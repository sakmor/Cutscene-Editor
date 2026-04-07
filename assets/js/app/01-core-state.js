        // --- 核心資料結構 ---
        let animObjects = []; 
        let selectedObjectId = null; 
        let selectedKeyframeIndex = null; 
        let playState = { isPlaying: false, startTime: 0, animationFrameId: null, totalDuration: 0, currentTime: 0 };
        let keyframeClipboard = null;
        let outputMask = { enabled: false, width: 1920, height: 1080 };
        let exportState = { isExporting: false, currentTime: 0, progress: 0, label: 'Load' };
        let mp4MuxerLoaderPromise = null;
        let ffmpegWasmLoaderPromise = null;
        let ffmpegWasmLoadPromise = null;
        let ffmpegWasmInstance = null;

        let selectedKeyframes = []; // [{ objId, kfIndex }] — 複選影格
        let isoObjectId = null; // ISO 模式：只允許操作此物件的影格，null 表示未啟用
        let kfDrag = { isDragging: false, hasMoved: false, objId: null, kfIndex: null, startX: 0, startTime: 0, nodeEl: null, dragTargets: [] };
        let marqueeState = { isSelecting: false, hasMoved: false, additive: false, startX: 0, startY: 0, currentX: 0, currentY: 0, baseSelection: [] };
        let scrubState = { isScrubbing: false };
        let suppressObjectAutoRefresh = false;
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
        const DEFAULT_CAMERA_POSE = { ...DEFAULT_POSE };
        const DEFAULT_SPINE_SIZE = 320;
        const IMAGE_TYPE = 'image';
        const BLOCK_TYPE = 'block';
        const TEXT_TYPE = 'text';
        const SPINE_TYPE = 'spine';
        const CAMERA_TYPE = 'camera';
        const spineRuntimeState = { loadedVersion: null, loadingVersion: null, promise: null };
        const SVG_NS = 'http://www.w3.org/2000/svg';

        const BASE_PIXELS_PER_SEC = 150;
        const TIMELINE_ZOOM_MIN = 0.25;
        const TIMELINE_ZOOM_MAX = 4;
        const BOTTOM_PANEL_MIN_HEIGHT = 180;
        const WORKSPACE_MIN_HEIGHT = 220;
        const TIMELINE_RESIZER_HEIGHT = 10;
        const EXPORT_FPS = 30;
        const EXPORT_VIDEO_BITS_PER_SECOND = 12_000_000;
        const EXPORT_BACKGROUND_COLOR = '#000000';
        const EXPORT_IMAGE_QUALITY = 0.92;
        const MP4_MUXER_LOCAL_PATH = 'assets/js/vendor/mp4-muxer.js';
        const FFMPEG_WRAPPER_LOCAL_PATH = 'assets/js/vendor/ffmpeg/ffmpeg.js';
        const FFMPEG_CORE_LOCAL_PATH = 'assets/js/vendor/ffmpeg/ffmpeg-core.js';
        const FFMPEG_WASM_LOCAL_PATH = 'assets/js/vendor/ffmpeg/ffmpeg-core.wasm';
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
        const objectListEl = document.getElementById('object-list');
        const hiddenObjectListSection = document.getElementById('hidden-object-list-section');
        const hiddenObjectListEl = document.getElementById('hidden-object-list');
        const hiddenObjectListEmptyEl = document.getElementById('hidden-object-list-empty');
        const hiddenObjectListToggleCheckbox = document.getElementById('hidden-object-list-toggle');
        const layerNoteInput = document.getElementById('layer-note-input');
        const propsPanel = document.getElementById('props-panel');
        const tintPanel = document.getElementById('tint-panel');
        const keyframeOffsetPanel = document.getElementById('keyframe-offset-panel');
        const keyframeOffsetXInput = document.getElementById('keyframe-offset-x');
        const keyframeOffsetYInput = document.getElementById('keyframe-offset-y');
        const applyKeyframeOffsetBtn = document.getElementById('apply-keyframe-offset-btn');
        const keyframeOffsetStatus = document.getElementById('keyframe-offset-status');
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
        let keyframeOffsetFloatingPanel = null;
        let objectSettingsPanel = null;
        let blockPanel = null;
        let blockSizeInput = null;
        let blockColorInput = null;
        let textPanel = null;
        let textContentInput = null;
        let textSizeInput = null;
        let textLineHeightInput = null;
        let textLetterSpacingInput = null;
        let textAlignInput = null;
        let textColorInput = null;
        let textFontFamilyInput = null;
        let textBitmapFontStatus = null;
        let textImportFontButton = null;
        let textClearFontButton = null;
        let textBitmapFontInput = null;
        let textBitmapFontTarget = { mode: 'create', objId: null };
        let chatPanel = null;
        let chatPanelTitleEl = null;
        let chatContextEl = null;
        let chatLogEl = null;
        let chatEmptyEl = null;
        let chatRoleSelect = null;
        let chatInput = null;
        let chatSendButton = null;
        let chatClearButton = null;
        let chatPanelCurrentObjectId = null;
        const chatDrafts = Object.create(null);
        let saveStatusEl = null;
        let projectFileModal = null;
        let projectFileModalSubtitle = null;
        let projectFileListEl = null;
        let projectFileModalOpen = false;
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
        const normalizeKeyframeText = (text) => String(text ?? '').replace(/\r\n/g, '\n');
        const normalizeMessageHistoryEntry = (entry = {}) => {
            const role = String(entry.role || 'user').trim().toLowerCase();
            const normalizedRole = ['system', 'user', 'assistant', 'tool'].includes(role) ? role : 'user';
            const content = String(entry.content ?? entry.message ?? entry.text ?? '').replace(/\r\n/g, '\n');
            return {
                role: normalizedRole,
                content,
                timestamp: getNum(entry.timestamp ?? entry.ts, Date.now())
            };
        };
        const normalizeMessageHistory = (history = []) => {
            if (!Array.isArray(history)) return [];
            return history
                .map(normalizeMessageHistoryEntry)
                .filter(entry => entry.content.length > 0 || entry.role === 'system');
        };
        const cloneMessageHistory = (history = []) => normalizeMessageHistory(history).map(entry => ({ ...entry }));
        const serializeMessageHistory = (history = []) => cloneMessageHistory(history);
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
        const isCameraObject = (obj) => obj?.type === CAMERA_TYPE;
        const getCurrentCameraObject = () => animObjects.find(obj => isCameraObject(obj)) || null;
        const getCurrentCameraPose = () => getCurrentCameraObject()?.currentPose || DEFAULT_CAMERA_POSE;
        const clonePose = (pose = DEFAULT_POSE) => ({
            x: pose.x, y: pose.y, rot: pose.rot, scale: pose.scale, opacity: pose.opacity, visible: pose.visible !== false,
            ...normalizePoseEffects(pose)
        });
        const normalizeKeyframe = (kf) => {
            const normalized = { ...clonePose(kf || DEFAULT_POSE), time: getNum(kf?.time, 0) };
            if (kf && Object.prototype.hasOwnProperty.call(kf, 'text')) {
                normalized.text = normalizeKeyframeText(kf.text);
            }
            return normalized;
        };
        const setElementDisplay = (element, displayValue) => {
            if (element?.style) {
                element.style.display = displayValue;
            }
        };
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
        const isObjectTrackVisible = (obj) => isCameraObject(obj) ? true : obj?.trackVisible !== false;
        const isObjectCurrentlyVisible = (obj) => isObjectTrackVisible(obj) && obj?.currentPose?.visible !== false;
        const getCurrentVisibleValue = () => {
            const targetObj = getSelectedObjectData();
            return targetObj ? (targetObj.currentPose?.visible !== false) : true;
        };

        hiddenObjectListSection?.classList.add('hidden-object-list-section');
        if (hiddenObjectListToggleCheckbox) {
            hiddenObjectListToggleCheckbox.checked = true;
        }
        const getTrackVisibilityIcon = (isVisible) => isVisible
            ? `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z"></path><circle cx="12" cy="12" r="3"></circle></svg>`
            : `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18"></path><path d="M10.6 10.7a3 3 0 0 0 4 4"></path><path d="M9.4 5.5A11.4 11.4 0 0 1 12 5c6.5 0 10 7 10 7a18.8 18.8 0 0 1-4 4.9"></path><path d="M6.6 6.7C4 8.5 2 12 2 12s3.5 6 10 6a10.8 10.8 0 0 0 2.5-.3"></path></svg>`;
        const setTrackObjectVisibility = (objId, nextVisible) => {
            const targetObj = animObjects.find(obj => obj.id === objId);
            if (!targetObj) return;
            if (isCameraObject(targetObj)) return;
            if (selectedObjectId !== objId) {
                selectObject(objId);
            }
            targetObj.trackVisible = !!nextVisible;
            if (targetObj.domWrapper?.dataset) {
                targetObj.domWrapper.dataset.trackVisible = targetObj.trackVisible ? 'true' : 'false';
            }
            applyPoseToDOM(targetObj.domWrapper, targetObj.currentPose);
            if (selectedObjectId === objId) {
                syncInputsWithState(targetObj.currentPose);
            }
            updateUIState();
        };
        const toggleTrackObjectVisibility = (objId) => {
            const targetObj = animObjects.find(obj => obj.id === objId);
            if (!targetObj) return;
            setTrackObjectVisibility(objId, !isObjectTrackVisible(targetObj));
        };
        const updateHiddenObjectListToggleButton = () => {
            const showHiddenTracks = hiddenObjectListToggleCheckbox?.checked ?? true;
            tracksContainer?.classList.toggle('hide-hidden-tracks', !showHiddenTracks);
            if (hiddenObjectListToggleCheckbox) {
                hiddenObjectListToggleCheckbox.setAttribute('aria-checked', showHiddenTracks ? 'true' : 'false');
            }
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
        hiddenObjectListToggleCheckbox?.addEventListener('change', updateHiddenObjectListToggleButton);
        updateHiddenObjectListToggleButton();
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
