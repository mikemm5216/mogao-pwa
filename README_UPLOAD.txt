這一版已把你確認的底圖換成新的麥積山底圖。
內容確認：包含老爸手寫圖所有洞窟：121, 127, 98, 133, 135, 78, 44, 43, 5, 4, 13, 9, 3, 1。
另外也保留底圖上額外可見的：148, 37, 168。
已更新檔案：/maijishan.html /maijishan-app.js /service-worker.js /data/maijishan-new-map.webp /data/maijishan-all-caves.json

補丁 v6.1：橘色標籤外觀已改成半透明圓形，保留洞窟編號；座標仍是 v6 對應新版底圖的座標。

補丁 v6.2：補上第191窟，座標 x=3.038, y=72.330，並附 overlay preview。

補丁 v6.3：修正 191 看不到的原因。現在 maijishan-app.js 會直接把 data/maijishan-all-caves.json 裡的洞窟全部渲染成橘色標籤；不再依賴 maijishan-caves.json 才顯示。
