/* La Cápsula Insólita — reordenar los boxes del panel de control arrastrándolos.
   Soltar una caja sobre otra la inserta ahí (antes o después según en qué mitad soltás);
   las demás se corren solas, nunca se superponen. Mismo patrón de drag & drop que ya usa
   el banco de evidencias (ver js/control.js, reordenar miniaturas).
   Pensado para que cada quien arme su propio orden antes de salir en vivo y lo bloquee
   para no mover nada sin querer mientras transmite. Se guarda en este navegador
   (localStorage), no viaja a OBS ni a otra PC. */
(function () {
  'use strict';
  const KEY = 'lci.order.v2'; // v2: Evidence Control / Archivo salieron de las columnas (fila fija de 2) y Lower Third bajó
  const PRESETS_KEY = 'lci.order.presets.v1';
  let editing = false;
  let dragId = null;

  function boxId(el) { return el.id || null; }
  function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

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

  function snapshotOrder() {
    const cols = {};
    document.querySelectorAll('.col').forEach(col => {
      const key = colClassOf(col);
      if (!key) return;
      cols[key] = Array.from(col.children).filter(c => c.id).map(c => c.id);
    });
    return cols;
  }

  function applyOrder(cols) {
    if (!cols) return;
    Object.keys(cols).forEach(colClass => {
      const col = document.querySelector('.' + colClass);
      if (!col) return;
      cols[colClass].forEach(id => {
        const el = document.getElementById(id);
        // Case Files, Control Deck y Emergency tienen lugar fijo (fuera de .col): un orden guardado viejo no los mueve
        if (el && el.closest('.col')) col.appendChild(el);
      });
    });
  }

  function saveOrder() {
    try { localStorage.setItem(KEY, JSON.stringify(snapshotOrder())); } catch (e) { /* sin almacenamiento */ }
    // Vuelve el desplegable a "— preset —": si no, al elegir el mismo preset dos veces seguidas
    // el <select> no dispara "change" la segunda vez (su valor ya era ese), y parece que no hace nada.
    const sel = document.getElementById('layout-preset-select');
    if (sel) sel.value = '';
  }

  function loadOrder() {
    try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; }
  }

  function applySavedOrder() { applyOrder(loadOrder()); }

  function resetOrder() {
    try { localStorage.removeItem(KEY); } catch (e) { /* sin almacenamiento */ }
    location.reload();
  }

  // ---- presets: varios órdenes guardados con nombre, para cambiar rápido entre acomodos ----
  function loadPresets() {
    try { return JSON.parse(localStorage.getItem(PRESETS_KEY)) || {}; } catch (e) { return {}; }
  }
  function savePresets(p) {
    try { localStorage.setItem(PRESETS_KEY, JSON.stringify(p)); } catch (e) { /* sin almacenamiento */ }
  }

  function refreshPresetSelect(selectName) {
    const sel = document.getElementById('layout-preset-select');
    if (!sel) return;
    const presets = loadPresets();
    const names = Object.keys(presets).sort((a, b) => a.localeCompare(b));
    sel.innerHTML = '<option value="">— preset —</option><option value="__base__">BASE · ORDEN ORIGINAL</option>'
      + names.map(n => `<option value="${esc(n)}">${esc(n)}</option>`).join('');
    if (selectName && names.includes(selectName)) sel.value = selectName;
  }

  function wirePresetUI() {
    refreshPresetSelect();
    const sel = document.getElementById('layout-preset-select');
    const saveBtn = document.getElementById('layout-preset-save');
    const delBtn = document.getElementById('layout-preset-delete');

    if (sel) sel.addEventListener('change', () => {
      const name = sel.value;
      if (!name) return;
      if (name === '__base__') { resetOrder(); return; } // recarga la página con el orden tal cual viene en el HTML
      const presets = loadPresets();
      if (!presets[name]) return;
      applyOrder(presets[name]);
      saveOrder();
    });
    if (saveBtn) saveBtn.addEventListener('click', () => {
      const name = (prompt('Nombre para este preset de orden:', '') || '').trim();
      if (!name) return;
      const presets = loadPresets();
      presets[name] = snapshotOrder();
      savePresets(presets);
      refreshPresetSelect(name);
    });
    if (delBtn) delBtn.addEventListener('click', () => {
      const name = sel && sel.value;
      if (!name) return;
      if (!confirm('¿Borrar el preset "' + name + '"?')) return;
      const presets = loadPresets();
      delete presets[name];
      savePresets(presets);
      refreshPresetSelect();
    });
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
      e.stopPropagation(); // que no dispare también el drop-zone de la columna (soltaría dos veces)
      box.classList.add('lci-drop-target');
    });
    box.addEventListener('dragleave', () => box.classList.remove('lci-drop-target'));
    box.addEventListener('drop', e => {
      if (!editing || !dragId) return;
      e.preventDefault();
      e.stopPropagation();
      box.classList.remove('lci-drop-target');
      placeDrop(box, e);
    });
  }

  // Soltar en el espacio vacío de abajo de una columna (no sobre ninguna caja puntual):
  // la manda al final de esa columna.
  function wireColumn(col) {
    col.addEventListener('dragover', e => {
      if (!editing || !dragId) return;
      e.preventDefault();
      col.classList.add('lci-drop-col');
    });
    col.addEventListener('dragleave', e => { if (e.target === col) col.classList.remove('lci-drop-col'); });
    col.addEventListener('drop', e => {
      if (!editing || !dragId) return;
      e.preventDefault();
      col.classList.remove('lci-drop-col');
      const dragEl = document.getElementById(dragId);
      if (dragEl) { col.appendChild(dragEl); saveOrder(); }
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

    document.querySelectorAll('.col').forEach(wireColumn);

    applySavedOrder();

    const toggle = document.getElementById('layout-toggle');
    if (toggle) toggle.addEventListener('click', () => setEditing(!editing));
    const reset = document.getElementById('layout-reset');
    if (reset) reset.addEventListener('click', resetOrder);

    wirePresetUI();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
