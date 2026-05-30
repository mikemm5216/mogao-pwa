(function(){
  var statusEl = document.getElementById('status');
  var frame = document.getElementById('appframe');

  function setStatus(text){
    if (!statusEl) return;
    statusEl.textContent = text;
    statusEl.classList.remove('hidden');
  }

  function removeAll(text, targets){
    var out = String(text || '');
    targets.forEach(function(t){ out = out.split(t).join(''); });
    return out;
  }

  function patchLegacyHtml(html){
    var patched = String(html || '');
    patched = removeAll(patched, [
      'observeModal();',
      "window.addEventListener('online', flushPending);",
      'window.addEventListener("online", flushPending);',
      'setTimeout(flushPending, 1000);',
      'const current = getOpenCaveId(); if (current) renderNotesIntoModal(current);',
      'if (current) renderNotesIntoModal(current);'
    ]);
    patched = patched.replace('</body>', '<script src="./v15-fast-upload.js?v=18-clean-shell"><\/script><script>window.__MOGAO_V18_CLEAN_SHELL__=true;<\/script></body>');
    return patched;
  }

  async function boot(){
    try {
      setStatus('正在載入原始地圖，並移除舊版上傳監聽…');
      var res = await fetch('/index.html?legacy=' + Date.now(), { cache: 'no-store' });
      if (!res.ok) throw new Error('讀取地圖失敗 ' + res.status);
      var html = await res.text();
      frame.srcdoc = patchLegacyHtml(html);
      frame.addEventListener('load', function(){
        setStatus('V18 乾淨版已載入。請測試橘色標籤與單張照片上傳。');
        setTimeout(function(){ statusEl.classList.add('hidden'); }, 1800);
      });
    } catch (err) {
      setStatus('V18 載入失敗：' + (err && err.message ? err.message : String(err)));
    }
  }

  boot();
})();
