(function () {
  if (window.__MOGAO_V18_FAST_UPLOAD__) return;
  window.__MOGAO_V18_FAST_UPLOAD__ = true;

  const LEGACY_NOTES_KEY = 'mogao.customNotes.v14';
  const BLOB_IMAGES_KEY = 'mogao.blobImages.v1';
  const PENDING_KEYS = [
    'mogao.pendingPhotos.v10',
    'mogao.pendingPhotos.v11',
    'mogao.pendingPhotos.v12',
    'mogao.pendingPhotos.v13',
    'mogao.pendingPhotos.v14',
    'mogao.pendingPhotoUploads.v1'
  ];

  function parseJson(raw, fallback) {
    try { return raw ? JSON.parse(raw) : fallback; } catch (_) { return fallback; }
  }

  function normalizeCaveId(value) {
    return String(value || '').replace(/[^0-9]/g, '');
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, function (ch) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch];
    });
  }

  function clearPending() {
    try {
      PENDING_KEYS.forEach(function (key) { localStorage.removeItem(key); });
      localStorage.setItem('mogao.pendingPhotos.v14', '[]');
    } catch (_) {}
  }

  function sanitizeLegacyCustomNotes() {
    try {
      const raw = localStorage.getItem(LEGACY_NOTES_KEY);
      if (!raw) return;
      const notes = parseJson(raw, null);
      if (!Array.isArray(notes)) {
        localStorage.removeItem(LEGACY_NOTES_KEY);
        return;
      }
      let changed = false;
      const cleaned = notes.map(function (note) {
        if (!note || typeof note !== 'object') return note;
        if (!Array.isArray(note.images)) return note;
        const before = note.images.length;
        note.images = note.images.filter(function (img) {
          const src = typeof img === 'string' ? img : (img && img.src);
          if (!src || typeof src !== 'string') return false;
          if (src.startsWith('data:')) return false;
          if (src.length > 1000) return false;
          return /^https?:\/\//.test(src);
        }).slice(-12);
        if (note.images.length !== before) changed = true;
        return note;
      });
      const next = JSON.stringify(cleaned);
      if (changed || raw.length > next.length + 1000) localStorage.setItem(LEGACY_NOTES_KEY, next);
      localStorage.setItem('mogao.v18.legacyNotesSanitizedAt', new Date().toISOString());
    } catch (_) {
      try { localStorage.removeItem(LEGACY_NOTES_KEY); } catch (e) {}
    }
  }

  function setStatus(message, type) {
    const el = document.getElementById('mogao-v11-status');
    if (!el) return;
    el.textContent = message || '';
    el.style.color = type === 'bad' ? '#fca5a5' : type === 'ok' ? '#86efac' : '#fde68a';
  }

  function setPendingText(message) {
    const el = document.getElementById('mogao-v11-pending');
    if (el) el.textContent = message || '';
  }

  function setBusy(busy, text) {
    ['mogao-v11-cave','mogao-v11-caption','mogao-v11-file','mogao-v11-upload','mogao-v15-clear-pending'].forEach(function (id) {
      const el = document.getElementById(id);
      if (el) {
        el.disabled = busy;
        el.style.opacity = busy ? '.55' : '1';
      }
    });
    const btn = document.getElementById('mogao-v11-upload');
    if (btn) btn.textContent = busy ? (text || '上傳中，請不要重複按') : '新增照片（一次 1 張）';
  }

  function getCaptionLines(raw) {
    return String(raw || '').split(/\r?\n/).map(function (s) { return s.trim(); }).filter(Boolean);
  }

  function getBlobImagesMap() {
    const map = parseJson(localStorage.getItem(BLOB_IMAGES_KEY), {});
    return map && typeof map === 'object' && !Array.isArray(map) ? map : {};
  }

  function saveBlobImage(caveId, image) {
    const id = normalizeCaveId(caveId);
    if (!id || !image || !image.src) return;
    const map = getBlobImagesMap();
    const list = Array.isArray(map[id]) ? map[id] : [];
    const exists = list.some(function (x) {
      return x && ((image.clientUploadId && x.clientUploadId === image.clientUploadId) || x.src === image.src);
    });
    if (!exists) list.push(image);
    map[id] = list.filter(function (x) { return x && x.src && /^https?:\/\//.test(x.src); }).slice(-30);
    localStorage.setItem(BLOB_IMAGES_KEY, JSON.stringify(map));
  }

  function getBlobImages(caveId) {
    const map = getBlobImagesMap();
    const id = normalizeCaveId(caveId);
    return Array.isArray(map[id]) ? map[id] : [];
  }

  function renderBlobImages(caveId) {
    const id = normalizeCaveId(caveId);
    if (!id) return;
    const modal = document.getElementById('note-modal');
    if (!modal || modal.classList.contains('hidden')) return;
    const body = modal.querySelector('.overflow-y-auto');
    if (!body) return;
    const images = getBlobImages(id);
    let box = document.getElementById('mogao-v18-blob-images');
    if (!box) {
      box = document.createElement('section');
      box.id = 'mogao-v18-blob-images';
      box.className = 'mt-4 space-y-3';
      body.appendChild(box);
    }
    if (!images.length) {
      box.innerHTML = '';
      return;
    }
    box.innerHTML = images.map(function (img) {
      return '<figure class="mogao-v11-photo-card"><img loading="lazy" src="' + escapeHtml(img.src) + '"><figcaption>' + escapeHtml(img.caption || '') + '</figcaption></figure>';
    }).join('');
  }

  function patchOpenNoteOnce() {
    if (window.__MOGAO_V18_OPENNOTE_PATCHED__) return;
    if (typeof window.openNote !== 'function') return;
    const originalOpenNote = window.openNote;
    window.openNote = function (caveId) {
      const result = originalOpenNote.apply(this, arguments);
      setTimeout(function () { renderBlobImages(caveId); }, 80);
      return result;
    };
    window.__MOGAO_V18_OPENNOTE_PATCHED__ = true;
  }

  function readFileAsDataUrl(file) {
    return new Promise(function (resolve, reject) {
      const reader = new FileReader();
      reader.onload = function () { resolve(String(reader.result || '')); };
      reader.onerror = function () { reject(reader.error || new Error('讀取照片失敗')); };
      reader.readAsDataURL(file);
    });
  }

  function loadImageFromDataUrl(dataUrl) {
    return new Promise(function (resolve, reject) {
      const img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error('照片載入失敗')); };
      img.src = dataUrl;
    });
  }

  function canvasToBlob(canvas, type, quality) {
    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (blob) {
        if (blob) resolve(blob); else reject(new Error('照片壓縮失敗'));
      }, type, quality);
    });
  }

  async function sha256FromBlob(blob) {
    const buf = await blob.arrayBuffer();
    const hash = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(hash)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
  }

  async function compressFileToSmallBlob(file) {
    const dataUrl = await readFileAsDataUrl(file);
    const img = await loadImageFromDataUrl(dataUrl);
    const originalWidth = img.naturalWidth || img.width;
    const originalHeight = img.naturalHeight || img.height;
    if (!originalWidth || !originalHeight) throw new Error('照片尺寸讀取失敗');

    const maxSize = 720;
    const scale = Math.min(1, maxSize / Math.max(originalWidth, originalHeight));
    const width = Math.max(1, Math.round(originalWidth * scale));
    const height = Math.max(1, Math.round(originalHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { alpha: false });
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    let blob = await canvasToBlob(canvas, 'image/jpeg', 0.55);
    if (blob.size > 700 * 1024) {
      const smaller = document.createElement('canvas');
      const s = Math.min(1, 560 / Math.max(width, height));
      smaller.width = Math.max(1, Math.round(width * s));
      smaller.height = Math.max(1, Math.round(height * s));
      const sctx = smaller.getContext('2d', { alpha: false });
      sctx.fillStyle = '#ffffff';
      sctx.fillRect(0, 0, smaller.width, smaller.height);
      sctx.drawImage(img, 0, 0, smaller.width, smaller.height);
      blob = await canvasToBlob(smaller, 'image/jpeg', 0.48);
    }
    return blob;
  }

  async function uploadOneFile(file, caveId, caption) {
    setStatus('正在壓縮照片，請稍候…', 'warn');
    const blob = await compressFileToSmallBlob(file);
    const hash = await sha256FromBlob(blob);
    const clientUploadId = caveId + '-' + hash.slice(0, 24);

    const existing = getBlobImages(caveId).some(function (img) { return img && img.clientUploadId === clientUploadId; });
    if (existing) {
      setStatus('這張照片已經存在，已略過。', 'ok');
      return null;
    }

    setStatus('正在上傳 1 張照片…', 'warn');
    const res = await fetch('/api/upload-cave-image-fast', {
      method: 'POST',
      headers: {
        'Content-Type': blob.type || 'image/jpeg',
        'X-Cave-Id': caveId,
        'X-Caption': encodeURIComponent(caption || ''),
        'X-Client-Upload-Id': clientUploadId,
        'X-Content-Hash': hash
      },
      body: blob
    });

    const json = await res.json().catch(function () { return {}; });
    if (!res.ok || !json.url) throw new Error(json.detail || json.error || '照片上傳失敗');

    const image = {
      src: json.url,
      caption: caption || '',
      createdAt: new Date().toISOString(),
      clientUploadId,
      contentHash: hash,
      bytes: json.bytes || blob.size,
      mode: 'v18-blob-images'
    };
    saveBlobImage(caveId, image);
    return image;
  }

  async function uploadSinglePhoto() {
    const caveId = normalizeCaveId(document.getElementById('mogao-v11-cave')?.value);
    const fileInput = document.getElementById('mogao-v11-file');
    const files = Array.from(fileInput?.files || []);
    const captions = getCaptionLines(document.getElementById('mogao-v11-caption')?.value || '');

    if (!caveId) throw new Error('請輸入洞窟號');
    if (!files.length) throw new Error('請選照片');
    if (!navigator.onLine) throw new Error('目前離線，照片先不要上傳；等有網路再試。');

    const chosen = files[0];
    setBusy(true, '上傳 1 張中…請勿重複按');
    try {
      const caption = captions[0] || chosen.name.replace(/\.[^.]+$/, '') || (caveId + ' 窟照片');
      const image = await uploadOneFile(chosen, caveId, caption);
      if (fileInput) fileInput.value = '';
      clearPending();
      setPendingText('');
      if (image) setStatus('完成：照片已上傳。請點該洞窟查看照片。', 'ok');
    } finally {
      setBusy(false);
    }
  }

  function installPatch() {
    sanitizeLegacyCustomNotes();
    clearPending();
    patchOpenNoteOnce();

    const uploadBtn = document.getElementById('mogao-v11-upload');
    const fileInput = document.getElementById('mogao-v11-file');
    if (!uploadBtn) return;

    uploadBtn.dataset.v18Fast = '1';
    uploadBtn.textContent = '新增照片（一次 1 張）';
    uploadBtn.onclick = function () {
      uploadSinglePhoto().catch(function (err) { setStatus(err && err.message ? err.message : String(err), 'bad'); setBusy(false); });
    };
    if (fileInput) fileInput.multiple = false;

    const pending = document.getElementById('mogao-v11-pending');
    if (pending && !document.getElementById('mogao-v15-clear-pending')) {
      const btn = document.createElement('button');
      btn.id = 'mogao-v15-clear-pending';
      btn.type = 'button';
      btn.textContent = '清除待上傳';
      btn.className = 'mogao-v11-btn bg-stone-700 text-amber-100 w-full';
      btn.onclick = function () { clearPending(); setPendingText('已清除待上傳照片。'); setStatus('待上傳 queue 已清空。', 'ok'); };
      pending.parentNode.insertBefore(btn, pending.nextSibling);
    }

    if (!window.__MOGAO_V18_READY_SHOWN__) {
      setStatus('V18 已啟用：照片改用輕量紀錄，不再寫入舊大型筆記資料。', 'ok');
      window.__MOGAO_V18_READY_SHOWN__ = true;
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    installPatch();
    setTimeout(installPatch, 500);
    setTimeout(installPatch, 1500);
  });
})();
