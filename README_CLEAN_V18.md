# 莫高窟 PWA Clean V18

這包是「乾淨重寫版」，不含舊 `index.html`、舊多張上傳、舊 queue、舊 `observeModal()`、舊 service-worker HTML patch。

## 使用方式

1. 解壓縮本 zip。
2. 建議把 GitHub repo 舊內容先移到備份分支。
3. 將本 zip 內容直接覆蓋 repo root。
4. 把正式莫高窟長圖放到：`assets/mogao-map.jpg`
5. 如果你有正式 131 個橘色標籤座標，覆蓋：`data/cave-coordinates.json`
6. Vercel Environment Variables 確認有：`BLOB_READ_WRITE_TOKEN`
7. Deploy 後先開 `/api/blob-env-check`，確認 `hasBlobReadWriteToken: true`。

## 這版刻意刪掉

- 舊 `observeModal()`
- 舊 `flushPending()`
- 舊 `queuePhotos()`
- 舊多張上傳
- 舊 base64 dataURL 寫入 localStorage
- 舊 `mogao.customNotes.v14` 圖片欄位依賴
- 所有 HTML 動態 patch / rewrite

## 新版 localStorage key

- 文字筆記：`mogao.textNotes.v1`
- 照片 URL：`mogao.blobImages.v1`

## 座標格式

```json
{
  "caves": [
    {"id":"130","x":44,"y":45,"title":"130 窟"}
  ]
}
```

x/y 是百分比座標。
