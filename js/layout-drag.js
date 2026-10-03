/* La Cápsula Insólita — mover y redimensionar libremente los boxes del panel de control.
   Pensado para que cada quien arme su propio acomodo antes de salir en vivo y lo bloquee
   para no mover nada sin querer mientras transmite. Las posiciones se guardan en este
   navegador (localStorage), no viajan a OBS ni a otra PC. */
(function () {
  'use strict';
  const KEY = 'lci.layout.v1';
  const BOX_SELECTOR = '.card, .drawers';
  let state = load();
  let editing = false;
  let zCounter = 10;

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || { boxes: {} }; } catch (e) { return { boxes: {} }; }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* sin almacenamiento */ }
  }
  function hasCustomLayout() { return Object.keys(state.boxes).length > 0; }
  function boxId(el) { return el.id || null; }

  function ensureDrawersHandle() {
    const drawers = document.querySelector('.drawers');
    if (!drawers) return;
    if (!drawers.id) drawers.id = 'box-drawers';
    if (!drawers.querySelector(':scope > .lci-drag-handle')) {
      const h = document.createElement('div');
      h.className = 'lci-drag-handle lci-drawers-handle';
      h.textContent = '⠿ AJUSTES (EFECTOS · TRANSICIONES · AUDIO · OBS · DEBUG)';
      drawers.insertBefore(h, drawers.firstChild);
    }
  }

  function bringToFront(el) {
    zCounter++;
    el.style.zIndex = zCounter;
    const id = boxId(el);
    if (id) state.boxes[id] = Object.assign({}, state.boxes[id], { z: zCounter });
  }

  function applyFreeMode() {
    document.body.classList.add('lci-free');
    const deck = document.querySelector('.deck');
    const deckRect = deck.getBoundingClientRect();
    document.querySelectorAll(BOX_SELECTOR).forEach(el => {
      const id = boxId(el);
      if (!id) return;
      const saved = state.boxes[id];
      if (saved) {
        el.style.left = saved.x + 'px';
        el.style.top = saved.y + 'px';
        if (saved.w) el.style.width = saved.w + 'px';
        if (saved.h) el.style.height = saved.h + 'px';
        if (saved.z) { el.style.zIndex = saved.z; zCounter = Math.max(zCounter, saved.z); }
      } else {
        const r = el.getBoundingClientRect();
        el.style.left = Math.round(r.left - deckRect.left) + 'px';
        el.style.top = Math.round(r.top - deckRect.top) + 'px';
        el.style.width = Math.round(r.width) + 'px';
      }
      addResizeHandle(el);
    });
    updateCanvasHeight();
  }

  function exitFreeMode() {
    document.body.classList.remove('lci-free', 'lci-edit');
    document.querySelectorAll(BOX_SELECTOR).forEach(el => {
      el.style.left = el.style.top = el.style.width = el.style.height = el.style.zIndex = '';
      const rh = el.querySelector(':scope > .lci-resize-handle');
      if (rh) rh.remove();
    });
    const deck = document.querySelector('.deck');
    if (deck) deck.style.minHeight = '';
    state = { boxes: {} };
    save();
    setEditing(false);
  }

  function addResizeHandle(el) {
    if (el.querySelector(':scope > .lci-resize-handle')) return;
    const r = document.createElement('div');
    r.className = 'lci-resize-handle';
    r.title = 'Arrastra para cambiar el tamaño';
    el.appendChild(r);
    r.addEventListener('pointerdown', e => startResize(e, el));
  }

  function updateCanvasHeight() {
    const deck = document.querySelector('.deck');
    if (!deck) return;
    let maxBottom = 0;
    document.querySelectorAll(BOX_SELECTOR).forEach(el => {
      const bottom = el.offsetTop + el.offsetHeight;
      if (bottom > maxBottom) maxBottom = bottom;
    });
    deck.style.minHeight = (maxBottom + 40) + 'px';
  }

  let dragEl = null, dragOffX = 0, dragOffY = 0;
  function startDrag(e, el) {
    if (!editing || e.target.closest('.lci-resize-handle')) return;
    e.preventDefault();
    dragEl = el;
    bringToFront(el);
    const r = el.getBoundingClientRect();
    dragOffX = e.clientX - r.left;
    dragOffY = e.clientY - r.top;
    el.classList.add('lci-box--dragging');
  }
  function onMove(e) {
    if (!dragEl) return;
    const deck = document.querySelector('.deck');
    const deckRect = deck.getBoundingClientRect();
    const x = Math.max(0, e.clientX - deckRect.left - dragOffX);
    const y = Math.max(0, e.clientY - deckRect.top - dragOffY);
    dragEl.style.left = Math.round(x) + 'px';
    dragEl.style.top = Math.round(y) + 'px';
    updateCanvasHeight();
  }
  function endDrag() {
    if (!dragEl) return;
    const id = boxId(dragEl);
    state.boxes[id] = Object.assign({}, state.boxes[id], {
      x: parseFloat(dragEl.style.left) || 0,
      y: parseFloat(dragEl.style.top) || 0,
      w: dragEl.offsetWidth,
      h: dragEl.offsetHeight
    });
    save();
    dragEl.classList.remove('lci-box--dragging');
    dragEl = null;
  }

  let resizeEl = null, resizeStartW = 0, resizeStartH = 0, resizeStartX = 0, resizeStartY = 0;
  function startResize(e, el) {
    if (!editing) return;
    e.preventDefault(); e.stopPropagation();
    resizeEl = el;
    bringToFront(el);
    resizeStartW = el.offsetWidth; resizeStartH = el.offsetHeight;
    resizeStartX = e.clientX; resizeStartY = e.clientY;
    el.classList.add('lci-box--dragging');
  }
  function onResizeMove(e) {
    if (!resizeEl) return;
    const w = Math.max(220, resizeStartW + (e.clientX - resizeStartX));
    const h = Math.max(90, resizeStartH + (e.clientY - resizeStartY));
    resizeEl.style.width = w + 'px';
    resizeEl.style.height = h + 'px';
    updateCanvasHeight();
  }
  function endResize() {
    if (!resizeEl) return;
    const id = boxId(resizeEl);
    state.boxes[id] = Object.assign({}, state.boxes[id], { w: resizeEl.offsetWidth, h: resizeEl.offsetHeight });
    save();
    resizeEl.classList.remove('lci-box--dragging');
    resizeEl = null;
  }

  document.addEventListener('pointermove', e => { onMove(e); onResizeMove(e); });
  document.addEventListener('pointerup', () => { endDrag(); endResize(); });
  document.addEventListener('pointercancel', () => { endDrag(); endResize(); });

  function setEditing(on) {
    editing = on;
    document.body.classList.toggle('lci-edit', on);
    const btn = document.getElementById('layout-toggle');
    if (btn) {
      btn.textContent = on ? '🔓 EDITANDO · CLIC PARA BLOQUEAR' : '⠿ MOVER CAJAS';
      btn.classList.toggle('layout-toggle--on', on);
    }
  }

  function wireHandles() {
    document.querySelectorAll('.card > .card-h').forEach(h => {
      h.classList.add('lci-drag-handle');
      h.addEventListener('pointerdown', e => startDrag(e, h.closest('.card')));
    });
    ensureDrawersHandle();
    document.querySelectorAll('.lci-drawers-handle').forEach(h => {
      h.addEventListener('pointerdown', e => startDrag(e, h.closest('.drawers')));
    });
  }

  function init() {
    wireHandles();
    if (hasCustomLayout()) applyFreeMode(); // arranca bloqueado: solo mira, no mueve nada sin querer

    const toggle = document.getElementById('layout-toggle');
    if (toggle) toggle.addEventListener('click', () => {
      if (!document.body.classList.contains('lci-free')) applyFreeMode();
      setEditing(!editing);
    });
    const reset = document.getElementById('layout-reset');
    if (reset) reset.addEventListener('click', exitFreeMode);

    window.addEventListener('resize', () => { if (document.body.classList.contains('lci-free')) updateCanvasHeight(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
