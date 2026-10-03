/* La Cápsula Insólita — reordenar los boxes del panel de control arrastrándolos.
   Soltar una caja sobre otra la inserta ahí (antes o después según en qué mitad soltás);
   las demás se corren solas, nunca se superponen. Mismo patrón de drag & drop que ya usa
   el banco de evidencias (ver js/control.js, reordenar miniaturas).
   Pensado para que cada quien arme su propio orden antes de salir en vivo y lo bloquee
   para no mover nada sin querer mientras transmite. Se guarda en este navegador
   (localStorage), no viaja a OBS ni a otra PC. */
(function () {
  'use strict';
  const KEY = 'lci.order.v1';
  let editing = false;
  let dragId = null;

  function boxId(el) { return el.id || null; }

  function ensureDrawersHandle() {
    const drawers = document.querySelector('.drawers');
    if (!drawers) return null;
    if (!drawers.id) drawers.id = 'box-drawers';
    let h = drawers.querySelector(':scope > .lci-drag-handle');
    if (!h) {
      h = document.createElement('div');
      h.className = 'lci-drag-handle lci-drawers-handle';
      h.textContent = '⠿ AJUSTES (EFECTOS · TRANSICIONES · AUDIO · OBS · DEBUG)';
      drawers.insertBefore(h, drawers.firstChild);
    }
    return h;
  }

  function colClassOf(col) {
    const m = col.className.match(/col-[abc]/);
    return m ? m[0] : null;
  }

  function saveOrder() {
    const cols = {};
    document.querySelectorAll('.col').forEach(col => {
      const key = colClassOf(col);
      if (!key) return;
      cols[key] = Array.from(col.children).filter(c => c.id).map(c => c.id);
    });
    try { localStorage.setItem(KEY, JSON.stringify(cols)); } catch (e) { /* sin almacenamiento */ }
  }

  function loadOrder() {
    try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; }
  }

  function applySavedOrder() {
    const saved = loadOrder();
    if (!saved) return;
    Object.keys(saved).forEach(colClass => {
      const col = document.querySelector('.' + colClass);
      if (!col) return;
      saved[colClass].forEach(id => {
        const el = document.getElementById(id);
        if (el) col.appendChild(el);
      });
    });
  }

  function resetOrder() {
    try { localStorage.removeItem(KEY); } catch (e) { /* sin almacenamiento */ }
    location.reload();
  }

  function setEditing(on) {
    editing = on;
    document.body.classList.toggle('lci-edit', on);
    document.querySelectorAll('.lci-drag-handle').forEach(h => h.setAttribute('draggable', on ? 'true' : 'false'));
    const btn = document.getElementById('layout-toggle');
    if (btn) {
      btn.textContent = on ? '🔓 EDITANDO · CLIC PARA BLOQUEAR' : '⠿ MOVER CAJAS';
      btn.classList.toggle('layout-toggle--on', on);
    }
  }

  function placeDrop(targetBox, e) {
    if (!dragId || dragId === boxId(targetBox)) return;
    const dragEl = document.getElementById(dragId);
    const col = targetBox.parentElement;
    if (!dragEl || !col) return;
    const rect = targetBox.getBoundingClientRect();
    const after = (e.clientY - rect.top) > rect.height / 2;
    col.insertBefore(dragEl, after ? targetBox.nextSibling : targetBox);
    saveOrder();
  }

  function wireBox(box) {
    box.addEventListener('dragover', e => {
      if (!editing || !dragId || dragId === boxId(box)) return;
      e.preventDefault();
      box.classList.add('lci-drop-target');
    });
    box.addEventListener('dragleave', () => box.classList.remove('lci-drop-target'));
    box.addEventListener('drop', e => {
      if (!editing || !dragId) return;
      e.preventDefault();
      box.classList.remove('lci-drop-target');
      placeDrop(box, e);
    });
  }

  function wireHandle(handle, box) {
    handle.addEventListener('dragstart', e => {
      if (!editing) { e.preventDefault(); return; }
      dragId = boxId(box);
      box.classList.add('lci-dragging');
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', dragId || ''); } catch (err) { /* algunos navegadores lo exigen igual */ }
    });
    handle.addEventListener('dragend', () => {
      box.classList.remove('lci-dragging');
      document.querySelectorAll('.lci-drop-target').forEach(x => x.classList.remove('lci-drop-target'));
      dragId = null;
    });
  }

  function init() {
    document.querySelectorAll('.col > .card').forEach(card => {
      const h = card.querySelector(':scope > .card-h');
      if (!h) return;
      h.classList.add('lci-drag-handle');
      wireHandle(h, card);
      wireBox(card);
    });
    const drawersHandle = ensureDrawersHandle();
    const drawers = document.querySelector('.drawers');
    if (drawersHandle && drawers) { wireHandle(drawersHandle, drawers); wireBox(drawers); }

    applySavedOrder();

    const toggle = document.getElementById('layout-toggle');
    if (toggle) toggle.addEventListener('click', () => setEditing(!editing));
    const reset = document.getElementById('layout-reset');
    if (reset) reset.addEventListener('click', resetOrder);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
