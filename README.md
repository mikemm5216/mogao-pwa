莫高窟崖面筆記 — PWA 離線版
================================

【這是什麼】
一個可安裝到手機主畫面、完全離線使用的網頁 App，
保留原本所有互動：橫向滾動長卷全景圖、點橘色標記跳出洞窟筆記、自動播放等。

【如何部署（擇一）】

▸ GitHub Pages
  1. 在 GitHub 建一個 repo（可設 Public）
  2. 把這個資料夾內所有檔案上傳到 repo 根目錄
  3. Settings → Pages → Source 選 main 分支 / root
  4. 等一兩分鐘，會給你一個 https://你的帳號.github.io/repo名/ 網址

▸ Netlify（最簡單，免帳號也行）
  1. 開 https://app.netlify.com/drop
  2. 直接把「整個資料夾」拖進去
  3. 立刻得到一個 https 網址

▸ Cloudflare Pages 亦可，作法類似。

【手機安裝（拿到 https 網址後）】
  iPhone：用 Safari 開網址 → 分享鈕 → 「加入主畫面」
  Android：用 Chrome 開網址 → 會跳「安裝」提示，或選單 →「安裝應用程式」
  安裝後第一次開啟會自動快取，之後飛航模式也能用。

【檔案說明】
  index.html              主程式
  manifest.webmanifest    App 設定（名稱、圖示）
  sw.js                   離線快取核心
  assets/tw3.css          樣式
  assets/fonts.css        內嵌繁體中文字型
  icons/                  App 圖示

【更新內容後】
  改完檔案重新上傳，並把 sw.js 裡的 CACHE_VERSION 改個新字串
  （例如 mogao-v2），使用者下次開啟就會拿到新版。
