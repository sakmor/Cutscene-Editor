        // --- MP4 匯出 ---

        const exportObjectCanvas = document.createElement('canvas');
        const exportObjectCtx = exportObjectCanvas.getContext('2d', { alpha: true });
        const exportEffectCanvas = document.createElement('canvas');
        const exportEffectCtx = exportEffectCanvas.getContext('2d', { alpha: true });
        const bitmapFontPageImageCache = new Map();
        const animatedGifCache = new Map();
        const supportedCanvasBlendModes = (() => {
            const probeCanvas = document.createElement('canvas');
            const probeCtx = probeCanvas.getContext('2d');
            const supported = new Set(['source-over']);
            [
                'multiply', 'screen', 'overlay', 'darken', 'lighten',
                'color-dodge', 'color-burn', 'hard-light', 'soft-light',
                'difference', 'exclusion'
            ].forEach((mode) => {
                probeCtx.globalCompositeOperation = 'source-over';
                probeCtx.globalCompositeOperation = mode;
                if (probeCtx.globalCompositeOperation === mode) {
                    supported.add(mode);
                }
            });
            return supported;
        })();

        const exportMp4Buttons = Array.from(document.querySelectorAll('[data-export-mp4-trigger]'));

        const updateExportButtonState = (label = null) => {
            if (label !== null) exportState.label = label;
            exportMp4Buttons.forEach((button) => {
                button.disabled = exportState.isExporting;
                button.textContent = exportState.isExporting
                    ? exportState.label
                    : (button.id === 'btn-export-mp4' ? 'Load' : '匯出目前遮罩 MP4');
            });
        };
        updateExportButtonState();

        function waitForDelay(ms) {
            return new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));
        }

        function waitForAnimationFrames(count = 1) {
            return new Promise((resolve) => {
                const step = (remaining) => {
                    if (remaining <= 0) {
                        resolve();
                        return;
                    }
                    requestAnimationFrame(() => step(remaining - 1));
                };
                step(Math.max(1, count));
            });
        }

        function getSupportedMp4MimeType() {
            if (typeof MediaRecorder === 'undefined') return '';
            const candidates = [
                'video/mp4;codecs=avc1.42E01E',
                'video/mp4;codecs=avc1',
                'video/mp4;codecs=h264',
                'video/mp4'
            ];
            return candidates.find((mimeType) => MediaRecorder.isTypeSupported(mimeType)) || '';
        }

        function ensureMp4MuxerLibrary() {
            if (window.Mp4Muxer) return Promise.resolve(window.Mp4Muxer);
            if (mp4MuxerLoaderPromise) return mp4MuxerLoaderPromise;

            mp4MuxerLoaderPromise = new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = MP4_MUXER_LOCAL_PATH;
                script.async = true;
                script.onload = () => {
                    if (window.Mp4Muxer) resolve(window.Mp4Muxer);
                    else reject(new Error('MP4 muxer library loaded, but was not exposed on window.'));
                };
                script.onerror = () => reject(new Error(`Failed to load MP4 muxer library from ${MP4_MUXER_LOCAL_PATH}.`));
                document.head.appendChild(script);
            }).catch((err) => {
                mp4MuxerLoaderPromise = null;
                throw err;
            });

            return mp4MuxerLoaderPromise;
        }

        function ensureFFmpegWasmLibrary() {
            if (window.FFmpegWASM) return Promise.resolve(window.FFmpegWASM);
            if (ffmpegWasmLoaderPromise) return ffmpegWasmLoaderPromise;

            ffmpegWasmLoaderPromise = new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = FFMPEG_WRAPPER_LOCAL_PATH;
                script.async = true;
                script.onload = () => {
                    if (window.FFmpegWASM) resolve(window.FFmpegWASM);
                    else reject(new Error('FFmpeg wrapper loaded, but FFmpegWASM was not exposed on window.'));
                };
                script.onerror = () => reject(new Error(`Failed to load FFmpeg wrapper from ${FFMPEG_WRAPPER_LOCAL_PATH}.`));
                document.head.appendChild(script);
            }).catch((err) => {
                ffmpegWasmLoaderPromise = null;
                throw err;
            });

            return ffmpegWasmLoaderPromise;
        }

        async function ensureFFmpegWasmReady() {
            if (ffmpegWasmInstance?.loaded) return ffmpegWasmInstance;
            if (ffmpegWasmLoadPromise) return ffmpegWasmLoadPromise;

            ffmpegWasmLoadPromise = (async () => {
                const FFmpegWASM = await ensureFFmpegWasmLibrary();
                if (!ffmpegWasmInstance) {
                    ffmpegWasmInstance = new FFmpegWASM.FFmpeg();
                }
                if (!ffmpegWasmInstance.loaded) {
                    await ffmpegWasmInstance.load({
                        coreURL: FFMPEG_CORE_LOCAL_PATH,
                        wasmURL: FFMPEG_WASM_LOCAL_PATH
                    });
                }
                return ffmpegWasmInstance;
            })().catch((err) => {
                ffmpegWasmLoadPromise = null;
                throw err;
            });

            return ffmpegWasmLoadPromise;
        }

        async function getSupportedVideoEncoderConfig(width, height) {
            if (typeof VideoEncoder === 'undefined' || typeof VideoFrame === 'undefined') return null;

            const candidates = [
                {
                    codec: 'avc1.42001f',
                    muxerCodec: 'avc',
                    extra: { avc: { format: 'avc' } }
                },
                {
                    codec: 'avc1.42E01E',
                    muxerCodec: 'avc',
                    extra: { avc: { format: 'avc' } }
                },
                {
                    codec: 'avc1.4d001f',
                    muxerCodec: 'avc',
                    extra: { avc: { format: 'avc' } }
                },
                {
                    codec: 'avc1.64001f',
                    muxerCodec: 'avc',
                    extra: { avc: { format: 'avc' } }
                },
                {
                    codec: 'vp09.00.10.08',
                    muxerCodec: 'vp9'
                },
                {
                    codec: 'vp09.00.41.08',
                    muxerCodec: 'vp9'
                },
                {
                    codec: 'av01.0.08M.08',
                    muxerCodec: 'av1'
                },
                {
                    codec: 'av01.0.05M.08',
                    muxerCodec: 'av1'
                }
            ];

            for (const candidate of candidates) {
                const config = {
                    codec: candidate.codec,
                    width,
                    height,
                    bitrate: EXPORT_VIDEO_BITS_PER_SECOND,
                    framerate: EXPORT_FPS,
                    ...(candidate.extra || {})
                };

                try {
                    const support = await VideoEncoder.isConfigSupported(config);
                    if (support?.supported) {
                        return {
                            encoderConfig: support.config || config,
                            muxerCodec: candidate.muxerCodec,
                            codecLabel: candidate.codec
                        };
                    }
                } catch (err) {
                }
            }

            return null;
        }

        function getExportFileName(extension = 'mp4') {
            const baseName = String(currentProjectFileName || 'cutscene-export')
                .replace(/\.[^/.]+$/, '')
                .trim() || 'cutscene-export';
            const now = new Date();
            const timestamp = [
                now.getFullYear(),
                String(now.getMonth() + 1).padStart(2, '0'),
                String(now.getDate()).padStart(2, '0'),
                '-',
                String(now.getHours()).padStart(2, '0'),
                String(now.getMinutes()).padStart(2, '0'),
                String(now.getSeconds()).padStart(2, '0')
            ].join('');
            return `${baseName}-${timestamp}.${extension}`;
        }

        function downloadBlob(blob, fileName) {
            const link = document.createElement('a');
            const blobUrl = URL.createObjectURL(blob);
            link.href = blobUrl;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(blobUrl), 0);
        }

        function canvasToBlob(canvasEl, type, quality) {
            return new Promise((resolve, reject) => {
                canvasEl.toBlob((blob) => {
                    if (blob) resolve(blob);
                    else reject(new Error(`Failed to encode canvas as ${type}.`));
                }, type, quality);
            });
        }

        function formatFrameFileName(frameIndex, extension = 'jpg') {
            return `frame_${String(frameIndex).padStart(6, '0')}.${extension}`;
        }

        function isAnimatedGifObject(obj) {
            if (!obj || obj.type !== IMAGE_TYPE) return false;
            const src = String(obj.src || obj.domWrapper?.querySelector('img')?.src || '').toLowerCase();
            const assetPath = String(obj.assetPath || obj.name || '').toLowerCase();
            return src.startsWith('data:image/gif') || src.includes('.gif') || assetPath.endsWith('.gif');
        }

        async function ensureAnimatedGifData(obj) {
            if (!isAnimatedGifObject(obj) || typeof ImageDecoder === 'undefined') return null;

            const cacheKey = String(obj.id || obj.assetPath || obj.src || '');
            if (animatedGifCache.has(cacheKey)) {
                return animatedGifCache.get(cacheKey);
            }

            const promise = (async () => {
                const sourceUrl = obj.src || obj.domWrapper?.querySelector('img')?.src || '';
                const response = await fetch(sourceUrl);
                const buffer = await response.arrayBuffer();
                const decoder = new ImageDecoder({
                    data: buffer,
                    type: 'image/gif'
                });

                await decoder.tracks.ready;
                const track = decoder.tracks.selectedTrack;
                const frameCount = Math.max(1, track?.frameCount || 1);
                const frames = [];
                let totalDurationMs = 0;

                for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
                    const { image } = await decoder.decode({
                        frameIndex,
                        completeFrames: true
                    });
                    const bitmap = await createImageBitmap(image);
                    const durationMs = Math.max(20, Math.round((image.duration || 100000) / 1000));
                    image.close();
                    frames.push({
                        bitmap,
                        durationMs
                    });
                    totalDurationMs += durationMs;
                }

                const data = {
                    width: frames[0]?.bitmap?.width || obj.domWrapper?.querySelector('img')?.naturalWidth || 1,
                    height: frames[0]?.bitmap?.height || obj.domWrapper?.querySelector('img')?.naturalHeight || 1,
                    frames,
                    totalDurationMs: Math.max(20, totalDurationMs || 100)
                };
                obj.animatedGifData = data;
                return data;
            })().catch((err) => {
                animatedGifCache.delete(cacheKey);
                throw err;
            });

            animatedGifCache.set(cacheKey, promise);
            return promise;
        }

        function getAnimatedGifFrameAtTime(gifData, timeInSeconds) {
            if (!gifData || !Array.isArray(gifData.frames) || gifData.frames.length === 0) return null;
            const loopMs = Math.max(1, gifData.totalDurationMs || 1);
            let targetMs = ((Math.max(0, timeInSeconds) * 1000) % loopMs);
            for (const frame of gifData.frames) {
                if (targetMs < frame.durationMs) return frame;
                targetMs -= frame.durationMs;
            }
            return gifData.frames[gifData.frames.length - 1] || null;
        }

        function isGifPlaybackActivePose(pose) {
            if (!pose) return false;
            return pose.visible !== false && getNum(pose.opacity, 1) > 0.001;
        }

        function getAnimatedGifPlaybackTime(obj, sceneTime) {
            if (!obj?.keyframes?.length) return Math.max(0, sceneTime);

            let resetTime = 0;
            let wasActive = false;

            for (let index = 0; index < obj.keyframes.length; index++) {
                const kf = obj.keyframes[index];
                if (!kf || getNum(kf.time, 0) > sceneTime) break;

                const isActive = isGifPlaybackActivePose(kf);
                if (isActive && !wasActive) {
                    resetTime = getNum(kf.time, 0);
                }
                wasActive = isActive;
            }

            return Math.max(0, sceneTime - resetTime);
        }

        function getCanvasBlendMode(blendMode) {
            const normalized = normalizeBlendMode(blendMode);
            if (normalized === 'normal') return 'source-over';
            return supportedCanvasBlendModes.has(normalized) ? normalized : 'source-over';
        }

        function buildCanvasFilter(effects) {
            const filters = [];
            if (effects.hue !== DEFAULT_HUE) {
                filters.push(`hue-rotate(${effects.hue}deg)`);
            }
            if (effects.brightness !== DEFAULT_BRIGHTNESS) {
                filters.push(`brightness(${(effects.brightness / 100).toFixed(2)})`);
            }
            if (effects.contrast !== DEFAULT_CONTRAST) {
                filters.push(`contrast(${(effects.contrast / 100).toFixed(2)})`);
            }
            return filters.length > 0 ? filters.join(' ') : 'none';
        }

        function applyTintToExportCanvas(sourceCanvas, width, height, effects) {
            if (!sourceCanvas || width <= 0 || height <= 0) return sourceCanvas;
            if (effects.tintStrength <= 0 || effects.tint === DEFAULT_TINT) return sourceCanvas;

            exportEffectCanvas.width = width;
            exportEffectCanvas.height = height;
            exportEffectCtx.clearRect(0, 0, width, height);

            exportEffectCtx.globalCompositeOperation = 'source-over';
            exportEffectCtx.globalAlpha = 1;
            exportEffectCtx.drawImage(sourceCanvas, 0, 0, width, height);

            exportEffectCtx.globalCompositeOperation = 'multiply';
            exportEffectCtx.fillStyle = effects.tint;
            exportEffectCtx.fillRect(0, 0, width, height);
            exportEffectCtx.globalCompositeOperation = 'destination-in';
            exportEffectCtx.drawImage(sourceCanvas, 0, 0, width, height);

            exportObjectCanvas.width = width;
            exportObjectCanvas.height = height;
            exportObjectCtx.clearRect(0, 0, width, height);
            exportObjectCtx.globalCompositeOperation = 'source-over';
            exportObjectCtx.globalAlpha = 1;
            exportObjectCtx.drawImage(sourceCanvas, 0, 0, width, height);
            exportObjectCtx.globalAlpha = clamp(effects.tintStrength / 100, 0, 1);
            exportObjectCtx.drawImage(exportEffectCanvas, 0, 0, width, height);
            exportObjectCtx.globalAlpha = 1;
            exportObjectCtx.globalCompositeOperation = 'source-over';

            return exportObjectCanvas;
        }

        function getObjectPoseAtTime(obj, time) {
            if (obj.keyframes.length > 0) {
                const pose = interpolatePose(obj.keyframes, time);
                if (pose) return pose;
            }
            return { ...(obj.currentPose || DEFAULT_POSE) };
        }

        function waitForImageReady(imageEl) {
            if (!imageEl) return Promise.resolve(null);
            if (imageEl.complete && imageEl.naturalWidth > 0) return Promise.resolve(imageEl);
            return new Promise((resolve, reject) => {
                const cleanup = () => {
                    imageEl.removeEventListener('load', onLoad);
                    imageEl.removeEventListener('error', onError);
                };
                const onLoad = () => {
                    cleanup();
                    resolve(imageEl);
                };
                const onError = () => {
                    cleanup();
                    reject(new Error('Image asset failed to load.'));
                };
                imageEl.addEventListener('load', onLoad, { once: true });
                imageEl.addEventListener('error', onError, { once: true });
            });
        }

        function getBitmapFontPageCacheKey(page) {
            return String(page?.src || page?.assetPath || page?.file || '');
        }

        function getBitmapFontPageImage(page) {
            const key = getBitmapFontPageCacheKey(page);
            if (!key) return Promise.resolve(null);

            let entry = bitmapFontPageImageCache.get(key);
            if (!entry) {
                const image = new Image();
                const promise = new Promise((resolve, reject) => {
                    image.onload = () => resolve(image);
                    image.onerror = () => reject(new Error(`Bitmap font page failed to load: ${page?.file || key}`));
                });
                entry = { image, promise };
                bitmapFontPageImageCache.set(key, entry);
                image.src = page.src;
            }

            if (entry.image.complete && entry.image.naturalWidth > 0) {
                return Promise.resolve(entry.image);
            }
            return entry.promise;
        }

        function getBitmapFontPageImageSync(page) {
            const key = getBitmapFontPageCacheKey(page);
            return key ? (bitmapFontPageImageCache.get(key)?.image || null) : null;
        }

        async function ensureExportAssetsReady() {
            const tasks = [];

            animObjects.forEach((obj) => {
                if (obj.type === IMAGE_TYPE) {
                    tasks.push(waitForImageReady(obj.domWrapper?.querySelector('img')));
                    if (isAnimatedGifObject(obj)) {
                        tasks.push(ensureAnimatedGifData(obj).catch(() => null));
                    }
                }
                if (obj.type === TEXT_TYPE) {
                    const textData = normalizeTextData(obj.textData);
                    if (textData.bitmapFont) {
                        Object.values(textData.bitmapFont.pages || {}).forEach((page) => {
                            tasks.push(getBitmapFontPageImage(page));
                        });
                    }
                }
                if (obj.type === SPINE_TYPE && obj.spineElement?.whenReady) {
                    tasks.push(obj.spineElement.whenReady.catch(() => null));
                }
            });

            await Promise.all(tasks);
        }

        function measurePlainTextLine(ctx, line, letterSpacing) {
            const chars = Array.from(String(line || ''));
            if (chars.length === 0) return 0;

            let width = 0;
            chars.forEach((char, index) => {
                width += ctx.measureText(char).width;
                if (index < chars.length - 1) {
                    width += letterSpacing;
                }
            });
            return width;
        }

        function drawPlainTextLine(ctx, line, x, y, letterSpacing) {
            const chars = Array.from(String(line || ''));
            let penX = x;
            chars.forEach((char, index) => {
                ctx.fillText(char, penX, y);
                penX += ctx.measureText(char).width;
                if (index < chars.length - 1) {
                    penX += letterSpacing;
                }
            });
        }

        function renderTextObjectToExportCanvas(obj) {
            const textData = normalizeTextData(obj.textData);
            const lines = String(textData.text || ' ').replace(/\r\n/g, '\n').split('\n');
            const fontLineHeight = Math.max(1, getNum(textData.lineHeight, textData.size));
            const letterSpacing = getNum(textData.letterSpacing, 0);

            if (textData.bitmapFont) {
                const bitmapFont = textData.bitmapFont;
                const sourceLineHeight = Math.max(1, getNum(bitmapFont.lineHeight, DEFAULT_TEXT_SIZE));
                const scale = textData.size / sourceLineHeight;
                const logicalLetterSpacing = scale === 0 ? 0 : (letterSpacing / scale);
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
                                y: (lineIndex * fontLineHeight / scale) + glyph.yoffset,
                                width: glyph.width,
                                height: glyph.height,
                                textureX: glyph.x,
                                textureY: glyph.y
                            });
                            penX += glyph.xadvance;
                        } else {
                            penX += sourceLineHeight * 0.5;
                        }

                        penX += logicalLetterSpacing;
                        prevCode = code;
                    });

                    const logicalWidth = glyphs.length > 0 ? (maxX - minX) : 0;
                    const scaledWidth = logicalWidth * scale;
                    maxWidth = Math.max(maxWidth, scaledWidth);
                    layoutLines.push({ glyphs, minX, width: scaledWidth });
                });

                const totalHeight = Math.max(
                    textData.size,
                    ((Math.max(lines.length, 1) - 1) * fontLineHeight) + textData.size
                );

                exportObjectCanvas.width = Math.max(1, Math.ceil(maxWidth));
                exportObjectCanvas.height = Math.max(1, Math.ceil(totalHeight));
                exportObjectCtx.clearRect(0, 0, exportObjectCanvas.width, exportObjectCanvas.height);
                exportObjectCtx.imageSmoothingEnabled = false;

                layoutLines.forEach((line) => {
                    const alignOffset = textData.align === 'right'
                        ? (exportObjectCanvas.width - line.width)
                        : (textData.align === 'center' ? (exportObjectCanvas.width - line.width) / 2 : 0);

                    line.glyphs.forEach((glyph) => {
                        const pageImage = getBitmapFontPageImageSync(glyph.page);
                        if (!pageImage || glyph.width <= 0 || glyph.height <= 0) return;
                        exportObjectCtx.drawImage(
                            pageImage,
                            glyph.textureX,
                            glyph.textureY,
                            glyph.width,
                            glyph.height,
                            Math.round(alignOffset + ((glyph.x - line.minX) * scale)),
                            Math.round(glyph.y * scale),
                            Math.max(1, Math.round(glyph.width * scale)),
                            Math.max(1, Math.round(glyph.height * scale))
                        );
                    });
                });

                return {
                    source: exportObjectCanvas,
                    width: exportObjectCanvas.width,
                    height: exportObjectCanvas.height
                };
            }

            exportObjectCtx.font = `${textData.size}px ${textData.fontFamily}`;
            const lineWidths = lines.map((line) => measurePlainTextLine(exportObjectCtx, line, letterSpacing));
            const maxWidth = Math.max(1, Math.ceil(Math.max(0, ...lineWidths)));
            const totalHeight = Math.max(
                textData.size,
                ((Math.max(lines.length, 1) - 1) * fontLineHeight) + textData.size
            );

            exportObjectCanvas.width = maxWidth;
            exportObjectCanvas.height = Math.max(1, Math.ceil(totalHeight));
            exportObjectCtx.clearRect(0, 0, exportObjectCanvas.width, exportObjectCanvas.height);
            exportObjectCtx.font = `${textData.size}px ${textData.fontFamily}`;
            exportObjectCtx.textBaseline = 'top';
            exportObjectCtx.fillStyle = textData.color;

            lines.forEach((line, index) => {
                const lineWidth = lineWidths[index];
                let x = 0;
                if (textData.align === 'center') x = (exportObjectCanvas.width - lineWidth) / 2;
                if (textData.align === 'right') x = exportObjectCanvas.width - lineWidth;
                drawPlainTextLine(exportObjectCtx, line, x, index * fontLineHeight, letterSpacing);
            });

            return {
                source: exportObjectCanvas,
                width: exportObjectCanvas.width,
                height: exportObjectCanvas.height
            };
        }

        function renderBlockObjectToExportCanvas(obj) {
            const blockData = normalizeBlockData(obj.blockData);
            const size = Math.max(1, Math.round(blockData.size));
            exportObjectCanvas.width = size;
            exportObjectCanvas.height = size;
            exportObjectCtx.clearRect(0, 0, size, size);
            exportObjectCtx.fillStyle = blockData.color;
            exportObjectCtx.fillRect(0, 0, size, size);
            exportObjectCtx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
            exportObjectCtx.lineWidth = 1;
            exportObjectCtx.strokeRect(0.5, 0.5, Math.max(0, size - 1), Math.max(0, size - 1));
            return {
                source: exportObjectCanvas,
                width: size,
                height: size
            };
        }

        function renderImageObjectToExportCanvas(obj, time = 0) {
            const imageEl = obj.domWrapper?.querySelector('img');
            const gifData = obj.animatedGifData || null;
            const gifPlaybackTime = gifData ? getAnimatedGifPlaybackTime(obj, time) : time;
            const gifFrame = gifData ? getAnimatedGifFrameAtTime(gifData, gifPlaybackTime) : null;
            const width = Math.max(1, gifData?.width || imageEl?.naturalWidth || imageEl?.width || 1);
            const height = Math.max(1, gifData?.height || imageEl?.naturalHeight || imageEl?.height || 1);
            if (!imageEl && !gifFrame) return null;

            exportObjectCanvas.width = width;
            exportObjectCanvas.height = height;
            exportObjectCtx.clearRect(0, 0, width, height);
            if (gifFrame?.bitmap) {
                exportObjectCtx.drawImage(gifFrame.bitmap, 0, 0, width, height);
            } else {
                exportObjectCtx.drawImage(imageEl, 0, 0, width, height);
            }
            return {
                source: exportObjectCanvas,
                width,
                height
            };
        }

        function renderSpineObjectToExportCanvas(obj) {
            const spineCanvas = obj.spineElement?.shadowRoot?.querySelector('canvas') || obj.spineElement?.querySelector('canvas');
            if (!spineCanvas) return null;

            const width = Math.max(1, Math.round(obj.spineData?.size?.width || spineCanvas.width || DEFAULT_SPINE_SIZE));
            const height = Math.max(1, Math.round(obj.spineData?.size?.height || spineCanvas.height || DEFAULT_SPINE_SIZE));
            exportObjectCanvas.width = width;
            exportObjectCanvas.height = height;
            exportObjectCtx.clearRect(0, 0, width, height);
            exportObjectCtx.drawImage(spineCanvas, 0, 0, width, height);
            return {
                source: exportObjectCanvas,
                width,
                height
            };
        }

        function renderObjectContentToExportCanvas(obj, time = 0) {
            if (obj.type === IMAGE_TYPE) return renderImageObjectToExportCanvas(obj, time);
            if (obj.type === BLOCK_TYPE) return renderBlockObjectToExportCanvas(obj);
            if (obj.type === TEXT_TYPE) {
                const resolvedText = getKeyframeTextContentAtTime(obj.keyframes || [], time, obj.textData?.text);
                const savedText = obj.textData.text;
                obj.textData.text = resolvedText;
                const result = renderTextObjectToExportCanvas(obj);
                obj.textData.text = savedText;
                return result;
            }
            if (obj.type === SPINE_TYPE) return renderSpineObjectToExportCanvas(obj);
            return null;
        }

        function drawSceneObjectToExportCanvas(ctx, obj, pose, time = 0) {
            const finalVisible = isObjectTrackVisible(obj) && pose.visible !== false;
            if (!finalVisible || pose.opacity <= 0) return;

            const renderData = renderObjectContentToExportCanvas(obj, time);
            if (!renderData || renderData.width <= 0 || renderData.height <= 0) return;

            const effects = normalizePoseEffects(pose);
            const effectSource = applyTintToExportCanvas(renderData.source, renderData.width, renderData.height, effects);

            ctx.save();
            ctx.translate(getNum(pose.x, 0), -getNum(pose.y, 0));
            // 正交投影三軸旋轉矩陣 (rotX→rotY→rotZ)
            const _rX = (getNum(pose.rotX, 0) * Math.PI) / 180;
            const _rY = (getNum(pose.rotY, 0) * Math.PI) / 180;
            const _rZ = (getNum(pose.rot,  0) * Math.PI) / 180;
            const _s  = getNum(pose.scale, 1);
            const _cX = Math.cos(_rX), _sX = Math.sin(_rX);
            const _cY = Math.cos(_rY), _sY = Math.sin(_rY);
            const _cZ = Math.cos(_rZ), _sZ = Math.sin(_rZ);
            ctx.transform(
                _cZ * _cY * _s,
                (_sZ * _cX + _cZ * _sY * _sX) * _s,
                (-_sZ * _cY) * _s,
                (_cZ * _cX - _sZ * _sY * _sX) * _s,
                0, 0
            );
            ctx.globalAlpha = clamp(getNum(pose.opacity, 1), 0, 1);
            ctx.globalCompositeOperation = getCanvasBlendMode(effects.blendMode);
            ctx.filter = buildCanvasFilter(effects);
            ctx.drawImage(effectSource, -renderData.width / 2, -renderData.height / 2, renderData.width, renderData.height);
            ctx.restore();
            ctx.filter = 'none';
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 1;
        }

        function renderSceneToExportCanvas(ctx, width, height, time) {
            ctx.save();
            ctx.filter = 'none';
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 1;
            ctx.fillStyle = EXPORT_BACKGROUND_COLOR;
            ctx.fillRect(0, 0, width, height);

            const cameraObj = getCurrentCameraObject();
            const cameraPose = cameraObj ? getObjectPoseAtTime(cameraObj, time) : DEFAULT_CAMERA_POSE;
            const cameraX = getNum(cameraPose?.x, 0);
            const cameraY = getNum(cameraPose?.y, 0);
            const cameraRot = getNum(cameraPose?.rot, 0);
            const cameraScale = Math.max(0.01, getNum(cameraPose?.scale, 1));

            ctx.save();
            ctx.translate(width / 2 + cameraX, height / 2 + cameraY);
            ctx.rotate((cameraRot * Math.PI) / 180);
            ctx.scale(cameraScale, cameraScale);

            animObjects.forEach((obj) => {
                if (obj.type === CAMERA_TYPE) return;
                const pose = getObjectPoseAtTime(obj, time);
                drawSceneObjectToExportCanvas(ctx, obj, pose, time);
            });

            ctx.restore();
            ctx.restore();
        }

        async function exportMaskedRangeAsMp4WithWebCodecs(exportCanvas, exportCtx, duration) {
            const Mp4Muxer = await ensureMp4MuxerLibrary();
            const encoderSupport = await getSupportedVideoEncoderConfig(exportCanvas.width, exportCanvas.height);
            if (!encoderSupport) {
                throw new Error('This environment does not support MP4-compatible WebCodecs video encoding.');
            }

            const muxer = new Mp4Muxer.Muxer({
                target: new Mp4Muxer.ArrayBufferTarget(),
                video: {
                    codec: encoderSupport.muxerCodec,
                    width: exportCanvas.width,
                    height: exportCanvas.height,
                    frameRate: EXPORT_FPS
                },
                fastStart: 'in-memory'
            });

            let encoderFailure = null;
            const encoder = new VideoEncoder({
                output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
                error: (err) => {
                    encoderFailure = err instanceof Error ? err : new Error(String(err));
                }
            });
            encoder.configure(encoderSupport.encoderConfig);

            const totalFrames = Math.max(1, Math.round(duration * EXPORT_FPS));
            const frameDurationUs = Math.round(1_000_000 / EXPORT_FPS);

            for (let frameIndex = 0; frameIndex <= totalFrames; frameIndex++) {
                if (encoderFailure) throw encoderFailure;

                const time = Math.min(duration, frameIndex / EXPORT_FPS);
                exportState.currentTime = time;
                playState.currentTime = time;
                await waitForAnimationFrames(1);

                renderSceneToExportCanvas(exportCtx, exportCanvas.width, exportCanvas.height, time);

                const frame = new VideoFrame(exportCanvas, {
                    timestamp: frameIndex * frameDurationUs,
                    duration: frameDurationUs
                });
                encoder.encode(frame, {
                    keyFrame: frameIndex === 0 || frameIndex % (EXPORT_FPS * 2) === 0
                });
                frame.close();

                exportState.progress = frameIndex / totalFrames;
                updateExportButtonState(`輸出 MP4 ${Math.round(exportState.progress * 100)}%`);

                if (frameIndex % 10 === 0) {
                    await waitForDelay(0);
                }
            }

            await encoder.flush();
            if (encoderFailure) throw encoderFailure;
            muxer.finalize();
            encoder.close();

            const buffer = muxer.target.buffer;
            if (!buffer || buffer.byteLength === 0) {
                throw new Error('MP4 encoder produced an empty file.');
            }

            return new Blob([buffer], { type: 'video/mp4' });
        }

        async function exportMaskedRangeAsMp4WithMediaRecorder(exportCanvas, exportCtx, duration) {
            const mimeType = getSupportedMp4MimeType();
            if (!mimeType) {
                throw new Error('This environment does not support MP4 MediaRecorder export.');
            }
            if (!exportCanvas.captureStream) {
                throw new Error('Canvas captureStream is not available.');
            }

            const frameDurationMs = 1000 / EXPORT_FPS;
            const totalFrames = Math.max(1, Math.round(duration * EXPORT_FPS));
            const chunks = [];
            const stream = exportCanvas.captureStream(EXPORT_FPS);
            const recorder = new MediaRecorder(stream, {
                mimeType,
                videoBitsPerSecond: EXPORT_VIDEO_BITS_PER_SECOND
            });

            const stopPromise = new Promise((resolve, reject) => {
                recorder.onstop = resolve;
                recorder.onerror = (event) => reject(event.error || new Error('MediaRecorder error.'));
            });

            recorder.ondataavailable = (event) => {
                if (event.data?.size) {
                    chunks.push(event.data);
                }
            };

            try {
                recorder.start(250);
                const exportStart = performance.now();

                for (let frameIndex = 0; frameIndex <= totalFrames; frameIndex++) {
                    const time = Math.min(duration, frameIndex / EXPORT_FPS);
                    exportState.currentTime = time;
                    playState.currentTime = time;

                    await waitForAnimationFrames(1);
                    renderSceneToExportCanvas(exportCtx, exportCanvas.width, exportCanvas.height, time);

                    exportState.progress = frameIndex / totalFrames;
                    updateExportButtonState(`輸出 MP4 ${Math.round(exportState.progress * 100)}%`);

                    const targetElapsed = (frameIndex + 1) * frameDurationMs;
                    const delay = (exportStart + targetElapsed) - performance.now();
                    if (delay > 0) {
                        await waitForDelay(delay);
                    }
                }

                await waitForDelay(frameDurationMs * 2);
                recorder.stop();
                await stopPromise;
            } finally {
                stream.getTracks().forEach((track) => track.stop());
            }

            const blob = new Blob(chunks, { type: mimeType });
            if (!blob.size) {
                throw new Error('MP4 recorder produced an empty file.');
            }
            return blob;
        }

        async function exportMaskedRangeAsMp4WithFFmpegWasm(exportCanvas, exportCtx, duration) {
            const ffmpeg = await ensureFFmpegWasmReady();
            const totalFrames = Math.max(1, Math.round(duration * EXPORT_FPS));
            const framesDir = 'frames';
            const outputPath = 'output.mp4';
            const logTail = [];
            const logHandler = ({ message }) => {
                if (!message) return;
                logTail.push(String(message));
                if (logTail.length > 24) logTail.shift();
            };
            const progressHandler = ({ progress }) => {
                const ratio = Number.isFinite(progress) ? clamp(progress, 0, 1) : 0;
                const mapped = 0.85 + (ratio * 0.15);
                exportState.progress = clamp(mapped, 0, 1);
                updateExportButtonState(`輸出 MP4 ${Math.round(exportState.progress * 100)}%`);
            };

            ffmpeg.on('log', logHandler);
            ffmpeg.on('progress', progressHandler);

            try {
                try { await ffmpeg.deleteFile(outputPath); } catch (err) {}
                try {
                    const existingEntries = await ffmpeg.listDir(framesDir);
                    for (const entry of existingEntries) {
                        if (!entry?.name || entry.name === '.' || entry.name === '..' || entry.isDir) continue;
                        await ffmpeg.deleteFile(`${framesDir}/${entry.name}`);
                    }
                } catch (err) {}
                try { await ffmpeg.deleteDir(framesDir); } catch (err) {}
                await ffmpeg.createDir(framesDir);

                for (let frameIndex = 0; frameIndex <= totalFrames; frameIndex++) {
                    const time = Math.min(duration, frameIndex / EXPORT_FPS);
                    exportState.currentTime = time;
                    playState.currentTime = time;
                    await waitForAnimationFrames(1);

                    renderSceneToExportCanvas(exportCtx, exportCanvas.width, exportCanvas.height, time);
                    const blob = await canvasToBlob(exportCanvas, 'image/jpeg', EXPORT_IMAGE_QUALITY);
                    const bytes = new Uint8Array(await blob.arrayBuffer());
                    await ffmpeg.writeFile(`${framesDir}/${formatFrameFileName(frameIndex + 1, 'jpg')}`, bytes);

                    exportState.progress = (frameIndex / totalFrames) * 0.85;
                    updateExportButtonState(`準備影格 ${Math.round(exportState.progress * 100)}%`);
                }

                let ret = await ffmpeg.exec([
                    '-framerate', String(EXPORT_FPS),
                    '-i', `${framesDir}/frame_%06d.jpg`,
                    '-c:v', 'libx264',
                    '-pix_fmt', 'yuv420p',
                    '-movflags', '+faststart',
                    outputPath
                ]);
                if (ret !== 0) {
                    ret = await ffmpeg.exec([
                        '-framerate', String(EXPORT_FPS),
                        '-i', `${framesDir}/frame_%06d.jpg`,
                        '-c:v', 'mpeg4',
                        '-q:v', '2',
                        '-pix_fmt', 'yuv420p',
                        '-movflags', '+faststart',
                        outputPath
                    ]);
                }
                if (ret !== 0) {
                    const detail = logTail.length ? ` ${logTail[logTail.length - 1]}` : '';
                    throw new Error(`ffmpeg exited with code ${ret}.${detail}`.trim());
                }

                const data = await ffmpeg.readFile(outputPath);
                const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
                if (!bytes.byteLength) {
                    throw new Error('ffmpeg produced an empty MP4 file.');
                }
                return new Blob([bytes], { type: 'video/mp4' });
            } finally {
                ffmpeg.off('log', logHandler);
                ffmpeg.off('progress', progressHandler);
                try { await ffmpeg.deleteFile(outputPath); } catch (err) {}
                try {
                    const entries = await ffmpeg.listDir(framesDir);
                    for (const entry of entries) {
                        if (!entry?.name || entry.name === '.' || entry.name === '..' || entry.isDir) continue;
                        await ffmpeg.deleteFile(`${framesDir}/${entry.name}`);
                    }
                    await ffmpeg.deleteDir(framesDir);
                } catch (err) {}
            }
        }

        function getSceneDuration() {
            let hasVisualContent = animObjects.length > 0;
            let maxDuration = 0;
            animObjects.forEach((obj) => {
                if (obj.keyframes.length > 0) {
                    maxDuration = Math.max(maxDuration, getNum(obj.keyframes[obj.keyframes.length - 1].time, 0));
                }
                if (obj.type === SPINE_TYPE) {
                    maxDuration = Math.max(maxDuration, getNum(obj.spineData?.animationDuration, 0));
                }
                if (obj.animatedGifData?.totalDurationMs) {
                    maxDuration = Math.max(maxDuration, obj.animatedGifData.totalDurationMs / 1000);
                }
            });
            if (!hasVisualContent) return 0;
            return maxDuration > 0 ? maxDuration : 0.5;
        }

        async function exportMaskedRangeAsMp4() {
            if (exportState.isExporting) return;
            if (window.location.protocol === 'file:') {
                alert('MP4 匯出需要用本地伺服器開啟編輯器。請執行專案根目錄的「Open Cutscene Editor.cmd」，再從開啟的瀏覽器頁面匯出。');
                return;
            }
            if (!outputMask.enabled) {
                alert('請先設定 Output Mask，MP4 會依照目前遮罩尺寸輸出。');
                return;
            }
            if (animObjects.length === 0) {
                alert('目前場景沒有可輸出的內容。');
                return;
            }

            const exportCanvas = document.createElement('canvas');
            exportCanvas.width = Math.max(1, Math.round(outputMask.width));
            exportCanvas.height = Math.max(1, Math.round(outputMask.height));
            const exportCtx = exportCanvas.getContext('2d', { alpha: false });
            if (!exportCtx) {
                alert('目前這個環境不支援畫布影片匯出。');
                return;
            }

            const previousTime = playState.currentTime;
            const wasPlaying = playState.isPlaying;
            if (wasPlaying) stopAnimation();

            exportState.isExporting = true;
            exportState.currentTime = 0;
            exportState.progress = 0;
            updateExportButtonState('準備匯出...');

            try {
                await ensureExportAssetsReady();
                await waitForAnimationFrames(2);
                const duration = getSceneDuration();
                if (duration <= 0) {
                    throw new Error('目前沒有可輸出的動畫內容。');
                }

                let blob = null;
                let primaryError = null;
                let secondaryError = null;
                let fallbackError = null;

                try {
                    blob = await exportMaskedRangeAsMp4WithWebCodecs(exportCanvas, exportCtx, duration);
                } catch (err) {
                    primaryError = err;
                    try {
                        console.warn('WebCodecs MP4 export failed, falling back to FFmpeg.wasm.', err);
                        updateExportButtonState('改用 FFmpeg 匯出...');
                        blob = await exportMaskedRangeAsMp4WithFFmpegWasm(exportCanvas, exportCtx, duration);
                    } catch (ffmpegErr) {
                        secondaryError = ffmpegErr;
                        console.warn('FFmpeg.wasm MP4 export failed, falling back to MediaRecorder.', ffmpegErr);
                        updateExportButtonState('改用備援匯出...');
                        try {
                            blob = await exportMaskedRangeAsMp4WithMediaRecorder(exportCanvas, exportCtx, duration);
                        } catch (mediaErr) {
                            fallbackError = mediaErr;
                        }
                    }
                }

                if (!blob || !blob.size) {
                    if (primaryError && secondaryError && fallbackError) {
                        throw new Error(`WebCodecs: ${primaryError.message} | FFmpeg: ${secondaryError.message} | Fallback: ${fallbackError.message}`);
                    }
                    if (primaryError && secondaryError) {
                        throw new Error(`WebCodecs: ${primaryError.message} | FFmpeg: ${secondaryError.message}`);
                    }
                    if (primaryError && fallbackError) {
                        throw new Error(`WebCodecs: ${primaryError.message} | Fallback: ${fallbackError.message}`);
                    }
                    throw primaryError || secondaryError || fallbackError || new Error('MP4 export produced an empty file.');
                }

                downloadBlob(blob, getExportFileName('mp4'));
            } catch (err) {
                console.error(err);
                alert(`MP4 匯出失敗：${err.message}`);
            } finally {
                exportState.isExporting = false;
                exportState.currentTime = 0;
                exportState.progress = 0;
                updateExportButtonState();
                seekToTime(previousTime);
            }
        }
