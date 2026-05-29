# 莫高窟 PWA 個人新增筆記版

此版本包含：

- 手動新增筆記，離線可用，先存 localStorage。
- 洞窟號自動查座標表，自動產生橘色數字標籤。
- 聯網時透過 Vercel API 同步 `data/custom-notes.json` 到 GitHub。
- 聯網時可上傳圖片，透過 Vercel API 呼叫 OpenAI OCR 產生草稿。

Vercel Environment Variables：

- `GITHUB_TOKEN`
- `OPENAI_API_KEY`
- `GITHUB_OWNER=mikemm5216`
- `GITHUB_REPO=mogao-pwa`
- `GITHUB_BRANCH=main`
- `CUSTOM_NOTES_PATH=data/custom-notes.json`
- 可選：`OPENAI_OCR_MODEL=gpt-4.1-mini`

建議用 Vercel 網址安裝 PWA，因為 `/api/sync-notes` 與 `/api/ocr-note` 需要 Vercel Serverless Functions。
