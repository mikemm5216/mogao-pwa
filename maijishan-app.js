(() => {
  const T = 'maijishan.textNotes.v1';
  const I = 'maijishan.blobImages.v1';
  const OLD = [
    'mogao.pendingPhotos.v10',
    'mogao.pendingPhotos.v11',
    'mogao.pendingPhotos.v12',
    'mogao.pendingPhotos.v13',
    'mogao.pendingPhotos.v14',
    'mogao.pendingPhotoUploads.v1'
  ];

  let allCaves = [];
  let noteCaves = [];
  let cur = '';
  let scale = 1.25;
  let px = 8;
  let py = 6;
  let drag = false;
  let sx = 0;
  let sy = 0;
  let bx = 0;
  let by = 0;

  const $ = id => document.getElementById(id);
  const norm = value => String(value || '').replace(/[^0-9]/g, '');
  const parse = (raw, fallback) => {
    try {
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  };
  const esc = value => String(value || '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));

  const tm = () => parse(localStorage.getItem(T), {});
  const im = () => parse(localStorage.getItem(I), {});

  function trans() {
    $('stage').style.transform = `translate3d(${px}px,${py}px,0) scale(${scale})`;
  }

  function reset() {
    scale = 1.25;
    px = 8;
    py = 6;
    trans();
  }

  function status(message) {
    $('status').textContent = message || '';
  }

  function findNote(id) {
    return noteCaves.find(cave => String(cave.id) === id);
  }

  function photoFigure(image) {
    return `<figure class="photo"><img loading="lazy" src="${esc(image.src)}" alt="${esc(image.caption || '')}">${image.caption ? `<figcaption>${esc(image.caption)}</figcaption>` : ''}</figure>`;
  }

  function openCave(id) {
    id = norm(id);
    cur = id;

    const cave = findNote(id) || {
      id,
      title: `${id} 窟`,
      note: '這個洞窟目前沒有內建筆記。可用「新增筆記」補資料。'
    };

    $('modalTitle').textContent = `${cave.title || `${id} 窟`} 筆記`;
    $('info').textContent = cave.note || '這個洞窟目前沒有內建筆記。';
    $('textView').textContent = tm()[id] || '尚無自訂文字筆記。';

    const builtInPhotos = Array.isArray(cave.images) ? cave.images : [];
    const uploadedPhotos = Array.isArray(im()[id]) ? im()[id] : [];
    const photosHtml = [
      ...builtInPhotos.map(photoFigure),
      ...uploadedPhotos.map(photoFigure)
    ].join('');

    $('photos').innerHTML = photosHtml || '<p class="muted">尚無照片。</p>';
    $('modal').style.display = 'flex';
  }

  function drawNumber(cave) {
    const nums = $('numbers');
    if (!nums) return;
    const id = norm(cave.id);
    const x = Number(cave.x);
    const y = Number(cave.y);
    if (!id || !isFinite(x) || !isFinite(y)) return;

    const label = document.createElement('span');
    label.className = 'num';
    label.textContent = id;
    label.style.left = `${x}%`;
    label.style.top = `${y}%`;
    nums.appendChild(label);
  }

  function drawMarker(cave) {
    const layer = $('spots');
    const id = norm(cave.id);
    const x = Number(cave.x);
    const y = Number(cave.y);
    if (!id || !isFinite(x) || !isFinite(y)) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'spot';
    button.textContent = id;
    button.style.left = `${x}%`;
    button.style.top = `${y}%`;
    button.onpointerdown = event => {
      event.preventDefault();
      event.stopPropagation();
    };
    button.onpointerup = event => {
      event.preventDefault();
      event.stopPropagation();
      openCave(id);
    };
    button.onclick = event => {
      event.preventDefault();
      event.stopPropagation();
      openCave(id);
    };
    layer.appendChild(button);
  }

  function render() {
    const nums = $('numbers');
    const layer = $('spots');
    if (nums) nums.innerHTML = '';
    layer.innerHTML = '';

    const seenNum = new Set();
    allCaves.forEach(cave => {
      const id = norm(cave.id);
      if (!id || seenNum.has(id)) return;
      seenNum.add(id);
      drawNumber(cave);
    });

    const seenNote = new Set();
    noteCaves.forEach(cave => {
      const id = norm(cave.id);
      if (!id || seenNote.has(id)) return;
      seenNote.add(id);
      drawMarker(cave);
    });
  }

  async function loadJson(path) {
    try {
      const response = await fetch(`${path}?ts=${Date.now()}`, { cache: 'no-store' });
      const json = await response.json();
      return Array.isArray(json) ? json : json.caves || [];
    } catch {
      return [];
    }
  }

  async function load() {
    allCaves = await loadJson('./data/maijishan-all-caves.json');
    noteCaves = await loadJson('./data/maijishan-caves.json');
    if (!allCaves.length) allCaves = noteCaves;
    render();
  }

  async function compress(file) {
    const data = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = data;
    });

    const w = image.naturalWidth;
    const h = image.naturalHeight;
    const s = Math.min(1, 600 / Math.max(w, h));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(w * s);
    canvas.height = Math.round(h * s);

    const ctx = canvas.getContext('2d', { alpha: false });
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    return await new Promise((resolve, reject) => {
      canvas.toBlob(blob => blob ? resolve(blob) : reject(Error('壓縮失敗')), 'image/jpeg', 0.45);
    });
  }

  async function hash(blob) {
    const buf = await blob.arrayBuffer();
    const digest = await crypto.subtle.digest('SHA-256', buf);
    return [...new Uint8Array(digest)].map(x => x.toString(16).padStart(2, '0')).join('');
  }

  async function upload() {
    const id = norm($('caveInput').value);
    const file = $('fileInput').files[0];
    const caption = $('captionInput').value || '';
    if (!id) return status('請輸入洞窟號');
    if (!file) return status('請選照片');
    if (!navigator.onLine) return status('離線不能上傳照片');

    $('uploadBtn').disabled = true;
    try {
      status('正在壓縮照片…');
      const blob = await compress(file);
      const contentHash = await hash(blob);
      const clientUploadId = `maijishan-${id}-${contentHash.slice(0, 24)}`;
      const storedImages = im();
      const list = Array.isArray(storedImages[id]) ? storedImages[id] : [];

      if (list.some(item => item.clientUploadId === clientUploadId)) {
        return status('這張照片已存在');
      }

      status('正在上傳照片…');
      const response = await fetch('/api/upload-cave-image-fast', {
        method: 'POST',
        headers: {
          'Content-Type': 'image/jpeg',
          'X-Cave-Id': `maijishan-${id}`,
          'X-Caption': encodeURIComponent(caption),
          'X-Client-Upload-Id': clientUploadId,
          'X-Content-Hash': contentHash
        },
        body: blob
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.url) throw Error(result.detail || result.error || '上傳失敗');

      list.push({
        src: result.url,
        caption,
        clientUploadId,
        createdAt: new Date().toISOString()
      });
      storedImages[id] = list.slice(-30);
      localStorage.setItem(I, JSON.stringify(storedImages));
      $('fileInput').value = '';
      status('完成：照片已上傳');
    } catch (error) {
      status(error.message || String(error));
    } finally {
      $('uploadBtn').disabled = false;
    }
  }

  function boot() {
    $('viewer').onpointerdown = event => {
      if (event.target.closest('.spot')) return;
      drag = true;
      sx = event.clientX;
      sy = event.clientY;
      bx = px;
      by = py;
      $('viewer').setPointerCapture(event.pointerId);
    };
    $('viewer').onpointermove = event => {
      if (!drag) return;
      px = bx + event.clientX - sx;
      py = by + event.clientY - sy;
      trans();
    };
    $('viewer').onpointerup = event => {
      drag = false;
      try {
        $('viewer').releasePointerCapture(event.pointerId);
      } catch {}
    };

    $('zoomIn').onclick = () => { scale = Math.min(4, scale * 1.2); trans(); };
    $('zoomOut').onclick = () => { scale = Math.max(0.65, scale / 1.2); trans(); };
    $('resetView').onclick = reset;
    $('closeModal').onclick = $('closeModal2').onclick = () => { $('modal').style.display = 'none'; };
    $('closePanel').onclick = () => { $('panel').style.display = 'none'; };
    $('addNote').onclick = () => { $('panel').style.display = 'flex'; };
    $('editCave').onclick = () => {
      $('modal').style.display = 'none';
      $('panel').style.display = 'flex';
      $('caveInput').value = cur;
      $('textInput').value = tm()[cur] || '';
    };
    $('saveText').onclick = () => {
      const id = norm($('caveInput').value);
      if (!id) return status('請輸入洞窟號');
      const notes = tm();
      notes[id] = $('textInput').value || '';
      localStorage.setItem(T, JSON.stringify(notes));
      status('文字筆記已儲存');
    };
    $('uploadBtn').onclick = upload;
    $('clearOld').onclick = () => {
      OLD.forEach(key => localStorage.removeItem(key));
      status('已清除舊暫存');
    };
    $('map').onload = () => {
      render();
      reset();
    };
    load();
    reset();
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', boot) : boot();
})();
