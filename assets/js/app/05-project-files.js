        spineInput.addEventListener('change', async function (e) {
            const files = Array.from(e.target.files || []);
            if (files.length === 0) return;

            try {
                const spineData = await buildSpineObjectData(files);
                await addSpineObject(spineData);
            } catch (err) {
                alert(`Spine import failed: ${err.message}`);
            }

            e.target.value = '';
        });

        spineAnimationSelect.addEventListener('change', () => {
            const obj = getSelectedObjectData();
            if (!obj || obj.type !== SPINE_TYPE) return;
            obj.spineData.animationName = spineAnimationSelect.value;
            obj.spineState.previewStartedAt = performance.now();
            syncSpineElementConfig(obj);
        });

        async function writeProjectFileWithHandle(fileHandle, dataStr, statusText) {
            const allowed = await ensureHandlePermission(fileHandle, 'readwrite', true);
            if (!allowed) throw new Error('Write permission was not granted.');
            const writable = await fileHandle.createWritable();
            await writable.write(dataStr);
            await writable.close();
            await setCurrentProjectHandle(fileHandle, fileHandle.name);
            lastAutoBackupSnapshot = dataStr;
            updateSaveStatus(statusText);
        }

        function buildProjectPayloadV2() {
            const exportData = animObjects.map(obj => ({
                name: obj.name,
                note: normalizeObjectNote(obj.note),
                trackVisible: obj.trackVisible !== false,
                type: obj.type || IMAGE_TYPE,
                src: obj.type === IMAGE_TYPE ? obj.src : undefined,
                assetPath: obj.type === IMAGE_TYPE ? normalizePath(obj.assetPath || buildDefaultAssetPath(obj.name)) : undefined,
                blockData: obj.type === BLOCK_TYPE ? normalizeBlockData(obj.blockData) : undefined,
                textData: obj.type === TEXT_TYPE ? serializeTextData(obj.textData) : undefined,
                spineData: obj.type === SPINE_TYPE ? {
                    editorVersion: obj.spineData.editorVersion,
                    skeletonPath: obj.spineData.skeletonPath,
                    atlasPath: obj.spineData.atlasPath,
                    rawData: obj.spineData.rawData,
                    animationName: obj.spineData.animationName,
                    animationNames: obj.spineData.animationNames,
                    animationDuration: obj.spineData.animationDuration,
                    size: obj.spineData.size
                } : undefined,
                keyframes: obj.keyframes.map(kf => ({
                    time: parseFloat(kf.time.toFixed(3)),
                    x: Math.round(kf.x),
                    y: Math.round(kf.y),
                    rot: Math.round(kf.rot),
                    scale: parseFloat(kf.scale.toFixed(2)),
                    opacity: parseFloat(kf.opacity.toFixed(2)),
                    tint: normalizeTintHex(kf.tint || DEFAULT_TINT),
                    tintStrength: parseFloat(getNum(kf.tintStrength, DEFAULT_TINT_STRENGTH).toFixed(2)),
                    hue: parseFloat(getNum(kf.hue, DEFAULT_HUE).toFixed(2)),
                    brightness: parseFloat(getNum(kf.brightness, DEFAULT_BRIGHTNESS).toFixed(2)),
                    contrast: parseFloat(getNum(kf.contrast, DEFAULT_CONTRAST).toFixed(2)),
                    blendMode: normalizeBlendMode(kf.blendMode)
                }))
            }));

            return {
                project_type: 'PixelAnimator_NLE',
                version: 6,
                mask: outputMask.enabled ? { width: outputMask.width, height: outputMask.height } : null,
                objects: exportData
            };
        }

        function serializeProjectDataV2() {
            return JSON.stringify(buildProjectPayloadV2(), null, 2);
        }

        function validateImportedProjectDataV2(data) {
            if (data.project_type !== 'PixelAnimator_NLE') {
                throw new Error('Unsupported project JSON format.');
            }
            if (!Array.isArray(data.objects) || data.objects.length === 0) {
                throw new Error('This JSON file does not contain any objects.');
            }

            const isSupportedObject = (obj) => {
                if (!obj) return false;
                if ((obj.type || IMAGE_TYPE) === SPINE_TYPE) return !!obj.spineData;
                if ((obj.type || IMAGE_TYPE) === BLOCK_TYPE) return true;
                if ((obj.type || IMAGE_TYPE) === TEXT_TYPE) return !!obj.textData;
                return !!obj.src;
            };
            if (!data.objects.every(isSupportedObject)) {
                throw new Error('The imported JSON contains unsupported object data.');
            }

            return data.mask && Number.isFinite(data.mask.width) && Number.isFinite(data.mask.height)
                ? { enabled: true, width: Math.max(1, Math.round(data.mask.width)), height: Math.max(1, Math.round(data.mask.height)) }
                : { enabled: false, width: outputMask.width, height: outputMask.height };
        }

        function clearCurrentSceneV2() {
            if (playState.isPlaying) stopAnimation();
            animObjects.forEach(obj => {
                obj.spineElement?.dispose?.();
                obj.domWrapper?.tintFilterNode?.remove?.();
                obj.domWrapper?.remove();
            });
            animObjects = [];
            selectedObjectId = null;
            selectedKeyframeIndex = null;
            selectedKeyframes = [];
            updateMultiSelectUI();
            playhead.style.display = 'none';
            playState.currentTime = 0;
        }

        function restoreImportedObjectTrackVisibility(obj, trackVisible) {
            if (!obj) return;
            obj.trackVisible = trackVisible !== false;
            if (obj.domWrapper?.dataset) {
                obj.domWrapper.dataset.trackVisible = obj.trackVisible ? 'true' : 'false';
            }
            applyPoseToDOM(obj.domWrapper, obj.currentPose);
        }

        async function loadProjectDataFromHandle(data, { fileHandle = null, fileName = '' } = {}) {
            const importedMask = validateImportedProjectDataV2(data);

            let overwrite = true;
            if (animObjects.length > 0) {
                overwrite = confirm(`Import ${data.objects.length} objects and replace the current scene?`);
            }
            if (!overwrite) return false;

            clearCurrentSceneV2();
            outputMask = importedMask;
            updateCanvasMaskLayout();

            for (const objData of data.objects) {
                const objectType = objData.type || IMAGE_TYPE;
                if (objectType === SPINE_TYPE) {
                    const newObj = await addSpineObject({ ...objData.spineData, name: objData.name }, objData.keyframes || [], objData.note);
                    restoreImportedObjectTrackVisibility(newObj, objData.trackVisible);
                } else if (objectType === BLOCK_TYPE) {
                    const newObj = addBlockObject(objData.blockData || {}, objData.note, objData.name || 'Block');
                    newObj.keyframes = (objData.keyframes || []).map(normalizeKeyframe);
                    restoreImportedObjectTrackVisibility(newObj, objData.trackVisible);
                } else if (objectType === TEXT_TYPE) {
                    const newObj = addTextObject(objData.textData || {}, objData.note, objData.name || buildTextObjectName(objData.textData?.text));
                    newObj.keyframes = (objData.keyframes || []).map(normalizeKeyframe);
                    restoreImportedObjectTrackVisibility(newObj, objData.trackVisible);
                } else {
                    const resolvedImage = await resolveImportedImageSource(objData);
                    const newObj = addNewObject(
                        objData.name,
                        resolvedImage.displaySrc,
                        objData.note,
                        resolvedImage.storedSrc,
                        resolvedImage.assetPath
                    );
                    newObj.keyframes = (objData.keyframes || []).map(normalizeKeyframe);
                    restoreImportedObjectTrackVisibility(newObj, objData.trackVisible);
                }
            }

            btnPlay.disabled = animObjects.length === 0;
            updateUIState();
            await setCurrentProjectHandle(fileHandle, fileName);
            lastAutoBackupSnapshot = serializeProjectDataV2();
            updateSaveStatus(fileName ? `loaded ${fileName}` : 'project loaded');
            return true;
        }

        async function saveProjectDirect() {
            if (animObjects.length === 0) {
                alert('No project data to export.');
                return;
            }

            if (!window.showDirectoryPicker || !currentProjectFileHandle) {
                await saveProjectAs();
                return;
            }

            try {
                await writeProjectFileWithHandle(currentProjectFileHandle, serializeProjectDataV2(), 'saved');
            } catch (err) {
                alert(`Direct save failed: ${err.message}`);
            }
        }

        async function saveProjectAs() {
            if (animObjects.length === 0) {
                alert('No project data to export.');
                return;
            }

            const suggestedName = sanitizeProjectFileName(currentProjectFileName || 'animation_project.json') || 'animation_project.json';
            const dataStr = serializeProjectDataV2();

            if (!window.showDirectoryPicker) {
                const fallbackName = sanitizeProjectFileName(prompt('Save file name', suggestedName));
                if (!fallbackName) return;
                downloadProjectJson(dataStr, fallbackName);
                currentProjectFileName = fallbackName;
                lastAutoBackupSnapshot = dataStr;
                updateSaveStatus('downloaded JSON');
                return;
            }

            try {
                const directoryHandle = await ensureSaveDirectoryHandle({ promptUser: true, writeAccess: true });
                if (!directoryHandle) return;

                const inputName = prompt('Save as file name', suggestedName);
                if (inputName === null) return;
                const fileName = sanitizeProjectFileName(inputName);
                if (!fileName) {
                    alert('Please enter a valid file name.');
                    return;
                }

                let shouldOverwrite = true;
                try {
                    await directoryHandle.getFileHandle(fileName);
                    shouldOverwrite = confirm(`${fileName} already exists. Overwrite it?`);
                } catch (err) {
                    shouldOverwrite = true;
                }
                if (!shouldOverwrite) return;

                const fileHandle = await directoryHandle.getFileHandle(fileName, { create: true });
                await writeProjectFileWithHandle(fileHandle, dataStr, 'saved as');
            } catch (err) {
                alert(`Save as failed: ${err.message}`);
            }
        }

        async function loadProjectFromHandle(fileHandle) {
            try {
                const allowed = await ensureHandlePermission(fileHandle, 'read', true);
                if (!allowed) throw new Error('Read permission was not granted.');
                const file = await fileHandle.getFile();
                const data = JSON.parse(await file.text());
                const loaded = await loadProjectDataFromHandle(data, { fileHandle, fileName: file.name });
                if (loaded) closeProjectFileModal();
            } catch (err) {
                alert(`Project load failed: ${err.message}`);
            }
        }

        async function runAutoBackup() {
            if (animObjects.length === 0 || !window.showDirectoryPicker) return;

            const snapshot = serializeProjectDataV2();
            if (!snapshot || snapshot === lastAutoBackupSnapshot) return;

            const directoryHandle = await ensureSaveDirectoryHandle({ promptUser: false, writeAccess: true });
            if (!directoryHandle) {
                updateSaveStatus('backup waiting for folder access');
                return;
            }

            const backupDirectory = await directoryHandle.getDirectoryHandle(AUTO_BACKUP_FOLDER_NAME, { create: true });
            const backupName = `${sanitizeProjectStem(currentProjectFileName || 'animation_project')}_backup_${formatTimestampForFileName()}.json`;
            const backupHandle = await backupDirectory.getFileHandle(backupName, { create: true });
            const writable = await backupHandle.createWritable();
            await writable.write(snapshot);
            await writable.close();

            const backups = [];
            for await (const entry of backupDirectory.values()) {
                if (entry.kind !== 'file' || !entry.name.toLowerCase().endsWith('.json')) continue;
                const file = await entry.getFile();
                backups.push({ name: entry.name, lastModified: file.lastModified });
            }
            backups.sort((a, b) => b.lastModified - a.lastModified);
            for (const backup of backups.slice(MAX_AUTO_BACKUPS)) {
                await backupDirectory.removeEntry(backup.name);
            }

            lastAutoBackupSnapshot = snapshot;
            updateSaveStatus(`backup ${backupName}`);
        }

        function importProjectJSON() {
            if (window.showDirectoryPicker) {
                refreshProjectFileList();
                return;
            }
            jsonImportInput.click();
        }

        function exportProjectJSON() {
            saveProjectDirect();
        }

        jsonImportInput.addEventListener('change', (e) => {
            const file = e.target.files?.[0];
            if (file) currentProjectFileName = file.name;
        }, true);
        jsonImportInput.addEventListener('change', async (e) => {
            const file = e.target.files?.[0];
            if (!file || window.showDirectoryPicker) return;
            e.stopImmediatePropagation();
            try {
                const data = JSON.parse(await file.text());
                await loadProjectDataFromHandle(data, { fileHandle: null, fileName: file.name });
            } catch (err) {
                alert(`Project import failed: ${err.message}`);
            }
            e.target.value = '';
        }, true);

        async function initializeProjectFileSystem() {
            if (window.showDirectoryPicker) {
                saveDirectoryHandle = await readStoredHandle(SAVE_DIRECTORY_HANDLE_KEY);
                currentProjectFileHandle = await readStoredHandle(CURRENT_PROJECT_HANDLE_KEY);
                if (currentProjectFileHandle?.name) currentProjectFileName = currentProjectFileHandle.name;
                updateSaveStatus('auto backup every 5 minutes');
            } else {
                updateSaveStatus('browser only supports import/export JSON');
            }
            startAutoBackupTimer();
        }

        initializeProjectFileSystem();
