# Cutscene Editor

單檔 HTML 的 2D Cutscene / Timeline 動畫編輯器，支援圖片物件與 Spine skeleton JSON 匯入，可直接在時間軸上編排關鍵幀、播放預覽、匯出 / 匯入專案 JSON。

## 目前已支援的功能

- 圖片圖層匯入與管理
- Spine 資料夾匯入
- Block 物件建立與管理
- 物件屬性編輯：`X / Y / Rotation / Scale / Opacity`
- 色彩效果：`Tint / Tint Strength / Hue / Brightness / Contrast`
- 混色模式：`Blend Mode`
- 關鍵幀新增、更新、刪除
- 單選 / 複選 / 框選多顆關鍵幀
- 多顆關鍵幀一起拖曳
- 關鍵幀複製 / 貼上
- 播放頭拖曳 Scrub
- `上一關鍵幀 / 下一關鍵幀` 跳轉並自動選取該幀
- 時間軸縮放
- 底部時間軸高度可拖曳調整
- 軌道可見性切換
- 圖層註解顯示
- 軌道重排
- 畫布縮放
- Output Mask 預覽
- 專案 JSON 匯出 / 匯入
- 專案直接存檔 / 另存新檔
- 專案自動備份
- Spine 動畫切換

## 支援格式

### 圖片

- `png`
- `jpg / jpeg`
- `webp`
- 其他瀏覽器可直接顯示的 `image/*`

### Spine

- `skeleton .json`
- `.atlas`
- atlas 對應貼圖

## Spine 目前限制

- 目前只支援 `Spine skeleton JSON`，不支援 `.skel` binary。
- 匯入 Spine 時需要同時提供 `.json + .atlas + 貼圖`。
- 同一個頁面目前不支援混用不同 Spine runtime 版本。

## 啟動方式

1. 直接用瀏覽器開啟 [Cutscene Editor.html](/E:/Projects/Cutscene%20Editor/Cutscene%20Editor.html)
2. 左側加入圖片或 Spine 資料
3. 在右側調整屬性
4. 用下方時間軸建立與編輯關鍵幀
5. 用 `匯出 JSON` 保存專案

## 基本操作流程

1. 匯入圖片或 Spine 物件
2. 在左側圖層列表選取物件
3. 在右側調整位置、旋轉、縮放、透明度與色彩效果
4. 按 `記錄為新影格` 建立關鍵幀
5. 在下方時間軸點選關鍵幀進入編輯
6. 再次調整右側數值後，按 `更新影格`
7. 按 `全域播放` 或空白鍵預覽動畫

## 物件屬性

每個物件目前可編輯與記錄到關鍵幀的屬性：

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

### Blend Mode

目前混色模式是套在物件內容層的 `mix-blend-mode`，常用模式包含：

- `normal`
- `multiply`
- `screen`
- `overlay`
- `darken`
- `lighten`
- `color-dodge`
- `color-burn`
- `hard-light`
- `soft-light`
- `difference`
- `exclusion`

混色模式屬於離散屬性，播放時會沿用前一顆關鍵幀的模式，到下一顆關鍵幀才切換。

## 時間軸操作

### 單顆關鍵幀

- 單擊關鍵幀：選取該幀、播放頭跳到該時間、進入編輯模式
- 拖曳關鍵幀：調整時間位置
- 按 `Delete / Backspace`：刪除目前選到的關鍵幀

### 多選關鍵幀

- `Ctrl / Cmd + 點擊`：多選或取消選取單顆關鍵幀
- 在時間軸空白處拖拉方框：框選多顆關鍵幀
- `Ctrl / Cmd + 框選`：追加到既有選取
- 拖曳任一顆已選關鍵幀：整組一起移動

### 複製 / 貼上

- `Copy KF`：複製選到的關鍵幀
- `Paste KF`：貼到目前播放頭時間
- 會保留多顆關鍵幀之間的相對時間差

### 播放頭與導覽

- 拖曳時間標尺：Scrub 到指定時間
- `上一關鍵幀 / 下一關鍵幀`：跳到相鄰關鍵幀，並自動選取該幀
- 若目前有選物件，跳轉優先以該物件的關鍵幀為準
- 若未選物件，跳轉會以整個專案的關鍵幀為準

### 時間軸縮放

- 底部工具列有 `Timeline Zoom` 滑桿
- `Ctrl / Cmd + 滾輪` 也可縮放時間軸
- 時間軸縮放會同步影響：
  - 刻度密度
  - 關鍵幀位置
  - 拖曳換算
  - 播放頭位置
  - 自動置中

