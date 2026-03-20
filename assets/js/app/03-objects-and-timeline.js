        // --- 物件與圖層管理 ---
        fileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => { addNewObject(file.name, ev.target.result, '', ev.target.result, buildDefaultAssetPath(file.name)); fileInput.value = ''; };
            reader.readAsDataURL(file);
        });

        function addNewObject(name, imageSrc, note = '', storedSrc = null, assetPath = '') {
            const objId = createObjectId();
            const wrapper = createObjectWrapper(objId);
            const img = document.createElement('img');
            img.src = imageSrc;
            (wrapper.contentLayer || wrapper).appendChild(img);
            canvasViewport.appendChild(wrapper);

            applyPoseToDOM(wrapper, DEFAULT_POSE);

            const newObj = {
                id: objId,
                type: IMAGE_TYPE,
                name: name,
                note: normalizeObjectNote(note),
                src: storedSrc || imageSrc,
                assetPath: normalizePath(assetPath || buildDefaultAssetPath(name)),
                domWrapper: wrapper,
                currentPose: clonePose(),
                keyframes: []
            };
            
            return finalizeNewObject(newObj);
        }

        function syncBlockElement(obj) {
            if (!obj?.blockElement) return;
            const blockData = normalizeBlockData(obj.blockData);
            obj.blockData = blockData;
            obj.blockElement.style.width = `${blockData.size}px`;
            obj.blockElement.style.height = `${blockData.size}px`;
            obj.blockElement.style.background = blockData.color;
        }

        function addBlockObject(blockData = {}, note = '', name = '方形圖塊') {
            const objId = createObjectId();
            const wrapper = createObjectWrapper(objId, 'block-object');
            const blockElement = document.createElement('div');
            blockElement.className = 'shape-block';
            (wrapper.contentLayer || wrapper).appendChild(blockElement);
            canvasViewport.appendChild(wrapper);

            applyPoseToDOM(wrapper, DEFAULT_POSE);

            const newObj = {
                id: objId,
                type: BLOCK_TYPE,
                name,
                note: normalizeObjectNote(note),
                domWrapper: wrapper,
                blockElement,
                blockData: normalizeBlockData(blockData),
                currentPose: clonePose(),
                keyframes: []
            };

            syncBlockElement(newObj);
            return finalizeNewObject(newObj);
        }

        function addTextObject(textData = {}, note = '', name = '') {
            const normalizedTextData = normalizeTextData(textData);
            const objId = createObjectId();
            const wrapper = createObjectWrapper(objId, 'text-object');
            const textElement = document.createElement('div');
            textElement.className = 'text-object-surface';
            (wrapper.contentLayer || wrapper).appendChild(textElement);
            canvasViewport.appendChild(wrapper);

            applyPoseToDOM(wrapper, DEFAULT_POSE);

            const newObj = {
                id: objId,
                type: TEXT_TYPE,
                name: name || buildTextObjectName(normalizedTextData.text),
                note: normalizeObjectNote(note),
                domWrapper: wrapper,
                textElement,
                textData: cloneTextData(normalizedTextData),
                currentPose: clonePose(),
                keyframes: []
            };

            syncTextElement(newObj);
            if (!name) syncTextObjectName(newObj);
            return finalizeNewObject(newObj);
        }

        function importSpineBundle() {
            spineInput.click();
        }

        async function buildSpineObjectData(files) {
            const atlasFile = files.find(file => file.name.toLowerCase().endsWith('.atlas'));
            const textureFiles = files.filter(file => /\.(png|jpg|jpeg|webp)$/i.test(file.name));
            const jsonFiles = files.filter(file => file.name.toLowerCase().endsWith('.json'));
            /*

            if (!atlasFile) throw new Error('Spine 匯入至少需要 1 個 .atlas 檔。');
            if (textureFiles.length === 0) throw new Error('Spine 匯入至少需要 atlas 對應的貼圖檔。');
            if (jsonFiles.length === 0) throw new Error('目前先支援 Spine skeleton JSON，請提供 .json skeleton 檔。');

            */
            if (!atlasFile) throw new Error('Spine import requires at least one .atlas file.');
            if (textureFiles.length === 0) throw new Error('Spine import requires the atlas texture images.');
            if (jsonFiles.length === 0) throw new Error('This editor currently supports Spine skeleton JSON (.json) files only.');

            let skeletonFile = null;
            let skeletonData = null;
            for (const candidate of jsonFiles) {
                try {
                    const parsed = JSON.parse(await readFileAsText(candidate));
                    if (parsed?.skeleton && (parsed.bones || parsed.animations || parsed.skins)) {
                        skeletonFile = candidate;
                        skeletonData = parsed;
                        break;
                    }
                } catch (err) {
                }
            }

            if (!skeletonFile || !skeletonData) {
                /*
                throw new Error('找不到有效的 Spine skeleton JSON。');
            }

                */
                throw new Error('Could not find a valid Spine skeleton JSON file.');
            }

            const editorVersion = skeletonData?.skeleton?.spine || '';
            await ensureSpineRuntime(editorVersion);

            const rawData = {};
            for (const file of files) {
                const assetPath = normalizePath(file.webkitRelativePath || file.name);
                const base64 = stripDataUrlPrefix(await readFileAsDataURL(file));
                rawData[assetPath] = base64;
                if (!rawData[file.name]) rawData[file.name] = base64;
            }

            const animationNames = Object.keys(skeletonData.animations || {});
            return {
                name: stripExtension(skeletonFile.name),
                editorVersion,
                skeletonPath: normalizePath(skeletonFile.webkitRelativePath || skeletonFile.name),
                atlasPath: normalizePath(atlasFile.webkitRelativePath || atlasFile.name),
                rawData,
                animationName: animationNames[0] || '',
                animationNames,
                animationDuration: 3,
                size: { width: DEFAULT_SPINE_SIZE, height: DEFAULT_SPINE_SIZE }
            };
        }

        function syncSpineElementConfig(obj) {
            if (!obj?.spineElement) return;
            obj.spineElement.setAttribute('skeleton', obj.spineData.skeletonPath);
            obj.spineElement.setAttribute('atlas', obj.spineData.atlasPath);
            obj.spineElement.setAttribute('raw-data', JSON.stringify(obj.spineData.rawData));
            obj.spineElement.setAttribute('default-mix', '0');
            if (obj.spineData.animationName) obj.spineElement.setAttribute('animation', obj.spineData.animationName);
            else obj.spineElement.removeAttribute('animation');
        }

        function getSpinePreviewTime(obj) {
            if (playState.isPlaying || scrubState.isScrubbing) return playState.currentTime;
            const startedAt = obj.spineState?.previewStartedAt || performance.now();
            return Math.max(0, (performance.now() - startedAt) / 1000);
        }

        function syncSpineState(obj, skeleton, state) {
            const animationName = obj.spineData?.animationName || '';
            if (!animationName) {
                state.clearTracks?.();
                skeleton.setupPose?.();
                return;
            }

            let entry = state.tracks?.[0] || null;
            const currentAnimation = entry?.animation?.name || '';
            if (!entry || currentAnimation !== animationName) {
                state.clearTrack?.(0);
                entry = state.setAnimation(0, animationName, true);
                if (entry) {
                    entry.mixDuration = 0;
                    obj.spineData.animationDuration = entry.animation?.duration || obj.spineData.animationDuration || 3;
                }
            }

            if (entry) {
                const duration = entry.animation?.duration || obj.spineData.animationDuration || 0;
                const nextTime = getSpinePreviewTime(obj);
                entry.trackTime = duration > 0 ? (nextTime % duration) : nextTime;
                entry.animationLast = entry.trackTime;
                if ('mixTime' in entry && 'mixDuration' in entry) entry.mixTime = entry.mixDuration;
            }
        }

        async function addSpineObject(spineData, keyframes = [], note = '') {
            await ensureSpineRuntime(spineData.editorVersion);

            const objId = createObjectId();
            const wrapper = createObjectWrapper(objId, 'spine-object');
            wrapper.style.width = `${spineData.size?.width || DEFAULT_SPINE_SIZE}px`;
            wrapper.style.height = `${spineData.size?.height || DEFAULT_SPINE_SIZE}px`;

            const spineElement = document.createElement('spine-skeleton');
            spineElement.setAttribute('identifier', `spine-object-${objId}`);
            spineElement.style.width = '100%';
            spineElement.style.height = '100%';
            (wrapper.contentLayer || wrapper).appendChild(spineElement);
            canvasViewport.appendChild(wrapper);

            applyPoseToDOM(wrapper, DEFAULT_POSE);

            const newObj = {
                id: objId,
                type: SPINE_TYPE,
                name: spineData.name || 'Spine Object',
                note: normalizeObjectNote(note || spineData.note),
                domWrapper: wrapper,
                currentPose: clonePose(),
                keyframes: keyframes.map(normalizeKeyframe),
                spineData: {
                    name: spineData.name || 'Spine Object',
                    editorVersion: spineData.editorVersion,
                    skeletonPath: spineData.skeletonPath,
                    atlasPath: spineData.atlasPath,
                    rawData: { ...(spineData.rawData || {}) },
                    animationName: spineData.animationName || '',
                    animationNames: [...(spineData.animationNames || [])],
                    animationDuration: spineData.animationDuration || 3,
                    size: { width: spineData.size?.width || DEFAULT_SPINE_SIZE, height: spineData.size?.height || DEFAULT_SPINE_SIZE }
                },
                spineElement,
                spineState: { previewStartedAt: performance.now() }
            };

            syncSpineElementConfig(newObj);
            spineElement.whenReady.then(({ skeleton, state }) => {
                spineElement.update = (delta, currentSkeleton, currentState) => {
                    syncSpineState(newObj, currentSkeleton, currentState);
                    currentState.apply(currentSkeleton);
                    currentSkeleton.updateWorldTransform();
                };
                syncSpineState(newObj, skeleton, state);
            }).catch((err) => {
                console.error(err);
                /*
                alert(`Spine 物件 ${newObj.name} 載入失敗：${err.message}`);
                */
                alert(`Spine object ${newObj.name} failed to load: ${err.message}`);
            });

            return finalizeNewObject(newObj);
        }

        function updateZIndices() { animObjects.forEach((obj, i) => obj.domWrapper.style.zIndex = i + 2); }
        function moveLayer(objId, direction) {
            const index = animObjects.findIndex(obj => obj.id === objId);
            if (index < 0) return;
            const newIndex = index + direction;
            if (newIndex < 0 || newIndex >= animObjects.length) return; 
            [animObjects[index], animObjects[newIndex]] = [animObjects[newIndex], animObjects[index]];
            updateZIndices(); updateUIState();
        }

        function moveLayerToDisplayInsertionIndex(objId, insertionIndex) {
            const displayObjects = [...animObjects].reverse();
            const sourceIndex = displayObjects.findIndex(obj => obj.id === objId);
            if (sourceIndex < 0) return;

            let resolvedInsertionIndex = clamp(insertionIndex, 0, displayObjects.length);
            const [movingObj] = displayObjects.splice(sourceIndex, 1);
            if (!movingObj) return;
            if (sourceIndex < resolvedInsertionIndex) resolvedInsertionIndex -= 1;
            resolvedInsertionIndex = clamp(resolvedInsertionIndex, 0, displayObjects.length);
            displayObjects.splice(resolvedInsertionIndex, 0, movingObj);

            animObjects = displayObjects.reverse();
            updateZIndices();
            updateUIState();
        }

        function clearTrackReorderIndicators() {
            tracksContainer.querySelectorAll('.track-row[data-obj-id]').forEach((row) => {
                row.classList.remove('track-reorder-source', 'track-reorder-target-before', 'track-reorder-target-after');
            });
        }

        function updateTrackReorderIndicators() {
            clearTrackReorderIndicators();
            if (!trackReorderDrag.isDragging) return;

            const rows = Array.from(tracksContainer.querySelectorAll('.track-row[data-obj-id]'));
            const sourceRow = tracksContainer.querySelector(`.track-row[data-obj-id="${trackReorderDrag.objId}"]`);
            sourceRow?.classList.add('track-reorder-source');

            if (!trackReorderDrag.hasMoved || rows.length === 0) return;

            if (trackReorderDrag.insertionIndex <= 0) {
                rows[0]?.classList.add('track-reorder-target-before');
                return;
            }
            if (trackReorderDrag.insertionIndex >= rows.length) {
                rows[rows.length - 1]?.classList.add('track-reorder-target-after');
                return;
            }
            rows[trackReorderDrag.insertionIndex]?.classList.add('track-reorder-target-before');
        }

        function getTrackReorderInsertionIndex(clientY) {
            const rows = Array.from(tracksContainer.querySelectorAll('.track-row[data-obj-id]'));
            for (let i = 0; i < rows.length; i++) {
                const rect = rows[i].getBoundingClientRect();
                if (clientY < rect.top + (rect.height / 2)) return i;
            }
            return rows.length;
        }

        function handleTrackReorderMouseDown(event, objId) {
            if (playState.isPlaying || event.button !== 0) return;
            event.preventDefault();
            event.stopPropagation();
            trackReorderDrag = {
                isDragging: true,
                hasMoved: false,
                objId,
                startY: event.clientY,
                insertionIndex: getTrackReorderInsertionIndex(event.clientY)
            };
            document.body.classList.add('is-dragging-track-reorder');
            updateTrackReorderIndicators();
        }

        function deleteObject(objId) {
            if (!confirm('Delete this object?')) return;
            /*
            if (!confirm("確定要刪除嗎？")) return;
            */
            const targetObj = animObjects.find(obj => obj.id === objId);
            targetObj?.spineElement?.dispose?.();
            targetObj?.domWrapper?.tintFilterNode?.remove?.();
            animObjects = animObjects.filter(obj => obj.id !== objId);
            document.getElementById(`obj-wrap-${objId}`)?.remove();
            if (selectedObjectId === objId) selectedObjectId = null;
            updateZIndices(); updateUIState();
            if (animObjects.length === 0) btnPlay.disabled = true;
        }

        function selectObject(objId) {
            if (playState.isPlaying) stopAnimation();
            selectedObjectId = objId;
            selectedKeyframeIndex = null;
            selectedKeyframes = [];
            updateMultiSelectUI();
            
            document.querySelectorAll('.anim-object-wrapper').forEach(el => el.classList.remove('selected'));
            if (objId !== null) {
                document.getElementById(`obj-wrap-${objId}`)?.classList.add('selected');
                const obj = getSelectedObjectData();
                if (obj) { syncInputsWithState(obj.currentPose); intervalInput.value = 0.5; }
            }
            updateUIState();
        }

        function updateSpinePanel(obj) {
            if (!obj || obj.type !== SPINE_TYPE) {
                spinePanel.style.display = 'none';
                spineAnimationSelect.innerHTML = '';
                return;
            }

            spinePanel.style.display = 'block';
            const animationNames = obj.spineData?.animationNames || [];
            if (animationNames.length === 0) {
                spineAnimationSelect.disabled = true;
                spineAnimationSelect.innerHTML = '<option value="">Setup Pose</option>';
                spineAnimationSelect.value = '';
                return;
            }

            spineAnimationSelect.disabled = false;
            spineAnimationSelect.innerHTML = animationNames.map(name => {
                const safeName = escapeHTML(name);
                return `<option value="${safeName}">${safeName}</option>`;
            }).join('');
            spineAnimationSelect.value = obj.spineData.animationName || animationNames[0];
        }

        function updateBlockPanel(obj) {
            if (!blockPanel || !blockSizeInput || !blockColorInput) return;
            if (!obj || obj.type !== BLOCK_TYPE) {
                blockPanel.style.display = 'none';
                return;
            }

            obj.blockData = normalizeBlockData(obj.blockData);
            blockPanel.style.display = 'block';
            blockSizeInput.value = Math.round(obj.blockData.size);
            blockColorInput.value = obj.blockData.color;
        }

        function updateTextPanel(obj) {
            if (!textPanel || !textContentInput || !textSizeInput || !textLineHeightInput || !textLetterSpacingInput || !textAlignInput || !textColorInput || !textFontFamilyInput || !textBitmapFontStatus || !textClearFontButton) return;
            if (!obj || obj.type !== TEXT_TYPE) {
                textPanel.style.display = 'none';
                return;
            }

            obj.textData = normalizeTextData(obj.textData);
            textPanel.style.display = 'block';
            textContentInput.value = obj.textData.text;
            textSizeInput.value = Math.round(obj.textData.size);
            textLineHeightInput.value = Math.round(obj.textData.lineHeight);
            textLetterSpacingInput.value = Math.round(obj.textData.letterSpacing);
            textAlignInput.value = obj.textData.align;
            textColorInput.value = obj.textData.color;
            textFontFamilyInput.value = obj.textData.fontFamily;
            textBitmapFontStatus.textContent = obj.textData.bitmapFont
                ? `Bitmap Font: ${obj.textData.bitmapFont.name}`
                : 'Bitmap Font: none';
            textColorInput.disabled = !!obj.textData.bitmapFont;
            textFontFamilyInput.disabled = !!obj.textData.bitmapFont;
            textClearFontButton.disabled = !obj.textData.bitmapFont;
        }

        function renderObjectList() {
            objectListEl.innerHTML = '';
            for (let i = animObjects.length - 1; i >= 0; i--) {
                const obj = animObjects[i];
                const li = document.createElement('li');
                if (obj.id === selectedObjectId) li.className = 'active';

                const info = document.createElement('div');
                info.className = 'object-list-info';

                const nameEl = document.createElement('span');
                nameEl.className = 'obj-name';
                nameEl.textContent = obj.name;
                nameEl.title = getObjectDisplayTitle(obj);
                info.appendChild(nameEl);

                const noteSummary = getObjectNoteSummary(obj.note);
                if (noteSummary) {
                    li.classList.add('has-note');
                    const noteEl = document.createElement('span');
                    noteEl.className = 'obj-note';
                    noteEl.textContent = noteSummary;
                    noteEl.title = normalizeObjectNote(obj.note);
                    info.appendChild(noteEl);
                }

                const actions = document.createElement('div');
                actions.className = 'layer-actions';
                actions.innerHTML = `
                    <button class="layer-btn" title="上移圖層" onclick="event.stopPropagation(); moveLayer(${obj.id}, 1);">上</button>
                    <button class="layer-btn" title="下移圖層" onclick="event.stopPropagation(); moveLayer(${obj.id}, -1);">下</button>
                    <button class="layer-btn btn-danger" title="刪除圖層" onclick="event.stopPropagation(); deleteObject(${obj.id});">刪</button>
                `;

                li.appendChild(info);
                li.appendChild(actions);
                li.onclick = () => selectObject(obj.id);
                objectListEl.appendChild(li);
            }
        }

        function updateUIState() {
            renderObjectList();

            const obj = getSelectedObjectData();
            updateSpinePanel(obj);
            updateBlockPanel(obj);
            updateTextPanel(obj);
            if (objectSettingsPanel) {
                objectSettingsPanel.style.display = (obj && (obj.type === SPINE_TYPE || obj.type === BLOCK_TYPE || obj.type === TEXT_TYPE)) ? '' : 'none';
            }
            if (obj) {
                layerNoteInput.disabled = false;
                layerNoteInput.value = obj.note || '';
                propsPanel.style.opacity = 1; propsPanel.style.pointerEvents = 'auto'; btnSnapshot.disabled = false;
                tintPanel.style.opacity = 1; tintPanel.style.pointerEvents = 'auto';
                const anyKfSelected = selectedKeyframeIndex !== null || selectedKeyframes.length > 0;
                if (anyKfSelected) {
                    btnDeleteKf.style.display = 'block';
                    btnDeleteKf.innerText = selectedKeyframes.length > 1
                        ? `Delete ${selectedKeyframes.length} keyframes`
                        : 'Delete keyframe';
                    /*
                    btnDeleteKf.innerText = selectedKeyframes.length > 1
                        ? `🗑 刪除 ${selectedKeyframes.length} 個影格`
                        : '🗑 刪除此影格';
                    */
                } else {
                    btnDeleteKf.style.display = 'none';
                }
            } else {
                layerNoteInput.value = '';
                layerNoteInput.disabled = true;
                propsPanel.style.opacity = 0.5; propsPanel.style.pointerEvents = 'none'; btnSnapshot.disabled = true;
                tintPanel.style.opacity = 0.5; tintPanel.style.pointerEvents = 'none';
                btnDeleteKf.style.display = 'none';
                if (selectedKeyframes.length === 0) {
                    exitEditingFrameMode();
                }
            }

            updateClipboardButtons();
            updateTimelineNavigationButtons();
            updateGlobalTimeline();
        }

        function updateMultiSelectUI() {
            if (selectedKeyframes.length > 1) {
                multiSelectDisplay.style.display = 'inline';
                multiSelectDisplay.innerText = `Selected ${selectedKeyframes.length} keyframes`;
                /*
                multiSelectDisplay.innerText = `● 已複選 ${selectedKeyframes.length} 個影格`;
                */
            } else {
                multiSelectDisplay.style.display = 'none';
            }
        }

        function syncSelectedObjectFromKeyframes() {
            if (selectedKeyframes.length === 0) return;
            const firstSelected = selectedKeyframes[0];
            if (!firstSelected) return;
            selectedObjectId = firstSelected.objId;

            document.querySelectorAll('.anim-object-wrapper').forEach(el => el.classList.remove('selected'));
            document.getElementById(`obj-wrap-${selectedObjectId}`)?.classList.add('selected');

            const obj = getSelectedObjectData();
            if (obj && selectedKeyframeIndex === null) {
                syncInputsWithState(obj.currentPose);
            }
        }

        function getActiveKeyframeSelection() {
            if (selectedKeyframes.length > 0) {
                return selectedKeyframes.map(({ objId, kfIndex }) => ({ objId, kfIndex }));
            }
            if (selectedKeyframeIndex !== null && selectedObjectId !== null) {
                return [{ objId: selectedObjectId, kfIndex: selectedKeyframeIndex }];
            }
            return [];
        }

        function updateClipboardButtons() {
            const hasObject = !!getSelectedObjectData();
            const hasSelection = getActiveKeyframeSelection().length > 0;
            btnCopyKf.disabled = !hasSelection;
            btnPasteKf.disabled = !hasObject || !keyframeClipboard || keyframeClipboard.items.length === 0;
        }

        function getKeyframeClipboardTargetTime() {
            return Math.max(0, Math.round((playState.currentTime || 0) * 100) / 100);
        }

        function copySelectedKeyframes() {
            const selection = getActiveKeyframeSelection();
            if (selection.length === 0) return;

            const expanded = selection.map(({ objId, kfIndex }) => {
                const obj = animObjects.find(o => o.id === objId);
                const kf = obj?.keyframes?.[kfIndex];
                if (!obj || !kf) return null;
                return {
                    sourceObjId: objId,
                    sourceObjName: obj.name,
                    time: kf.time,
                    pose: {
                        x: kf.x, y: kf.y, rot: kf.rot, scale: kf.scale, opacity: kf.opacity,
                        ...normalizePoseEffects(kf)
                    }
                };
            }).filter(Boolean);

            if (expanded.length === 0) return;

            const minTime = Math.min(...expanded.map(item => item.time));
            keyframeClipboard = {
                anchorTime: minTime,
                copiedAt: Date.now(),
                items: expanded
                    .sort((a, b) => a.time - b.time || a.sourceObjId - b.sourceObjId)
                    .map(item => ({
                        ...item,
                        relativeTime: Math.round((item.time - minTime) * 100) / 100
                    }))
            };

            updateClipboardButtons();
        }

        function pasteCopiedKeyframes() {
            if (!keyframeClipboard || keyframeClipboard.items.length === 0) return;

            const baseTime = getKeyframeClipboardTargetTime();
            const grouped = new Map();
            keyframeClipboard.items.forEach(item => {
                if (!grouped.has(item.sourceObjId)) grouped.set(item.sourceObjId, []);
                grouped.get(item.sourceObjId).push(item);
            });

            const newSelection = [];
            grouped.forEach((items, objId) => {
                const targetObj = animObjects.find(o => o.id === objId);
                if (!targetObj) return;

                const inserted = [];
                items.forEach(item => {
                    const newTime = Math.max(0, Math.round((baseTime + item.relativeTime) * 100) / 100);
                    const newKf = {
                        time: newTime,
                        x: item.pose.x,
                        y: item.pose.y,
                        rot: item.pose.rot,
                        scale: item.pose.scale,
                        opacity: item.pose.opacity,
                        ...normalizePoseEffects(item.pose)
                    };
                    targetObj.keyframes.push(newKf);
                    inserted.push(newKf);
                });

                targetObj.keyframes.sort((a, b) => a.time - b.time);
                inserted.forEach((insertedKf) => {
                    const newIndex = targetObj.keyframes.findIndex(kf => kf === insertedKf);
                    if (newIndex >= 0) newSelection.push({ objId, kfIndex: newIndex });
                });
            });

            if (newSelection.length === 0) return;

            selectedKeyframeIndex = null;
            selectedKeyframes = newSelection;
            const firstSelection = newSelection[0];
            if (selectedObjectId !== firstSelection.objId) {
                selectedObjectId = firstSelection.objId;
            }

            updateMultiSelectUI();
            updateUIState();

            const maxTime = Math.max(...newSelection.map(({ objId, kfIndex }) => {
                const obj = animObjects.find(o => o.id === objId);
                return obj?.keyframes?.[kfIndex]?.time || 0;
            }));
            centerTimelineOnTime(maxTime);
        }

        function getSelectionToken(objId, kfIndex) {
            return `${objId}:${kfIndex}`;
        }

        function getTimelineContentPoint(e) {
            const rect = timelineScrollArea.getBoundingClientRect();
            return {
                x: e.clientX - rect.left + timelineScrollArea.scrollLeft,
                y: e.clientY - rect.top + timelineScrollArea.scrollTop
            };
        }

        function getMarqueeRect() {
            const left = Math.min(marqueeState.startX, marqueeState.currentX);
            const top = Math.min(marqueeState.startY, marqueeState.currentY);
            const right = Math.max(marqueeState.startX, marqueeState.currentX);
            const bottom = Math.max(marqueeState.startY, marqueeState.currentY);
            return { left, top, right, bottom, width: right - left, height: bottom - top };
        }

        function updateTimelineSelectionBox() {
            const rect = getMarqueeRect();
            timelineSelectionBox.style.display = marqueeState.isSelecting ? 'block' : 'none';
            if (!marqueeState.isSelecting) return;
            timelineSelectionBox.style.left = `${rect.left}px`;
            timelineSelectionBox.style.top = `${rect.top}px`;
            timelineSelectionBox.style.width = `${rect.width}px`;
            timelineSelectionBox.style.height = `${rect.height}px`;
        }

        function renderSelectedKeyframeNodes() {
            const selectedSet = new Set(selectedKeyframes.map(s => getSelectionToken(s.objId, s.kfIndex)));
            document.querySelectorAll('.kf-node').forEach(node => {
                const token = getSelectionToken(node.dataset.objId, node.dataset.kfIndex);
                node.classList.toggle('selected', selectedSet.has(token));
            });
        }

        function collectKeyframesInRect(rect) {
            const scrollRect = timelineScrollArea.getBoundingClientRect();
            const hits = [];

            document.querySelectorAll('.kf-node').forEach(node => {
                const nodeRect = node.getBoundingClientRect();
                const nodeLeft = nodeRect.left - scrollRect.left + timelineScrollArea.scrollLeft;
                const nodeTop = nodeRect.top - scrollRect.top + timelineScrollArea.scrollTop;
                const nodeRight = nodeLeft + nodeRect.width;
                const nodeBottom = nodeTop + nodeRect.height;
                const intersects = !(nodeRight < rect.left || nodeLeft > rect.right || nodeBottom < rect.top || nodeTop > rect.bottom);
                if (!intersects) return;
                hits.push({
                    objId: Number(node.dataset.objId),
                    kfIndex: Number(node.dataset.kfIndex)
                });
            });

            return hits;
        }

        function startMarqueeSelection(e) {
            const point = getTimelineContentPoint(e);
            marqueeState.isSelecting = true;
            marqueeState.hasMoved = false;
            marqueeState.additive = !!(e.ctrlKey || e.metaKey);
            marqueeState.startX = point.x;
            marqueeState.startY = point.y;
            marqueeState.currentX = point.x;
            marqueeState.currentY = point.y;
            marqueeState.baseSelection = marqueeState.additive ? [...selectedKeyframes] : [];

            if (selectedKeyframeIndex !== null) resetSnapshotMode();
            if (!marqueeState.additive) selectedKeyframes = [];
            updateTimelineSelectionBox();
            renderSelectedKeyframeNodes();
            updateMultiSelectUI();
        }

        function updateMarqueeSelection(e) {
            const point = getTimelineContentPoint(e);
            marqueeState.currentX = point.x;
            marqueeState.currentY = point.y;
            if (Math.abs(marqueeState.currentX - marqueeState.startX) > 2 || Math.abs(marqueeState.currentY - marqueeState.startY) > 2) {
                marqueeState.hasMoved = true;
            }

            const rect = getMarqueeRect();
            const hits = collectKeyframesInRect(rect);
            const merged = marqueeState.additive ? [...marqueeState.baseSelection] : [];
            const selectedSet = new Set(merged.map(s => getSelectionToken(s.objId, s.kfIndex)));
            hits.forEach(hit => {
                const token = getSelectionToken(hit.objId, hit.kfIndex);
                if (selectedSet.has(token)) return;
                selectedSet.add(token);
                merged.push(hit);
            });
            selectedKeyframes = merged;

            updateTimelineSelectionBox();
            renderSelectedKeyframeNodes();
            updateMultiSelectUI();
        }

        function finishMarqueeSelection() {
            if (!marqueeState.isSelecting) return;
            marqueeState.isSelecting = false;
            timelineSelectionBox.style.display = 'none';
            if (selectedKeyframes.length > 0) {
                selectedKeyframeIndex = null;
                syncSelectedObjectFromKeyframes();
            }
            updateUIState();
        }

        // ─── 時間軸渲染子函式 ────────────────────────────────────────────────────────
        function buildRuler(trackWidth, maxTime) {
            rulerTicks.style.width = `${trackWidth}px`;
            rulerRow.style.width   = `${trackWidth + HEADER_WIDTH}px`;
            for (let i = 0; i * 0.5 <= maxTime; i++) {
                const tick = document.createElement('div');
                tick.className  = 'ruler-tick';
                tick.style.left = `${timeToTimelineX(i * 0.5)}px`;
                tick.innerText  = (i * 0.5) + 's';
                rulerTicks.appendChild(tick);
            }
        }

        function handleKfNodeMouseDown(e, kf, index, obj, node) {
            if (playState.isPlaying) return;
            e.stopPropagation();
            const isInSelection = selectedKeyframes.some(s => s.objId === obj.id && s.kfIndex === index);

            if (e.ctrlKey || e.metaKey) {
                if (selectedKeyframeIndex !== null) resetSnapshotMode();
                if (isInSelection) {
                    selectedKeyframes = selectedKeyframes.filter(s => !(s.objId === obj.id && s.kfIndex === index));
                } else {
                    selectedKeyframes.push({ objId: obj.id, kfIndex: index });
                }
                updateGlobalTimeline();
                updateMultiSelectUI();
                updateUIState();
                return;
            }

            if (!isInSelection) selectedKeyframes = [{ objId: obj.id, kfIndex: index }];

            kfDrag.dragTargets = selectedKeyframes.map(s => {
                const tObj  = animObjects.find(o => o.id === s.objId);
                if (!tObj || !tObj.keyframes[s.kfIndex]) return null;
                const tNode = document.querySelector(`.kf-node[data-obj-id="${s.objId}"][data-kf-index="${s.kfIndex}"]`);
                return { objId: s.objId, kfIndex: s.kfIndex, startTime: tObj.keyframes[s.kfIndex].time, nodeEl: tNode };
            }).filter(Boolean);

            Object.assign(kfDrag, {
                isDragging: true, hasMoved: false,
                objId: obj.id, kfIndex: index,
                startX: e.clientX, startTime: kf.time, nodeEl: node
            });
        }

        function buildKfNode(kf, index, obj) {
            const node = document.createElement('div');
            node.className       = 'kf-node';
            node.dataset.objId   = obj.id;
            node.dataset.kfIndex = index;
            if (selectedKeyframes.some(s => s.objId === obj.id && s.kfIndex === index)) node.classList.add('selected');
            node.style.left  = `${timeToTimelineX(kf.time)}px`;
            node.title       = `時間: ${kf.time.toFixed(2)}s\n點擊編輯 | Ctrl+點擊複選 | 拖拉移動`;
            node.onmousedown = (e) => handleKfNodeMouseDown(e, kf, index, obj, node);
            return node;
        }

        function updateGlobalTimeline() {
            tracksContainer.innerHTML = '';
            rulerTicks.innerHTML      = '';
            if (animObjects.length === 0) return;

            const maxTime    = Math.ceil(animObjects.reduce((m, o) =>
                o.keyframes.length ? Math.max(m, o.keyframes[o.keyframes.length - 1].time) : m, 3)) + 1;
            const trackWidth = Math.max(800, timeToTimelineX(maxTime));

            buildRuler(trackWidth, maxTime);

            for (let i = animObjects.length - 1; i >= 0; i--) {
                const obj = animObjects[i];

                const header = document.createElement('div');
                header.className = 'track-header track-object-header';
                header.dataset.objId = obj.id;
                if (!isObjectTrackVisible(obj)) header.classList.add('is-hidden');
                header.title = getObjectDisplayTitle(obj);

                const topRow = document.createElement('div');
                topRow.className = 'track-header-top';

                const reorderHandle = document.createElement('button');
                reorderHandle.type = 'button';
                reorderHandle.className = 'track-reorder-handle';
                reorderHandle.title = 'Drag to reorder layer';
                reorderHandle.setAttribute('aria-label', `Reorder ${obj.name}`);
                reorderHandle.textContent = '||';
                reorderHandle.onmousedown = (event) => handleTrackReorderMouseDown(event, obj.id);
                reorderHandle.onclick = (event) => event.stopPropagation();

                const visibilityBtn = document.createElement('button');
                visibilityBtn.type = 'button';
                visibilityBtn.className = 'track-visibility-btn';
                visibilityBtn.dataset.objId = obj.id;
                if (!isObjectTrackVisible(obj)) visibilityBtn.classList.add('is-hidden');
                visibilityBtn.title = isObjectTrackVisible(obj) ? 'Hide object' : 'Show object';
                visibilityBtn.innerHTML = getTrackVisibilityIcon(isObjectTrackVisible(obj));
                visibilityBtn.onclick = (event) => {
                    event.stopPropagation();
                    toggleTrackObjectVisibility(obj.id);
                };

                const nameWrap = document.createElement('div');
                nameWrap.className = 'track-object-name-wrap';
                const nameEl = document.createElement('span');
                nameEl.className = 'track-object-name';
                nameEl.textContent = obj.name;
                nameWrap.appendChild(nameEl);
                topRow.appendChild(reorderHandle);
                topRow.appendChild(visibilityBtn);
                topRow.appendChild(nameWrap);
                header.appendChild(topRow);
                const noteSummary = getObjectNoteSummary(obj.note, 24);
                if (noteSummary) {
                    const noteEl = document.createElement('span');
                    noteEl.className = 'track-object-note';
                    noteEl.textContent = noteSummary;
                    header.appendChild(noteEl);
                }
                header.onclick   = () => selectObject(obj.id);

                const framesArea = document.createElement('div');
                framesArea.className  = 'track-frames';
                framesArea.style.width = `${trackWidth}px`;
                obj.keyframes.forEach((kf, idx) => framesArea.appendChild(buildKfNode(kf, idx, obj)));

                const row = document.createElement('div');
                row.className   = 'track-row';
                if (noteSummary) row.classList.add('has-note');
                row.dataset.objId = obj.id;
                row.style.width = `${trackWidth + HEADER_WIDTH}px`;
                if (obj.id === selectedObjectId) row.classList.add('active-track');
                row.appendChild(header);
                row.appendChild(framesArea);
                tracksContainer.appendChild(row);
            }
        }

        // --- 手動刷洗時間軸 (Scrubbing) ---
        rulerRow.addEventListener('mousedown', (e) => {
            if (playState.isPlaying || animObjects.length === 0) return;
            scrubState.isScrubbing = true;
            scrubTimeDisplay.style.display = 'block';
            exitEditingFrameMode(); 
            handleScrub(e);
        });

        tracksContainer.addEventListener('mousedown', (e) => {
            if (playState.isPlaying || e.button !== 0) return;
            if (e.target.closest('.kf-node') || e.target.closest('.track-header')) return;
            if (!e.target.closest('.track-frames')) return;

            e.preventDefault();
            startMarqueeSelection(e);
        });

        function handleScrub(e) {
            const rect = rulerTicks.getBoundingClientRect();
            let x = e.clientX - rect.left;
            x = Math.max(0, x); 
            
            let time = timelineXToTime(x);
            time = Math.round(time * 100) / 100;
            
            seekToTime(time);
        }

        function seekToTime(time) {
            playState.currentTime = time;
            playhead.style.display = 'block';
            updatePlayheadPosition();
            scrubTimeDisplay.innerText = `${time.toFixed(2)}s`;

            animObjects.forEach(obj => {
                if (obj.keyframes.length === 0) return;
                const pose = interpolatePose(obj.keyframes, time);
                if (!pose) return;
                applyPoseToDOM(obj.domWrapper, pose);
                obj.currentPose = { ...pose };
                if (obj.id === selectedObjectId && selectedKeyframeIndex === null) syncInputsWithState(pose);
            });
            refreshTrackVisibilityIndicators();
        }

        // --- 全域事件監聽 (拖曳與刷洗) ---
        document.addEventListener('mousemove', (e) => {
            if (scrubState.isScrubbing) {
                handleScrub(e);
            }

            if (marqueeState.isSelecting) {
                updateMarqueeSelection(e);
            }

            if (trackReorderDrag.isDragging) {
                if (Math.abs(e.clientY - trackReorderDrag.startY) > 3) {
                    trackReorderDrag.hasMoved = true;
                }
                if (trackReorderDrag.hasMoved) {
                    trackReorderDrag.insertionIndex = getTrackReorderInsertionIndex(e.clientY);
                }
                updateTrackReorderIndicators();
            }

            if (kfDrag.isDragging) {
                if (Math.abs(e.clientX - kfDrag.startX) > 3 && !kfDrag.hasMoved) {
                    kfDrag.hasMoved = true;
                    kfDrag.dragTargets.forEach(t => t.nodeEl?.classList.add('dragging'));
                }
                if (kfDrag.hasMoved) {
                    const dx = e.clientX - kfDrag.startX;
                    kfDrag.dragTargets.forEach(target => {
                        if (!target.nodeEl) return;
                        let newTime = target.startTime + timelineXToTime(dx);
                        newTime = Math.max(0, newTime);
                        target.nodeEl.style.left = `${timeToTimelineX(newTime)}px`;
                        target.nodeEl.title = `時間: ${newTime.toFixed(2)}s`;
                    });
                }
            }
            
            if (drag.isDragging && selectedObjectId !== null) {
                const obj = getSelectedObjectData();
                if (!obj) { drag.isDragging = false; return; }
                const displayScale = getCanvasDisplayScale();
                obj.currentPose.x = drag.objX + (e.clientX - drag.sx) / displayScale;
                obj.currentPose.y = drag.objY - (e.clientY - drag.sy) / displayScale;
                syncInputsWithState(obj.currentPose); applyPoseToDOM(obj.domWrapper, obj.currentPose);
            }
        });

        document.addEventListener('mouseup', (e) => {
            if (scrubState.isScrubbing) {
                scrubState.isScrubbing = false;
                scrubTimeDisplay.style.display = 'none';
            }

            if (trackReorderDrag.isDragging) {
                const dragResult = { ...trackReorderDrag };
                trackReorderDrag = { isDragging: false, hasMoved: false, objId: null, startY: 0, insertionIndex: -1 };
                document.body.classList.remove('is-dragging-track-reorder');
                clearTrackReorderIndicators();

                if (dragResult.hasMoved) {
                    moveLayerToDisplayInsertionIndex(dragResult.objId, dragResult.insertionIndex);
                } else if (dragResult.objId !== null) {
                    selectObject(dragResult.objId);
                }
            }

            if (marqueeState.isSelecting) {
                if (!marqueeState.hasMoved) {
                    updateMarqueeSelection(e);
                }
                finishMarqueeSelection();
            }

            if (kfDrag.isDragging) {
                kfDrag.isDragging = false;
                kfDrag.dragTargets.forEach(t => t.nodeEl?.classList.remove('dragging'));

                if (kfDrag.hasMoved) {
                    const dx = e.clientX - kfDrag.startX;
                    const affectedObjIds = new Set();

                    // 套用新時間
                    kfDrag.dragTargets.forEach(target => {
                        const targetObj = animObjects.find(o => o.id === target.objId);
                        if (!targetObj || !targetObj.keyframes[target.kfIndex]) return;
                        let newTime = target.startTime + timelineXToTime(dx);
                        newTime = Math.max(0, Math.round(newTime * 100) / 100);
                        targetObj.keyframes[target.kfIndex].time = newTime;
                        target.newTime = newTime;
                        affectedObjIds.add(target.objId);
                    });

                    // 排序後找回新索引，更新 selectedKeyframes
                    const newSelected = [];
                    affectedObjIds.forEach(objId => {
                        const targetObj = animObjects.find(o => o.id === objId);
                        if (!targetObj) return;
                        targetObj.keyframes.sort((a, b) => a.time - b.time);
                        kfDrag.dragTargets.filter(t => t.objId === objId).forEach(target => {
                            if (target.newTime !== undefined) {
                                const newIdx = targetObj.keyframes.findIndex(kf => kf.time === target.newTime);
                                if (newIdx >= 0) newSelected.push({ objId, kfIndex: newIdx });
                            }
                        });
                    });
                    // 保留未被移動的物件的選取狀態
                    selectedKeyframes.filter(s => !affectedObjIds.has(s.objId)).forEach(s => newSelected.push(s));
                    selectedKeyframes = newSelected;

                    if (selectedKeyframeIndex !== null) resetSnapshotMode();
                    updateUIState();
                    updateMultiSelectUI();
                } else {
                    // 點擊（沒有移動）：進入單格編輯模式（selectObject 要先呼叫，否則會清掉 selectedKeyframes）
                    if (selectedObjectId !== kfDrag.objId) selectObject(kfDrag.objId);
                    selectedKeyframes = [{ objId: kfDrag.objId, kfIndex: kfDrag.kfIndex }];
                    enterEditingFrameMode(kfDrag.kfIndex);
                }
                kfDrag.nodeEl = null;
                kfDrag.dragTargets = [];
            }

            if (drag.isDragging) drag.isDragging = false;
        });


