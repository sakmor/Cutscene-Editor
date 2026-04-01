# Cutscene Editor

一個純前端的 2D cutscene / timeline 編輯器，使用單一 HTML 搭配原生 JavaScript 與 CSS。

目前支援：
- 圖片物件
- 文字物件
- FNT Bitmap Font 文字
- Block 方塊物件
- Spine skeleton JSON 匯入
- Camera 攝影機軌
- JSON 專案存檔 / 讀檔
- Output Mask 與 MP4 匯出

## 主要功能

### 物件類型

- 圖片圖層：支援 `png`、`jpg`、`jpeg`、`webp`、`gif`
- 文字圖層：可編輯文字內容、字型、顏色、行高、字距、對齊
- Bitmap Font 文字：支援 `.fnt` 搭配貼圖頁
- Block 圖層：快速建立純色方塊
- Spine 圖層：匯入 `skeleton .json + .atlas + texture`
- Camera 軌：用影格控制整體畫面平移、旋轉、縮放

### 時間軸 / 影格

- 為每個物件建立 keyframe
- 影格可拖曳調整時間
- 支援多選影格
- 支援框選影格
- 支援複製 / 貼上影格
- 支援批次 `Offset X / Y`
- 支援跳到上一個 / 下一個影格
- 支援 timeline scrub 預覽
- 支援 timeline zoom

### 圖層管理

- 圖層選取
- 圖層上下重排
- 圖層複製
- 圖層刪除
- 圖層隱藏 / 顯示
- 隱藏圖層列表
- ISO 模式：暫時只操作單一圖層
- 圖層備註
- 每個圖層都可記錄聊天 / 註解歷史

### 變形 / 特效

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

### 專案與輸出

- 匯入 / 匯出 JSON 專案
- 支援舊版 JSON 相容匯入
- Browser File System Access API 儲存
- `Save` / `Save As`
- 專案檔列表視窗
- 自動備份到 `save/backups/`
- `Output Mask` 設定
- 匯出目前遮罩範圍為 MP4

## 新增功能摘要

目前 README 這次補上的重點新功能如下：

- `Camera` 攝影機軌
  - 可建立單一 camera track
  - camera keyframe 會影響整個畫面平移、旋轉、縮放
  - camera 軌固定顯示在時間軸最上方
- 圖層聊天 / 註解歷史
  - 每個物件都有 `messageHistory`
  - 可在右側面板記錄 user / assistant / system 內容
  - 會一起存進專案 JSON
- 隱藏圖層列表
  - 隱藏圖層不再混在主列表
  - 可在隱藏列表中快速重新顯示
- 專案讀檔相容性提升
  - 讀舊版 JSON 時會盡量自動判斷物件類型
  - 舊欄位格式會轉成新版資料結構
  - 單一壞物件不會讓整份專案直接失敗
- 自動備份流程
  - 支援 save directory
  - 每 5 分鐘建立備份
  - 最多保留固定數量備份

## 支援的素材格式

### 圖片

- `png`
- `jpg`
- `jpeg`
- `webp`
- `gif`

### Spine

- `skeleton .json`
- `.atlas`
- atlas 對應貼圖

不支援：
- `.skel` binary skeleton

### Bitmap Font

- `.fnt`
- 對應貼圖頁：`png`、`jpg`、`jpeg`、`webp`

## 使用方式

### 基本流程

1. 開啟 [Cutscene Editor.html](E:/Projects/Cutscene%20Editor/Cutscene%20Editor.html)
2. 匯入圖片 / Spine / FNT，或建立文字、Block、Camera
3. 選取物件後調整屬性
4. 在時間軸建立與編輯 keyframe
5. 用 scrub / play 預覽動畫
6. 匯出 JSON 或 MP4

### MP4 匯出

MP4 匯出建議透過本機 server 開啟，不要直接用 `file://`。

請使用：
- [Open Cutscene Editor.cmd](E:/Projects/Cutscene%20Editor/Open%20Cutscene%20Editor.cmd)

它會啟動本機 server，再開啟編輯器頁面。

相關腳本：
- [tools/serve-editor.js](E:/Projects/Cutscene%20Editor/tools/serve-editor.js)

## 快捷鍵

- `Space`：播放 / 停止
- `Delete` / `Backspace`：刪除已選影格
- `Ctrl/Cmd + C`：複製影格
- `Ctrl/Cmd + V`：貼上影格
- `Ctrl/Cmd + 滾輪`：縮放 timeline
- `PageUp`：跳到上一個影格
- `PageDown`：跳到下一個影格
- `Enter`：在聊天輸入框送出內容
- `Shift + Enter`：聊天輸入框換行

## 右側屬性面板

### 通用屬性

- 位置、旋轉、縮放、透明度
- 顏色與混色效果
- Output Mask

### 文字屬性

- `Text Content`
- `Font Size`
- `Line Height`
- `Letter Spacing`
- `Align`
- `Color`
- `Font Family`
- `Bitmap Font`

### Block 屬性

- `Size`
- `Color`

### Spine 屬性

- Animation 選擇
- 依 runtime 狀態預覽動畫

### 圖層聊天

- 支援 `user`
- 支援 `assistant`
- 支援 `system`
- 可清空該圖層聊天紀錄

## 專案存檔

### 有 File System Access API 時

- 可選擇專案資料夾
- 可直接在 `save/` 類似結構中管理 JSON
- 支援 `Save`
- 支援 `Save As`
- 支援自動備份

### 沒有 File System Access API 時

- 使用傳統 JSON 匯入 / 匯出

## 專案 JSON

目前專案格式為：
- `project_type: PixelAnimator_NLE`
- `version: 9`

資料中會包含：
- 物件類型
- keyframes
- note
- messageHistory
- output mask
- 物件專屬資料
  - image
  - text
  - block
  - spine
  - camera

## 專案結構

```text
Cutscene Editor.html
Open Cutscene Editor.cmd
README.md
assets/
  css/
    cutscene-editor.css
  js/
    app/
      01-core-state.js
      02-editor-ui.js
      03-objects-and-timeline.js
      04-snapshot-and-playback.js
      05-project-files.js
    vendor/
      mp4-muxer.js
      ffmpeg/
save/
  backups/
tools/
  serve-editor.js
```

## 備註

- 這個專案目前是單頁前端工具，不依賴框架
- 主要邏輯已拆成 `assets/js/app/` 多檔案
- MP4 匯出相關依賴在 `assets/js/vendor/`
- 若修改後瀏覽器沒更新，請強制重新整理或更新 script query version
