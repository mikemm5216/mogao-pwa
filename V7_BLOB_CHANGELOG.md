# V7：Vercel Blob image storage

本版改動：
- 洞窟照片不再存進 GitHub repo 的 images/caves。
- /api/upload-cave-image 會把照片上傳到 Vercel Blob，回傳可立即使用的 public URL。
- 前端只在 Blob 上傳成功後，才把照片加入正式洞窟照片牆。
- 離線時只保留待上傳任務，不把 data:image 本機圖混進正式照片牆。
- 多張照片、多行備註、上傳中鎖表單、離線 queue 去重都保留。
- service worker cache bump 到 mogao-pwa-v7-vercel-blob-storage。

Vercel 需要設定：
- 安裝 / 啟用 Vercel Blob Store。
- 確認 Vercel 專案環境變數中存在 BLOB_READ_WRITE_TOKEN。
