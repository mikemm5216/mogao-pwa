(() => {
  const SITE = 'mogao';
  const DATA_ALL = './data/cave-coordinates.json';
  const DATA_NOTES = './data/cave-coordinates.json';
  const DATA_SUPP = './data/mogao-supplements.json';
  const UPDATE_API = '/api/update-maijishan-cave';
  const TEXT_KEY = `${SITE}.textNotes.v1`;
  const IMAGE_KEY = `${SITE}.blobImages.v1`;

  let allCaves = [];
  let noteCaves = [];
  let supp = [];
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
    try { return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
  };
  const esc = value => String(value || '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
  const tm = () => parse(localStorage.getItem(TEXT_KEY), {});
  const im = () => parse(localStorage.getItem(IMAGE_KEY), {});
  const num = value => {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  };
  const hasPoint = item => num(item && item.x) !== null && num(item && item.y) !== null;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const imgSrc = value => String(value || '').replace(/^\/public\/images\//, '/images/');

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
    const node = $('status');
    if (node) node.textContent = message || '';
  }

  function findNote(id) {
    return noteCaves.find(item => norm(item && item.id) === id);
  }

  function findSupp(id) {
    return supp.find(item => norm(item && item.id) === id) || { id, note: '', images: [] };
  }

  function fig(item) {
    return `<figure class="photo"><img loading="lazy" src="${esc(imgSrc(item.src))}" alt="${esc(item.caption || '')}">${item.caption ? `<figcaption>${esc(item.caption)}</figcaption>` : ''}</figure>`;
  }

  function openCave(id) {
    id = norm(id);
    cur = id;
    const cave = findNote(id) || { id, title: `${id} 窟`, note: '這個洞窟目前沒有內建筆記。' };
    const extra = findSupp(id);
    const builtImages = Array.isArray(cave.images) ? cave.images : [];
    const savedImages = Array.isArray(extra.images) ? extra.images : [];
    const localImages = Array.isArray(im()[id]) ? im()[id] : [];

    $('modalTitle').textContent = (cave.title || `${id} 窟`) + ' 筆記';
    $('info').textContent = cave.desc || cave.note || '這個洞窟目前沒有內建筆記。';
    $('textView').textContent = extra.note || tm()[id] || '尚無補充文字。';
    $('photos').innerHTML = [...builtImages.map(fig), ...savedImages.map(fig), ...localImages.map(fig)].join('') || '<p class="muted">尚無照片。</p>';
    $('modal').style.display = 'flex';
  }

  function drawNumber(cave) {
    const nums = $('numbers');
    if (!nums) return;
    const id = norm(cave && cave.id);
    const x = num(cave && cave.x);
    const y = num(cave && cave.y);
    if (!id || x === null || y === null) return;
    const node = document.createElement('span');
    node.className = 'num';
    node.textContent = id;
    node.style.left = x + '%';
    node.style.top = y + '%';
    nums.appendChild(node);
  }

  function drawMarker(cave) {
    const layer = $('spots');
    const id = norm(cave && cave.id);
    const x = num(cave && cave.x);
    const y = num(cave && cave.y);
    if (!id || x === null || y === null) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'spot';
    button.textContent = id;
    button.style.left = x + '%';
    button.style.top = y + '%';
    button.onpointerdown = event => { event.preventDefault(); event.stopPropagation(); };
    button.onpointerup = event => { event.preventDefault(); event.stopPropagation(); openCave(id); };
    button.onclick = event => { event.preventDefault(); event.stopPropagation(); openCave(id); };
    layer.appendChild(button);
  }

  function render() {
    const nums = $('numbers');
    const layer = $('spots');
    if (nums) nums.innerHTML = '';
    if (!layer) return;
    layer.innerHTML = '';

    const numbered = new Set();
    allCaves.forEach(cave => {
      const id = norm(cave && cave.id);
      if (id && !numbered.has(id)) {
        numbered.add(id);
        drawNumber(cave);
      }
    });

    const marked = new Set();
    noteCaves.forEach(cave => {
      const id = norm(cave && cave.id);
      if (id && !marked.has(id)) {
        marked.add(id);
        drawMarker(cave);
      }
    });

    supp.forEach(item => {
      const id = norm(item && item.id);
      if (id && !marked.has(id) && hasPoint(item)) {
        marked.add(id);
        drawMarker(item);
      }
    });
  }

  async function loadJson(path) {
    try {
      const response = await fetch(path + '?ts=' + Date.now(), { cache: 'no-store' });
      if (!response.ok) return [];
      const json = await response.json();
      return Array.isArray(json) ? json : (json.caves || []);
    } catch {
      return [];
    }
  }

  async function load() {
    allCaves = await loadJson(DATA_ALL);
    noteCaves = await loadJson(DATA_NOTES);
    supp = await loadJson(DATA_SUPP);
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
    const img = await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = data;
    });
    const ratio = Math.min(1, 600 / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * ratio);
    canvas.height = Math.round(img.naturalHeight * ratio);
    const ctx = canvas.getContext('2d', { alpha: false });
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(Error('壓縮失敗')), 'image/jpeg', 0.45));
  }

  async function hash(blob) {
    const buffer = await blob.arrayBuffer();
    const digest = await crypto.subtle.digest('SHA-256', buffer);
    return [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, '0')).join('');
  }

  function centerPoint() {
    const viewer = $('viewer');
    const wrap = $('wrap');
    if (!viewer || !wrap) return null;
    const viewerBox = viewer.getBoundingClientRect();
    const wrapBox = wrap.getBoundingClientRect();
    if (!wrapBox.width || !wrapBox.height) return null;
    return {
      x: Number(clamp(((viewerBox.left + viewerBox.width / 2 - wrapBox.left) / wrapBox.width) * 100, 0, 100).toFixed(3)),
      y: Number(clamp(((viewerBox.top + viewerBox.height / 2 - wrapBox.top) / wrapBox.height) * 100, 0, 100).toFixed(3))
    };
  }

  function setPanelPoint(point) {
    const xInput = $('labelX');
    const yInput = $('labelY');
    if (!xInput || !yInput || !point) return;
    xInput.value = point.x;
    yInput.value = point.y;
  }

  function getPanelPoint(id) {
    let x = num($('labelX') && $('labelX').value);
    let y = num($('labelY') && $('labelY').value);
    const existing = findSupp(id);
    if ((x === null || y === null) && hasPoint(existing)) {
      x = num(existing.x);
      y = num(existing.y);
    }
    if ((x === null || y === null) && !findNote(id)) {
      const point = centerPoint();
      if (point) {
        x = point.x;
        y = point.y;
        setPanelPoint(point);
      }
    }
    return x !== null && y !== null ? { x, y } : null;
  }

  function dedupeImages(images) {
    const seen = new Set();
    return images.filter(item => {
      const src = String(item && item.src || '');
      if (!src || seen.has(src)) return false;
      seen.add(src);
      return true;
    });
  }

  async function saveSupplement(extraImages = []) {
    const id = norm(($('caveInput') && $('caveInput').value) || cur);
    if (!id) return status('請輸入洞窟號');
    const existing = findSupp(id);
    const note = ($('textInput') && $('textInput').value) || existing.note || '';
    const images = dedupeImages([...(Array.isArray(existing.images) ? existing.images : []), ...extraImages]);
    const point = getPanelPoint(id);
    const body = { site: SITE, id, note, images };
    if (point) {
      body.x = point.x;
      body.y = point.y;
      body.title = `${id} 窟`;
    }

    const response = await fetch(UPDATE_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok || !json.ok) throw Error(json.detail || json.error || '補充資料儲存失敗');

    const index = supp.findIndex(item => norm(item && item.id) === id);
    if (index >= 0) supp[index] = json.supplement;
    else supp.push(json.supplement);
    localStorage.setItem(TEXT_KEY, JSON.stringify({ ...tm(), [id]: note }));
    render();
    status(point ? '完成：補充資料與橘色標籤已更新' : '完成：補充資料已更新');
  }

  async function upload() {
    const id = norm($('caveInput') && $('caveInput').value);
    const file = $('fileInput') && $('fileInput').files[0];
    const caption = ($('captionInput') && $('captionInput').value) || '';
    if (!id) return status('請輸入洞窟號');
    if (!file) return status('請選照片');
    if (!navigator.onLine) return status('離線時不能上傳照片，請連上網路後再試。');
    $('uploadBtn').disabled = true;
    try {
      status('正在整理照片…');
      const blob = await compress(file);
      const contentHash = await hash(blob);
      const uploadId = `${SITE}-${id}-${contentHash.slice(0, 24)}`;
      status('正在新增照片…');
      const response = await fetch('/api/upload-cave-image-fast', {
        method: 'POST',
        headers: {
          'Content-Type': 'image/jpeg',
          'X-Cave-Id': `${SITE}-${id}`,
          'X-Caption': encodeURIComponent(caption),
          'X-Client-Upload-Id': uploadId,
          'X-Content-Hash': contentHash
        },
        body: blob
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json.url) throw Error(json.detail || json.error || '照片新增失敗');
      await saveSupplement([{ src: json.url, caption }]);
      $('fileInput').value = '';
      $('captionInput').value = '';
      status('完成：補充照片已更新');
    } catch (error) {
      status(error.message || String(error));
    } finally {
      $('uploadBtn').disabled = false;
    }
  }

  function openPanelFor(id) {
    id = norm(id || '');
    const existing = id ? findSupp(id) : { note: '' };
    $('panel').style.display = 'flex';
    $('caveInput').value = id;
    $('textInput').value = existing.note || tm()[id] || '';
    $('captionInput').value = '';
    $('fileInput').value = '';
    $('labelX').value = hasPoint(existing) ? num(existing.x) : '';
    $('labelY').value = hasPoint(existing) ? num(existing.y) : '';
    status(id && hasPoint(existing) ? '這個洞窟已有橘色標籤位置。' : '');
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
      try { $('viewer').releasePointerCapture(event.pointerId); } catch {}
    };
    $('zoomIn').onclick = () => { scale = Math.min(4, scale * 1.2); trans(); };
    $('zoomOut').onclick = () => { scale = Math.max(0.65, scale / 1.2); trans(); };
    $('resetView').onclick = reset;
    $('closeModal').onclick = $('closeModal2').onclick = () => { $('modal').style.display = 'none'; };
    $('closePanel').onclick = () => { $('panel').style.display = 'none'; };
    $('addNote').onclick = () => openPanelFor('');
    $('editCave').onclick = () => {
      $('modal').style.display = 'none';
      openPanelFor(cur);
    };
    $('placeLabel').onclick = () => {
      const point = centerPoint();
      if (!point) return status('目前無法取得位置，請稍後再試。');
      setPanelPoint(point);
      status('已記住橘色標籤位置，儲存後會出現在圖上。');
    };
    $('saveText').onclick = () => { saveSupplement().catch(error => status(error.message || String(error))); };
    $('uploadBtn').onclick = upload;
    $('clearOld').onclick = () => {
      localStorage.removeItem(IMAGE_KEY);
      status('已清除舊暫存');
    };
    $('map').onload = () => { render(); reset(); };
    load();
    reset();
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', boot) : boot();
})();
