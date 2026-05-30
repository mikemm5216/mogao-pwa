# V12 Auto Compress + Blob

老人家不用自己壓縮照片。

本版新增：
- 選照片後前端自動壓縮。
- 最大邊 1600px。
- JPEG 品質 0.82。
- 壓縮後才上傳到 Vercel Blob。
- 多張照片、多行備註、上傳中鎖表單、離線待上傳、自動補傳全部保留。
- 若原圖本來很小，會保留原圖，避免畫質不必要下降。
- service worker cache bump 到 mogao-pwa-v12-auto-compress-blob。
