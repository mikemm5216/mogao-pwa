(function () {
  if (window.__MOGAO_V15_FAST_UPLOAD__) return;
  window.__MOGAO_V15_FAST_UPLOAD__ = true;

  const NOTES_KEY = 'mogao.customNotes.v14';
  const PENDING_KEYS = [
    'mogao.pendingPhotos.v10',
    'mogao.pendingPhotos.v11',
    'mogao.pendingPhotos.v12',
    'mogao.pendingPhotos.v13',
    'mogao.pendingPhotos.v14',
    'mogao.pendingPhotoUploads.v1'
  ];

  let patchObserver = null;

  function parseJson(raw, fallback) {
    try { return raw ? JSON.parse(raw) : fallback; } catch (_) { return fallback; }
  }

  function getNotes() {
    const notes = parseJson(localStorage.getItem(NOTES_KEY), []);
    return Array.isArray(notes) ? notes : [];
  }

  function saveNotes(notes) {
    localStorage.setItem(NOTES_KEY, JSON.stringify(Array.isArray(notes) ? notes : []));
  }

  function normalizeCaveId(value) {
    return String(value || '').replace(/[^0-9]/g, '');
  }

  function hideOpenCaveModal() {
    const modal = document.getElementById('note-modal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.style.display = 'none';
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
      if (canvas.toBlob) {
        canvas.toBlob(function (blob) {
          if (blob) resolve(blob); else reject(new Error('照片壓縮失敗'));
        }, type, quality);
        return;
      }
      reject(new Error('這台手機瀏覽器不支援照片壓縮'));
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

    return { blob, originalBytes: file.size || 0, compressedBytes: blob.size };
  }

  function findNote(caveId) {
    return getNotes().find(function (n) { return String(n.id) === String(caveId); });
  }

  function upsertImage(caveId, image) {
    const id = normalizeCaveId(caveId);
    if (!id || !image || !image.src) return;
    const notes = getNotes();
    let note = notes.find(function (n) { return String(n.id) === id; });
    if (!note) {
      note = { id, title: id + ' 窟 筆記', content: '', tags: ['自訂照片'], images: [], updatedAt: '' };
      notes.push(note);
    }
    if (!Array.isArray(note.images)) note.images = [];
    const uploadId = image.clientUploadId || '';
    const src = image.src || '';
    const exists = note.images.some(function (img) {
      return typeof img === 'string' ? img === src : ((uploadId && img.clientUploadId === uploadId) || img.src === src);
    });
    if (!exists) note.images.push(image);
    note.updatedAt = new Date().toISOString();
    saveNotes(notes);
  }

  async function uploadOneFile(file, caveId, caption) {
    // Prevent the base page's broad modal observer from re-rendering while upload status changes.
    hideOpenCaveModal();

    setStatus('正在壓縮照片，會壓到較小尺寸避免手機卡住…', 'warn');
    const compressed = await compressFileToSmallBlob(file);
    const hash = await sha256FromBlob(compressed.blob);
    const clientUploadId = caveId + '-' + hash.slice(0, 24);

    const existing = findNote(caveId)?.images?.some(function (img) { return img && img.clientUploadId === clientUploadId; });
    if (existing) {
      setStatus('這張照片已經存在，已略過，不會重複加入。', 'ok');
      return null;
    }

    setStatus('正在上傳 1 張照片…不要關閉頁面。', 'warn');
    const res = await fetch('/api/upload-cave-image-fast', {
      method: 'POST',
      headers: {
        'Content-Type': compressed.blob.type || 'image/jpeg',
        'X-Cave-Id': caveId,
        'X-Caption': encodeURIComponent(caption || ''),
        'X-Client-Upload-Id': clientUploadId,
        'X-Content-Hash': hash
      },
      body: compressed.blob
    });

    const json = await res.json().catch(function () { return {}; });
    if (!res.ok || !json.url) {
      throw new Error(json.detail || json.error || '照片上傳失敗');
    }

    const image = {
      src: json.url,
      caption: caption || '',
      createdAt: new Date().toISOString(),
      clientUploadId,
      contentHash: hash,
      bytes: json.bytes || compressed.blob.size,
      mode: 'v15-fast-binary'
    };

    upsertImage(caveId, image);
    hideOpenCaveModal();
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

    hideOpenCaveModal();

    const chosen = files.slice(0, 1);
    if (files.length > 1) {
      setStatus('一次只上傳 1 張。這次先處理第一張，避免手機卡住。', 'warn');
    }

    setBusy(true, '上傳 1 張中…請勿重複按');
    try {
      const caption = captions[0] || chosen[0].name.replace(/\.[^.]+$/, '') || (caveId + ' 窟照片');
      const image = await uploadOneFile(chosen[0], caveId, caption);
      if (fileInput) fileInput.value = '';
      PENDING_KEYS.forEach(function (key) { localStorage.removeItem(key); });
      localStorage.setItem('mogao.pendingPhotos.v14', '[]');
      setPendingText('');
      hideOpenCaveModal();
      if (image) {
        setStatus('完成：照片已上傳。請關閉新增視窗，再點一次該洞窟查看照片。', 'ok');
      }
    } finally {
      setBusy(false);
    }
  }

  function clearPending() {
    PENDING_KEYS.forEach(function (key) { localStorage.removeItem(key); });
    localStorage.setItem('mogao.pendingPhotos.v14', '[]');
    setPendingText('已清除待上傳照片。');
    setStatus('待上傳 queue 已清空。', 'ok');
  }

  function installPatch() {
    const uploadBtn = document.getElementById('mogao-v11-upload');
    const fileInput = document.getElementById('mogao-v11-file');
    if (!uploadBtn || uploadBtn.dataset.v15Fast === '1') return;

    uploadBtn.dataset.v15Fast = '1';
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
      btn.onclick = clearPending;
      pending.parentNode.insertBefore(btn, pending.nextSibling);
    }

    clearPending();
    setStatus('V15 已啟用：一次 1 張，小圖快速上傳，成功才加入照片紀錄。', 'ok');

    if (patchObserver) {
      patchObserver.disconnect();
      patchObserver = null;
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    setTimeout(installPatch, 500);
    setTimeout(installPatch, 1500);
  });

  patchObserver = new MutationObserver(function () { installPatch(); });
  patchObserver.observe(document.documentElement, { childList: true, subtree: true });
})();
