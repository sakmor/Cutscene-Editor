# Cutscene Editor

一個以單頁 HTML 為入口的 2D Cutscene / Timeline 編輯器，支援一般圖片、Spine skeleton JSON、文字物件、Bitmap Font 與 Block 物件，並可匯出 / 匯入專案 JSON。

## 功能摘要

- 圖片物件匯入與圖層管理
- 圖層顯示 / 隱藏、複製、換圖與註解編輯
- Spine 資料夾匯入與動畫預覽
- 文字物件編輯
- FNT Bitmap Font 匯入
- Block 物件建立
- 關鍵幀新增、更新、刪除
- 關鍵幀框選、多選、複製、貼上與批次位移
- 浮動影格操作面板與浮動 Offset 面板
- Timeline Scrub 與播放控制
- Timeline Zoom 與上一 / 下一關鍵幀跳轉
- Output Mask 設定
- 專案 JSON 匯出 / 匯入
- File System Access API 存檔、另存新檔、自動備份

## 支援格式

### 圖片

- `png`
- `jpg` / `jpeg`
- `webp`
- 其他瀏覽器可接受的 `image/*`

### Spine

- `skeleton .json`
- `.atlas`
- atlas 對應貼圖

不支援 `.skel` binary。

### 文字

- 系統字型文字
- 自訂 `font-family`
- `FNT` Bitmap Font
- FNT 對應貼圖：`png` / `jpg` / `jpeg` / `webp`

## 使用方式

1. 直接開啟 [Cutscene Editor.html](/E:/Projects/Cutscene%20Editor/Cutscene%20Editor.html)
2. 在左側加入圖片、Spine、文字或 Block 物件
3. 調整物件屬性與時間軸關鍵幀
4. 用下方 Timeline 做播放、框選、Scrub 與 Zoom
5. 使用底部工具列匯出或載入專案 JSON

## 可編輯屬性

### 共用屬性

- `X`
- `Y`
- `Rotation`
- `Scale`
- `Opacity`
- `Tint`
- `Tint Strength`
- `Hue`
- `Brightness`
- `Contrast`
- `Blend Mode`

### 文字物件

- `Text Content`
- `Font Size`
- `Line Height`
- `Letter Spacing`
- `Align`
- `Color`
- `Font Family`
- `Bitmap Font`

### Block 物件

- `Size`
- `Color`

### Spine 物件

- Animation 選擇
- Runtime 版本依匯入資料自動判定

## 快捷操作

- `Space`：播放 / 停止
- `Delete` / `Backspace`：刪除選取關鍵幀
- `Ctrl / Cmd + C`：複製關鍵幀
- `Ctrl / Cmd + V`：貼上關鍵幀
- `Ctrl / Cmd + 滾輪`：縮放 Timeline
- `PageUp`：跳到上一關鍵幀
- `PageDown`：跳到下一關鍵幀

## 專案存檔

### 瀏覽器支援 File System Access API 時

- 可直接指定專案資料夾
- 可從資料夾中的 JSON 專案清單直接載入
- 支援 `Save` / `Save As`
- 會在 `save/backups/` 自動保留最近的備份檔

### 不支援 File System Access API 時

- 退回一般 `匯出 JSON` / `匯入 JSON`

## 專案結構

目前專案已從單一 HTML 進一步整理成「入口頁 + 外部 CSS / JS」：

```text
Cutscene Editor.html
assets/
  css/
    cutscene-editor.css
  js/
    cutscene-editor.bundle.js
    app/
      01-core-state.js
      02-editor-ui.js
      03-objects-and-timeline.js
      04-snapshot-and-playback.js
      05-project-files.js
save/
  backups/
```

### 載入策略

- 瀏覽器實際執行使用 `assets/js/cutscene-editor.bundle.js`
- `assets/js/app/` 保留拆分後的來源結構，方便後續維護與再整理
- 樣式已從 HTML 抽到 `assets/css/cutscene-editor.css`

## 最近更新

### 2026-03-23

- 圖層註解改為獨立視窗編輯，支援雙擊圖層清單或時間軸標題快速開啟
- 圖片圖層新增「換圖」操作，可直接替換既有圖片素材而不必重建物件
- 優化影格更新提示，編輯既有影格時會依拖曳狀態顯示更明確的操作說明
- 調整物件選取流程，減少切換同一圖層時誤清空目前關鍵幀選取的情況
- 補上關鍵幀框選 / 複選後的批次 Offset 功能，可同時調整多個影格的 X / Y
- 新增獨立浮動的 `影格 Offset` 面板，支援拖曳與收合，且只會在複選 2 格以上時顯示
- 時間軸圖層標題在眼睛按鈕旁新增圖層複製按鈕，可直接複製物件、關鍵幀、註記與可見狀態

### 2026-03-20

- 新增 Block 物件
- 新增文字物件與 FNT Bitmap Font 支援
- 補強 Output Mask、Timeline 操作與專案存檔流程
- 將原本超大的單檔 HTML 拆出外部 CSS / JS
- 新增 `assets/js/app/` 作為後續維護用的功能分區來源
- 保留 `cutscene-editor.bundle.js` 作為目前穩定的執行入口

## 備註

- 這個專案目前沒有建置流程，直接開 HTML 就能使用
- 若之後要繼續模組化，建議以 `assets/js/app/` 為整理基礎，再視需要導入 bundler
