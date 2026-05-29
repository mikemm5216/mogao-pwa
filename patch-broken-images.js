(function(){
  if (window.__MOGAO_BROKEN_IMAGE_PATCH__) return;
  window.__MOGAO_BROKEN_IMAGE_PATCH__ = true;
  function safeJsonParse(raw, fallback) {
    try { return raw ? JSON.parse(raw) : fallback; } catch (_) { return fallback; }
  }
  function normalizePath(src) {
    if (!src) return '';
    if (String(src).startsWith('data:')) return String(src);
    try { return new URL(src, location.href).pathname.replace(/^\/+/, ''); }
    catch (_) { return String(src).replace(/^\/+/, ''); }
  }
  function purgeBrokenImage(src) {
    const target = normalizePath(src);
    if (!target || target.startsWith('data:')) return;
    const key = 'mogao.customNotes.v1';
    const notes = safeJsonParse(localStorage.getItem(key), []);
    let changed = false;
    const cleaned = (Array.isArray(notes) ? notes : []).map(function(note) {
      if (!Array.isArray(note.images)) return note;
      const before = note.images.length;
      note.images = note.images.filter(function(img) {
        const value = typeof img === 'string' ? img : (img && img.src);
        const normalized = normalizePath(value);
        return normalized && normalized !== target;
      });
      if (note.images.length !== before) {
        note.updatedAt = new Date().toISOString();
        changed = true;
      }
      return note;
    });
    if (changed) localStorage.setItem(key, JSON.stringify(cleaned));
  }
  window.addEventListener('error', function(event) {
    const img = event.target;
    if (!(img instanceof HTMLImageElement)) return;
    const src = img.getAttribute('src') || img.currentSrc || '';
    if (!src || String(src).startsWith('data:')) return;
    const card = img.closest('figure');
    if (card) card.remove();
    purgeBrokenImage(src);
    const gallery = document.getElementById('modal-cave-gallery');
    const wrap = document.getElementById('modal-cave-gallery-wrap');
    if (gallery && wrap) wrap.classList.toggle('hidden', gallery.children.length === 0);
  }, true);
})();
