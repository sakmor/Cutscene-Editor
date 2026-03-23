        // --- 核心資料結構 ---
        let animObjects = []; 
        let selectedObjectId = null; 
        let selectedKeyframeIndex = null; 
        let playState = { isPlaying: false, startTime: 0, animationFrameId: null, totalDuration: 0, currentTime: 0 };
        let keyframeClipboard = null;
        let outputMask = { enabled: false, width: 1920, height: 1080 };

        let selectedKeyframes = []; // [{ objId, kfIndex }] — 複選影格
        let kfDrag = { isDragging: false, hasMoved: false, objId: null, kfIndex: null, startX: 0, startTime: 0, nodeEl: null, dragTargets: [] };
        let marqueeState = { isSelecting: false, hasMoved: false, additive: false, startX: 0, startY: 0, currentX: 0, currentY: 0, baseSelection: [] };
        let scrubState = { isScrubbing: false };
        let trackReorderDrag = { isDragging: false, hasMoved: false, objId: null, startY: 0, insertionIndex: -1 };
        let drag = { isDragging: false, sx: 0, sy: 0, objX: 0, objY: 0 };
        let timelinePanelResize = { isDragging: false, startY: 0, startHeight: 250 };
        let canvasZoom = 1.0;
        let canvasViewportBaseScale = 1.0;

        const ZOOM_MIN = 0.1;
        const ZOOM_MAX = 5.0;
        const ZOOM_STEP = 1.25;
        const DEFAULT_TINT = '#ffffff';
        const DEFAULT_TINT_STRENGTH = 100;
        const DEFAULT_HUE = 0;
        const DEFAULT_BRIGHTNESS = 100;
        const DEFAULT_CONTRAST = 100;
        const DEFAULT_BLEND_MODE = 'normal';
        const DEFAULT_BLOCK_SIZE = 160;
        const DEFAULT_BLOCK_COLOR = '#ffffff';
        const DEFAULT_TEXT_CONTENT = 'New Text';
        const DEFAULT_TEXT_SIZE = 72;
        const DEFAULT_TEXT_LINE_HEIGHT = 86;
        const DEFAULT_TEXT_COLOR = '#ffffff';
        const DEFAULT_TEXT_FONT_FAMILY = 'Arial, sans-serif';
        const DEFAULT_TEXT_ALIGN = 'center';
        const DEFAULT_TEXT_LETTER_SPACING = 0;
        const DEFAULT_POSE = {
            x: 0, y: 0, rot: 0, scale: 1, opacity: 1, visible: true,
            tint: DEFAULT_TINT, tintStrength: DEFAULT_TINT_STRENGTH,
            hue: DEFAULT_HUE, brightness: DEFAULT_BRIGHTNESS, contrast: DEFAULT_CONTRAST,
            blendMode: DEFAULT_BLEND_MODE
        };
        const DEFAULT_SPINE_SIZE = 320;
        const IMAGE_TYPE = 'image';
        const BLOCK_TYPE = 'block';
        const TEXT_TYPE = 'text';
        const SPINE_TYPE = 'spine';
        const spineRuntimeState = { loadedVersion: null, loadingVersion: null, promise: null };
        const SVG_NS = 'http://www.w3.org/2000/svg';

        const BASE_PIXELS_PER_SEC = 150;
        const TIMELINE_ZOOM_MIN = 0.25;
        const TIMELINE_ZOOM_MAX = 4;
        const BOTTOM_PANEL_MIN_HEIGHT = 180;
        const WORKSPACE_MIN_HEIGHT = 220;
        const TIMELINE_RESIZER_HEIGHT = 10;
        let timelineZoom = 1;
        const HEADER_WIDTH = 210;
        const SIDEBAR_SECTION_STORAGE_KEY = 'cutscene-editor.sidebar-sections';
        const SIDEBAR_SUBSECTION_STORAGE_KEY = 'cutscene-editor.sidebar-subsections';
        const BOTTOM_PANEL_HEIGHT_STORAGE_KEY = 'cutscene-editor.bottom-panel-height';

        const workspace = document.getElementById('workspace');
        const canvas = document.getElementById('canvas-container');
        const canvasMaskFrame = document.getElementById('canvas-mask-frame');
        const canvasMaskLabel = document.getElementById('canvas-mask-label');
        const canvasViewport = document.getElementById('canvas-viewport');
        const zoomDisplay = document.getElementById('zoom-display');
        const fileInput = document.getElementById('file-input');
        const spineInput = document.getElementById('spine-input');
        const replaceImageInput = document.createElement('input');
        const objectListEl = document.getElementById('object-list');
        const layerNoteInput = document.createElement('textarea');
        const propsPanel = document.getElementById('props-panel');
        const tintPanel = document.getElementById('tint-panel');
        const outputMaskWidthInput = document.getElementById('output-mask-width');
        const outputMaskHeightInput = document.getElementById('output-mask-height');
        const outputMaskStatus = document.getElementById('output-mask-status');
        const spinePanel = document.getElementById('spine-panel');
        const spineAnimationSelect = document.getElementById('spine-animation-select');
        const btnSnapshot = document.getElementById('btn-snapshot');
        const btnDeleteKf = document.getElementById('btn-delete-kf'); 
        const btnCopyKf = document.getElementById('btn-copy-kf');
        const btnPasteKf = document.getElementById('btn-paste-kf');
        const updateHint = document.getElementById('update-hint');
        const btnPlay = document.getElementById('btn-play');
        const btnStop = document.getElementById('btn-stop');
        const btnPrevKf = document.getElementById('btn-prev-kf');
        const btnNextKf = document.getElementById('btn-next-kf');
        const jsonImportInput = document.getElementById('json-import-input');
        const intervalInput = document.getElementById('prop-interval');
        const timelineResizer = document.getElementById('timeline-resizer');
        const bottomPanel = document.getElementById('bottom-panel');
        const tracksContainer = document.getElementById('tracks-container');
        const timelineScrollArea = document.getElementById('timeline-scroll-area');
        const timelineSelectionBox = document.getElementById('timeline-selection-box');
        const rulerRow = document.getElementById('ruler-row'); 
        const rulerTicks = document.getElementById('ruler-ticks');
        const playhead = document.getElementById('playhead');
        const scrubTimeDisplay = document.getElementById('scrub-time-display');
        const multiSelectDisplay = document.getElementById('multi-select-display');
        const timelineZoomSlider = document.getElementById('timeline-zoom-slider');
        const timelineZoomDisplay = document.getElementById('timeline-zoom-display');
        let replaceImageTargetObjectId = null;
        let objectSettingsPanel = null;
        let blockPanel = null;
        let blockSizeInput = null;
        let blockColorInput = null;
        let textPanel = null;
        let textContentInput = null;
        let textSizeInput = null;
        let textLineHeightInput = null;
        let textLetterSpacingInput = null;

        replaceImageInput.type = 'file';
        replaceImageInput.accept = 'image/*';
        replaceImageInput.style.display = 'none';
        document.body.appendChild(replaceImageInput);
        let textAlignInput = null;
        let textColorInput = null;
        let textFontFamilyInput = null;
        let textBitmapFontStatus = null;
        let textImportFontButton = null;
        let textClearFontButton = null;
        let textBitmapFontInput = null;
        let textBitmapFontTarget = { mode: 'create', objId: null };
        let saveStatusEl = null;
        let projectFileModal = null;
        let projectFileModalSubtitle = null;
        let projectFileListEl = null;
        let projectFileModalOpen = false;
        let layerNoteModal = null;
        let layerNoteModalTitle = null;
        let layerNoteModalSubtitle = null;
        let layerNoteModalMeta = null;
        let layerNoteModalTextarea = null;
        let layerNoteModalSaveButton = null;
        let layerNoteModalOpen = false;
        let layerNoteModalObjectId = null;
        let saveDirectoryHandle = null;
        let currentProjectFileHandle = null;
        let currentProjectFileName = '';
        let autoBackupTimerId = null;
        let lastAutoBackupSnapshot = '';
        const FILE_SYSTEM_DB_NAME = 'cutscene-editor-file-system';
        const FILE_SYSTEM_STORE_NAME = 'handles';
        const SAVE_DIRECTORY_HANDLE_KEY = 'save-directory';
        const CURRENT_PROJECT_HANDLE_KEY = 'current-project-file';
        const AUTO_BACKUP_INTERVAL_MS = 5 * 60 * 1000;
        const AUTO_BACKUP_FOLDER_NAME = 'backups';
        const MAX_AUTO_BACKUPS = 5;

        const inputs = {
            x: document.getElementById('prop-x'), y: document.getElementById('prop-y'),
            rot: document.getElementById('prop-rot'), scale: document.getElementById('prop-scale'),
            opacity: document.getElementById('prop-opacity'),
            tint: document.getElementById('prop-tint'),
            tintStrength: document.getElementById('prop-tint-strength'),
            hue: document.getElementById('prop-hue'),
            brightness: document.getElementById('prop-brightness'),
            contrast: document.getElementById('prop-contrast'),
            blendMode: document.getElementById('prop-blend-mode')
        };

        const escapeHTML = (str) => String(str ?? '').replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag));
        const getNum = (val, defaultVal) => isNaN(parseFloat(val)) ? defaultVal : parseFloat(val);
        const normalizeTintHex = (tint) => {
            const value = String(tint || DEFAULT_TINT).trim();
            if (/^#[0-9a-f]{6}$/i.test(value)) return value.toLowerCase();
            if (/^#[0-9a-f]{3}$/i.test(value)) {
                return `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`.toLowerCase();
            }
            return DEFAULT_TINT;
        };
        const hexToRgb = (hex) => {
            const value = normalizeTintHex(hex);
            return {
                r: parseInt(value.slice(1, 3), 16),
                g: parseInt(value.slice(3, 5), 16),
                b: parseInt(value.slice(5, 7), 16)
            };
        };
        const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
        const rgbToHex = ({ r, g, b }) => `#${[r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;
        const BLEND_MODE_OPTIONS = new Set([
            'normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten',
            'color-dodge', 'color-burn', 'hard-light', 'soft-light',
            'difference', 'exclusion'
        ]);
        const normalizeBlendMode = (blendMode) => {
            const value = String(blendMode || DEFAULT_BLEND_MODE).trim().toLowerCase();
            return BLEND_MODE_OPTIONS.has(value) ? value : DEFAULT_BLEND_MODE;
        };
        const lerpTint = (startTint, endTint, t) => {
            const start = hexToRgb(startTint);
            const end = hexToRgb(endTint);
            return rgbToHex({
                r: lerp(start.r, end.r, t),
                g: lerp(start.g, end.g, t),
                b: lerp(start.b, end.b, t)
            });
        };
        const normalizePoseEffects = (pose = DEFAULT_POSE) => ({
            tint: normalizeTintHex(pose.tint || DEFAULT_TINT),
            tintStrength: clamp(getNum(pose.tintStrength, DEFAULT_TINT_STRENGTH), 0, 100),
            hue: clamp(getNum(pose.hue, DEFAULT_HUE), -180, 180),
            brightness: clamp(getNum(pose.brightness, DEFAULT_BRIGHTNESS), 0, 300),
            contrast: clamp(getNum(pose.contrast, DEFAULT_CONTRAST), 0, 300),
            blendMode: normalizeBlendMode(pose.blendMode)
        });
        const normalizeBlockData = (blockData = {}) => ({
            size: clamp(getNum(blockData.size, DEFAULT_BLOCK_SIZE), 4, 4096),
            color: normalizeTintHex(blockData.color || DEFAULT_BLOCK_COLOR)
        });
        const TEXT_ALIGN_OPTIONS = new Set(['left', 'center', 'right']);
        const normalizeTextAlign = (align) => {
            const value = String(align || DEFAULT_TEXT_ALIGN).trim().toLowerCase();
            return TEXT_ALIGN_OPTIONS.has(value) ? value : DEFAULT_TEXT_ALIGN;
        };
        const guessMimeTypeFromFilename = (name) => {
            const lower = String(name || '').toLowerCase();
            if (lower.endsWith('.png')) return 'image/png';
            if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
            if (lower.endsWith('.webp')) return 'image/webp';
            if (lower.endsWith('.gif')) return 'image/gif';
            return 'application/octet-stream';
        };
        const cloneBitmapFontData = (fontData = null) => {
            if (!fontData) return null;
            const pages = {};
            Object.entries(fontData.pages || {}).forEach(([id, page]) => {
                pages[String(id)] = {
                    id: getNum(page?.id ?? id, 0),
                    file: String(page?.file || ''),
                    assetPath: normalizePath(page?.assetPath || page?.file || ''),
                    mimeType: String(page?.mimeType || guessMimeTypeFromFilename(page?.file || '')),
                    src: String(page?.src || '')
                };
            });
            const chars = {};
            Object.entries(fontData.chars || {}).forEach(([id, charData]) => {
                chars[String(id)] = {
                    id: getNum(charData?.id ?? id, 0),
                    x: getNum(charData?.x, 0),
                    y: getNum(charData?.y, 0),
                    width: Math.max(0, getNum(charData?.width, 0)),
                    height: Math.max(0, getNum(charData?.height, 0)),
                    xoffset: getNum(charData?.xoffset, 0),
                    yoffset: getNum(charData?.yoffset, 0),
                    xadvance: getNum(charData?.xadvance, 0),
                    page: getNum(charData?.page, 0),
                    chnl: getNum(charData?.chnl, 0)
                };
            });
            const kernings = {};
            Object.entries(fontData.kernings || {}).forEach(([pair, amount]) => {
                kernings[String(pair)] = getNum(amount, 0);
            });
            return {
                name: String(fontData.name || 'Bitmap Font'),
                sourcePath: normalizePath(fontData.sourcePath || ''),
                lineHeight: Math.max(1, getNum(fontData.lineHeight, DEFAULT_TEXT_SIZE)),
                base: Math.max(0, getNum(fontData.base, 0)),
                scaleW: Math.max(1, getNum(fontData.scaleW, 1)),
                scaleH: Math.max(1, getNum(fontData.scaleH, 1)),
                pages,
                chars,
                kernings
            };
        };
        const normalizeTextData = (textData = {}) => {
            const bitmapFont = cloneBitmapFontData(textData.bitmapFont || null);
            const defaultSize = bitmapFont ? bitmapFont.lineHeight : DEFAULT_TEXT_SIZE;
            const size = clamp(getNum(textData.size ?? textData.fontSize, defaultSize), 4, 1024);
            const defaultLineHeight = bitmapFont ? size : Math.round(size * 1.2);
            return {
                text: String(textData.text ?? DEFAULT_TEXT_CONTENT).replace(/\r\n/g, '\n'),
                size,
                lineHeight: clamp(getNum(textData.lineHeight, defaultLineHeight), 4, 2048),
                letterSpacing: clamp(getNum(textData.letterSpacing, DEFAULT_TEXT_LETTER_SPACING), -128, 256),
                color: normalizeTintHex(textData.color || DEFAULT_TEXT_COLOR),
                fontFamily: String(textData.fontFamily || DEFAULT_TEXT_FONT_FAMILY).trim() || DEFAULT_TEXT_FONT_FAMILY,
                align: normalizeTextAlign(textData.align),
                bitmapFont
            };
        };
        const cloneTextData = (textData = {}) => normalizeTextData(textData);
        const serializeTextData = (textData = {}) => {
            const normalized = normalizeTextData(textData);
            return {
                text: normalized.text,
                size: normalized.size,
                lineHeight: normalized.lineHeight,
                letterSpacing: normalized.letterSpacing,
                color: normalized.color,
                fontFamily: normalized.fontFamily,
                align: normalized.align,
                bitmapFont: cloneBitmapFontData(normalized.bitmapFont)
            };
        };
        const buildTextObjectName = (text) => {
            const preview = String(text || DEFAULT_TEXT_CONTENT).replace(/\s+/g, ' ').trim();
            return preview ? `Text: ${preview.slice(0, 18)}` : 'Text';
        };
        const getInputPoseValues = () => ({
            x: getNum(inputs.x.value, 0),
            y: getNum(inputs.y.value, 0),
            rot: getNum(inputs.rot.value, 0),
            scale: getNum(inputs.scale.value, 1),
            opacity: getNum(inputs.opacity.value, 1),
            visible: getCurrentVisibleValue(),
            ...normalizePoseEffects({
                tint: inputs.tint.value,
                tintStrength: inputs.tintStrength.value,
                hue: inputs.hue.value,
                brightness: inputs.brightness.value,
                contrast: inputs.contrast.value,
                blendMode: inputs.blendMode.value
            })
        });
        const getSelectedObjectData = () => animObjects.find(obj => obj.id === selectedObjectId);
        const clonePose = (pose = DEFAULT_POSE) => ({
            x: pose.x, y: pose.y, rot: pose.rot, scale: pose.scale, opacity: pose.opacity, visible: pose.visible !== false,
            ...normalizePoseEffects(pose)
        });
        const normalizeKeyframe = (kf) => ({ ...clonePose(kf || DEFAULT_POSE), time: getNum(kf?.time, 0) });
        const normalizePath = (path) => String(path || '').replace(/\\/g, '/');
        const stripExtension = (name) => String(name || '').replace(/\.[^.]+$/, '');
        const getFileBaseName = (name) => String(name || '').split(/[\\/]/).pop() || '';
        const buildDefaultAssetPath = (name) => {
            const baseName = getFileBaseName(name);
            return baseName ? normalizePath(`assets/${baseName}`) : '';
        };
        const withCacheBuster = (src) => src ? `${src}${src.includes('?') ? '&' : '?'}v=${Date.now()}` : src;
        const formatBytes = (size) => {
            if (!Number.isFinite(size) || size < 1024) return `${Math.max(0, Math.round(size || 0))} B`;
            if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
            return `${(size / (1024 * 1024)).toFixed(2)} MB`;
        };
        const formatLocalDateTime = (timestamp) => {
            if (!Number.isFinite(timestamp)) return '時間未知';
            return new Date(timestamp).toLocaleString('zh-TW', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        };
        const formatTimestampForFileName = (date = new Date()) => {
            const pad = (value) => String(value).padStart(2, '0');
            return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
        };
        const sanitizeProjectFileName = (name) => {
            const trimmed = String(name || '').trim().replace(/[<>:"/\\|?*\x00-\x1F]/g, '_');
            if (!trimmed) return '';
            return /\.json$/i.test(trimmed) ? trimmed : `${trimmed}.json`;
        };
        const sanitizeProjectStem = (name) => {
            const stem = stripExtension(String(name || '').trim())
                .replace(/[^a-z0-9\-_]+/gi, '_')
                .replace(/^_+|_+$/g, '');
            return stem || 'animation_project';
        };
        const createProjectToolbarButton = (label, className, onClick) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = `action-btn ${className}`;
            button.textContent = label;
            button.addEventListener('click', onClick);
            return button;
        };
        const createProjectModalButton = (label, className, onClick) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = `action-btn ${className}`;
            button.textContent = label;
            button.addEventListener('click', onClick);
            return button;
        };
        const isObjectTrackVisible = (obj) => obj?.trackVisible !== false;
        const isObjectCurrentlyVisible = (obj) => isObjectTrackVisible(obj) && obj?.currentPose?.visible !== false;
        const getCurrentVisibleValue = () => {
            const targetObj = getSelectedObjectData();
            return targetObj ? (targetObj.currentPose?.visible !== false) : true;
        };
        const getTrackVisibilityIcon = (isVisible) => isVisible
            ? `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z"></path><circle cx="12" cy="12" r="3"></circle></svg>`
            : `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18"></path><path d="M10.6 10.7a3 3 0 0 0 4 4"></path><path d="M9.4 5.5A11.4 11.4 0 0 1 12 5c6.5 0 10 7 10 7a18.8 18.8 0 0 1-4 4.9"></path><path d="M6.6 6.7C4 8.5 2 12 2 12s3.5 6 10 6a10.8 10.8 0 0 0 2.5-.3"></path></svg>`;
        const toggleTrackObjectVisibility = (objId) => {
            const targetObj = animObjects.find(obj => obj.id === objId);
            if (!targetObj) return;
            if (selectedObjectId !== objId) {
                selectObject(objId);
            }
            const nextVisible = !isObjectTrackVisible(targetObj);
            targetObj.trackVisible = nextVisible;
            if (targetObj.domWrapper?.dataset) {
                targetObj.domWrapper.dataset.trackVisible = nextVisible ? 'true' : 'false';
            }
            applyPoseToDOM(targetObj.domWrapper, targetObj.currentPose);
            if (selectedObjectId === objId) {
                syncInputsWithState(targetObj.currentPose);
            }
            updateGlobalTimeline();
        };
        const refreshTrackVisibilityIndicators = () => {
            animObjects.forEach((obj) => {
                const isVisible = isObjectTrackVisible(obj);
                const header = tracksContainer.querySelector(`.track-object-header[data-obj-id="${obj.id}"]`);
                const button = tracksContainer.querySelector(`.track-visibility-btn[data-obj-id="${obj.id}"]`);
                header?.classList.toggle('is-hidden', !isVisible);
                if (button) {
                    button.classList.toggle('is-hidden', !isVisible);
                    button.title = isVisible ? 'Hide object' : 'Show object';
                    button.innerHTML = getTrackVisibilityIcon(isVisible);
                }
            });
        };
        /*
        const setupProjectFileToolbar = () => {
            const legacyLoadButton = jsonImportInput?.nextElementSibling;
            const legacySaveButton = legacyLoadButton?.nextElementSibling;
            const toolbar = jsonImportInput?.parentElement;
            if (!toolbar || !legacyLoadButton || !legacySaveButton) return;

            legacyLoadButton.textContent = '讀取存檔';
            legacyLoadButton.type = 'button';
            legacyLoadButton.onclick = importProjectJSON;

            legacySaveButton.textContent = '直接存檔';
            legacySaveButton.type = 'button';
            legacySaveButton.onclick = saveProjectDirect;

            const saveAsButton = createProjectToolbarButton('另存新檔', 'btn-save-secondary', saveProjectAs);
            const chooseFolderButton = createProjectToolbarButton('設定存檔資料夾', 'btn-import', () => chooseSaveDirectory());
            saveStatusEl = document.createElement('span');
            saveStatusEl.id = 'save-status';
            saveStatusEl.textContent = '存檔資料夾未設定';

            toolbar.insertBefore(saveAsButton, legacySaveButton.nextSibling);
            toolbar.insertBefore(chooseFolderButton, saveAsButton.nextSibling);
            toolbar.insertBefore(saveStatusEl, chooseFolderButton.nextSibling);
        };
        const buildProjectFileModal = () => {
            const overlay = document.createElement('div');
            overlay.id = 'project-file-modal';
            overlay.className = 'modal-overlay';
            overlay.hidden = true;

            const card = document.createElement('div');
            card.className = 'modal-card';
            card.setAttribute('role', 'dialog');
            card.setAttribute('aria-modal', 'true');
            card.setAttribute('aria-labelledby', 'project-file-modal-title');

            const header = document.createElement('div');
            header.className = 'modal-header';

            const titleWrap = document.createElement('div');
            const title = document.createElement('h2');
            title.className = 'modal-title';
            title.id = 'project-file-modal-title';
            title.textContent = '讀取存檔';
            projectFileModalSubtitle = document.createElement('p');
            projectFileModalSubtitle.className = 'modal-subtitle';
            projectFileModalSubtitle.textContent = '從 save 資料夾選一個 JSON 工程檔。';
            titleWrap.appendChild(title);
            titleWrap.appendChild(projectFileModalSubtitle);

            const closeBtn = document.createElement('button');
            closeBtn.type = 'button';
            closeBtn.className = 'modal-close-btn';
            closeBtn.setAttribute('aria-label', '關閉');
            closeBtn.textContent = '×';
            closeBtn.addEventListener('click', closeProjectFileModal);

            header.appendChild(titleWrap);
            header.appendChild(closeBtn);

            projectFileListEl = document.createElement('div');
            projectFileListEl.id = 'project-file-list';
            projectFileListEl.className = 'project-file-list';

            const actions = document.createElement('div');
            actions.className = 'modal-actions';
            const leftActions = document.createElement('div');
            leftActions.className = 'modal-actions-left';
            leftActions.appendChild(createProjectModalButton('重新整理', 'btn-import', refreshProjectFileList));
            leftActions.appendChild(createProjectModalButton('切換資料夾', 'btn-save-secondary', () => chooseSaveDirectory(true)));
            const rightActions = document.createElement('div');
            rightActions.className = 'modal-actions-right';
            rightActions.appendChild(createProjectModalButton('取消', 'btn-import', closeProjectFileModal));
            actions.appendChild(leftActions);
            actions.appendChild(rightActions);

            card.appendChild(header);
            card.appendChild(projectFileListEl);
            card.appendChild(actions);
            overlay.appendChild(card);

            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) closeProjectFileModal();
            });

            document.body.appendChild(overlay);
            projectFileModal = overlay;
        };
        const updateSaveStatus = (extra = '') => {
            if (!saveStatusEl) return;
            const folderName = saveDirectoryHandle?.name || '未設定';
            const fileLabel = currentProjectFileName || '未命名';
            const suffix = extra ? ` | ${extra}` : '';
            saveStatusEl.textContent = `save: ${folderName} | file: ${fileLabel}${suffix}`;
        };
        */
        const setupProjectFileToolbar = () => {
            const legacyLoadButton = jsonImportInput?.nextElementSibling;
            const legacySaveButton = legacyLoadButton?.nextElementSibling;
            const toolbar = jsonImportInput?.parentElement;
            if (!toolbar || !legacyLoadButton || !legacySaveButton) return;

            legacyLoadButton.textContent = 'Load Project';
            legacyLoadButton.type = 'button';
            legacyLoadButton.onclick = importProjectJSON;

            legacySaveButton.textContent = 'Save';
            legacySaveButton.type = 'button';
            legacySaveButton.onclick = saveProjectDirect;

            const saveAsButton = createProjectToolbarButton('Save As', 'btn-save-secondary', saveProjectAs);
            const chooseFolderButton = createProjectToolbarButton('Set Save Folder', 'btn-import', () => chooseSaveDirectory());
            saveStatusEl = document.createElement('span');
            saveStatusEl.id = 'save-status';
            saveStatusEl.textContent = 'Save folder not set';

            toolbar.insertBefore(saveAsButton, legacySaveButton.nextSibling);
            toolbar.insertBefore(chooseFolderButton, saveAsButton.nextSibling);
            toolbar.insertBefore(saveStatusEl, chooseFolderButton.nextSibling);
        };
        const buildProjectFileModal = () => {
            const overlay = document.createElement('div');
            overlay.id = 'project-file-modal';
            overlay.className = 'modal-overlay';
            overlay.hidden = true;

            const card = document.createElement('div');
            card.className = 'modal-card';
            card.setAttribute('role', 'dialog');
            card.setAttribute('aria-modal', 'true');
            card.setAttribute('aria-labelledby', 'project-file-modal-title');

            const header = document.createElement('div');
            header.className = 'modal-header';

            const titleWrap = document.createElement('div');
            const title = document.createElement('h2');
            title.className = 'modal-title';
            title.id = 'project-file-modal-title';
            title.textContent = 'Load Project';
            projectFileModalSubtitle = document.createElement('p');
            projectFileModalSubtitle.className = 'modal-subtitle';
            projectFileModalSubtitle.textContent = 'Select a JSON project file from the save folder.';
            titleWrap.appendChild(title);
            titleWrap.appendChild(projectFileModalSubtitle);

            const closeBtn = document.createElement('button');
            closeBtn.type = 'button';
            closeBtn.className = 'modal-close-btn';
            closeBtn.setAttribute('aria-label', 'Close');
            closeBtn.textContent = 'x';
            closeBtn.addEventListener('click', closeProjectFileModal);

            header.appendChild(titleWrap);
            header.appendChild(closeBtn);

            projectFileListEl = document.createElement('div');
            projectFileListEl.id = 'project-file-list';
            projectFileListEl.className = 'project-file-list';

            const actions = document.createElement('div');
            actions.className = 'modal-actions';
            const leftActions = document.createElement('div');
            leftActions.className = 'modal-actions-left';
            leftActions.appendChild(createProjectModalButton('Refresh', 'btn-import', refreshProjectFileList));
            leftActions.appendChild(createProjectModalButton('Switch Folder', 'btn-save-secondary', () => chooseSaveDirectory(true)));
            const rightActions = document.createElement('div');
            rightActions.className = 'modal-actions-right';
            rightActions.appendChild(createProjectModalButton('Cancel', 'btn-import', closeProjectFileModal));
            actions.appendChild(leftActions);
            actions.appendChild(rightActions);

            card.appendChild(header);
            card.appendChild(projectFileListEl);
            card.appendChild(actions);
            overlay.appendChild(card);

            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) closeProjectFileModal();
            });

            document.body.appendChild(overlay);
            projectFileModal = overlay;
        };
        const updateSaveStatus = (extra = '') => {
            if (!saveStatusEl) return;
            const folderName = saveDirectoryHandle?.name || 'unset';
            const fileLabel = currentProjectFileName || 'untitled';
            const suffix = extra ? ` | ${extra}` : '';
            saveStatusEl.textContent = `save: ${folderName} | file: ${fileLabel}${suffix}`;
        };
        const openFileSystemDB = () => new Promise((resolve, reject) => {
            if (!('indexedDB' in window)) {
                resolve(null);
                return;
            }
            const request = indexedDB.open(FILE_SYSTEM_DB_NAME, 1);
            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains(FILE_SYSTEM_STORE_NAME)) {
                    db.createObjectStore(FILE_SYSTEM_STORE_NAME);
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
        const readStoredHandle = async (key) => {
            try {
                const db = await openFileSystemDB();
                if (!db) return null;
                return await new Promise((resolve, reject) => {
                    const tx = db.transaction(FILE_SYSTEM_STORE_NAME, 'readonly');
                    const store = tx.objectStore(FILE_SYSTEM_STORE_NAME);
                    const request = store.get(key);
                    request.onsuccess = () => resolve(request.result || null);
                    request.onerror = () => reject(request.error);
                });
            } catch (err) {
                console.warn('Failed to restore stored handle:', err);
                return null;
            }
        };
        const writeStoredHandle = async (key, handle) => {
            try {
                const db = await openFileSystemDB();
                if (!db) return;
                await new Promise((resolve, reject) => {
                    const tx = db.transaction(FILE_SYSTEM_STORE_NAME, 'readwrite');
                    tx.oncomplete = () => resolve();
                    tx.onerror = () => reject(tx.error);
                    tx.objectStore(FILE_SYSTEM_STORE_NAME).put(handle, key);
                });
            } catch (err) {
                console.warn('Failed to persist stored handle:', err);
            }
        };
        const deleteStoredHandle = async (key) => {
            try {
                const db = await openFileSystemDB();
                if (!db) return;
                await new Promise((resolve, reject) => {
                    const tx = db.transaction(FILE_SYSTEM_STORE_NAME, 'readwrite');
                    tx.oncomplete = () => resolve();
                    tx.onerror = () => reject(tx.error);
                    tx.objectStore(FILE_SYSTEM_STORE_NAME).delete(key);
                });
            } catch (err) {
                console.warn('Failed to clear stored handle:', err);
            }
        };
        const queryHandlePermission = async (handle, mode = 'read') => {
            if (!handle?.queryPermission) return 'granted';
            try {
                return await handle.queryPermission({ mode });
            } catch (err) {
                return 'prompt';
            }
        };
        const requestHandlePermission = async (handle, mode = 'read') => {
            if (!handle?.requestPermission) return 'granted';
            try {
                return await handle.requestPermission({ mode });
            } catch (err) {
                return 'denied';
            }
        };
        const ensureHandlePermission = async (handle, mode = 'read', promptUser = false) => {
            if (!handle) return false;
            const currentPermission = await queryHandlePermission(handle, mode);
            if (currentPermission === 'granted') return true;
            if (!promptUser) return false;
            return (await requestHandlePermission(handle, mode)) === 'granted';
        };
        const setCurrentProjectHandle = async (fileHandle = null, fileName = '') => {
            currentProjectFileHandle = fileHandle || null;
            currentProjectFileName = fileHandle?.name || fileName || '';
            if (currentProjectFileHandle) await writeStoredHandle(CURRENT_PROJECT_HANDLE_KEY, currentProjectFileHandle);
            else await deleteStoredHandle(CURRENT_PROJECT_HANDLE_KEY);
            updateSaveStatus();
        };
        /*
        const ensureSaveDirectoryHandle = async ({ promptUser = false, writeAccess = false, forcePick = false } = {}) => {
            const mode = writeAccess ? 'readwrite' : 'read';
            if (!window.showDirectoryPicker) return null;

            if (!saveDirectoryHandle && !forcePick) {
                saveDirectoryHandle = await readStoredHandle(SAVE_DIRECTORY_HANDLE_KEY);
            }

            if (forcePick) {
                saveDirectoryHandle = null;
            }

            if (saveDirectoryHandle) {
                const allowed = await ensureHandlePermission(saveDirectoryHandle, mode, promptUser);
                if (allowed) {
                    updateSaveStatus();
                    return saveDirectoryHandle;
                }
            }

            if (!promptUser) return null;

            try {
                const pickedHandle = await window.showDirectoryPicker({
                    id: 'cutscene-editor-save-folder',
                    mode
                });
                saveDirectoryHandle = pickedHandle;
                await writeStoredHandle(SAVE_DIRECTORY_HANDLE_KEY, pickedHandle);
                updateSaveStatus('資料夾已連線');
                return pickedHandle;
            } catch (err) {
                if (err?.name !== 'AbortError') {
                    alert(`無法設定存檔資料夾: ${err.message}`);
                }
                return null;
            }
        };
        */
        const ensureSaveDirectoryHandle = async ({ promptUser = false, writeAccess = false, forcePick = false } = {}) => {
            const mode = writeAccess ? 'readwrite' : 'read';
            if (!window.showDirectoryPicker) return null;

            if (!saveDirectoryHandle && !forcePick) {
                saveDirectoryHandle = await readStoredHandle(SAVE_DIRECTORY_HANDLE_KEY);
            }

            if (forcePick) {
                saveDirectoryHandle = null;
            }

            if (saveDirectoryHandle) {
                const allowed = await ensureHandlePermission(saveDirectoryHandle, mode, promptUser);
                if (allowed) {
                    updateSaveStatus();
                    return saveDirectoryHandle;
                }
            }

            if (!promptUser) return null;

            try {
                const pickedHandle = await window.showDirectoryPicker({
                    id: 'cutscene-editor-save-folder',
                    mode
                });
                saveDirectoryHandle = pickedHandle;
                await writeStoredHandle(SAVE_DIRECTORY_HANDLE_KEY, pickedHandle);
                updateSaveStatus('folder connected');
                return pickedHandle;
            } catch (err) {
                if (err?.name !== 'AbortError') {
                    alert(`Failed to set save folder: ${err.message}`);
                }
                return null;
            }
        };
        const chooseSaveDirectory = async (refreshAfterPick = false) => {
            const directoryHandle = await ensureSaveDirectoryHandle({ promptUser: true, writeAccess: true, forcePick: true });
            if (!directoryHandle) return null;
            await setCurrentProjectHandle(null, currentProjectFileName);
            if (refreshAfterPick && projectFileModalOpen) {
                await refreshProjectFileList();
            }
            return directoryHandle;
        };
        const openProjectFileModal = () => {
            if (!projectFileModal) return;
            projectFileModal.hidden = false;
            projectFileModalOpen = true;
            document.body.classList.add('modal-open');
        };
        const closeProjectFileModal = () => {
            if (!projectFileModal) return;
            projectFileModal.hidden = true;
            projectFileModalOpen = false;
            document.body.classList.remove('modal-open');
        };
        const buildLayerNoteModal = () => {
            const overlay = document.createElement('div');
            overlay.id = 'layer-note-modal';
            overlay.className = 'modal-overlay';
            overlay.hidden = true;

            const card = document.createElement('div');
            card.className = 'modal-card';
            card.setAttribute('role', 'dialog');
            card.setAttribute('aria-modal', 'true');
            card.setAttribute('aria-labelledby', 'layer-note-modal-title');

            const header = document.createElement('div');
            header.className = 'modal-header';

            const titleWrap = document.createElement('div');
            layerNoteModalTitle = document.createElement('h2');
            layerNoteModalTitle.className = 'modal-title';
            layerNoteModalTitle.id = 'layer-note-modal-title';
            layerNoteModalTitle.textContent = '圖層註解';
            layerNoteModalSubtitle = document.createElement('p');
            layerNoteModalSubtitle.className = 'modal-subtitle';
            layerNoteModalSubtitle.textContent = '雙擊圖層可快速新增或修改註解。';
            titleWrap.appendChild(layerNoteModalTitle);
            titleWrap.appendChild(layerNoteModalSubtitle);

            const closeBtn = document.createElement('button');
            closeBtn.type = 'button';
            closeBtn.className = 'modal-close-btn';
            closeBtn.setAttribute('aria-label', '關閉');
            closeBtn.textContent = 'x';
            closeBtn.addEventListener('click', closeLayerNoteModal);

            header.appendChild(titleWrap);
            header.appendChild(closeBtn);

            const body = document.createElement('div');
            body.className = 'layer-note-modal-body';

            layerNoteModalMeta = document.createElement('p');
            layerNoteModalMeta.className = 'layer-note-modal-meta';
            body.appendChild(layerNoteModalMeta);

            layerNoteModalTextarea = document.createElement('textarea');
            layerNoteModalTextarea.id = 'layer-note-modal-input';
            layerNoteModalTextarea.rows = 8;
            layerNoteModalTextarea.placeholder = '例如：主角立繪、夜景背景、翻頁時要淡入...';
            layerNoteModalTextarea.addEventListener('keydown', (event) => {
                if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
                    event.preventDefault();
                    saveLayerNoteModal();
                }
            });
            body.appendChild(layerNoteModalTextarea);

            const actions = document.createElement('div');
            actions.className = 'modal-actions';

            const leftActions = document.createElement('div');
            leftActions.className = 'modal-actions-left';
            leftActions.appendChild(createProjectModalButton('清空', 'btn-import', () => {
                if (!layerNoteModalTextarea) return;
                layerNoteModalTextarea.value = '';
                layerNoteModalTextarea.focus();
            }));

            const rightActions = document.createElement('div');
            rightActions.className = 'modal-actions-right';
            rightActions.appendChild(createProjectModalButton('取消', 'btn-import', closeLayerNoteModal));
            layerNoteModalSaveButton = createProjectModalButton('儲存註解', 'btn-export', saveLayerNoteModal);
            rightActions.appendChild(layerNoteModalSaveButton);

            actions.appendChild(leftActions);
            actions.appendChild(rightActions);

            card.appendChild(header);
            card.appendChild(body);
            card.appendChild(actions);
            overlay.appendChild(card);

            overlay.addEventListener('click', (event) => {
                if (event.target === overlay) closeLayerNoteModal();
            });

            document.body.appendChild(overlay);
            layerNoteModal = overlay;
        };
        const openLayerNoteModal = (objId = selectedObjectId) => {
            const targetObj = animObjects.find(obj => obj.id === objId);
            if (!targetObj) return;
            if (!layerNoteModal) buildLayerNoteModal();

            if (selectedObjectId !== objId) {
                selectObject(objId);
            }

            const hasNote = normalizeObjectNote(targetObj.note).length > 0;
            layerNoteModalObjectId = objId;
            layerNoteModalTitle.textContent = hasNote ? '修改圖層註解' : '新增圖層註解';
            layerNoteModalSubtitle.textContent = hasNote
                ? '編輯這個圖層的註解內容。'
                : '幫這個圖層補上一段註解，之後在清單與時間軸都看得到摘要。';
            layerNoteModalMeta.textContent = `圖層：${targetObj.name}`;
            layerNoteModalTextarea.value = targetObj.note || '';
            layerNoteModalSaveButton.textContent = hasNote ? '儲存修改' : '新增註解';

            layerNoteModal.hidden = false;
            layerNoteModalOpen = true;
            document.body.classList.add('modal-open');

            requestAnimationFrame(() => {
                layerNoteModalTextarea.focus();
                const cursorPos = layerNoteModalTextarea.value.length;
                layerNoteModalTextarea.setSelectionRange(cursorPos, cursorPos);
            });
        };
        const closeLayerNoteModal = () => {
            if (!layerNoteModal) return;
            layerNoteModal.hidden = true;
            layerNoteModalOpen = false;
            layerNoteModalObjectId = null;
            document.body.classList.remove('modal-open');
        };
        const saveLayerNoteModal = () => {
            const targetObj = animObjects.find(obj => obj.id === layerNoteModalObjectId);
            if (!targetObj || !layerNoteModalTextarea) {
                closeLayerNoteModal();
                return;
            }

            targetObj.note = normalizeObjectNote(layerNoteModalTextarea.value);
            closeLayerNoteModal();
            updateUIState();
        };
        const renderProjectFileListMessage = (message) => {
            if (!projectFileListEl) return;
            projectFileListEl.innerHTML = '';
            const empty = document.createElement('div');
            empty.className = 'project-file-empty';
            empty.textContent = message;
            projectFileListEl.appendChild(empty);
        };
        const collectProjectFiles = async (directoryHandle) => {
            const entries = [];
            for await (const entry of directoryHandle.values()) {
                if (entry.kind !== 'file' || !entry.name.toLowerCase().endsWith('.json')) continue;
                const file = await entry.getFile();
                entries.push({
                    name: entry.name,
                    handle: entry,
                    lastModified: file.lastModified,
                    size: file.size
                });
            }
            return entries.sort((a, b) => b.lastModified - a.lastModified);
        };
        /*
        const refreshProjectFileList = async () => {
            if (!window.showDirectoryPicker) {
                closeProjectFileModal();
                jsonImportInput?.click();
                return;
            }

            const directoryHandle = await ensureSaveDirectoryHandle({ promptUser: true, writeAccess: false });
            if (!directoryHandle) return;

            openProjectFileModal();
            renderProjectFileListMessage('讀取 save 資料夾中...');
            projectFileModalSubtitle.textContent = `目前資料夾：${directoryHandle.name}`;

            try {
                const files = await collectProjectFiles(directoryHandle);
                if (files.length === 0) {
                    renderProjectFileListMessage('目前沒有可讀取的 JSON 工程檔。');
                    return;
                }

                projectFileListEl.innerHTML = '';
                files.forEach((item) => {
                    const button = document.createElement('button');
                    button.type = 'button';
                    button.className = 'project-file-item';
                    button.addEventListener('click', async () => {
                        await loadProjectFromHandle(item.handle);
                    });

                    const info = document.createElement('div');
                    const nameEl = document.createElement('div');
                    nameEl.className = 'project-file-name';
                    nameEl.textContent = item.name;
                    const meta = document.createElement('div');
                    meta.className = 'project-file-meta';
                    const timeEl = document.createElement('span');
                    timeEl.textContent = formatLocalDateTime(item.lastModified);
                    const sizeEl = document.createElement('span');
                    sizeEl.textContent = formatBytes(item.size);
                    meta.appendChild(timeEl);
                    meta.appendChild(sizeEl);
                    info.appendChild(nameEl);
                    info.appendChild(meta);

                    const action = document.createElement('span');
                    action.className = 'project-file-action';
                    action.textContent = '載入';

                    button.appendChild(info);
                    button.appendChild(action);
                    projectFileListEl.appendChild(button);
                });
            } catch (err) {
                renderProjectFileListMessage(`讀取存檔清單失敗: ${err.message}`);
            }
        };
        */
        const refreshProjectFileList = async () => {
            if (!window.showDirectoryPicker) {
                closeProjectFileModal();
                jsonImportInput?.click();
                return;
            }

            const directoryHandle = await ensureSaveDirectoryHandle({ promptUser: true, writeAccess: false });
            if (!directoryHandle) return;

            openProjectFileModal();
            renderProjectFileListMessage('Loading save folder...');
            projectFileModalSubtitle.textContent = `Current folder: ${directoryHandle.name}`;

            try {
                const files = await collectProjectFiles(directoryHandle);
                if (files.length === 0) {
                    renderProjectFileListMessage('No JSON project files found.');
                    return;
                }

                projectFileListEl.innerHTML = '';
                files.forEach((item) => {
                    const button = document.createElement('button');
                    button.type = 'button';
                    button.className = 'project-file-item';
                    button.addEventListener('click', async () => {
                        await loadProjectFromHandle(item.handle);
                    });

                    const info = document.createElement('div');
                    const nameEl = document.createElement('div');
                    nameEl.className = 'project-file-name';
                    nameEl.textContent = item.name;
                    const meta = document.createElement('div');
                    meta.className = 'project-file-meta';
                    const timeEl = document.createElement('span');
                    timeEl.textContent = formatLocalDateTime(item.lastModified);
                    const sizeEl = document.createElement('span');
                    sizeEl.textContent = formatBytes(item.size);
                    meta.appendChild(timeEl);
                    meta.appendChild(sizeEl);
                    info.appendChild(nameEl);
                    info.appendChild(meta);

                    const action = document.createElement('span');
                    action.className = 'project-file-action';
                    action.textContent = 'Load';

                    button.appendChild(info);
                    button.appendChild(action);
                    projectFileListEl.appendChild(button);
                });
            } catch (err) {
                renderProjectFileListMessage(`Failed to read save list: ${err.message}`);
            }
        };
        const downloadProjectJson = (dataStr, fileName) => {
            const a = document.createElement('a');
            const blobUrl = URL.createObjectURL(new Blob([dataStr], { type: 'application/json' }));
            a.href = blobUrl;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(blobUrl);
        };
        const startAutoBackupTimer = () => {
            if (autoBackupTimerId) clearInterval(autoBackupTimerId);
            autoBackupTimerId = window.setInterval(() => {
                runAutoBackup().catch((err) => console.error('Auto backup failed:', err));
            }, AUTO_BACKUP_INTERVAL_MS);
        };
        const canLoadImageSource = (src) => new Promise((resolve) => {
            if (!src) {
                resolve(false);
                return;
            }
            const probe = new Image();
            probe.onload = () => resolve(true);
            probe.onerror = () => resolve(false);
            probe.src = withCacheBuster(src);
        });
        const resolveImportedImageSource = async (objData) => {
            const savedAssetPath = normalizePath(objData?.assetPath || '');
            const fallbackAssetPath = buildDefaultAssetPath(objData?.name);
            const candidates = [...new Set([savedAssetPath, fallbackAssetPath].filter(Boolean))];

            for (const assetPath of candidates) {
                if (await canLoadImageSource(assetPath)) {
                    return {
                        displaySrc: withCacheBuster(assetPath),
                        storedSrc: objData.src,
                        assetPath
                    };
                }
            }

            return {
                displaySrc: objData.src,
                storedSrc: objData.src,
                assetPath: savedAssetPath || fallbackAssetPath
            };
        };
        const normalizeObjectNote = (note) => String(note || '').replace(/\r\n/g, '\n').trim();
        const getObjectNoteSummary = (note, maxLength = 28) => {
            const singleLine = normalizeObjectNote(note).replace(/\s+/g, ' ');
            return singleLine.length > maxLength ? `${singleLine.slice(0, maxLength - 3)}...` : singleLine;
        };
        const getObjectDisplayTitle = (obj) => {
            const note = normalizeObjectNote(obj?.note);
            return note ? `${obj.name}\n註解: ${note}` : obj.name;
        };
        const loadSidebarSectionState = () => {
            try {
                return JSON.parse(localStorage.getItem(SIDEBAR_SECTION_STORAGE_KEY) || '{}');
            } catch (err) {
                return {};
            }
        };
        const sidebarSectionState = loadSidebarSectionState();
        const loadSidebarSubsectionState = () => {
            try {
                return JSON.parse(localStorage.getItem(SIDEBAR_SUBSECTION_STORAGE_KEY) || '{}');
            } catch (err) {
                return {};
            }
        };
        const sidebarSubsectionState = loadSidebarSubsectionState();
        const saveSidebarSectionState = () => {
            try {
                localStorage.setItem(SIDEBAR_SECTION_STORAGE_KEY, JSON.stringify(sidebarSectionState));
            } catch (err) {
            }
        };
        const saveSidebarSubsectionState = () => {
            try {
                localStorage.setItem(SIDEBAR_SUBSECTION_STORAGE_KEY, JSON.stringify(sidebarSubsectionState));
            } catch (err) {
            }
        };
        const loadBottomPanelHeight = () => {
            try {
                return getNum(localStorage.getItem(BOTTOM_PANEL_HEIGHT_STORAGE_KEY), 250);
            } catch (err) {
                return 250;
            }
        };
        const getBottomPanelHeightBounds = () => {
            const viewportHeight = Math.max(window.innerHeight || 0, document.documentElement.clientHeight || 0);
            const maxHeight = Math.max(
                BOTTOM_PANEL_MIN_HEIGHT,
                viewportHeight - WORKSPACE_MIN_HEIGHT - TIMELINE_RESIZER_HEIGHT
            );
            return { min: BOTTOM_PANEL_MIN_HEIGHT, max: maxHeight };
        };
        const clampBottomPanelHeight = (height) => {
            const bounds = getBottomPanelHeightBounds();
            return Math.min(bounds.max, Math.max(bounds.min, Math.round(getNum(height, 250))));
        };
        const applyBottomPanelHeight = (height, persist = true) => {
            const clampedHeight = clampBottomPanelHeight(height);
            document.documentElement.style.setProperty('--bottom-panel-height', `${clampedHeight}px`);
            if (persist) {
                try {
                    localStorage.setItem(BOTTOM_PANEL_HEIGHT_STORAGE_KEY, String(clampedHeight));
                } catch (err) {
                }
            }
            return clampedHeight;
        };
        const stopTimelineResize = (persist = true) => {
            if (!timelinePanelResize.isDragging) return;
            timelinePanelResize.isDragging = false;
            document.body.classList.remove('is-resizing-timeline');
            if (persist) {
                applyBottomPanelHeight(bottomPanel.getBoundingClientRect().height, true);
            }
        };
        const stripDataUrlPrefix = (dataUrl) => {
            const parts = String(dataUrl || '').split(',', 2);
            return parts.length === 2 ? parts[1] : '';
        };
        const createObjectId = () => Date.now() + Math.floor(Math.random() * 1000000);
        const readFileAsText = (file) => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error || new Error(`讀取 ${file.name} 失敗`));
            reader.readAsText(file);
        });
        const readFileAsDataURL = (file) => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error || new Error(`讀取 ${file.name} 失敗`));
            reader.readAsDataURL(file);
        });

        // --- 縮放功能 ---
        const parseFntAttributeString = (source = '') => {
            const attributes = {};
            const pattern = /([a-zA-Z0-9_]+)=("[^"]*"|[^\s]+)/g;
            let match;
            while ((match = pattern.exec(source)) !== null) {
                const [, key, rawValue] = match;
                attributes[key] = rawValue.startsWith('"') ? rawValue.slice(1, -1) : rawValue;
            }
            return attributes;
        };
        const buildBitmapFontPageAssetPath = (fontSourcePath, pageFile) => {
            const normalizedPage = normalizePath(pageFile || '');
            if (!normalizedPage) return '';
            if (normalizedPage.includes('/')) return normalizedPage;
            const normalizedSource = normalizePath(fontSourcePath || '');
            const lastSlashIndex = normalizedSource.lastIndexOf('/');
            if (lastSlashIndex < 0) return normalizedPage;
            return `${normalizedSource.slice(0, lastSlashIndex + 1)}${normalizedPage}`;
        };
        const normalizeBitmapFontFromParsedData = (parsedFont, sourcePath = '') => {
            const pages = {};
            Object.entries(parsedFont.pages || {}).forEach(([id, page]) => {
                pages[String(id)] = {
                    id: getNum(page?.id ?? id, 0),
                    file: String(page?.file || ''),
                    assetPath: buildBitmapFontPageAssetPath(sourcePath, page?.file || ''),
                    mimeType: String(page?.mimeType || guessMimeTypeFromFilename(page?.file || '')),
                    src: String(page?.src || '')
                };
            });
            const chars = {};
            Object.entries(parsedFont.chars || {}).forEach(([id, charData]) => {
                chars[String(id)] = {
                    id: getNum(charData?.id ?? id, 0),
                    x: getNum(charData?.x, 0),
                    y: getNum(charData?.y, 0),
                    width: Math.max(0, getNum(charData?.width, 0)),
                    height: Math.max(0, getNum(charData?.height, 0)),
                    xoffset: getNum(charData?.xoffset, 0),
                    yoffset: getNum(charData?.yoffset, 0),
                    xadvance: getNum(charData?.xadvance, 0),
                    page: getNum(charData?.page, 0),
                    chnl: getNum(charData?.chnl, 0)
                };
            });
            const kernings = {};
            Object.entries(parsedFont.kernings || {}).forEach(([pair, amount]) => {
                kernings[String(pair)] = getNum(amount, 0);
            });
            return cloneBitmapFontData({
                name: parsedFont.name || stripExtension(getFileBaseName(sourcePath)) || 'Bitmap Font',
                sourcePath,
                lineHeight: Math.max(1, getNum(parsedFont.lineHeight, DEFAULT_TEXT_SIZE)),
                base: Math.max(0, getNum(parsedFont.base, 0)),
                scaleW: Math.max(1, getNum(parsedFont.scaleW, 1)),
                scaleH: Math.max(1, getNum(parsedFont.scaleH, 1)),
                pages,
                chars,
                kernings
            });
        };
        const parseBitmapFontText = (content, sourcePath = '') => {
            const parsed = {
                name: stripExtension(getFileBaseName(sourcePath)),
                sourcePath,
                lineHeight: DEFAULT_TEXT_SIZE,
                base: 0,
                scaleW: 1,
                scaleH: 1,
                pages: {},
                chars: {},
                kernings: {}
            };
            String(content || '').split(/\r?\n/).forEach((line) => {
                const trimmed = line.trim();
                if (!trimmed) return;
                const spaceIndex = trimmed.indexOf(' ');
                const keyword = spaceIndex === -1 ? trimmed : trimmed.slice(0, spaceIndex);
                const attrs = parseFntAttributeString(spaceIndex === -1 ? '' : trimmed.slice(spaceIndex + 1));
                if (keyword === 'info') {
                    if (attrs.face) parsed.name = attrs.face;
                    return;
                }
                if (keyword === 'common') {
                    parsed.lineHeight = Math.max(1, getNum(attrs.lineHeight, parsed.lineHeight));
                    parsed.base = Math.max(0, getNum(attrs.base, parsed.base));
                    parsed.scaleW = Math.max(1, getNum(attrs.scaleW, parsed.scaleW));
                    parsed.scaleH = Math.max(1, getNum(attrs.scaleH, parsed.scaleH));
                    return;
                }
                if (keyword === 'page') {
                    const pageId = String(getNum(attrs.id, 0));
                    parsed.pages[pageId] = {
                        id: getNum(attrs.id, 0),
                        file: String(attrs.file || '')
                    };
                    return;
                }
                if (keyword === 'char') {
                    const charId = String(getNum(attrs.id, -1));
                    if (charId === '-1') return;
                    parsed.chars[charId] = {
                        id: getNum(attrs.id, 0),
                        x: getNum(attrs.x, 0),
                        y: getNum(attrs.y, 0),
                        width: getNum(attrs.width, 0),
                        height: getNum(attrs.height, 0),
                        xoffset: getNum(attrs.xoffset, 0),
                        yoffset: getNum(attrs.yoffset, 0),
                        xadvance: getNum(attrs.xadvance, 0),
                        page: getNum(attrs.page, 0),
                        chnl: getNum(attrs.chnl, 0)
                    };
                    return;
                }
                if (keyword === 'kerning') {
                    const first = getNum(attrs.first, -1);
                    const second = getNum(attrs.second, -1);
                    if (first < 0 || second < 0) return;
                    parsed.kernings[`${first}:${second}`] = getNum(attrs.amount, 0);
                }
            });
            return normalizeBitmapFontFromParsedData(parsed, sourcePath);
        };
        const parseBitmapFontXml = (content, sourcePath = '') => {
            const parser = new DOMParser();
            const doc = parser.parseFromString(String(content || ''), 'application/xml');
            if (doc.querySelector('parsererror')) {
                throw new Error('The .fnt XML file could not be parsed.');
            }
            const common = doc.querySelector('common');
            const parsed = {
                name: doc.querySelector('info')?.getAttribute('face') || stripExtension(getFileBaseName(sourcePath)),
                sourcePath,
                lineHeight: Math.max(1, getNum(common?.getAttribute('lineHeight'), DEFAULT_TEXT_SIZE)),
                base: Math.max(0, getNum(common?.getAttribute('base'), 0)),
                scaleW: Math.max(1, getNum(common?.getAttribute('scaleW'), 1)),
                scaleH: Math.max(1, getNum(common?.getAttribute('scaleH'), 1)),
                pages: {},
                chars: {},
                kernings: {}
            };
            doc.querySelectorAll('pages > page').forEach((node) => {
                const pageId = String(getNum(node.getAttribute('id'), 0));
                parsed.pages[pageId] = {
                    id: getNum(node.getAttribute('id'), 0),
                    file: String(node.getAttribute('file') || '')
                };
            });
            doc.querySelectorAll('chars > char').forEach((node) => {
                const charId = String(getNum(node.getAttribute('id'), -1));
                if (charId === '-1') return;
                parsed.chars[charId] = {
                    id: getNum(node.getAttribute('id'), 0),
                    x: getNum(node.getAttribute('x'), 0),
                    y: getNum(node.getAttribute('y'), 0),
                    width: getNum(node.getAttribute('width'), 0),
                    height: getNum(node.getAttribute('height'), 0),
                    xoffset: getNum(node.getAttribute('xoffset'), 0),
                    yoffset: getNum(node.getAttribute('yoffset'), 0),
                    xadvance: getNum(node.getAttribute('xadvance'), 0),
                    page: getNum(node.getAttribute('page'), 0),
                    chnl: getNum(node.getAttribute('chnl'), 0)
                };
            });
            doc.querySelectorAll('kernings > kerning').forEach((node) => {
                const first = getNum(node.getAttribute('first'), -1);
                const second = getNum(node.getAttribute('second'), -1);
                if (first < 0 || second < 0) return;
                parsed.kernings[`${first}:${second}`] = getNum(node.getAttribute('amount'), 0);
            });
            return normalizeBitmapFontFromParsedData(parsed, sourcePath);
        };
        const parseBitmapFontContent = (content, sourcePath = '') => {
            const trimmed = String(content || '').trim();
            if (!trimmed) throw new Error('The .fnt file is empty.');
            return trimmed.startsWith('<')
                ? parseBitmapFontXml(trimmed, sourcePath)
                : parseBitmapFontText(trimmed, sourcePath);
        };
        const findBitmapFontPageFile = (files, pageFile, expectedAssetPath = '') => {
            const expectedName = getFileBaseName(pageFile);
            const expectedPath = normalizePath(expectedAssetPath || pageFile);
            return files.find((file) => {
                const filePath = normalizePath(file.webkitRelativePath || file.name);
                return filePath === expectedPath
                    || normalizePath(file.name) === normalizePath(pageFile)
                    || getFileBaseName(filePath) === expectedName;
            }) || null;
        };
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

        const tintFilterSvg = document.createElementNS(SVG_NS, 'svg');
        tintFilterSvg.setAttribute('width', '0');
        tintFilterSvg.setAttribute('height', '0');
        tintFilterSvg.style.position = 'absolute';
        tintFilterSvg.style.pointerEvents = 'none';
        tintFilterSvg.style.opacity = '0';
        const tintFilterDefs = document.createElementNS(SVG_NS, 'defs');
        tintFilterSvg.appendChild(tintFilterDefs);
        document.body.appendChild(tintFilterSvg);

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
                /*
                return Promise.reject(new Error(`目前頁面已載入 Spine ${spineRuntimeState.loadedVersion} runtime，無法混用 ${runtimeVersion} 匯出版本。`));
                */
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
                    /*
                    reject(new Error(`Spine ${runtimeVersion} runtime 載入失敗，請確認網路連線與 skeleton 版本相符。`));
                    */
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
                selectObject(objId, {
                    preserveKeyframeSelection: objId === selectedObjectId
                });
            });
            return wrapper;
        }

        function finalizeNewObject(newObj) {
            newObj.trackVisible = newObj.trackVisible !== false;
            if (newObj.domWrapper?.dataset) {
                newObj.domWrapper.dataset.trackVisible = newObj.trackVisible ? 'true' : 'false';
            }
            animObjects.push(newObj);
            updateZIndices();
            updateUIState();
            selectObject(newObj.id);
            btnPlay.disabled = false;
            return newObj;
        }

        function getCanvasDisplayScale() {
            return outputMask.enabled ? canvasZoom * canvasViewportBaseScale : canvasZoom;
        }

        function updateOutputMaskStatus() {
            if (outputMask.enabled) {
                outputMaskInput.value = `${outputMask.width}x${outputMask.height}`;
                outputMaskStatus.innerText = `目前遮罩：${outputMask.width} x ${outputMask.height}`;
            } else {
                outputMaskInput.value = '';
                outputMaskStatus.innerText = '目前未啟用遮罩';
            }
        }

        function updateCanvasViewportTransform() {
            canvasViewport.style.transform = `translate(-50%, -50%) scale(${getCanvasDisplayScale()})`;
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
            const parsed = parseOutputMaskValue(outputMaskInput.value);
            if (!parsed) {
                alert('請輸入像 1920x1080 或 720x480 這樣的尺寸。');
                return;
            }
            outputMask = { enabled: true, width: parsed.width, height: parsed.height };
            updateCanvasMaskLayout();
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
            if (outputMask.enabled) {
                canvasMaskFrame.style.transform = `translate(-50%, -50%) scale(${canvasZoom})`;
                canvasViewport.style.transform = `translate(-50%, -50%) scale(${canvasViewportBaseScale})`;
            } else {
                canvasMaskFrame.style.transform = 'translate(-50%, -50%)';
                canvasViewport.style.transform = `translate(-50%, -50%) scale(${canvasZoom})`;
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

        function setupSidebarSubsections() {
            if (!document.getElementById('sidebar-section-layers')?.dataset.subsectionsReady) {
                const layersBody = document.getElementById('sidebar-section-layers');
                const imageAddWrapper = fileInput.parentElement;
                const spineAddWrapper = spineInput.parentElement;
                const layerListContainer = document.getElementById('object-list-container');
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

                const addPanel = createSidebarSubpanel('layer-add', '新增物件');
                addPanel.body.append(imageAddWrapper, textAddWrapper, bitmapTextAddWrapper, blockAddWrapper, spineAddWrapper);

                const listPanel = createSidebarSubpanel('layer-list', '圖層清單');
                listPanel.body.appendChild(layerListContainer);

                layersBody.innerHTML = '';
                layersBody.append(addPanel.wrapper, listPanel.wrapper);
                layersBody.dataset.subsectionsReady = 'true';
            }

            if (!document.getElementById('sidebar-section-properties')?.dataset.subsectionsReady) {
                const propertiesBody = document.getElementById('sidebar-section-properties');
                const maskGroup = outputMaskStatus.closest('.control-group');

                objectSettingsPanel = createSidebarSubpanel('prop-object', '物件專屬設定').wrapper;
                objectSettingsPanel.id = 'object-settings-panel';
                objectSettingsPanel.style.display = 'none';
                const objectSettingsBody = objectSettingsPanel.querySelector('.subpanel-body');

                blockPanel = document.createElement('div');
                blockPanel.id = 'block-panel';
                blockPanel.style.display = 'none';
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
                textPanel.style.display = 'none';
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

                propertiesBody.innerHTML = '';
                propertiesBody.append(outputPanel.wrapper, transformPanel.wrapper, effectsPanel.wrapper, objectSettingsPanel);
                propertiesBody.dataset.subsectionsReady = 'true';
            }

            if (!document.getElementById('sidebar-section-snapshot')?.dataset.subsectionsReady) {
                const snapshotBody = document.getElementById('sidebar-section-snapshot');
                const intervalGroup = intervalInput.closest('.control-group');
                const clipboardRow = btnCopyKf.closest('.keyframe-clipboard-row');

                const timingPanel = createSidebarSubpanel('snapshot-timing', '影格設定');
                timingPanel.body.appendChild(intervalGroup);

                const actionsPanel = createSidebarSubpanel('snapshot-actions', '影格操作');
                actionsPanel.body.append(btnSnapshot, btnDeleteKf, clipboardRow, updateHint);

                snapshotBody.innerHTML = '';
                snapshotBody.append(timingPanel.wrapper, actionsPanel.wrapper);
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
                selectObject(objId, {
                    preserveKeyframeSelection: objId === selectedObjectId
                });
            });
            return wrapper;
        }

        function finalizeNewObject(newObj) {
            newObj.trackVisible = newObj.trackVisible !== false;
            if (newObj.domWrapper?.dataset) {
                newObj.domWrapper.dataset.trackVisible = newObj.trackVisible ? 'true' : 'false';
            }
            animObjects.push(newObj);
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

        setupProjectFileToolbar();
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
        textBitmapFontInput.style.display = 'none';
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
        buildLayerNoteModal();
        updateCanvasMaskLayout();
        window.addEventListener('resize', () => {
            applyBottomPanelHeight(bottomPanel.getBoundingClientRect().height, false);
            updateCanvasMaskLayout();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && projectFileModalOpen) {
                closeProjectFileModal();
                return;
            }
            if (e.key === 'Escape' && layerNoteModalOpen) {
                closeLayerNoteModal();
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
        document.addEventListener('mouseup', () => stopTimelineResize(true));
        document.addEventListener('mouseleave', () => stopTimelineResize(true));
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
                }
            });
        });

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

        layerNoteInput.addEventListener('input', () => {
            const targetObj = getSelectedObjectData();
            if (!targetObj) return;
            targetObj.note = layerNoteInput.value;
            renderObjectList();
            updateGlobalTimeline();
        });

        // --- 物件與圖層管理 ---
        fileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => { addNewObject(file.name, ev.target.result, '', ev.target.result, buildDefaultAssetPath(file.name)); fileInput.value = ''; };
            reader.readAsDataURL(file);
        });

        replaceImageInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            const targetObj = animObjects.find(obj => obj.id === replaceImageTargetObjectId);
            if (!file || !targetObj || targetObj.type !== IMAGE_TYPE) {
                replaceImageTargetObjectId = null;
                replaceImageInput.value = '';
                return;
            }

            const reader = new FileReader();
            reader.onload = (ev) => {
                updateImageObjectSource(targetObj, ev.target.result, ev.target.result, buildDefaultAssetPath(file.name));
                replaceImageTargetObjectId = null;
                replaceImageInput.value = '';
            };
            reader.onerror = () => {
                alert(`讀取圖片失敗：${file.name}`);
                replaceImageTargetObjectId = null;
                replaceImageInput.value = '';
            };
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

        function updateImageObjectSource(obj, imageSrc, storedSrc = null, assetPath = '') {
            if (!obj || obj.type !== IMAGE_TYPE) return;
            const imageEl = obj.domWrapper?.querySelector('img');
            if (imageEl) {
                imageEl.src = imageSrc;
            }
            obj.src = storedSrc || imageSrc;
            obj.assetPath = normalizePath(assetPath || obj.assetPath || buildDefaultAssetPath(obj.name));
            updateUIState();
        }

        function openReplaceImagePicker(objId) {
            const targetObj = animObjects.find(obj => obj.id === objId);
            if (!targetObj || targetObj.type !== IMAGE_TYPE) return;
            if (selectedObjectId !== objId) {
                selectObject(objId);
            }
            replaceImageTargetObjectId = objId;
            replaceImageInput.value = '';
            replaceImageInput.click();
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

        function selectObject(objId, options = {}) {
            const { preserveKeyframeSelection = false } = options;
            if (playState.isPlaying) stopAnimation();
            selectedObjectId = objId;
            if (!preserveKeyframeSelection) {
                selectedKeyframeIndex = null;
                selectedKeyframes = [];
                updateMultiSelectUI();
            }
            
            document.querySelectorAll('.anim-object-wrapper').forEach(el => el.classList.remove('selected'));
            if (objId !== null) {
                document.getElementById(`obj-wrap-${objId}`)?.classList.add('selected');
                const obj = getSelectedObjectData();
                if (obj) {
                    syncInputsWithState(obj.currentPose);
                    if (!(preserveKeyframeSelection && selectedKeyframeIndex !== null)) {
                        intervalInput.value = 0.5;
                    }
                }
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
                const replaceButton = obj.type === IMAGE_TYPE
                    ? `<button class="layer-btn" title="更換這個圖層的圖片" onclick="event.stopPropagation(); openReplaceImagePicker(${obj.id});">換圖</button>`
                    : '';
                actions.innerHTML = `
                    ${replaceButton}
                    <button class="layer-btn" title="上移圖層" onclick="event.stopPropagation(); moveLayer(${obj.id}, 1);">上</button>
                    <button class="layer-btn" title="下移圖層" onclick="event.stopPropagation(); moveLayer(${obj.id}, -1);">下</button>
                    <button class="layer-btn btn-danger" title="刪除圖層" onclick="event.stopPropagation(); deleteObject(${obj.id});">刪</button>
                `;

                li.appendChild(info);
                li.appendChild(actions);
                li.onclick = () => selectObject(obj.id);
                li.ondblclick = (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    openLayerNoteModal(obj.id);
                };
                actions.ondblclick = (event) => event.stopPropagation();
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
                header.ondblclick = (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    openLayerNoteModal(obj.id);
                };

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

            if (drag.isDragging) {
                drag.isDragging = false;
                if (selectedKeyframeIndex !== null) refreshKeyframeEditHint(false);
            }
        });


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
            updateHint.classList.remove('is-dragging');
            updateHint.style.display = 'none';
            intervalInput.value = 0.5;
        }

        function handleSnapshotAction() {
            if (selectedKeyframeIndex !== null) updateSelectedKeyframe();
            else recordNewSnapshot();
        }

        function refreshKeyframeEditHint(isDragging = false) {
            const obj = getSelectedObjectData();
            const targetKf = (selectedKeyframeIndex !== null && obj?.keyframes?.[selectedKeyframeIndex])
                ? obj.keyframes[selectedKeyframeIndex]
                : null;

            if (!targetKf) {
                updateHint.classList.remove('is-dragging');
                updateHint.style.display = 'none';
                return;
            }

            updateHint.classList.toggle('is-dragging', isDragging);
            updateHint.textContent = isDragging
                ? `正在拖曳畫面物件，放開後按「更新影格」會套用到 ${targetKf.time.toFixed(2)}s。`
                : `正在編輯 ${targetKf.time.toFixed(2)}s 影格。拖曳畫面物件後按「更新影格」即可覆蓋目前這格。`;
            updateHint.style.display = 'block';
        }

        function recordNewSnapshot() {
            const obj = getSelectedObjectData();
            if (!obj) return;
            const interval = Math.max(0, parseFloat(intervalInput.value) || 0);
            let newTime;
            if (obj.keyframes.length === 0) {
                newTime = interval;
            } else {
                const lastTime = obj.keyframes[obj.keyframes.length - 1].time;
                newTime = lastTime + Math.max(interval, 0.01); // 修復 Bug 1：防止相同時間點產生 NaN
            }
            newTime = Math.round(newTime * 100) / 100;

            const currentPose = clonePose(obj.currentPose || getInputPoseValues());
            obj.keyframes.push({ time: newTime, ...currentPose });
            obj.currentPose = { ...currentPose }; 
            updateUIState();
            
            const scrollArea = document.getElementById('timeline-scroll-area');
            centerTimelineOnTime(newTime);
        }

        function recordNewSnapshot() {
            const obj = getSelectedObjectData();
            if (!obj) return;
            const newTime = Math.max(0, Math.round((playState.currentTime || 0) * 100) / 100);

            const currentPose = clonePose(obj.currentPose || getInputPoseValues());
            const existingIndex = obj.keyframes.findIndex(kf => Math.abs(kf.time - newTime) < 0.0001);
            if (existingIndex >= 0) {
                obj.keyframes[existingIndex] = { time: newTime, ...currentPose };
                obj.currentPose = { ...currentPose };
                selectedKeyframes = [{ objId: obj.id, kfIndex: existingIndex }];
                enterEditingFrameMode(existingIndex);
                return;
            }

            obj.keyframes.push({ time: newTime, ...currentPose });
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
            refreshKeyframeEditHint(false);
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
            const targetIndex = selectedKeyframeIndex;
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

            obj.keyframes[selectedKeyframeIndex] = { time: newTime, ...editedPose };
            for (let i = selectedKeyframeIndex + 1; i < obj.keyframes.length; i++) {
                obj.keyframes[i].time = Math.max(0, obj.keyframes[i].time + timeDiff);
            }

            obj.currentPose = { ...editedPose }; 
            selectedKeyframes = [{ objId: obj.id, kfIndex: targetIndex }];
            enterEditingFrameMode(targetIndex);
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
            domWrapper.style.pointerEvents = finalVisible ? 'auto' : 'none';
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
            if (wrap.dataset.objId !== String(selectedObjectId)) return; 

            const objData = getSelectedObjectData();
            if (!objData) return;
            drag.isDragging = true; drag.sx = e.clientX; drag.sy = e.clientY;
            drag.objX = objData.currentPose.x; drag.objY = objData.currentPose.y;
            if (selectedKeyframeIndex !== null) refreshKeyframeEditHint(true);

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

        /* Legacy import/export block replaced below.
        function exportProjectJSON() {
            if (animObjects.length === 0) { alert("沒有工程可匯出"); return; }
            const exportData = animObjects.map(obj => ({
                name: obj.name,
                src: obj.src,
                keyframes: obj.keyframes.map(kf => ({ time: parseFloat(kf.time.toFixed(3)), x: Math.round(kf.x), y: Math.round(kf.y), rot: Math.round(kf.rot), scale: parseFloat(kf.scale.toFixed(2)), opacity: parseFloat(kf.opacity.toFixed(2)) }))
            }));
            const dataStr = JSON.stringify({ project_type: "PixelAnimator_NLE", version: 2, objects: exportData }, null, 2);
            const a = document.createElement('a');
            const blobUrl = URL.createObjectURL(new Blob([dataStr], { type: "application/json" }));
            a.href = blobUrl;
            a.download = "animation_project.json";
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            URL.revokeObjectURL(blobUrl);
        }

        function importProjectJSON() {
            document.getElementById('json-import-input').click();
        }

        document.getElementById('json-import-input').addEventListener('change', function (e) {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const data = JSON.parse(ev.target.result);

                    if (data.project_type !== 'PixelAnimator_NLE') {
                        alert('❌ 無效的工程檔案\n此 JSON 並非由本工具匯出'); return;
                    }
                    if (!Array.isArray(data.objects) || data.objects.length === 0) {
                        alert('❌ JSON 中找不到任何物件資料'); return;
                    }
                    if (!data.objects.every(o => o.src)) {
                        alert('⚠️ 舊版格式不含圖片資料，無法還原\n\n請重新用新版工具匯出後再匯入'); return;
                    }

                    let overwrite = true;
                    if (animObjects.length > 0) {
                        overwrite = confirm(
                            `匯入 ${data.objects.length} 個物件\n\n` +
                            `確定 → 清空畫布後匯入\n取消 → 合併加入現有工程`
                        );
                    }

                    if (overwrite) {
                        if (playState.isPlaying) stopAnimation();
                        animObjects.forEach(obj => obj.domWrapper?.remove());
                        animObjects = [];
                        selectedObjectId = null;
                        selectedKeyframeIndex = null;
                        selectedKeyframes = [];
                        updateMultiSelectUI();
                    }

                    data.objects.forEach(objData => {
                        addNewObject(objData.name, objData.src);
                        const newObj = animObjects[animObjects.length - 1];
                        newObj.keyframes = objData.keyframes.map(kf => ({ ...kf }));
                    });

                    btnPlay.disabled = animObjects.length === 0;
                    updateUIState();

                } catch (err) {
                    alert('❌ 匯入失敗：' + err.message);
                }
                e.target.value = '';
            };
            reader.readAsText(file);
        });
        */

        function exportProjectJSON() {
            if (animObjects.length === 0) { alert('No project data to export.'); return; }
            const exportData = animObjects.map(obj => ({
                name: obj.name,
                note: normalizeObjectNote(obj.note),
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
                    visible: kf.visible !== false,
                    tint: normalizeTintHex(kf.tint || DEFAULT_TINT),
                    tintStrength: parseFloat(getNum(kf.tintStrength, DEFAULT_TINT_STRENGTH).toFixed(2)),
                    hue: parseFloat(getNum(kf.hue, DEFAULT_HUE).toFixed(2)),
                    brightness: parseFloat(getNum(kf.brightness, DEFAULT_BRIGHTNESS).toFixed(2)),
                    contrast: parseFloat(getNum(kf.contrast, DEFAULT_CONTRAST).toFixed(2)),
                    blendMode: normalizeBlendMode(kf.blendMode)
                }))
            }));

            const dataStr = JSON.stringify({
                project_type: 'PixelAnimator_NLE',
                version: 6,
                mask: outputMask.enabled ? { width: outputMask.width, height: outputMask.height } : null,
                objects: exportData
            }, null, 2);
            const a = document.createElement('a');
            const blobUrl = URL.createObjectURL(new Blob([dataStr], { type: 'application/json' }));
            a.href = blobUrl;
            a.download = 'animation_project.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(blobUrl);
        }

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

        function importProjectJSON() {
            document.getElementById('json-import-input').click();
        }

        document.getElementById('json-import-input').addEventListener('change', function (e) {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = async (ev) => {
                try {
                    const data = JSON.parse(ev.target.result);

                    if (data.project_type !== 'PixelAnimator_NLE') {
                        alert('Unsupported project JSON format.');
                        return;
                    }
                    if (!Array.isArray(data.objects) || data.objects.length === 0) {
                        alert('This JSON file does not contain any objects.');
                        return;
                    }

                    const isSupportedObject = (obj) => {
                        if (!obj) return false;
                        if ((obj.type || IMAGE_TYPE) === SPINE_TYPE) return !!obj.spineData;
                        if ((obj.type || IMAGE_TYPE) === BLOCK_TYPE) return true;
                        return !!obj.src;
                    };
                    if (!data.objects.every(isSupportedObject)) {
                        alert('The imported JSON contains unsupported object data.');
                        return;
                    }

                    const importedMask = data.mask && Number.isFinite(data.mask.width) && Number.isFinite(data.mask.height)
                        ? { enabled: true, width: Math.max(1, Math.round(data.mask.width)), height: Math.max(1, Math.round(data.mask.height)) }
                        : { enabled: false, width: outputMask.width, height: outputMask.height };

                    let overwrite = true;
                    if (animObjects.length > 0) {
                        overwrite = confirm(`Import ${data.objects.length} objects and replace the current scene?`);
                    }

                    if (overwrite) {
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
                    }

                    outputMask = importedMask;
                    updateCanvasMaskLayout();

                    for (const objData of data.objects) {
                        const objectType = objData.type || IMAGE_TYPE;
                        if (objectType === SPINE_TYPE) {
                            const newObj = await addSpineObject({ ...objData.spineData, name: objData.name }, objData.keyframes || [], objData.note);
                            restoreImportedObjectTrackVisibility(newObj, objData.trackVisible);
                        } else if (objectType === BLOCK_TYPE) {
                            const newObj = addBlockObject(objData.blockData || {}, objData.note, objData.name || '方形圖塊');
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
                } catch (err) {
                    alert(`Project import failed: ${err.message}`);
                }

                e.target.value = '';
            };
            reader.readAsText(file);
        });

        /*
        async function writeProjectFileWithHandle(fileHandle, dataStr, statusText) {
            const allowed = await ensureHandlePermission(fileHandle, 'readwrite', true);
            if (!allowed) throw new Error('未取得檔案寫入權限。');
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
                    visible: kf.visible !== false,
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
            updateSaveStatus(fileName ? `已載入 ${fileName}` : '已載入工程');
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
                await writeProjectFileWithHandle(currentProjectFileHandle, serializeProjectDataV2(), '已直接存檔');
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
                updateSaveStatus('已下載 JSON');
                return;
            }

            try {
                const directoryHandle = await ensureSaveDirectoryHandle({ promptUser: true, writeAccess: true });
                if (!directoryHandle) return;

                const inputName = prompt('另存新檔名稱', suggestedName);
                if (inputName === null) return;
                const fileName = sanitizeProjectFileName(inputName);
                if (!fileName) {
                    alert('請輸入有效的檔名。');
                    return;
                }

                let shouldOverwrite = true;
                try {
                    await directoryHandle.getFileHandle(fileName);
                    shouldOverwrite = confirm(`${fileName} 已存在，要覆寫嗎？`);
                } catch (err) {
                    shouldOverwrite = true;
                }
                if (!shouldOverwrite) return;

                const fileHandle = await directoryHandle.getFileHandle(fileName, { create: true });
                await writeProjectFileWithHandle(fileHandle, dataStr, '已另存新檔');
            } catch (err) {
                alert(`Save as failed: ${err.message}`);
            }
        }

        async function loadProjectFromHandle(fileHandle) {
            try {
                const allowed = await ensureHandlePermission(fileHandle, 'read', true);
                if (!allowed) throw new Error('未取得檔案讀取權限。');
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
                updateSaveStatus('自動備份等待資料夾授權');
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
            updateSaveStatus(`已自動備份 ${backupName}`);
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
                updateSaveStatus('每 5 分鐘自動備份');
            } else {
                updateSaveStatus('目前瀏覽器僅支援下載/上傳 JSON');
            }
            startAutoBackupTimer();
        }

        initializeProjectFileSystem();
        */

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
    
