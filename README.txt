莫高窟崖面筆記 PWA — 扁平版（所有檔案放根目錄）
================================================

這個版本所有檔案都在同一層，程式路徑也已對應根目錄。
直接把以下全部檔案上傳到 GitHub repo 根目錄即可：

  index.html
  manifest.webmanifest
  sw.js
  tw3.css          ← 樣式（重要，缺它版面會壞）
  fonts.css        ← 內嵌繁體中文字型
  icon-192.png
  icon-512.png
  icon-180.png
  icon-maskable-512.png

【上傳後務必做的事】
1. 確認 repo 根目錄能看到 tw3.css（先前漏傳的就是這個）
2. Settings → Pages → Source 選 main / root，存檔
3. 等一兩分鐘，開 https://mikemm5216.github.io/mogao-pwa/
4. iPhone Safari 開該網址 → 分享 → 加入主畫面

【更新內容時】把 sw.js 裡的 CACHE_VERSION 改成新字串（如 mogao-v2），
使用者下次開啟會自動更新，否則會一直讀舊快取。
