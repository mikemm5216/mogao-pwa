# V14 Direct Client Blob Upload

本版換掉慢的 Base64 JSON API 管線：

- 不再把整張照片 base64 塞進 JSON POST 到 Vercel API。
- 前端壓縮後轉 Blob binary。
- 使用 Vercel Blob client upload，瀏覽器直接上傳到 Blob。
- API 只負責 token exchange，不再轉傳照片本體。
- 啟動時自動清掉舊版 pending queue，乾淨重跑。
- 重複照片防呆保留：用壓縮後圖片 hash 產生固定 clientUploadId。
- 多張照片、多行備註、上傳中鎖表單、離線待上傳、自動補傳保留。
