        async function buildBitmapFontData(files) {
            const fontFile = files.find(file => file.name.toLowerCase().endsWith('.fnt'));
            if (!fontFile) {
                throw new Error('FNT import requires a .fnt file.');
            }

            const sourcePath = normalizePath(fontFile.webkitRelativePath || fontFile.name);
            const parsedFont = parseBitmapFontContent(await readFileAsText(fontFile), sourcePath);
            const pageEntries = Object.values(parsedFont.pages || {});
            if (pageEntries.length === 0) {
                throw new Error('The .fnt file does not define any texture pages.');
            }

            for (const page of pageEntries) {
                const pageFile = findBitmapFontPageFile(files, page.file, page.assetPath);
                if (!pageFile) {
                    throw new Error(`Missing bitmap font page image: ${page.file}`);
                }
                page.mimeType = guessMimeTypeFromFilename(pageFile.name);
                page.src = await readFileAsDataURL(pageFile);
            }

            if (Object.keys(parsedFont.chars || {}).length === 0) {
                throw new Error('The .fnt file does not contain any character metrics.');
            }

            return cloneBitmapFontData(parsedFont);
        }
        const getBitmapFontKerning = (bitmapFont, firstCode, secondCode) => getNum(bitmapFont?.kernings?.[`${firstCode}:${secondCode}`], 0);
        let floatingPanelDrag = { isDragging: false, panelEl: null, offsetX: 0, offsetY: 0 };
        function syncTextObjectName(obj) {
            if (!obj || obj.type !== TEXT_TYPE) return;
            obj.name = buildTextObjectName(obj.textData?.text);
        }
        function renderPlainTextObject(obj) {
            const textData = normalizeTextData(obj.textData);
            obj.textData = textData;
            obj.textElement.innerHTML = '';
            obj.textElement.classList.remove('bitmap-mode');
            obj.textElement.textContent = textData.text || ' ';
            obj.textElement.style.color = textData.color;
            obj.textElement.style.fontFamily = textData.fontFamily;
            obj.textElement.style.fontSize = `${textData.size}px`;
            obj.textElement.style.lineHeight = `${textData.lineHeight}px`;
            obj.textElement.style.letterSpacing = `${textData.letterSpacing}px`;
            obj.textElement.style.textAlign = textData.align;
            obj.textElement.style.width = 'auto';
            obj.textElement.style.height = 'auto';
        }
        function renderBitmapTextObject(obj) {
            const textData = normalizeTextData(obj.textData);
            const bitmapFont = textData.bitmapFont;
            if (!bitmapFont) {
                renderPlainTextObject(obj);
                return;
            }

            obj.textData = textData;
            obj.textElement.innerHTML = '';
            obj.textElement.classList.add('bitmap-mode');
            obj.textElement.style.color = '';
            obj.textElement.style.fontFamily = '';
            obj.textElement.style.fontSize = '';
            obj.textElement.style.lineHeight = '';
            obj.textElement.style.letterSpacing = '';
            obj.textElement.style.textAlign = '';

            const fontLineHeight = Math.max(1, getNum(bitmapFont.lineHeight, DEFAULT_TEXT_SIZE));
            const scale = textData.size / fontLineHeight;
            const lineAdvance = Math.max(1, getNum(textData.lineHeight, textData.size));
            const logicalLetterSpacing = scale === 0 ? 0 : (textData.letterSpacing / scale);
            const lines = String(textData.text || '').replace(/\r\n/g, '\n').split('\n');
            const fallbackGlyph = bitmapFont.chars?.['63'] || null;
            const layoutLines = [];
            let maxWidth = 0;

            lines.forEach((lineText, lineIndex) => {
                const glyphs = [];
                let penX = 0;
                let prevCode = null;
                let minX = 0;
                let maxX = 0;
                Array.from(lineText).forEach((char) => {
                    const code = char.codePointAt(0);
                    const glyph = bitmapFont.chars?.[String(code)] || fallbackGlyph;
                    const kerning = prevCode === null ? 0 : getBitmapFontKerning(bitmapFont, prevCode, code);
                    penX += kerning;
                    if (glyph) {
                        const glyphX = penX + glyph.xoffset;
                        const glyphRight = glyphX + glyph.width;
                        minX = Math.min(minX, glyphX);
                        maxX = Math.max(maxX, glyphRight);
                        glyphs.push({
                            page: bitmapFont.pages?.[String(glyph.page)] || null,
                            x: glyphX,
                            y: (lineIndex * lineAdvance / scale) + glyph.yoffset,
                            width: glyph.width,
                            height: glyph.height,
                            textureX: glyph.x,
                            textureY: glyph.y
                        });
                        penX += glyph.xadvance;
                    } else {
                        penX += fontLineHeight * 0.5;
                    }
                    penX += logicalLetterSpacing;
                    prevCode = code;
                });
                const logicalWidth = glyphs.length > 0 ? (maxX - minX) : 0;
                const scaledWidth = logicalWidth * scale;
                maxWidth = Math.max(maxWidth, scaledWidth);
                layoutLines.push({
                    glyphs,
                    minX,
                    width: scaledWidth
                });
            });

            const totalHeight = Math.max(
                textData.size,
                ((Math.max(lines.length, 1) - 1) * lineAdvance) + textData.size
            );
            obj.textElement.style.width = `${Math.max(1, Math.ceil(maxWidth))}px`;
            obj.textElement.style.height = `${Math.max(1, Math.ceil(totalHeight))}px`;

            layoutLines.forEach((line) => {
                const alignOffset = textData.align === 'right'
                    ? (maxWidth - line.width)
                    : (textData.align === 'center' ? (maxWidth - line.width) / 2 : 0);
                line.glyphs.forEach((glyph) => {
                    if (!glyph.page?.src || glyph.width <= 0 || glyph.height <= 0) return;
                    const glyphEl = document.createElement('div');
                    glyphEl.className = 'text-object-glyph';
                    glyphEl.style.left = `${Math.round(alignOffset + ((glyph.x - line.minX) * scale))}px`;
                    glyphEl.style.top = `${Math.round(glyph.y * scale)}px`;
                    glyphEl.style.width = `${Math.max(1, Math.round(glyph.width * scale))}px`;
                    glyphEl.style.height = `${Math.max(1, Math.round(glyph.height * scale))}px`;
                    glyphEl.style.backgroundImage = `url("${glyph.page.src}")`;
                    glyphEl.style.backgroundPosition = `-${glyph.textureX * scale}px -${glyph.textureY * scale}px`;
                    glyphEl.style.backgroundSize = `${bitmapFont.scaleW * scale}px ${bitmapFont.scaleH * scale}px`;
                    obj.textElement.appendChild(glyphEl);
                });
            });
        }
        function syncTextElement(obj) {
            if (!obj?.textElement) return;
            obj.textData = normalizeTextData(obj.textData);
            if (obj.textData.bitmapFont) renderBitmapTextObject(obj);
            else renderPlainTextObject(obj);
        }

        function getKeyframeTextContentAtTime(keyframes, time, fallbackText = DEFAULT_TEXT_CONTENT) {
            let resolvedText = normalizeKeyframeText(fallbackText);
            const targetTime = Math.max(0, getNum(time, 0));
            (keyframes || []).forEach((kf) => {
                if (!kf || kf.time > targetTime) return;
                if (Object.prototype.hasOwnProperty.call(kf, 'text')) {
                    resolvedText = normalizeKeyframeText(kf.text);
                }
            });
            return resolvedText;
        }

        function syncTextObjectFromKeyframes(obj, time) {
            if (!obj || obj.type !== TEXT_TYPE) return false;
            const nextText = getKeyframeTextContentAtTime(obj.keyframes || [], time, obj.textData?.text);
            if (nextText === String(obj.textData?.text ?? '')) return false;

            obj.textData = normalizeTextData({
                ...obj.textData,
                text: nextText
            });
            syncTextElement(obj);

            if (obj.id === selectedObjectId && selectedKeyframeIndex === null) {
                updateTextPanel(obj);
            }
            return true;
        }

        const tintFilterSvg = document.createElementNS(SVG_NS, 'svg');
        tintFilterSvg.setAttribute('width', '0');
        tintFilterSvg.setAttribute('height', '0');
        tintFilterSvg.style.position = 'absolute';
        tintFilterSvg.style.pointerEvents = 'none';
        tintFilterSvg.style.opacity = '0';
        const tintFilterDefs = document.createElementNS(SVG_NS, 'defs');
        tintFilterSvg.appendChild(tintFilterDefs);
        document.body.appendChild(tintFilterSvg);

        function getCanvasDisplayScale() {
            const cameraPose = getCurrentCameraPose?.() || DEFAULT_CAMERA_POSE;
            const cameraScale = Math.max(0.01, getNum(cameraPose?.scale, 1));
            return (outputMask.enabled ? canvasZoom * canvasViewportBaseScale : canvasZoom) * cameraScale;
        }

        function clearOutputMask() {
            outputMask.enabled = false;
            updateCanvasMaskLayout();
        }

        function updateOutputMaskStatus() {
            if (outputMask.enabled) {
                outputMaskWidthInput.value = outputMask.width;
                outputMaskHeightInput.value = outputMask.height;
                outputMaskStatus.innerText = `目前遮罩：${outputMask.width} x ${outputMask.height}`;
            } else {
                outputMaskWidthInput.value = '';
                outputMaskHeightInput.value = '';
                outputMaskStatus.innerText = '目前未啟用遮罩';
            }
        }

        function updateCanvasViewportTransform() {
            const cameraPose = getCurrentCameraPose?.() || DEFAULT_CAMERA_POSE;
            const cameraScale = Math.max(0.01, getNum(cameraPose?.scale, 1));
            const cameraX = getNum(cameraPose?.x, 0);
            const cameraY = getNum(cameraPose?.y, 0);
            const cameraRot = getNum(cameraPose?.rot, 0);
            const viewportScale = (outputMask.enabled ? canvasViewportBaseScale : canvasZoom) * cameraScale;
            if (outputMask.enabled) {
                canvasMaskFrame.style.transform = `translate(-50%, -50%) scale(${canvasZoom})`;
                canvasViewport.style.transform = `translate(calc(-50% + ${cameraX}px), calc(-50% + ${cameraY}px)) rotate(${cameraRot}deg) scale(${viewportScale})`;
            } else {
                canvasMaskFrame.style.transform = 'translate(-50%, -50%)';
                canvasViewport.style.transform = `translate(calc(-50% + ${cameraX}px), calc(-50% + ${cameraY}px)) rotate(${cameraRot}deg) scale(${viewportScale})`;
            }
            zoomDisplay.innerText = `${Math.round(canvasZoom * 100)}%`;
        }

        function updateCanvasMaskLayout() {
            const canvasWidth = Math.max(1, canvas.clientWidth);
            const canvasHeight = Math.max(1, canvas.clientHeight);
            let logicalWidth = canvasWidth;
            let logicalHeight = canvasHeight;
            let frameWidth = canvasWidth;
            let frameHeight = canvasHeight;
            canvasViewportBaseScale = 1;

            if (outputMask.enabled) {
                logicalWidth = outputMask.width;
                logicalHeight = outputMask.height;
                const framePadding = 40;
                canvasViewportBaseScale = Math.max(
                    0.05,
                    Math.min(
                        (canvasWidth - framePadding) / logicalWidth,
                        (canvasHeight - framePadding) / logicalHeight
                    )
                );
                frameWidth = logicalWidth * canvasViewportBaseScale;
                frameHeight = logicalHeight * canvasViewportBaseScale;
                canvasMaskFrame.classList.add('mask-enabled');
                canvasMaskLabel.innerText = `${logicalWidth} x ${logicalHeight}`;
            } else {
                canvasMaskFrame.classList.remove('mask-enabled');
                canvasMaskLabel.innerText = '';
            }

            canvasMaskFrame.style.width = `${frameWidth}px`;
            canvasMaskFrame.style.height = `${frameHeight}px`;
            canvasViewport.style.width = `${logicalWidth}px`;
            canvasViewport.style.height = `${logicalHeight}px`;
            updateCanvasViewportTransform();
            updateOutputMaskStatus();
        }

        function applyOutputMask() {
            const width = Math.round(Number(outputMaskWidthInput.value));
            const height = Math.round(Number(outputMaskHeightInput.value));
            if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
                alert('請分別輸入有效的 width 與 height，例如 1920 和 1080。');
                return;
            }
            outputMask = { enabled: true, width, height };
            updateCanvasMaskLayout();
        }

        function setSidebarSectionCollapsed(sectionId, collapsed, persist = true) {
            const section = document.querySelector(`.panel-section[data-section-id="${sectionId}"]`);
            if (!section) return;

            section.classList.toggle('is-collapsed', collapsed);
            const toggleBtn = section.querySelector('.section-toggle');
            if (toggleBtn) {
                toggleBtn.textContent = collapsed ? '展開' : '收合';
                toggleBtn.setAttribute('aria-expanded', String(!collapsed));
            }

            if (persist) {
                sidebarSectionState[sectionId] = collapsed;
                saveSidebarSectionState();
            }
        }

        function toggleSidebarSection(sectionId) {
            const section = document.querySelector(`.panel-section[data-section-id="${sectionId}"]`);
            if (!section) return;
            setSidebarSectionCollapsed(sectionId, !section.classList.contains('is-collapsed'));
        }

        function initializeSidebarSections() {
            document.querySelectorAll('.panel-section[data-section-id]').forEach(section => {
                const sectionId = section.dataset.sectionId;
                setSidebarSectionCollapsed(sectionId, !!sidebarSectionState[sectionId], false);
            });
        }

        function setSidebarSubsectionCollapsed(subsectionId, collapsed, persist = true) {
            const subsection = document.querySelector(`.subpanel-section[data-subsection-id="${subsectionId}"]`);
            if (!subsection) return;

            subsection.classList.toggle('is-collapsed', collapsed);
            const toggleBtn = subsection.querySelector('.subsection-toggle');
            if (toggleBtn) {
                toggleBtn.textContent = collapsed ? '展開' : '收合';
                toggleBtn.setAttribute('aria-expanded', String(!collapsed));
            }

            if (persist) {
                sidebarSubsectionState[subsectionId] = collapsed;
                saveSidebarSubsectionState();
            }
        }

        function toggleSidebarSubsection(subsectionId) {
            const subsection = document.querySelector(`.subpanel-section[data-subsection-id="${subsectionId}"]`);
            if (!subsection) return;
            setSidebarSubsectionCollapsed(subsectionId, !subsection.classList.contains('is-collapsed'));
        }

        function createSidebarSubpanel(subsectionId, title) {
            const wrapper = document.createElement('div');
            wrapper.className = 'subpanel-section';
            wrapper.dataset.subsectionId = subsectionId;

            const header = document.createElement('div');
            header.className = 'subpanel-header';

            const titleEl = document.createElement('span');
            titleEl.className = 'subpanel-title';
            titleEl.textContent = title;

            const toggleBtn = document.createElement('button');
            toggleBtn.type = 'button';
            toggleBtn.className = 'subsection-toggle';
            toggleBtn.textContent = '收合';
            toggleBtn.setAttribute('aria-expanded', 'true');
            toggleBtn.addEventListener('click', () => toggleSidebarSubsection(subsectionId));

            const body = document.createElement('div');
            body.className = 'subpanel-body';

            header.appendChild(titleEl);
            header.appendChild(toggleBtn);
            wrapper.appendChild(header);
            wrapper.appendChild(body);

            return { wrapper, body };
        }

        function clampFloatingPanelPosition(panelEl, left, top) {
            const maxLeft = Math.max(8, canvas.clientWidth - panelEl.offsetWidth - 8);
            const maxTop = Math.max(8, canvas.clientHeight - panelEl.offsetHeight - 8);
            return {
                left: clamp(left, 8, maxLeft),
                top: clamp(top, 8, maxTop)
            };
        }

        function setFloatingPanelPosition(panelEl, left, top) {
            if (!panelEl) return;
            const next = clampFloatingPanelPosition(panelEl, left, top);
            panelEl.style.left = `${next.left}px`;
            panelEl.style.top = `${next.top}px`;
            panelEl.style.right = 'auto';
            panelEl.style.bottom = 'auto';
        }

        function stopFloatingPanelDrag() {
            if (!floatingPanelDrag.isDragging) return;
            floatingPanelDrag.isDragging = false;
            floatingPanelDrag.panelEl = null;
            document.body.classList.remove('is-dragging-floating-panel');
        }

        const CHAT_ROLE_LABELS = {
            user: '我',
            assistant: '角色',
            system: '系統',
            tool: '工具'
        };

        function getChatRoleLabel(role) {
            return CHAT_ROLE_LABELS[String(role || 'user').toLowerCase()] || '我';
        }

        function renderChatMessage(entry) {
            const message = normalizeMessageHistoryEntry(entry);
            const row = document.createElement('article');
            row.className = `chat-message chat-role-${message.role}`;

            const meta = document.createElement('div');
            meta.className = 'chat-message-meta';

            const roleEl = document.createElement('span');
            roleEl.className = 'chat-message-role';
            roleEl.textContent = getChatRoleLabel(message.role);

            const timeEl = document.createElement('span');
            timeEl.className = 'chat-message-time';
            timeEl.textContent = formatLocalDateTime(message.timestamp);

            const contentEl = document.createElement('div');
            contentEl.className = 'chat-message-content';
            contentEl.textContent = message.content;

            meta.append(roleEl, timeEl);
            row.append(meta, contentEl);
            return row;
        }

        function syncChatComposerState(obj) {
            const hasObject = !!obj;
            if (chatRoleSelect) chatRoleSelect.disabled = !hasObject;
            if (chatInput) chatInput.disabled = !hasObject;
            if (chatSendButton) chatSendButton.disabled = !hasObject;
            if (chatClearButton) chatClearButton.disabled = !hasObject;
            if (chatContextEl) {
                chatContextEl.textContent = hasObject
                    ? `目前角色：${obj.name}`
                    : '選擇一個角色後就可以開始記錄對話。';
            }
            if (chatPanelTitleEl) {
                chatPanelTitleEl.textContent = hasObject
                    ? `角色對話：${obj.name}`
                    : '角色對話';
            }
        }

        function renderChatPanel(obj) {
            if (!chatPanel || !chatLogEl || !chatEmptyEl) return;

            if (chatPanelCurrentObjectId !== null && chatInput) {
                chatDrafts[chatPanelCurrentObjectId] = chatInput.value;
            }

            chatPanelCurrentObjectId = obj?.id ?? null;
            syncChatComposerState(obj);

            if (!obj) {
                setElementDisplay(chatPanel, 'none');
                chatLogEl.innerHTML = '';
                chatEmptyEl.textContent = '先選一個角色，我們就能把對話存在它自己的紀錄裡。';
                setElementDisplay(chatEmptyEl, 'block');
                if (chatInput) chatInput.value = '';
                return;
            }

            setElementDisplay(chatPanel, '');
            const history = cloneMessageHistory(obj.messageHistory || []);
            obj.messageHistory = history;
            chatLogEl.innerHTML = '';
            setElementDisplay(chatEmptyEl, history.length > 0 ? 'none' : 'block');
            chatEmptyEl.textContent = history.length > 0 ? '' : `目前沒有「${obj.name}」的對話紀錄。`;

            history.forEach((entry) => {
                chatLogEl.appendChild(renderChatMessage(entry));
            });

            if (chatInput) {
                chatInput.value = chatDrafts[obj.id] || '';
            }

            requestAnimationFrame(() => {
                chatLogEl.scrollTop = chatLogEl.scrollHeight;
            });
        }

        function appendChatMessage(role, content) {
            const obj = getSelectedObjectData();
            if (!obj) return false;

            const nextContent = String(content ?? '').replace(/\r\n/g, '\n');
            if (!nextContent.trim()) return false;

            obj.messageHistory = cloneMessageHistory(obj.messageHistory);
            obj.messageHistory.push(normalizeMessageHistoryEntry({
                role,
                content: nextContent,
                timestamp: Date.now()
            }));

            chatDrafts[obj.id] = '';
            renderChatPanel(obj);
            return true;
        }

        function handleChatSend() {
            const role = chatRoleSelect?.value || 'user';
            if (!appendChatMessage(role, chatInput?.value || '')) {
                if (chatInput) chatInput.focus();
                return;
            }
            if (chatInput) chatInput.focus();
        }

        function clearChatHistory() {
            const obj = getSelectedObjectData();
            if (!obj) return;
            if (!confirm(`要清空「${obj.name}」的對話紀錄嗎？`)) return;

            obj.messageHistory = [];
            chatDrafts[obj.id] = '';
            renderChatPanel(obj);
        }

        function initializeFloatingPanelDrag(panelEl) {
            if (!panelEl || panelEl.dataset.dragReady === 'true') return;

            const header = panelEl.querySelector('.subpanel-header');
            if (!header) return;

            header.classList.add('floating-panel-handle');
            header.addEventListener('mousedown', (e) => {
                if (e.button !== 0) return;
                if (e.target.closest('.subsection-toggle')) return;

                const panelRect = panelEl.getBoundingClientRect();
                const canvasRect = canvas.getBoundingClientRect();
                setFloatingPanelPosition(panelEl, panelRect.left - canvasRect.left, panelRect.top - canvasRect.top);

                floatingPanelDrag.isDragging = true;
                floatingPanelDrag.panelEl = panelEl;
                floatingPanelDrag.offsetX = e.clientX - panelRect.left;
                floatingPanelDrag.offsetY = e.clientY - panelRect.top;
                document.body.classList.add('is-dragging-floating-panel');
                e.preventDefault();
            });

            panelEl.dataset.dragReady = 'true';
        }

        function setupSidebarSubsections() {
            if (!document.getElementById('sidebar-section-layers')?.dataset.subsectionsReady) {
                const layersBody = document.getElementById('sidebar-section-layers');
                const imageAddWrapper = fileInput.parentElement;
                const spineAddWrapper = spineInput.parentElement;
                const layerListContainer = document.getElementById('object-list-container');
                const noteGroup = layerNoteInput?.closest('.control-group');
                const blockAddWrapper = document.createElement('div');
                blockAddWrapper.className = 'btn-add-obj-wrapper';
                const blockAddButton = document.createElement('button');
                blockAddButton.type = 'button';
                blockAddButton.className = 'btn-add-obj';
                blockAddButton.textContent = '+ 新增方形圖塊';
                blockAddButton.addEventListener('click', () => addBlockObject());
                blockAddWrapper.appendChild(blockAddButton);

                const textAddWrapper = document.createElement('div');
                textAddWrapper.className = 'btn-add-obj-wrapper';
                const textAddButton = document.createElement('button');
                textAddButton.type = 'button';
                textAddButton.className = 'btn-add-obj';
                textAddButton.textContent = '+ 新增文字物件';
                textAddButton.addEventListener('click', () => addTextObject());
                textAddWrapper.appendChild(textAddButton);

                const bitmapTextAddWrapper = document.createElement('div');
                bitmapTextAddWrapper.className = 'btn-add-obj-wrapper';
                const bitmapTextAddButton = document.createElement('button');
                bitmapTextAddButton.type = 'button';
                bitmapTextAddButton.className = 'btn-add-obj';
                bitmapTextAddButton.textContent = '+ 匯入 FNT 文字';
                bitmapTextAddButton.addEventListener('click', () => openBitmapFontPicker('create'));
                bitmapTextAddWrapper.appendChild(bitmapTextAddButton);
                const cameraAddWrapper = document.createElement('div');
                cameraAddWrapper.className = 'btn-add-obj-wrapper';
                const cameraAddButton = document.createElement('button');
                cameraAddButton.type = 'button';
                cameraAddButton.className = 'btn-add-obj';
                cameraAddButton.textContent = '+ 新增攝影機軌';
                cameraAddButton.addEventListener('click', () => createCameraTrack());
                cameraAddWrapper.appendChild(cameraAddButton);

                const addPanel = createSidebarSubpanel('layer-add', '新增物件');
                addPanel.body.append(imageAddWrapper, textAddWrapper, bitmapTextAddWrapper, blockAddWrapper, spineAddWrapper, cameraAddWrapper);

                const listPanel = createSidebarSubpanel('layer-list', '圖層清單');
                listPanel.body.appendChild(layerListContainer);
                const hiddenListSection = document.getElementById('hidden-object-list-section');
                if (hiddenListSection) listPanel.body.appendChild(hiddenListSection);

                const notePanel = createSidebarSubpanel('layer-note', '圖層備註');
                if (noteGroup) notePanel.body.appendChild(noteGroup);

                layersBody.innerHTML = '';
                layersBody.append(addPanel.wrapper, listPanel.wrapper);
                if (noteGroup) layersBody.append(notePanel.wrapper);
                layersBody.dataset.subsectionsReady = 'true';
            }

            if (!document.getElementById('sidebar-section-properties')?.dataset.subsectionsReady) {
                const propertiesBody = document.getElementById('sidebar-section-properties');
                const maskGroup = outputMaskStatus.closest('.control-group');

                objectSettingsPanel = createSidebarSubpanel('prop-object', '物件專屬設定').wrapper;
                objectSettingsPanel.id = 'object-settings-panel';
                setElementDisplay(objectSettingsPanel, 'none');
                const objectSettingsBody = objectSettingsPanel.querySelector('.subpanel-body');

                blockPanel = document.createElement('div');
                blockPanel.id = 'block-panel';
                setElementDisplay(blockPanel, 'none');
                blockPanel.innerHTML = `
                    <div class="control-group">
                        <label>方塊尺寸：</label>
                        <input type="number" id="prop-block-size" min="4" step="1" value="${DEFAULT_BLOCK_SIZE}">
                    </div>
                    <div class="control-group">
                        <label>方塊顏色：</label>
                        <input type="color" id="prop-block-color" value="${DEFAULT_BLOCK_COLOR}">
                    </div>
                `;
                blockSizeInput = blockPanel.querySelector('#prop-block-size');
                blockColorInput = blockPanel.querySelector('#prop-block-color');

                textPanel = document.createElement('div');
                textPanel.id = 'text-panel';
                setElementDisplay(textPanel, 'none');
                textPanel.innerHTML = `
                    <div class="control-group">
                        <label>文字內容：</label>
                        <textarea id="prop-text-content" rows="4" placeholder="輸入文字內容"></textarea>
                    </div>
                    <div class="control-group">
                        <label>字體大小：</label>
                        <input type="number" id="prop-text-size" min="4" step="1" value="${DEFAULT_TEXT_SIZE}">
                    </div>
                    <div class="control-group">
                        <label>行高：</label>
                        <input type="number" id="prop-text-line-height" min="4" step="1" value="${DEFAULT_TEXT_LINE_HEIGHT}">
                    </div>
                    <div class="control-group">
                        <label>字距：</label>
                        <input type="number" id="prop-text-letter-spacing" step="1" value="${DEFAULT_TEXT_LETTER_SPACING}">
                    </div>
                    <div class="control-group">
                        <label>對齊：</label>
                        <select id="prop-text-align">
                            <option value="left">Left</option>
                            <option value="center">Center</option>
                            <option value="right">Right</option>
                        </select>
                    </div>
                    <div class="control-group">
                        <label>文字顏色：</label>
                        <input type="color" id="prop-text-color" value="${DEFAULT_TEXT_COLOR}">
                    </div>
                    <div class="control-group">
                        <label>字型：</label>
                        <input type="text" id="prop-text-font-family" value="${DEFAULT_TEXT_FONT_FAMILY}">
                    </div>
                    <div class="control-group">
                        <label>Bitmap Font：</label>
                        <div class="inline-action-row">
                            <button type="button" id="btn-text-import-fnt">Import FNT</button>
                            <button type="button" id="btn-text-clear-fnt">Clear</button>
                        </div>
                        <div id="prop-text-font-status"></div>
                    </div>
                `;
                textContentInput = textPanel.querySelector('#prop-text-content');
                textSizeInput = textPanel.querySelector('#prop-text-size');
                textLineHeightInput = textPanel.querySelector('#prop-text-line-height');
                textLetterSpacingInput = textPanel.querySelector('#prop-text-letter-spacing');
                textAlignInput = textPanel.querySelector('#prop-text-align');
                textColorInput = textPanel.querySelector('#prop-text-color');
                textFontFamilyInput = textPanel.querySelector('#prop-text-font-family');
                textBitmapFontStatus = textPanel.querySelector('#prop-text-font-status');
                textImportFontButton = textPanel.querySelector('#btn-text-import-fnt');
                textClearFontButton = textPanel.querySelector('#btn-text-clear-fnt');

                objectSettingsBody.append(blockPanel, textPanel, spinePanel);

                const outputPanel = createSidebarSubpanel('prop-output', '輸出與遮罩');
                outputPanel.body.appendChild(maskGroup);

                const transformPanel = createSidebarSubpanel('prop-transform', '位置與變形');
                transformPanel.body.appendChild(propsPanel);

                const effectsPanel = createSidebarSubpanel('prop-effects', '外觀效果');
                effectsPanel.body.appendChild(tintPanel);

                chatPanel = createSidebarSubpanel('prop-chat', '角色對話');
                chatPanel.wrapper.id = 'chat-panel';
                setElementDisplay(chatPanel.wrapper, 'none');
                chatPanel.wrapper.classList.add('chat-panel');
                chatPanelTitleEl = chatPanel.wrapper.querySelector('.subpanel-title');

                chatContextEl = document.createElement('div');
                chatContextEl.className = 'chat-context';
                chatContextEl.textContent = '選擇一個角色後就可以開始記錄對話。';

                chatLogEl = document.createElement('div');
                chatLogEl.className = 'chat-log';

                chatEmptyEl = document.createElement('div');
                chatEmptyEl.className = 'chat-empty';
                chatEmptyEl.textContent = '目前還沒有對話紀錄。';

                const composer = document.createElement('div');
                composer.className = 'chat-composer';

                const roleRow = document.createElement('div');
                roleRow.className = 'chat-role-row';

                const roleLabel = document.createElement('label');
                roleLabel.textContent = '發話者';
                roleLabel.setAttribute('for', 'chat-role-select');

                chatRoleSelect = document.createElement('select');
                chatRoleSelect.id = 'chat-role-select';
                chatRoleSelect.innerHTML = `
                    <option value="user">我</option>
                    <option value="assistant">角色</option>
                    <option value="system">系統</option>
                `;

                roleRow.append(roleLabel, chatRoleSelect);

                chatInput = document.createElement('textarea');
                chatInput.rows = 3;
                chatInput.placeholder = '輸入訊息，Enter 送出，Shift+Enter 換行';

                const chatActions = document.createElement('div');
                chatActions.className = 'chat-actions';

                chatClearButton = document.createElement('button');
                chatClearButton.type = 'button';
                chatClearButton.className = 'chat-clear-btn';
                chatClearButton.textContent = '清空紀錄';

                chatSendButton = document.createElement('button');
                chatSendButton.type = 'button';
                chatSendButton.className = 'chat-send-btn';
                chatSendButton.textContent = '送出訊息';

                chatActions.append(chatClearButton, chatSendButton);
                composer.append(roleRow, chatInput, chatActions);
                chatPanel.body.append(chatContextEl, chatLogEl, chatEmptyEl, composer);

                propertiesBody.innerHTML = '';
                propertiesBody.append(outputPanel.wrapper, transformPanel.wrapper, effectsPanel.wrapper, objectSettingsPanel, chatPanel.wrapper);
                propertiesBody.dataset.subsectionsReady = 'true';

                chatSendButton.addEventListener('click', handleChatSend);
                chatClearButton.addEventListener('click', clearChatHistory);
                chatInput.addEventListener('keydown', (e) => {
                    if (e.isComposing || e.key !== 'Enter' || e.shiftKey) return;
                    e.preventDefault();
                    handleChatSend();
                });
                chatInput.addEventListener('input', () => {
                    if (chatPanelCurrentObjectId !== null) {
                        chatDrafts[chatPanelCurrentObjectId] = chatInput.value;
                    }
                });
            }

            if (!document.getElementById('sidebar-section-snapshot')?.dataset.subsectionsReady) {
                const snapshotBody = document.getElementById('sidebar-section-snapshot');
                const intervalGroup = intervalInput.closest('.control-group');
                const clipboardRow = btnCopyKf.closest('.keyframe-clipboard-row');

                const timingPanel = createSidebarSubpanel('snapshot-timing', '影格設定');
                timingPanel.body.appendChild(intervalGroup);

                const actionsPanel = createSidebarSubpanel('snapshot-actions', '影格操作');
                actionsPanel.wrapper.classList.add('floating-keyframe-panel', 'floating-keyframe-actions-panel');
                actionsPanel.body.append(btnSnapshot, btnDeleteKf, clipboardRow, updateHint);

                const offsetPanel = createSidebarSubpanel('snapshot-offset', '影格 Offset');
                offsetPanel.wrapper.classList.add('floating-keyframe-panel', 'floating-keyframe-offset-panel');
                setElementDisplay(offsetPanel.wrapper, 'none');
                offsetPanel.body.appendChild(keyframeOffsetPanel);
                keyframeOffsetFloatingPanel = offsetPanel.wrapper;

                snapshotBody.innerHTML = '';
                snapshotBody.append(timingPanel.wrapper);
                canvas.appendChild(actionsPanel.wrapper);
                canvas.appendChild(offsetPanel.wrapper);
                initializeFloatingPanelDrag(actionsPanel.wrapper);
                initializeFloatingPanelDrag(offsetPanel.wrapper);
                snapshotBody.dataset.subsectionsReady = 'true';
            }
        }

        function initializeSidebarSubsections() {
            document.querySelectorAll('.subpanel-section[data-subsection-id]').forEach(subsection => {
                const subsectionId = subsection.dataset.subsectionId;
                setSidebarSubsectionCollapsed(subsectionId, !!sidebarSubsectionState[subsectionId], false);
            });
        }

        function getSpineRuntimeVersion(editorVersion) {
            const match = String(editorVersion || '').match(/^(\d+\.\d+)/);
            return match ? match[1] : '4.2';
        }

        function ensureSpineRuntime(editorVersion) {
            const runtimeVersion = getSpineRuntimeVersion(editorVersion);
            if (window.customElements?.get('spine-skeleton') && spineRuntimeState.loadedVersion === runtimeVersion) {
                return Promise.resolve(runtimeVersion);
            }
            if (spineRuntimeState.promise && spineRuntimeState.loadingVersion === runtimeVersion) {
                return spineRuntimeState.promise;
            }
            if (spineRuntimeState.loadedVersion && spineRuntimeState.loadedVersion !== runtimeVersion) {
                return Promise.reject(new Error(`Spine runtime ${spineRuntimeState.loadedVersion} is already loaded. Mixed runtime version ${runtimeVersion} is not supported in the same page.`));
            }

            spineRuntimeState.loadingVersion = runtimeVersion;
            spineRuntimeState.promise = new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = `https://unpkg.com/@esotericsoftware/spine-webcomponents@${runtimeVersion}.*/dist/iife/spine-webcomponents.min.js`;
                script.onload = () => {
                    spineRuntimeState.loadedVersion = runtimeVersion;
                    resolve(runtimeVersion);
                };
                script.onerror = () => {
                    spineRuntimeState.promise = null;
                    spineRuntimeState.loadingVersion = null;
                    reject(new Error(`Failed to load Spine runtime ${runtimeVersion}. Check your network connection and make sure the skeleton export version matches.`));
                };
                document.head.appendChild(script);
            });

            return spineRuntimeState.promise;
        }

        function createObjectWrapper(objId, className = '') {
            const wrapper = document.createElement('div');
            wrapper.className = `anim-object-wrapper${className ? ` ${className}` : ''}`;
            wrapper.id = `obj-wrap-${objId}`;
            wrapper.dataset.objId = objId;
            wrapper.dataset.tintFilterId = `tint-filter-${objId}`;

            const filter = document.createElementNS(SVG_NS, 'filter');
            filter.setAttribute('id', wrapper.dataset.tintFilterId);
            filter.setAttribute('color-interpolation-filters', 'sRGB');
            const flood = document.createElementNS(SVG_NS, 'feFlood');
            flood.setAttribute('flood-color', DEFAULT_TINT);
            flood.setAttribute('flood-opacity', '1');
            flood.setAttribute('result', 'tint');
            const composite = document.createElementNS(SVG_NS, 'feComposite');
            composite.setAttribute('in', 'tint');
            composite.setAttribute('in2', 'SourceAlpha');
            composite.setAttribute('operator', 'in');
            composite.setAttribute('result', 'tintMask');
            const blend = document.createElementNS(SVG_NS, 'feBlend');
            blend.setAttribute('in', 'SourceGraphic');
            blend.setAttribute('in2', 'tintMask');
            blend.setAttribute('mode', 'multiply');
            filter.appendChild(flood);
            filter.appendChild(composite);
            filter.appendChild(blend);
            tintFilterDefs.appendChild(filter);
            wrapper.tintFloodNode = flood;
            wrapper.tintFilterNode = filter;

            const contentLayer = document.createElement('div');
            contentLayer.className = 'anim-object-content';
            const tintOverlay = document.createElement('div');
            tintOverlay.className = 'anim-object-tint';
            wrapper.appendChild(contentLayer);
            wrapper.appendChild(tintOverlay);
            wrapper.contentLayer = contentLayer;
            wrapper.tintOverlay = tintOverlay;

            wrapper.addEventListener('mousedown', onObjectMouseDown);
            wrapper.addEventListener('click', (e) => {
                e.stopPropagation();
                if (isoObjectId !== null && objId !== isoObjectId) return;
                selectObject(objId);
            });
            return wrapper;
        }

        function finalizeNewObject(newObj) {
            newObj.trackVisible = newObj.trackVisible !== false;
            newObj.messageHistory = cloneMessageHistory(newObj.messageHistory);
            if (newObj.domWrapper?.dataset) {
                newObj.domWrapper.dataset.trackVisible = newObj.trackVisible ? 'true' : 'false';
            }
            animObjects.push(newObj);
            if (suppressObjectAutoRefresh) {
                return newObj;
            }
            updateZIndices();
            updateUIState();
            selectObject(newObj.id);
            btnPlay.disabled = false;
            return newObj;
        }

        function setZoom(level) {
            canvasZoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, level));
            updateCanvasViewportTransform();
        }
        function zoomIn()    { setZoom(canvasZoom * ZOOM_STEP); }
        function zoomOut()   { setZoom(canvasZoom / ZOOM_STEP); }
        function resetZoom() { setZoom(1.0); }

        buildProjectFileModal();
        setupSidebarSubsections();
        if (blockSizeInput && blockColorInput) {
            blockSizeInput.addEventListener('input', handleBlockPropertyChange);
            blockColorInput.addEventListener('input', handleBlockPropertyChange);
        }
        if (textContentInput && textSizeInput && textLineHeightInput && textLetterSpacingInput && textAlignInput && textColorInput && textFontFamilyInput) {
            [textContentInput, textSizeInput, textLineHeightInput, textLetterSpacingInput, textAlignInput, textColorInput, textFontFamilyInput].forEach((input) => {
                input.addEventListener('input', handleTextPropertyChange);
            });
        }
        if (textImportFontButton) {
            textImportFontButton.addEventListener('click', () => {
                const targetObj = getSelectedObjectData();
                if (!targetObj || targetObj.type !== TEXT_TYPE) return;
                openBitmapFontPicker('update', targetObj.id);
            });
        }
        if (textClearFontButton) {
            textClearFontButton.addEventListener('click', clearSelectedTextBitmapFont);
        }
        textBitmapFontInput = document.createElement('input');
        textBitmapFontInput.type = 'file';
        textBitmapFontInput.className = 'object-file-input';
        textBitmapFontInput.accept = '.fnt,.png,.jpg,.jpeg,.webp';
        textBitmapFontInput.multiple = true;
            setElementDisplay(textBitmapFontInput, 'none');
        document.body.appendChild(textBitmapFontInput);
        textBitmapFontInput.addEventListener('change', async (e) => {
            const files = Array.from(e.target.files || []);
            if (files.length === 0) return;
            try {
                const bitmapFont = await buildBitmapFontData(files);
                if (textBitmapFontTarget.mode === 'update') {
                    const targetObj = animObjects.find(obj => obj.id === textBitmapFontTarget.objId);
                    if (!targetObj || targetObj.type !== TEXT_TYPE) {
                        throw new Error('Select a text object before importing a bitmap font.');
                    }
                    targetObj.textData = normalizeTextData({
                        ...targetObj.textData,
                        bitmapFont,
                        size: targetObj.textData?.size || bitmapFont.lineHeight,
                        lineHeight: targetObj.textData?.lineHeight || bitmapFont.lineHeight
                    });
                    syncTextElement(targetObj);
                    syncTextObjectName(targetObj);
                    if (selectedObjectId === targetObj.id) updateTextPanel(targetObj);
                    renderObjectList();
                    updateGlobalTimeline();
                } else {
                    addTextObject({
                        text: DEFAULT_TEXT_CONTENT,
                        size: bitmapFont.lineHeight,
                        lineHeight: bitmapFont.lineHeight,
                        bitmapFont
                    });
                }
            } catch (err) {
                alert(`FNT import failed: ${err.message}`);
            }
            e.target.value = '';
            textBitmapFontTarget = { mode: 'create', objId: null };
        });
        applyBottomPanelHeight(loadBottomPanelHeight(), false);
        initializeSidebarSections();
        initializeSidebarSubsections();
        updateCanvasMaskLayout();
        window.addEventListener('resize', () => {
            applyBottomPanelHeight(bottomPanel.getBoundingClientRect().height, false);
            updateCanvasMaskLayout();
            document.querySelectorAll('.floating-keyframe-panel').forEach(panel => {
                if (!panel.style.left && !panel.style.top) return;
                setFloatingPanelPosition(panel, parseFloat(panel.style.left) || 0, parseFloat(panel.style.top) || 0);
            });
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && projectFileModalOpen) {
                closeProjectFileModal();
            }
        });
        timelineResizer.addEventListener('mousedown', (e) => {
            e.preventDefault();
            timelinePanelResize.isDragging = true;
            timelinePanelResize.startY = e.clientY;
            timelinePanelResize.startHeight = bottomPanel.getBoundingClientRect().height;
            document.body.classList.add('is-resizing-timeline');
        });
        document.addEventListener('mousemove', (e) => {
            if (!timelinePanelResize.isDragging) return;
            const nextHeight = timelinePanelResize.startHeight + (timelinePanelResize.startY - e.clientY);
            applyBottomPanelHeight(nextHeight, false);
        });
        document.addEventListener('mousemove', (e) => {
            if (!floatingPanelDrag.isDragging || !floatingPanelDrag.panelEl) return;
            const canvasRect = canvas.getBoundingClientRect();
            setFloatingPanelPosition(
                floatingPanelDrag.panelEl,
                e.clientX - canvasRect.left - floatingPanelDrag.offsetX,
                e.clientY - canvasRect.top - floatingPanelDrag.offsetY
            );
        });
        document.addEventListener('mouseup', () => stopTimelineResize(true));
        document.addEventListener('mouseleave', () => stopTimelineResize(true));
        document.addEventListener('mouseup', stopFloatingPanelDrag);
        document.addEventListener('mouseleave', stopFloatingPanelDrag);
        [outputMaskWidthInput, outputMaskHeightInput].forEach((input) => {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    applyOutputMask();
                }
            });
        });

        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            if (e.deltaY < 0) zoomIn(); else zoomOut();
        }, { passive: false });

        function getTimelinePixelsPerSecond() {
            return BASE_PIXELS_PER_SEC * timelineZoom;
        }

        function timeToTimelineX(time) {
            return time * getTimelinePixelsPerSecond();
        }

        function timelineXToTime(x) {
            return x / getTimelinePixelsPerSecond();
        }

        function updatePlayheadPosition() {
            const timelineContentHeight = Math.max(timelineScrollArea.scrollHeight, timelineScrollArea.clientHeight);
            playhead.style.height = `${timelineContentHeight}px`;
            playhead.style.left = `${HEADER_WIDTH + timeToTimelineX(playState.currentTime)}px`;
        }

        function updateTimelineZoomUI() {
            const zoomPercent = Math.round(timelineZoom * 100);
            timelineZoomSlider.value = String(zoomPercent);
            timelineZoomDisplay.innerText = `${zoomPercent}%`;
        }

        function setTimelineZoom(level, anchorTime = null) {
            const previousPixelsPerSecond = getTimelinePixelsPerSecond();
            const clampedLevel = clamp(level, TIMELINE_ZOOM_MIN, TIMELINE_ZOOM_MAX);
            const resolvedAnchorTime = anchorTime !== null
                ? Math.max(0, anchorTime)
                : Math.max(0, (timelineScrollArea.scrollLeft + (timelineScrollArea.clientWidth / 2) - HEADER_WIDTH) / previousPixelsPerSecond);

            timelineZoom = clampedLevel;
            updateTimelineZoomUI();
            updateGlobalTimeline();

            timelineScrollArea.scrollLeft = Math.max(
                0,
                HEADER_WIDTH + timeToTimelineX(resolvedAnchorTime) - (timelineScrollArea.clientWidth / 2)
            );
            if (playhead.style.display !== 'none') updatePlayheadPosition();
        }

        function adjustTimelineZoom(multiplier, anchorTime = null) {
            setTimelineZoom(timelineZoom * multiplier, anchorTime);
        }

        function centerTimelineOnTime(time) {
            timelineScrollArea.scrollLeft = Math.max(
                0,
                HEADER_WIDTH + timeToTimelineX(time) - (timelineScrollArea.clientWidth / 2)
            );
        }

        function getJumpKeyframeTargets() {
            const selectedObj = getSelectedObjectData();
            if (selectedObj && selectedObj.keyframes.length > 0) {
                return selectedObj.keyframes.map((kf, kfIndex) => ({
                    objId: selectedObj.id,
                    kfIndex,
                    time: kf.time
                }));
            }
            return animObjects.flatMap(obj => obj.keyframes.map((kf, kfIndex) => ({
                objId: obj.id,
                kfIndex,
                time: kf.time
            })));
        }

        function updateTimelineNavigationButtons() {
            const hasAnyKeyframes = getJumpKeyframeTargets().length > 0;
            btnPrevKf.disabled = !hasAnyKeyframes;
            btnNextKf.disabled = !hasAnyKeyframes;
        }

        function jumpToAdjacentKeyframe(direction) {
            const targets = getJumpKeyframeTargets()
                .map(target => ({ ...target, time: Math.round(target.time * 1000) / 1000 }))
                .sort((a, b) => a.time - b.time || a.objId - b.objId || a.kfIndex - b.kfIndex);
            if (targets.length === 0) return;
            if (playState.isPlaying) stopAnimation();

            const epsilon = 0.0001;
            let target = null;
            if (direction > 0) {
                target = targets.find(item => item.time > playState.currentTime + epsilon);
                if (target === undefined) target = targets[targets.length - 1];
            } else {
                const previousTargets = targets.filter(item => item.time < playState.currentTime - epsilon);
                target = previousTargets.length > 0 ? previousTargets[previousTargets.length - 1] : targets[0];
            }

            if (!target) return;
            if (selectedObjectId !== target.objId) selectObject(target.objId);
            selectedKeyframes = [{ objId: target.objId, kfIndex: target.kfIndex }];
            updateMultiSelectUI();
            enterEditingFrameMode(target.kfIndex);
        }

        function jumpToPreviousKeyframe() {
            jumpToAdjacentKeyframe(-1);
        }

        function jumpToNextKeyframe() {
            jumpToAdjacentKeyframe(1);
        }

        timelineZoomSlider.addEventListener('input', (e) => {
            setTimelineZoom(getNum(e.target.value, 100) / 100);
        });
        updateTimelineZoomUI();

        function handleTimelineWheel(e) {
            if (!e.target.closest('#timeline-scroll-area')) return;

            e.preventDefault();

            if (e.ctrlKey || e.metaKey) {
                const rect = timelineScrollArea.getBoundingClientRect();
                const anchorX = e.clientX - rect.left + timelineScrollArea.scrollLeft - HEADER_WIDTH;
                const anchorTime = Math.max(0, timelineXToTime(Math.max(0, anchorX)));
                adjustTimelineZoom(e.deltaY < 0 ? 1.1 : (1 / 1.1), anchorTime);
                return;
            }

            if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
                timelineScrollArea.scrollLeft += e.deltaX || e.deltaY;
                return;
            }

            timelineScrollArea.scrollTop += e.deltaY || e.deltaX;
        }

        document.addEventListener('wheel', handleTimelineWheel, { passive: false, capture: true });

        canvas.addEventListener('click', (e) => {
            if (e.target === canvas || e.target === canvasViewport || e.target === canvasMaskFrame) {
                if (selectedKeyframeIndex !== null || selectedKeyframes.length > 0) {
                    selectedKeyframes = [];
                    updateMultiSelectUI();
                    exitEditingFrameMode();
                } else if (selectedObjectId !== null) {
                    selectObject(null);
                }
            }
        });

        Object.keys(inputs).forEach(key => {
            const eventName = inputs[key].type === 'checkbox' ? 'change' : 'input';
            inputs[key].addEventListener(eventName, () => {
                const targetObj = getSelectedObjectData();
                if (targetObj) {
                    const tempPose = getInputPoseValues();
                    targetObj.currentPose = { ...tempPose };
                    applyPoseToDOM(targetObj.domWrapper, tempPose);
                    refreshTrackVisibilityIndicators();
                    updateCanvasViewportTransform();
                }
            });
        });

        [keyframeOffsetXInput, keyframeOffsetYInput].forEach(input => {
            if (!input) return;
            input.addEventListener('input', () => updateKeyframeOffsetUI());
            input.addEventListener('keydown', (e) => {
                if (e.key !== 'Enter') return;
                e.preventDefault();
                applyOffsetToSelectedKeyframes();
            });
        });
        applyKeyframeOffsetBtn?.addEventListener('click', () => applyOffsetToSelectedKeyframes());

        function handleBlockPropertyChange() {
            const targetObj = getSelectedObjectData();
            if (!targetObj || targetObj.type !== BLOCK_TYPE || !blockSizeInput || !blockColorInput) return;
            targetObj.blockData = normalizeBlockData({
                size: blockSizeInput.value,
                color: blockColorInput.value
            });
            syncBlockElement(targetObj);
        }

        function handleTextPropertyChange() {
            const targetObj = getSelectedObjectData();
            if (!targetObj || targetObj.type !== TEXT_TYPE || !textContentInput || !textSizeInput || !textLineHeightInput || !textLetterSpacingInput || !textAlignInput || !textColorInput || !textFontFamilyInput) return;
            targetObj.textData = normalizeTextData({
                ...targetObj.textData,
                text: textContentInput.value,
                size: textSizeInput.value,
                lineHeight: textLineHeightInput.value,
                letterSpacing: textLetterSpacingInput.value,
                align: textAlignInput.value,
                color: textColorInput.value,
                fontFamily: textFontFamilyInput.value
            });
            syncTextObjectName(targetObj);
            syncTextElement(targetObj);
            updateTextPanel(targetObj);
            renderObjectList();
            updateGlobalTimeline();
        }

        function openBitmapFontPicker(mode = 'create', objId = null) {
            if (!textBitmapFontInput) return;
            textBitmapFontTarget = { mode, objId };
            textBitmapFontInput.value = '';
            textBitmapFontInput.click();
        }

        function clearSelectedTextBitmapFont() {
            const targetObj = getSelectedObjectData();
            if (!targetObj || targetObj.type !== TEXT_TYPE) return;
            targetObj.textData = normalizeTextData({
                ...targetObj.textData,
                bitmapFont: null
            });
            syncTextObjectName(targetObj);
            syncTextElement(targetObj);
            updateTextPanel(targetObj);
            renderObjectList();
            updateGlobalTimeline();
        }

        layerNoteInput?.addEventListener('input', () => {
            const targetObj = getSelectedObjectData();
            if (!targetObj) return;
            targetObj.note = layerNoteInput.value;
            renderObjectList();
            updateGlobalTimeline();
        });

