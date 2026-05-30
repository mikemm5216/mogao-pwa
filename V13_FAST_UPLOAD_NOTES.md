# V13 Fast Upload + Queue Recompress

修正「兩張照片傳超過五分鐘」：

- 新選照片：最長邊改 1000px，JPEG quality 0.68。
- 如果壓完仍太大：再縮到 800px，quality 0.58。
- 舊 pending queue 裡已經排隊的大原圖：上傳前會重新壓縮，不再直接傳原始大圖。
- 上傳狀態會顯示正在壓縮 / 第幾張。
- 保留 Vercel Blob、多張照片、多行備註、離線待上傳、自動補傳。