## 畫布操作

- 滑鼠滾輪：縮放畫布
- 選取物件後拖曳：移動物件
- 畫布右下角可用 `+ / - / 重設` 控制畫布縮放

## 快捷鍵

- `Space`
  - 從目前播放頭時間開始播放
  - 播放中再次按下會停止

- `Delete` / `Backspace`
  - 刪除目前選到的單顆或多顆關鍵幀

- `Ctrl / Cmd + C`
  - 複製選到的關鍵幀

- `Ctrl / Cmd + V`
  - 貼上關鍵幀到目前播放頭時間

- `Ctrl / Cmd + 點擊`
  - 多選關鍵幀

- `PageUp`
  - 跳到上一關鍵幀

- `PageDown`
  - 跳到下一關鍵幀

## 專案存檔

### 匯出

- 按底部 `匯出 JSON`
- 會輸出 `animation_project.json`

### 匯入

- 按底部 `匯入 JSON`
- 可還原圖片物件、Spine 物件、關鍵幀與效果設定

## 專案 JSON 目前會保存的內容

- 物件名稱
- 圖層註解
- 軌道顯示狀態
- 物件類型
- 圖片來源或 Spine 資料
- Block 物件資料
- 每顆關鍵幀的時間
- 位置 / 旋轉 / 縮放 / 透明度
- Tint 與色彩效果
- Blend Mode
- Spine 動畫資訊
- Output Mask 設定

## 適合的使用情境

- 2D cutscene blocking
- 簡單角色 / 圖片演出排程
- Spine + 平面素材混合排演
- 快速做分鏡式動態預覽

## 功能演進紀錄

### 2026-03-19

- 建立單檔 HTML 的 cutscene editor 基礎版本。
- 完成圖片物件與 Spine skeleton JSON 匯入流程。
- 建立時間軸、關鍵幀編輯、播放預覽與畫布 / 時間軸縮放等核心操作。
- 支援位置、旋轉、縮放、透明度、Tint、Hue、Brightness、Contrast 與 Blend Mode。
- 完成專案 JSON 匯入 / 匯出，讓場景可以保存與還原。

### 2026-03-20

- 補上 Block 物件，方便做 blocking、版位佔位與純色構圖。
- 圖層列表與時間軸支援註解顯示，讓每個物件用途更容易辨識。
- 新增軌道顯示切換與軌道重排，讓場景整理更順。
- 底部時間軸高度可直接拖曳調整，編輯長時間軸時比較舒服。
- 新增 Output Mask 預覽，可先用指定輸出尺寸檢查構圖。
- 專案存檔流程升級為直接存檔、另存新檔與專案檔清單操作。
- 新增自動備份機制，會定期保留專案 JSON 快照。
- 專案格式升級到 `version 6`，同步保存圖層註解、軌道顯示、Block 物件與 Output Mask。

## 備註

- 這個工具目前是單檔 HTML 架構，主要邏輯集中在 [Cutscene Editor.html](/E:/Projects/Cutscene%20Editor/Cutscene%20Editor.html)
- 若後續功能繼續增加，建議再拆成 `HTML / CSS / JS` 三個檔案，會比較好維護

## 心得

這次把這個工具一路從比較單純的圖片時間軸，補成更接近真正 cutscene editor 的狀態，最大的進展不是只多了幾個按鈕，而是整體操作感開始比較像一般動畫編輯器了。

像是：

- 點關鍵幀就會跳到該時間
- 可以框選、多選、整組拖曳
- 可以複製 / 貼上關鍵幀
- 可以用上一顆 / 下一顆關鍵幀快速巡覽
- 時間軸可以縮放來微調時間
- 物件除了位置與透明度，還能做色彩與混色模式控制
- 甚至已經能把 Spine 一起放進同一套編排流程

如果只看功能表面，會覺得是很多零碎小功能；但實際上這些功能串起來之後，整個編輯節奏差很多，做動畫時會比較順，也比較不容易卡在重複操作上。

目前這套工具已經很適合拿來做：

- 簡單 cutscene blocking
- 角色演出排 timing
- 圖片與 Spine 混合預演
- 快速做可播放的分鏡草稿

後面如果還要繼續強化，我覺得很值得優先考慮的方向是：

- `.skel` binary 支援
- 更完整的時間軸編輯能力
- 可調整的底部面板高度
- 更穩定明顯的 timeline scrollbar
- 專案結構模組化，降低單檔 HTML 的維護成本
