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
                messageHistory: serializeMessageHistory(obj.messageHistory),
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
                    blendMode: normalizeBlendMode(kf.blendMode),
                    ...(Object.prototype.hasOwnProperty.call(kf, 'text') ? { text: normalizeKeyframeText(kf.text) } : {})
                }))
            }));

            return {
                project_type: 'PixelAnimator_NLE',
                version: 9,
                mask: outputMask.enabled ? { width: outputMask.width, height: outputMask.height } : null,
                objects: exportData
            };
        }

        function serializeProjectDataV2() {
            return JSON.stringify(buildProjectPayloadV2(), null, 2);
        }

        function inferImportedObjectType(obj = {}) {
            const rawType = String(obj.type || obj.objectType || obj.kind || '').trim().toLowerCase();
            if (rawType === CAMERA_TYPE || rawType === 'cam') return CAMERA_TYPE;
            if (rawType === SPINE_TYPE || obj.spineData || obj.skeletonPath || obj.atlasPath || obj.rawData) return SPINE_TYPE;
            if (rawType === BLOCK_TYPE || obj.blockData) return BLOCK_TYPE;
            if (
                rawType === TEXT_TYPE
                || obj.textData
                || Object.prototype.hasOwnProperty.call(obj, 'text')
                || Object.prototype.hasOwnProperty.call(obj, 'fontSize')
                || Object.prototype.hasOwnProperty.call(obj, 'fontFamily')
                || Object.prototype.hasOwnProperty.call(obj, 'bitmapFont')
                || (Array.isArray(obj.keyframes) && obj.keyframes.some(kf => Object.prototype.hasOwnProperty.call(kf || {}, 'text')))
            ) return TEXT_TYPE;
            if (rawType === IMAGE_TYPE || obj.src || obj.assetPath || obj.imageSrc || obj.imageData || obj.path) return IMAGE_TYPE;
            return null;
        }

        function getImportedMessageHistory(objData = {}) {
            return cloneMessageHistory(
                objData.messageHistory
                || objData.conversationHistory
                || objData.chatHistory
                || objData.messages
                || []
            );
        }

        function buildImportedSpineData(objData = {}) {
            if (objData.spineData) return { ...objData.spineData };
            return {
                editorVersion: objData.editorVersion,
                skeletonPath: objData.skeletonPath,
                atlasPath: objData.atlasPath,
                rawData: objData.rawData,
                animationName: objData.animationName,
                animationNames: objData.animationNames,
                animationDuration: objData.animationDuration,
                size: objData.size
            };
        }

        function buildImportedBlockData(objData = {}) {
            if (objData.blockData) return { ...objData.blockData };
            return {
                size: objData.size,
                color: objData.color
            };
        }

        function buildImportedTextData(objData = {}) {
            if (objData.textData) return { ...objData.textData };
            const legacyKeyframeText = Array.isArray(objData.keyframes)
                ? objData.keyframes.find(kf => Object.prototype.hasOwnProperty.call(kf || {}, 'text'))?.text
                : undefined;
            return {
                text: Object.prototype.hasOwnProperty.call(objData, 'text') ? objData.text : legacyKeyframeText,
                size: objData.size ?? objData.fontSize,
                lineHeight: objData.lineHeight,
                letterSpacing: objData.letterSpacing,
                color: objData.color,
                fontFamily: objData.fontFamily,
                align: objData.align,
                bitmapFont: objData.bitmapFont || null
            };
        }

        function buildImportedImageObjectData(objData = {}) {
            return {
                ...objData,
                src: objData.src || objData.imageSrc || objData.imageData || '',
                assetPath: objData.assetPath || objData.path || ''
            };
        }

        function validateImportedProjectDataV2(data) {
            const projectType = String(data.project_type || '').trim();
            if (projectType && projectType !== 'PixelAnimator_NLE') {
                throw new Error('Unsupported project JSON format.');
            }
            if (!Array.isArray(data.objects) || data.objects.length === 0) {
                throw new Error('This JSON file does not contain any objects.');
            }
            if (!data.objects.some(obj => !!inferImportedObjectType(obj))) {
                throw new Error('This JSON file does not contain any supported objects.');
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
            setElementDisplay(playhead, 'none');
            playState.currentTime = 0;
            updateCanvasViewportTransform?.();
        }

        function restoreImportedObjectTrackVisibility(obj, trackVisible) {
            if (!obj) return;
            obj.trackVisible = isCameraObject(obj) ? true : trackVisible !== false;
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

            const importWarnings = [];
            let loadedObjectCount = 0;
            const previousSuppressState = suppressObjectAutoRefresh;
            suppressObjectAutoRefresh = true;
            try {
                for (const objData of data.objects) {
                    try {
                        const objectType = inferImportedObjectType(objData);
                        if (!objectType) {
                            throw new Error('Unsupported object data.');
                        }
                        if (objectType === CAMERA_TYPE) {
                            const newObj = addCameraObject({
                                name: objData.name,
                                currentPose: objData.currentPose
                            }, objData.keyframes || [], objData.note);
                            newObj.messageHistory = getImportedMessageHistory(objData);
                            restoreImportedObjectTrackVisibility(newObj, objData.trackVisible);
                            if (selectedObjectId === newObj.id) renderChatPanel(newObj);
                        } else if (objectType === SPINE_TYPE) {
                            const newObj = await addSpineObject({ ...buildImportedSpineData(objData), name: objData.name }, objData.keyframes || [], objData.note);
                            newObj.messageHistory = getImportedMessageHistory(objData);
                            restoreImportedObjectTrackVisibility(newObj, objData.trackVisible);
                            if (selectedObjectId === newObj.id) renderChatPanel(newObj);
                        } else if (objectType === BLOCK_TYPE) {
                            const newObj = addBlockObject(buildImportedBlockData(objData), objData.note, objData.name || 'Block');
                            newObj.messageHistory = getImportedMessageHistory(objData);
                            newObj.keyframes = (objData.keyframes || []).map(normalizeKeyframe);
                            restoreImportedObjectTrackVisibility(newObj, objData.trackVisible);
                            if (selectedObjectId === newObj.id) renderChatPanel(newObj);
                        } else if (objectType === TEXT_TYPE) {
                            const importedTextData = buildImportedTextData(objData);
                            const newObj = addTextObject(importedTextData, objData.note, objData.name || buildTextObjectName(importedTextData.text));
                            newObj.messageHistory = getImportedMessageHistory(objData);
                            newObj.keyframes = (objData.keyframes || []).map(normalizeKeyframe);
                            restoreImportedObjectTrackVisibility(newObj, objData.trackVisible);
                            if (selectedObjectId === newObj.id) renderChatPanel(newObj);
                        } else {
                            const resolvedImage = await resolveImportedImageSource(buildImportedImageObjectData(objData));
                            const newObj = addNewObject(
                                objData.name,
                                resolvedImage.displaySrc,
                                objData.note,
                                resolvedImage.storedSrc,
                                resolvedImage.assetPath
                            );
                            newObj.messageHistory = getImportedMessageHistory(objData);
                            newObj.keyframes = (objData.keyframes || []).map(normalizeKeyframe);
                            restoreImportedObjectTrackVisibility(newObj, objData.trackVisible);
                            if (selectedObjectId === newObj.id) renderChatPanel(newObj);
                        }
                        loadedObjectCount += 1;
                    } catch (err) {
                        importWarnings.push(`${objData.name || '(unnamed object)'}: ${err?.message || String(err)}`);
                    }
                }
            } finally {
                suppressObjectAutoRefresh = previousSuppressState;
            }

            if (loadedObjectCount === 0) {
                const details = importWarnings.length > 0 ? ` First error: ${importWarnings[0]}` : '';
                throw new Error(`None of the objects in this file could be loaded.${details}`);
            }
            updateZIndices();
            if (animObjects.length > 0) {
                selectedObjectId = animObjects[animObjects.length - 1].id;
            }
            updateUIState();
            if (importWarnings.length > 0) {
                console.warn('Project import completed with skipped objects:', importWarnings);
                alert(`Opened with ${importWarnings.length} skipped object(s). See console for details.`);
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

        setupProjectFileToolbar();
        initializeProjectFileSystem();
