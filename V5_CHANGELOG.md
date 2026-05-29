# V5 多張照片 + 多行備註 + 上傳鎖定

本版更新：
- 可一次選多張洞窟照片。
- 照片備註改成多行 textarea，一行對應一張照片。
- 上傳處理中會鎖住洞窟號、備註、選檔與上傳按鈕，避免老人家連點造成重複上傳。
- 離線時照片先存在 localStorage queue；恢復網路後自動補傳。
- 同一張照片用 hash/clientUploadId 去重，不會重複加入 queue 或重複建立 GitHub 圖檔。
- service worker cache 已 bump 到 mogao-pwa-v5-multi-photo-multi-caption-lock。
