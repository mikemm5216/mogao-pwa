# 莫高窟橘色筆記 PWA

手機優先、可安裝到主畫面、可離線使用的莫高窟橘色筆記 PWA。

## 使用方式

1. 部署到 GitHub Pages。
2. 用 iPhone Safari 開啟 GitHub Pages 網址。
3. 點 Safari 分享按鈕。
4. 選「加入主畫面」。
5. 第一次完整開啟後，之後可離線使用。

## 檔案

- `index.html`：手機優先卡片版，內含 35 筆橘色筆記。
- `manifest.webmanifest`：PWA 安裝設定。
- `service-worker.js`：離線快取。
- `icons/`：PWA 圖示。

## 注意

PWA 離線安裝需要 HTTPS，因此不要用 iPhone 檔案 App 直接開本機 HTML 來測試 PWA。請先部署到 GitHub Pages、Netlify、Cloudflare Pages 或其他 HTTPS 靜態站。
