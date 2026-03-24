        // --- 📸 影格快門管理 ---
        document.addEventListener('keydown', (e) => {
            const tagName = e.target?.tagName?.toLowerCase?.() || '';
            if (['input', 'textarea', 'select'].includes(tagName)) return;

            const selection = getActiveKeyframeSelection();
            if (e.key === 'PageUp') {
                e.preventDefault();
                jumpToPreviousKeyframe();
                return;
            }
            if (e.key === 'PageDown') {
                e.preventDefault();
                jumpToNextKeyframe();
                return;
            }
            if (e.code === 'Space') {
                e.preventDefault();
                if (playState.isPlaying) stopAnimation();
                else playAllObjects();
                return;
            }
            if ((e.key === 'Delete' || e.key === 'Backspace') && selection.length > 0) {
                e.preventDefault();
                deleteSelectedKeyframe();
                return;
            }

            if (!(e.ctrlKey || e.metaKey)) return;

            const key = e.key.toLowerCase();
            if (key === 'c') {
                if (selection.length === 0) return;
                e.preventDefault();
                copySelectedKeyframes();
                return;
            }

            if (key === 'v') {
                if (!keyframeClipboard || keyframeClipboard.items.length === 0) return;
                e.preventDefault();
                pasteCopiedKeyframes();
            }
        });

        function resetSnapshotMode() {
            selectedKeyframeIndex = null;
            btnSnapshot.innerText = '📸 記錄為新影格';
            btnSnapshot.classList.remove('update-mode');
            updateHint.style.display = 'none';
            intervalInput.value = 0.5;
        }

        function handleSnapshotAction() {
            if (selectedKeyframeIndex !== null) updateSelectedKeyframe();
            else recordNewSnapshot();
        }

        function recordNewSnapshot() {
            const obj = getSelectedObjectData();
            if (!obj) return;
            const newTime = Math.max(0, Math.round((playState.currentTime || 0) * 100) / 100);
            const text = obj.type === TEXT_TYPE ? normalizeKeyframeText(obj.textData?.text) : null;

            const currentPose = clonePose(obj.currentPose || getInputPoseValues());
            const existingIndex = obj.keyframes.findIndex(kf => Math.abs(kf.time - newTime) < 0.0001);
            const currentKeyframe = { time: newTime, ...currentPose };
            if (text !== null) currentKeyframe.text = text;
            if (existingIndex >= 0) {
                obj.keyframes[existingIndex] = normalizeKeyframe(currentKeyframe);
                obj.currentPose = { ...currentPose };
                selectedKeyframes = [{ objId: obj.id, kfIndex: existingIndex }];
                enterEditingFrameMode(existingIndex);
                return;
            }

            obj.keyframes.push(normalizeKeyframe(currentKeyframe));
            obj.keyframes.sort((a, b) => a.time - b.time);
            const insertedIndex = obj.keyframes.findIndex(kf => Math.abs(kf.time - newTime) < 0.0001);
            obj.currentPose = { ...currentPose };
            selectedKeyframes = insertedIndex >= 0 ? [{ objId: obj.id, kfIndex: insertedIndex }] : [];
            enterEditingFrameMode(insertedIndex >= 0 ? insertedIndex : obj.keyframes.length - 1);
        }

        function enterEditingFrameMode(index) {
            if (playState.isPlaying) stopAnimation();
            const obj = getSelectedObjectData();
            if (!obj || !obj.keyframes[index]) return;

            selectedKeyframeIndex = index;
            const targetKf = obj.keyframes[index];
            seekToTime(targetKf.time);
            centerTimelineOnTime(targetKf.time);

            applyPoseToDOM(obj.domWrapper, targetKf);
            syncInputsWithState(targetKf);

            let currentInterval = targetKf.time;
            if (index > 0) currentInterval = targetKf.time - obj.keyframes[index - 1].time;
            intervalInput.value = currentInterval.toFixed(2);

            btnSnapshot.innerText = `🔄 更新影格 (${targetKf.time.toFixed(2)}s)`;
            btnSnapshot.classList.add('update-mode');
            
            updateUIState(); 
            updateHint.style.display = 'block';
        }

        function exitEditingFrameMode() {
            if (selectedKeyframeIndex === null && selectedKeyframes.length === 0) return;
            selectedKeyframes = [];
            resetSnapshotMode();
            updateMultiSelectUI();
            updateUIState();
        }

        function updateSelectedKeyframe() {
            const obj = getSelectedObjectData();
            if (!obj || selectedKeyframeIndex === null) return;

            const editedPose = getInputPoseValues();
            const text = obj.type === TEXT_TYPE ? normalizeKeyframeText(obj.textData?.text) : null;
            const oldTime = obj.keyframes[selectedKeyframeIndex].time;
            const newInterval = Math.max(0, parseFloat(intervalInput.value) || 0);

            let newTime;
            if (selectedKeyframeIndex === 0) {
                newTime = newInterval; // 第一格允許從任意非負時間開始
            } else {
                const prevTime = obj.keyframes[selectedKeyframeIndex - 1].time;
                newTime = prevTime + Math.max(newInterval, 0.01); // 修復 Bug 1+3：確保嚴格大於前一格且非負
            }
            newTime = Math.max(0, Math.round(newTime * 100) / 100);
            const timeDiff = newTime - oldTime;

            const updatedKeyframe = { time: newTime, ...editedPose };
            if (text !== null) updatedKeyframe.text = text;
            obj.keyframes[selectedKeyframeIndex] = normalizeKeyframe(updatedKeyframe);
            for (let i = selectedKeyframeIndex + 1; i < obj.keyframes.length; i++) {
                obj.keyframes[i].time = Math.max(0, obj.keyframes[i].time + timeDiff);
            }

            obj.currentPose = { ...editedPose }; 
            exitEditingFrameMode();
        }

        function deleteSelectedKeyframe() {
            const toDelete = selectedKeyframes.length > 0
                ? [...selectedKeyframes]
                : (selectedKeyframeIndex !== null ? [{ objId: selectedObjectId, kfIndex: selectedKeyframeIndex }] : []);
            if (toDelete.length === 0) return;

            // 同一物件內按降序刪除，避免索引錯位
            const grouped = {};
            toDelete.forEach(({ objId, kfIndex }) => {
                if (!grouped[objId]) grouped[objId] = [];
                grouped[objId].push(kfIndex);
            });
            Object.entries(grouped).forEach(([objId, indices]) => {
                const obj = animObjects.find(o => o.id === Number(objId));
                if (!obj) return;
                indices.sort((a, b) => b - a).forEach(i => obj.keyframes.splice(i, 1));
            });

            selectedKeyframes = [];
            resetSnapshotMode();
            updateMultiSelectUI();
            updateUIState();
        }

        function applyPoseToDOM(domWrapper, pose) {
            const trackVisible = domWrapper?.dataset?.trackVisible !== 'false';
            const finalVisible = trackVisible && pose.visible !== false;
            domWrapper.style.transform = `translate(calc(-50% + ${pose.x}px), calc(-50% + ${-pose.y}px)) rotate(${pose.rot}deg) scale(${pose.scale})`;
            domWrapper.style.opacity = pose.opacity;
            domWrapper.style.visibility = finalVisible ? 'visible' : 'hidden';
            domWrapper.style.pointerEvents = (finalVisible && !domWrapper.classList.contains('iso-canvas-dimmed')) ? 'auto' : 'none';
            const effects = normalizePoseEffects(pose);
            domWrapper.style.mixBlendMode = effects.blendMode;
            const tint = effects.tint;
            const filters = [];
            if (domWrapper.tintFloodNode) {
                domWrapper.tintFloodNode.setAttribute('flood-color', tint);
                domWrapper.tintFloodNode.setAttribute('flood-opacity', (effects.tintStrength / 100).toFixed(2));
            }
            if (effects.tintStrength > 0 && tint !== DEFAULT_TINT) {
                filters.push(`url(#${domWrapper.dataset.tintFilterId})`);
            }
            if (effects.hue !== DEFAULT_HUE) {
                filters.push(`hue-rotate(${effects.hue}deg)`);
            }
            if (effects.brightness !== DEFAULT_BRIGHTNESS) {
                filters.push(`brightness(${(effects.brightness / 100).toFixed(2)})`);
            }
            if (effects.contrast !== DEFAULT_CONTRAST) {
                filters.push(`contrast(${(effects.contrast / 100).toFixed(2)})`);
            }
            if (domWrapper.contentLayer) {
                domWrapper.contentLayer.style.filter = filters.length > 0 ? filters.join(' ') : 'none';
                domWrapper.contentLayer.style.mixBlendMode = 'normal';
            }
        }

        function syncInputsWithState(pose) {
            const effects = normalizePoseEffects(pose);
            inputs.x.value = Math.round(pose.x); inputs.y.value = Math.round(pose.y);
            inputs.rot.value = Math.round(pose.rot); inputs.scale.value = parseFloat(pose.scale.toFixed(2));
            inputs.opacity.value = parseFloat(pose.opacity.toFixed(2));
            inputs.tint.value = effects.tint;
            inputs.tintStrength.value = Math.round(effects.tintStrength);
            inputs.hue.value = Math.round(effects.hue);
            inputs.brightness.value = Math.round(effects.brightness);
            inputs.contrast.value = Math.round(effects.contrast);
            inputs.blendMode.value = effects.blendMode;
        }

        // --- 畫布拖拉起點 ---
        function onObjectMouseDown(e) {
            if (playState.isPlaying) return;
            const wrap = e.currentTarget;
            if (isoObjectId !== null && Number(wrap.dataset.objId) !== isoObjectId) return;
            if (wrap.dataset.objId !== String(selectedObjectId)) return; 

            const objData = getSelectedObjectData();
            if (!objData) return;
            drag.isDragging = true; drag.sx = e.clientX; drag.sy = e.clientY;
            drag.objX = objData.currentPose.x; drag.objY = objData.currentPose.y;

            e.preventDefault(); e.stopPropagation();
        }

        // --- 播放邏輯 ---
        const lerp = (start, end, t) => start + (end - start) * t;

        function interpolatePose(kfs, time) {
            if (kfs.length === 0) return null;
            if (kfs.length === 1 || time <= kfs[0].time) return { ...kfs[0] };
            if (time >= kfs[kfs.length - 1].time) return { ...kfs[kfs.length - 1] };
            for (let i = 0; i < kfs.length - 1; i++) {
                if (time >= kfs[i].time && time <= kfs[i + 1].time) {
                    const t = (time - kfs[i].time) / (kfs[i + 1].time - kfs[i].time);
                    return {
                        x:       lerp(kfs[i].x,       kfs[i + 1].x,       t),
                        y:       lerp(kfs[i].y,       kfs[i + 1].y,       t),
                        rot:     lerp(kfs[i].rot,     kfs[i + 1].rot,     t),
                        scale:   lerp(kfs[i].scale,   kfs[i + 1].scale,   t),
                        opacity: lerp(kfs[i].opacity, kfs[i + 1].opacity, t),
                        visible: t < 1 ? (kfs[i].visible !== false) : (kfs[i + 1].visible !== false),
                        tint:    lerpTint(kfs[i].tint || DEFAULT_TINT, kfs[i + 1].tint || DEFAULT_TINT, t),
                        tintStrength: lerp(getNum(kfs[i].tintStrength, DEFAULT_TINT_STRENGTH), getNum(kfs[i + 1].tintStrength, DEFAULT_TINT_STRENGTH), t),
                        hue:     lerp(getNum(kfs[i].hue, DEFAULT_HUE), getNum(kfs[i + 1].hue, DEFAULT_HUE), t),
                        brightness: lerp(getNum(kfs[i].brightness, DEFAULT_BRIGHTNESS), getNum(kfs[i + 1].brightness, DEFAULT_BRIGHTNESS), t),
                        contrast: lerp(getNum(kfs[i].contrast, DEFAULT_CONTRAST), getNum(kfs[i + 1].contrast, DEFAULT_CONTRAST), t),
                        blendMode: normalizeBlendMode(kfs[i].blendMode)
                    };
                }
            }
            return null;
        }

        function playAllObjects() {
            if (animObjects.length === 0 || playState.isPlaying) return;
            let hasFrames = false; let maxDuration = 0;
            animObjects.forEach(obj => {
                if (obj.keyframes.length > 0) {
                    hasFrames = true;
                    maxDuration = Math.max(maxDuration, obj.keyframes[obj.keyframes.length - 1].time);
                }
                if (obj.type === SPINE_TYPE) {
                    hasFrames = true;
                    maxDuration = Math.max(maxDuration, obj.spineData?.animationDuration || 3);
                }
            });
            if (!hasFrames) { alert("無影格可播放"); return; }

            playState.totalDuration = maxDuration === 0 ? 0.5 : maxDuration;
            
            // [修復 Bug 3] 如果播到底了，從頭開始；否則從現在位置開始
            if (playState.currentTime >= playState.totalDuration) {
                playState.currentTime = 0;
            }

            playState.isPlaying = true;
            btnPlay.style.display = 'none'; btnStop.style.display = 'block';
            
            canvas.style.pointerEvents = 'none'; propsPanel.parentElement.style.opacity = 0.4;
            document.querySelectorAll('.panel-section button:not(.btn-play):not(.btn-danger):not(.section-toggle):not(.subsection-toggle)').forEach(b => b.disabled = true);
            exitEditingFrameMode();

            playhead.style.display = 'block';
            
            // [修復 Bug 3] 扣除已經播放過的時間
            playState.startTime = performance.now() - (playState.currentTime * 1000);
            playState.animationFrameId = requestAnimationFrame(animationLoop);
        }

        function stopAnimation() {
            if (!playState.isPlaying) return;
            playState.isPlaying = false;
            btnPlay.style.display = 'block'; btnStop.style.display = 'none';
            cancelAnimationFrame(playState.animationFrameId);

            canvas.style.pointerEvents = 'auto'; propsPanel.parentElement.style.opacity = 1;
            
            // [修復 Bug 4] 先盲解鎖所有按鈕，立刻呼叫 updateUIState 套用正確狀態邏輯
            document.querySelectorAll('.panel-section button:not(.btn-play):not(.btn-danger):not(.section-toggle):not(.subsection-toggle)').forEach(b => b.disabled = false);
            updateUIState(); 
            
            // 讓物件停留在暫停的瞬間
            seekToTime(playState.currentTime);
            
            // 恢復當前選取物件的輸入框，且不破壞剛剛的 currentPose 緩存
            const selObj = getSelectedObjectData();
            if (selectedObjectId !== null && selectedKeyframeIndex === null && selObj) {
                syncInputsWithState(selObj.currentPose);
            }
            animObjects.forEach(obj => {
                if (obj.type === SPINE_TYPE && obj.spineState) {
                    obj.spineState.previewStartedAt = performance.now() - (playState.currentTime * 1000);
                }
            });
        }

        function animationLoop(now) {
            if (!playState.isPlaying) return;
            const t_app = (now - playState.startTime) / 1000;
            
            // 更新狀態機中的時間，讓暫停功能知道現在播到哪
            playState.currentTime = t_app; 

            updatePlayheadPosition();

            animObjects.forEach(obj => {
                if (obj.keyframes.length === 0) return;
                const pose = interpolatePose(obj.keyframes, t_app);
                if (pose) {
                    applyPoseToDOM(obj.domWrapper, pose);
                    obj.currentPose = { ...pose };
                    syncTextObjectFromKeyframes(obj, t_app);
                }
            });
            refreshTrackVisibilityIndicators();

            if (t_app >= playState.totalDuration) {
                playState.currentTime = playState.totalDuration;
                stopAnimation();
            } else {
                playState.animationFrameId = requestAnimationFrame(animationLoop);
            }
        }

