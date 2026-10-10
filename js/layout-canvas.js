/* La Cápsula Insólita — "grid-canvas" organizable para los bloques §02–§08 + AJUSTES.
   Permite arrastrar cada bloque a cualquier celda de un grid de 12 columnas y redimensionarlo
   (columnas y filas). Se guarda en este navegador (localStorage), no viaja a OBS ni a otra PC.
   Mientras no haya un diseño guardado, el panel queda tal cual estaba siempre (sin tocar nada).
   Patrón de drag/estado igual al de js/layout-drag.js (reordenar cajas), pero este mueve y
   redimensiona en un grid libre en vez de solo reordenar dentro de una columna. */
(function () {
  'use strict';
  const KEY = 'lci-panel-layout-v1';
  const COLS = 12;
  const ROWH = 32;   // alto de una fila del grid, en px
  const GAP = 14;    // debe coincidir con el "gap" de .lci-canvas en css/control.css
  const MIN_CS = 2;  // mínimo de columnas que puede ocupar un bloque
  const MIN_RS = 3;  // mínimo de filas

  // Orden fijo en el DOM (no cambia con el drag: la posición visual la da el grid, no el orden).
  const BLOCKS = [
    { key: 'notes', sel: '#card-notes', label: 'CASE FILES' },
    { key: 'cdeck', sel: '#cdeck', label: 'CONTROL DECK' },
    { key: 'ev', sel: '#card-ev', label: 'EVIDENCE CONTROL' },
    { key: 'bank', sel: '#card-bank', label: 'ARCHIVO DE EVIDENCIAS' },
    { key: 'cams', sel: '#card-cams', label: 'CÁMARAS' },
    { key: 'lt', sel: '#card-lt', label: 'LOWER THIRD' },
    { key: 'tiktok', sel: '#card-tiktok', label: 'TIKTOK FX' },
    { key: 'settings', sel: '.col-c', label: 'AJUSTES' }
  ];

  const DEFAULTS = {
    notes: { c: 1, cs: 7, r: 1, rs: 16 },
    cdeck: { c: 8, cs: 5, r: 1, rs: 16 },
    ev: { c: 1, cs: 6, r: 17, rs: 10 },
    bank: { c: 7, cs: 6, r: 17, rs: 10 },
    cams: { c: 1, cs: 4, r: 27, rs: 10 },
    lt: { c: 5, cs: 4, r: 27, rs: 10 },
    tiktok: { c: 9, cs: 4, r: 27, rs: 10 },
    settings: { c: 1, cs: 12, r: 37, rs: 14 }
  };

  let organize = false;
  let canvasEl = null;
  const wrappers = {}; // key -> wrapper div

  function loadLayout() {
    try {
      const v = JSON.parse(localStorage.getItem(KEY));
      if (!v || typeof v !== 'object') return null;
      return v;
    } catch (e) { return null; }
  }
  function saveLayout() {
    const out = {};
    BLOCKS.forEach(b => { if (wrappers[b.key]) out[b.key] = readPos(wrappers[b.key]); });
    try { localStorage.setItem(KEY, JSON.stringify(out)); } catch (e) { /* sin almacenamiento */ }
  }
  function resetLayout() {
    try { localStorage.removeItem(KEY); } catch (e) { /* sin almacenamiento */ }
    location.reload();
  }

  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

  function readPos(wrap) {
    const c = parseInt(wrap.dataset.c, 10) || 1;
    const cs = parseInt(wrap.dataset.cs, 10) || MIN_CS;
    const r = parseInt(wrap.dataset.r, 10) || 1;
    const rs = parseInt(wrap.dataset.rs, 10) || MIN_RS;
    return { c, cs, r, rs };
  }

  function applyPos(wrap, pos) {
    pos.cs = clamp(pos.cs, MIN_CS, COLS);
    pos.c = clamp(pos.c, 1, COLS - pos.cs + 1);
    pos.rs = clamp(pos.rs, MIN_RS, 400);
    pos.r = clamp(pos.r, 1, 4000);
    wrap.dataset.c = pos.c; wrap.dataset.cs = pos.cs;
    wrap.dataset.r = pos.r; wrap.dataset.rs = pos.rs;
    wrap.style.gridColumn = pos.c + ' / span ' + pos.cs;
    wrap.style.gridRow = pos.r + ' / span ' + pos.rs;
    wrap.style.height = (pos.rs * ROWH + (pos.rs - 1) * GAP) + 'px';
  }

  function makeHandle(cls, glyph, title) {
    const h = document.createElement('div');
    h.className = cls;
    h.textContent = glyph;
    h.title = title;
    return h;
  }

  function buildCanvas(savedLayout) {
    canvasEl = document.getElementById('lci-canvas');
    if (!canvasEl) return false;
    const layout = savedLayout || {};
    BLOCKS.forEach(b => {
      const el = document.querySelector(b.sel);
      if (!el || el.closest('.lci-block')) return; // ya movido o no existe
      const wrap = document.createElement('div');
      wrap.className = 'lci-block';
      wrap.dataset.lciKey = b.key;
      const dragH = makeHandle('lci-drag2-handle', '✥', 'Arrastrar ' + b.label + ' a otra posición');
      const resizeH = makeHandle('lci-resize2-handle', '◢', 'Redimensionar ' + b.label);
      wrap.appendChild(dragH);
      el.parentNode.insertBefore(wrap, el);
      wrap.appendChild(el);
      wrap.appendChild(resizeH);
      canvasEl.appendChild(wrap);
      wrappers[b.key] = wrap;
      applyPos(wrap, Object.assign({}, DEFAULTS[b.key], layout[b.key] || {}));
      wireDrag(wrap, dragH);
      wireResize(wrap, resizeH);
    });
    document.body.classList.add('lci-canvas-on');
    return true;
  }

  function ensureCanvas() {
    if (canvasEl && Object.keys(wrappers).length) return;
    buildCanvas(loadLayout() || {});
  }

  function colWidth() {
    const rect = canvasEl.getBoundingClientRect();
    return (rect.width - GAP * (COLS - 1)) / COLS;
  }

  function wireDrag(wrap, handle) {
    let startX = 0, startY = 0, startC = 1, startR = 1, dragging = false;
    handle.addEventListener('pointerdown', e => {
      if (!organize) return;
      e.preventDefault();
      dragging = true;
      startX = e.clientX; startY = e.clientY;
      const pos = readPos(wrap);
      startC = pos.c; startR = pos.r;
      wrap.classList.add('lci-block--dragging');
      handle.setPointerCapture(e.pointerId);
    });
    handle.addEventListener('pointermove', e => {
      if (!dragging) return;
      const cw = colWidth() + GAP;
      const dCol = Math.round((e.clientX - startX) / cw);
      const dRow = Math.round((e.clientY - startY) / (ROWH + GAP));
      const pos = readPos(wrap);
      applyPos(wrap, { c: startC + dCol, cs: pos.cs, r: startR + dRow, rs: pos.rs });
    });
    handle.addEventListener('pointerup', e => {
      if (!dragging) return;
      dragging = false;
      wrap.classList.remove('lci-block--dragging');
      try { handle.releasePointerCapture(e.pointerId); } catch (err) { /* ya liberado */ }
      saveLayout();
    });
  }

  function wireResize(wrap, handle) {
    let startX = 0, startY = 0, startCs = 2, startRs = 3, resizing = false;
    handle.addEventListener('pointerdown', e => {
      if (!organize) return;
      e.preventDefault();
      e.stopPropagation();
      resizing = true;
      startX = e.clientX; startY = e.clientY;
      const pos = readPos(wrap);
      startCs = pos.cs; startRs = pos.rs;
      wrap.classList.add('lci-block--resizing');
      handle.setPointerCapture(e.pointerId);
    });
    handle.addEventListener('pointermove', e => {
      if (!resizing) return;
      const cw = colWidth() + GAP;
      const dCol = Math.round((e.clientX - startX) / cw);
      const dRow = Math.round((e.clientY - startY) / (ROWH + GAP));
      const pos = readPos(wrap);
      applyPos(wrap, { c: pos.c, cs: startCs + dCol, r: pos.r, rs: startRs + dRow });
    });
    handle.addEventListener('pointerup', e => {
      if (!resizing) return;
      resizing = false;
      wrap.classList.remove('lci-block--resizing');
      try { handle.releasePointerCapture(e.pointerId); } catch (err) { /* ya liberado */ }
      saveLayout();
    });
  }

  function setOrganize(on) {
    organize = on;
    if (on) ensureCanvas();
    document.body.classList.toggle('lci-organize', on);
    const btn = document.getElementById('lci-organize-btn');
    if (btn) {
      btn.textContent = on ? '🔓 ORGANIZANDO · LISTO' : '🔧 ORGANIZAR';
      btn.classList.toggle('on', on);
    }
  }

  function init() {
    const saved = loadLayout();
    if (saved) buildCanvas(saved); // restaura el diseño guardado al cargar, aunque el modo organizar esté apagado

    const btn = document.getElementById('lci-organize-btn');
    if (btn) btn.addEventListener('click', () => setOrganize(!organize));
    const reset = document.getElementById('lci-layout-reset-btn');
    if (reset) reset.addEventListener('click', () => {
      if (confirm('¿Restablecer el diseño de los bloques al orden original?')) resetLayout();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
