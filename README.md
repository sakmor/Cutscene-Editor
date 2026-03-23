# Cutscene Editor

一個以單頁 HTML 為主的 2D cutscene / timeline 編輯器，適合快速排物件、做關鍵影格、輸出專案 JSON，並依 `Output Mask` 匯出 MP4。

## 目前功能

- 匯入圖片物件：`png`、`jpg`、`jpeg`、`webp`、`gif`
- 匯入 Spine：`skeleton .json` + `.atlas` + 對應貼圖
- 文字物件與 Bitmap Font（FNT）
- Block 物件
- Timeline scrub / zoom / keyframe 編輯
- 多選 keyframe、複製貼上、offset
- Output Mask 設定
- 專案 JSON 匯入 / 匯出
- 依目前遮罩尺寸匯出 MP4

## 執行方式

### 一般編輯

直接開啟 [Cutscene Editor.html](./Cutscene%20Editor.html) 可以進行大部分編輯功能。

### MP4 匯出

MP4 匯出不能用 `file://` 直接打開頁面，因為瀏覽器會阻擋：

- Canvas / VideoFrame 讀取
- `captureStream`
- `ffmpeg.wasm` worker

請改用專案內建的啟動器：

- 執行 [Open Cutscene Editor.cmd](./Open%20Cutscene%20Editor.cmd)
- 它會啟動本地 server，並用 `http://127.0.0.1:4173` 開啟編輯器
- 之後再使用 `匯出目前遮罩 MP4`

本地 server 程式在 [tools/serve-editor.js](./tools/serve-editor.js)。

## MP4 匯出說明

- 輸出尺寸以 `Output Mask` 為準
- 若未設定 `Output Mask`，不會開始匯出
- 匯出流程會優先嘗試：
  - `WebCodecs`
  - `ffmpeg.wasm`
  - `MediaRecorder` 備援
- GIF 會在匯出前解碼成逐格影像，並依可見區段重新起播

## 專案結構

```text
Cutscene Editor.html
Open Cutscene Editor.cmd
assets/
  css/
    cutscene-editor.css
  js/
    cutscene-editor.bundle.js
    app/
    vendor/
      mp4-muxer.js
      ffmpeg/
        ffmpeg.js
        814.ffmpeg.js
        ffmpeg-core.js
        ffmpeg-core.wasm
save/
  backups/
tools/
  serve-editor.js
```

## 開發備註

- 目前實際載入的是 `assets/js/cutscene-editor.bundle.js`
- `assets/js/app/` 仍可作為拆分後的來源參考
- 若要調整 MP4 匯出，優先查看：
  - `assets/js/cutscene-editor.bundle.js`
  - `assets/js/vendor/mp4-muxer.js`
  - `assets/js/vendor/ffmpeg/`
