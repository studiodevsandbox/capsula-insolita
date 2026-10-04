/* La Cápsula Insólita — panel de control (dock de OBS o navegador).
   Habla con OBS por obs-websocket v5 y manda comandos al overlay con el evento "lci". */
(function () {
  'use strict';
  const C = window.LCI_CONFIG;

  /* ---------- SHA-256 (sin dependencias; crypto.subtle no siempre existe en file://) ---------- */
  const K = new Uint32Array([0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2]);
  function sha256(bytes) {
    const H = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
    const l = bytes.length, total = Math.ceil((l + 9) / 64) * 64;
    const m = new Uint8Array(total);
    m.set(bytes);
    m[l] = 0x80;
    const dv = new DataView(m.buffer);
    dv.setUint32(total - 4, (l * 8) >>> 0);
    dv.setUint32(total - 8, Math.floor((l * 8) / 0x100000000));
    const W = new Uint32Array(64);
    const rot = (x, n) => (x >>> n) | (x << (32 - n));
    for (let off = 0; off < total; off += 64) {
      for (let i = 0; i < 16; i++) W[i] = dv.getUint32(off + i * 4);
      for (let i = 16; i < 64; i++) {
        const s0 = rot(W[i - 15], 7) ^ rot(W[i - 15], 18) ^ (W[i - 15] >>> 3);
        const s1 = rot(W[i - 2], 17) ^ rot(W[i - 2], 19) ^ (W[i - 2] >>> 10);
        W[i] = (W[i - 16] + s0 + W[i - 7] + s1) >>> 0;
      }
      let [a, b, c, d, e, f, g, h] = H;
      for (let i = 0; i < 64; i++) {
        const t1 = (h + (rot(e, 6) ^ rot(e, 11) ^ rot(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + W[i]) >>> 0;
        const t2 = ((rot(a, 2) ^ rot(a, 13) ^ rot(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
        h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
      }
      H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0; H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0;
      H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0; H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
    }
    const out = new Uint8Array(32);
    const odv = new DataView(out.buffer);
    for (let i = 0; i < 8; i++) odv.setUint32(i * 4, H[i]);
    return out;
  }
  const b64sha = str => btoa(String.fromCharCode(...sha256(new TextEncoder().encode(str))));
  const authString = (password, salt, challenge) => b64sha(b64sha(password + salt) + challenge);

  /* ---------- cliente obs-websocket v5 ----------
     connect(host, port, password, eventSubscriptions = 0). Con 0 (lo que usa bridge.js) no llega
     ningún evento. El panel pide solo la categoría "Scenes" (1<<2) para enterarse al instante
     cuando la escena cambia en OBS. onstatus(texto, 'ok'|'off'|'wait', códigoDeCierre). */
  class Obs {
    constructor() { this.ws = null; this.pending = new Map(); this.id = 0; this.onstatus = () => {}; this.onevent = () => {}; }
    get connected() { return !!(this.ws && this.ws.readyState === 1 && this.ready); }
    connect(host, port, password, eventSubscriptions) {
      return new Promise((resolve, reject) => {
        try { if (this.ws) this.ws.close(); } catch (e) { /* ya cerrado */ }
        this.ready = false;
        this.failPending('Conexión con OBS reemplazada');
        const ws = new WebSocket(`ws://${host}:${port}`);
        this.ws = ws;
        this.onstatus('CONECTANDO…', 'wait');
        // si el saludo no termina en 8 s (servidor colgado), se cierra y el onclose deja reintentar
        const hsTimer = setTimeout(() => { if (this.ws === ws && !this.ready) { try { ws.close(); } catch (e) { /* nada */ } } }, 8000);
        ws.onmessage = ev => {
          if (this.ws !== ws) return; // conexión vieja reemplazada: se ignora
          let msg;
          try { msg = JSON.parse(ev.data); } catch (e) { return; } // mensaje basura: se ignora
          if (!msg || typeof msg !== 'object') return;
          if (msg.op === 0) {
            const d = { rpcVersion: 1, eventSubscriptions: eventSubscriptions || 0 };
            if (msg.d.authentication) d.authentication = authString(password, msg.d.authentication.salt, msg.d.authentication.challenge);
            ws.send(JSON.stringify({ op: 1, d }));
          } else if (msg.op === 2) {
            clearTimeout(hsTimer);
            this.ready = true;
            this.onstatus('CONECTADO', 'ok');
            resolve();
          } else if (msg.op === 5) {
            try { this.onevent(msg.d.eventType, msg.d.eventData || {}); } catch (e) { /* un error de la interfaz no debe cortar la conexión */ }
          } else if (msg.op === 7) {
            const p = this.pending.get(msg.d.requestId);
            if (!p) return;
            this.pending.delete(msg.d.requestId);
            clearTimeout(p.timer);
            if (msg.d.requestStatus && msg.d.requestStatus.result) p.res(msg.d.responseData);
            else { const s = msg.d.requestStatus || {}; p.rej(new Error(s.comment || 'error ' + s.code)); }
          }
        };
        ws.onclose = e => {
          clearTimeout(hsTimer);
          // Si esta conexión ya fue reemplazada por otra más nueva, su cierre no cambia el estado
          // (antes podía pintar "DESCONECTADO" justo después de reconectar).
          if (this.ws !== ws) { reject(new Error('reemplazada')); return; }
          this.ready = false;
          this.failPending('Conexión con OBS cerrada');
          this.onstatus(e.code === 4009 ? 'CONTRASEÑA INCORRECTA' : 'DESCONECTADO', 'off', e.code);
          reject(new Error('cerrado ' + e.code));
        };
      });
    }
    failPending(why) {
      this.pending.forEach(p => { clearTimeout(p.timer); p.rej(new Error(why)); });
      this.pending.clear();
    }
    request(type, data) {
      return new Promise((res, rej) => {
        if (!this.ws || this.ws.readyState !== 1) { rej(new Error('No conectado a OBS')); return; }
        const id = 'r' + (++this.id);
        const timer = setTimeout(() => { if (this.pending.has(id)) { this.pending.delete(id); rej(new Error('Sin respuesta de OBS')); } }, 6000);
        this.pending.set(id, { res, rej, timer });
        this.ws.send(JSON.stringify({ op: 6, d: { requestType: type, requestId: id, requestData: data || {} } }));
      });
    }
    emit(cmd) {
      return this.request('CallVendorRequest', { vendorName: 'obs-browser', requestType: 'emit_event', requestData: { event_name: 'lci', event_data: cmd } });
    }
  }

  // Permite reutilizar el cliente fuera del navegador (pruebas con Node, bridge.js).
  if (typeof module !== 'undefined') { module.exports = { Obs, authString, sha256 }; return; }

  /* =====================================================================================
     INTERFAZ
     ===================================================================================== */
  const $ = s => document.querySelector(s);
  const $$ = (s, root) => [...(root || document).querySelectorAll(s)];
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad3 = n => String(n).padStart(3, '0');
  const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  const hhmmss = () => new Date().toLocaleTimeString('es', { hour12: false });
  const obs = new Obs();
  const SUBS_SCENES = 1 << 2;

  /* ---------- bitácora técnica (DEBUG) ---------- */
  const logBox = $('#log');
  const log = (t, bad) => {
    const line = document.createElement('div');
    line.textContent = `${hhmmss()}  ${t}`;
    if (bad) line.className = 'bad';
    logBox.prepend(line);
    while (logBox.children.length > 40) logBox.lastChild.remove();
  };

  /* ---------- activity log (lo que el operador hizo) + toasts ---------- */
  const actBox = $('#activity');
  function activity(text, kind) {
    const empty = actBox.querySelector('.empty');
    if (empty) empty.remove();
    const li = document.createElement('li');
    if (kind) li.className = kind;
    li.innerHTML = `<time>${hhmmss()}</time><span></span>`;
    li.lastChild.textContent = text;
    actBox.prepend(li);
    while (actBox.children.length > 20) actBox.lastChild.remove();
  }
  const toastBox = $('#toasts');
  function toast(text, kind) {
    const t = document.createElement('div');
    t.className = 'toast' + (kind ? ' toast--' + kind : '');
    t.textContent = text;
    toastBox.prepend(t);
    while (toastBox.children.length > 4) toastBox.lastChild.remove();
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 200); }, kind === 'err' ? 3600 : 2200);
  }
  // feedback breve en cualquier botón
  // Tras un clic de MOUSE (e.detail > 0) se quita el foco: así Enter/Espacio no re-disparan el
  // último botón clicado (peligroso con OCULTAR TODO u OUTRO). Con teclado (Tab) el foco se queda.
  document.addEventListener('click', e => {
    const b = e.target.closest('button, [role=button]');
    if (!b) return;
    if (e.detail > 0 && typeof b.blur === 'function') b.blur();
    if (b.tagName !== 'BUTTON') return;
    b.classList.add('fired');
    setTimeout(() => b.classList.remove('fired'), 220);
  });

  /* ---------- campos persistentes (data-keep) ---------- */
  const KEEP = 'lci-control-v1';
  const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
  const readJSON = key => { try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; } };
  const saved = (() => { const v = readJSON(KEEP); return isObj(v) ? v : {}; })();
  const persist = () => { try { localStorage.setItem(KEEP, JSON.stringify(saved)); } catch (e) { /* sin almacenamiento */ } };
  const keep = (k, v) => { saved[k] = v; persist(); };
  $$('[data-keep]').forEach(n => {
    const k = n.dataset.keep;
    const v = saved[k];
    if (v !== undefined && v !== null && typeof v !== 'object') { if (n.type === 'checkbox') n.checked = !!v; else n.value = String(v); }
    n.addEventListener('change', () => keep(k, n.type === 'checkbox' ? n.checked : n.value));
  });
  const setKept = (n, v) => { n.value = v; n.dispatchEvent(new Event('change')); };
  if (!$('#host').value) $('#host').value = C.obs.host;
  if (!$('#port').value) $('#port').value = C.obs.port;
  if (!$('#pass').value) $('#pass').value = C.obs.password;

  /* ---------- estado "al aire" que conoce el panel ----------
     La escena viene de OBS (real). Lo demás es lo ÚLTIMO QUE ESTE PANEL ENVIÓ CON ÉXITO
     (el panel no recibe estado de vuelta del overlay). Lo desconocido queda en null → "—".
     Se guarda en localStorage porque el overlay también persiste cámaras/modo/evidencia/LT. */
  const LIVE_KEY = 'lci-control-live-v1';
  const live = Object.assign({ cams: {}, mode: null, fx: null, ev: null, lt: null, lastAlert: 'NUEVA EVIDENCIA', sound: null },
    (() => { const v = readJSON(LIVE_KEY); return isObj(v) ? v : {}; })());
  // forma mínima: si algo vino corrupto, se descarta solo esa parte (no rompe el arranque)
  if (!isObj(live.cams)) live.cams = {};
  [1, 2].forEach(id => { if (live.cams[id] != null && !isObj(live.cams[id])) delete live.cams[id]; });
  ['fx', 'ev', 'lt', 'sound'].forEach(k => { if (!isObj(live[k])) live[k] = null; });
  if (live.sound && live.sound.amb != null && !isObj(live.sound.amb)) delete live.sound.amb;
  if (typeof live.mode !== 'string') live.mode = null;
  if (typeof live.lastAlert !== 'string') live.lastAlert = 'NUEVA EVIDENCIA';
  if (live.ev && !Number.isFinite(Number(live.ev.num))) live.ev = null;
  live.scene = null; live.obsScene = null; live.obsSceneUuid = null; // la escena SIEMPRE se pregunta a OBS
  const saveLive = () => {
    const copy = Object.assign({}, live);
    delete copy.scene; delete copy.obsScene; delete copy.obsSceneUuid;
    try { localStorage.setItem(LIVE_KEY, JSON.stringify(copy)); } catch (e) { /* sin almacenamiento */ }
  };

  /* ---------- envío central ----------
     send(cmd, { ok: 'texto del toast', apply: fn }) → solo si OBS acepta el comando se ejecuta
     apply() (actualiza el estado) y aparece el toast verde. Si falla: toast rojo y nada cambia. */
  const errText = e => (/No conectado|cerrada/i.test(e.message) ? 'OBS OFFLINE · NO SE ENVIÓ' : /vendor|obs-browser/i.test(e.message) ? 'EL OVERLAY NO RESPONDE · ' + e.message : e.message);
  const send = (cmd, o) => {
    o = o || {};
    return obs.emit(cmd).then(() => {
      // el ducking solo arranca si OBS aceptó el comando (si falló, no suena nada que tapar)
      if (DUCK_TRIGGERS.has(cmd.cmd)) duckAudio();
      log('→ ' + cmd.cmd + (cmd.text ? ' · ' + cmd.text : ''));
      if (o.apply) o.apply();
      saveLive();
      renderAll();
      const msg = o.ok || ('✓ ' + cmd.cmd.toUpperCase());
      if (o.ok !== false) toast(msg, 'ok');
      activity(msg);
      return true;
    }, e => {
      log(e.message, true);
      const msg = errText(e);
      toast('✕ ' + msg, 'err');
      activity('✕ ' + (o.ok || cmd.cmd) + ' — ' + msg, 'err');
      return false;
    });
  };

  /* ---------- conexión: estado real, reconexión automática sin duplicar ---------- */
  let everConnected = false, retryTimer = null, retryN = 0, attempt = 0, authFailed = false, lastCls = null;
  let announcedOk = false; // el toast "OBS CONNECTED" sale una vez por conexión real, no en cada reconexión manual
  function connect(manual) {
    clearTimeout(retryTimer); retryTimer = null;
    if (manual) { retryN = 0; authFailed = false; }
    const my = ++attempt;
    return obs.connect($('#host').value.trim(), $('#port').value.trim(), $('#pass').value, SUBS_SCENES)
      .then(() => { if (my === attempt) log('Conectado a OBS'); },
        e => { if (my === attempt && e.message !== 'reemplazada') log('No se pudo conectar: ' + e.message, true); });
  }
  function scheduleRetry() {
    if (retryTimer || authFailed) return;
    const delay = Math.min(15000, 2000 * Math.pow(2, retryN));
    retryN++;
    $('#lost-msg').textContent = `reintento automático en ${Math.round(delay / 1000)} s`;
    retryTimer = setTimeout(() => { retryTimer = null; connect(false); }, delay);
  }
  obs.onstatus = (t, cls, code) => {
    const s = $('#conn'), lost = $('#lost');
    const prev = lastCls;
    lastCls = cls;
    if (cls === 'ok') {
      everConnected = true; retryN = 0;
      s.textContent = 'OBS CONNECTED';
      lost.hidden = true;
      loadAudioInputs(); loadFramingSources(); loadFramingScenes(); refreshScene();
      if (typeof startOutputsPoll === 'function') startOutputsPoll();
      if (origVolumeDb.size) restoreAudio(++duckGen); // un duck quedó sin restaurar al cortarse: se devuelve el volumen
      if (!announcedOk) { announcedOk = true; toast('● OBS CONNECTED', 'ok'); activity('● OBS conectado', 'info'); }
    } else if (cls === 'wait') {
      s.textContent = 'CONNECTING';
    } else {
      live.scene = null; live.obsScene = null; live.obsSceneUuid = null; overlayActive = null;
      if (typeof stopOutputsPoll === 'function') stopOutputsPoll();
      if (code === 4009) {
        authFailed = true;
        s.textContent = 'AUTH FAILED';
        $('#lost-title').textContent = 'CONTRASEÑA INCORRECTA';
        $('#lost-msg').textContent = 'revísala en OBS → avanzado; no se reintenta solo';
      } else {
        s.textContent = everConnected ? 'CONNECTION LOST' : 'OBS OFFLINE';
        $('#lost-title').textContent = everConnected ? 'CONNECTION LOST' : 'OBS OFFLINE';
        scheduleRetry();
      }
      lost.hidden = false;
      announcedOk = false;
      if (prev === 'ok') { toast('✕ OBS OFFLINE · CONEXIÓN PERDIDA', 'err'); activity('✕ Conexión con OBS perdida', 'err'); }
    }
    s.className = 'conn conn--' + cls;
    renderAll();
  };
  obs.onevent = (type, data) => {
    if (type === 'CurrentProgramSceneChanged') setObsScene(data.sceneName, data.sceneUuid);
  };
  $('#connect').addEventListener('click', () => connect(true));
  $('#reconnect').addEventListener('click', () => { $('#lost-msg').textContent = 'conectando…'; connect(true); });

  /* ---------- escena real de OBS ---------- */
  const obsNameFor = {};
  Object.entries(C.obs.sceneMap).forEach(([obsName, key]) => { obsNameFor[key] = obsName; });
  function mapObsScene(name) {
    if (!name) return null;
    const map = C.obs.sceneMap || {};
    if (map[name]) return map[name];
    const hit = Object.keys(map).find(k => norm(k) === norm(name));
    return hit ? map[hit] : null;
  }
  // ---------- mapa de aprendizaje uuid→escena interna ----------
  // El nombre de una escena de OBS puede cambiar; su sceneUuid nunca. La primera vez que el
  // panel reconoce una escena por NOMBRE (contra config.js), la "engancha" guardando su uuid
  // acá. De ahí en más se reconoce por uuid aunque Rox la renombre en OBS.
  const SCENE_UUID_KEY = 'lci-scene-uuid-map-v1';
  const sceneUuidMap = (() => { const v = readJSON(SCENE_UUID_KEY); return isObj(v) ? v : {}; })();
  const saveSceneUuidMap = () => { try { localStorage.setItem(SCENE_UUID_KEY, JSON.stringify(sceneUuidMap)); } catch (e) { /* sin almacenamiento */ } };
  function resolveSceneKey(sceneUuid, sceneName) {
    if (sceneUuid && sceneUuidMap[sceneUuid]) return sceneUuidMap[sceneUuid];
    const key = mapObsScene(sceneName);
    if (key && sceneUuid) {
      sceneUuidMap[sceneUuid] = key;
      saveSceneUuidMap();
      migrateFramingToUuid(sceneName, sceneUuid);
    }
    return key || null;
  }
  function setObsScene(name, uuid) {
    if (live.obsScene === name && live.obsSceneUuid === uuid) return;
    live.obsScene = name;
    live.obsSceneUuid = uuid || null;
    live.scene = resolveSceneKey(uuid, name);
    refreshOverlayActive();
    applyFramingForScene();
    renderAll();
  }
  // ¿la fuente del overlay está realmente en el programa? Se pregunta solo al conectar y al
  // cambiar de escena (nada de sondeo continuo).
  // Cada escena horizontal (LCI 01-04) tiene su propia fuente dedicada ("LCI Broadcast V1"…"V4",
  // con ?scene= fijo) en vez de una sola compartida, así que se revisan las 4: alcanza con que
  // una esté activa (la de la escena que esté al aire en ese momento).
  const OVERLAY_SOURCES = ['LCI Broadcast V1', 'LCI Broadcast V2', 'LCI Broadcast V3', 'LCI Broadcast V4'];
  let overlayActive = null; // null = desconocido
  function refreshOverlayActive() {
    if (!obs.connected) { overlayActive = null; renderOverlay(); return; }
    Promise.all(OVERLAY_SOURCES.map(name =>
      obs.request('GetSourceActive', { sourceName: name }).then(r => !!r.videoActive, () => false)
    )).then(results => { overlayActive = results.some(Boolean) || 'missing'; })
      .finally(renderOverlay);
  }
  function refreshScene() {
    // el campo de uuid en esta respuesta se llama "currentProgramSceneUuid" (inconsistente con
    // el evento CurrentProgramSceneChanged, que usa "sceneUuid" — así lo define obs-websocket 5.x)
    obs.request('GetCurrentProgramScene').then(r => setObsScene(r.currentProgramSceneName, r.currentProgramSceneUuid), () => {});
  }
  const sceneLabel = key => (C.scenes[key] && C.scenes[key].label) || key;

  // ---------- lista de fuentes de audio reales de OBS, para elegir cuáles duckear ----------
  const AUDIO_KINDS = /input_capture|output_capture/i;
  async function loadAudioInputs() {
    const box = $('#duck-inputs');
    try {
      const { inputs } = await obs.request('GetInputList');
      const audioInputs = inputs.filter(i => AUDIO_KINDS.test(i.inputKind));
      if (!audioInputs.length) { box.innerHTML = '<div class="bank-empty">OBS no tiene fuentes de audio.</div>'; return; }
      const current = new Set((C.sound.duck && C.sound.duck.inputs) || []);
      box.innerHTML = '';
      audioInputs.forEach(i => {
        const lab = document.createElement('label');
        const cb = document.createElement('input');
        cb.type = 'checkbox'; cb.value = i.inputName; cb.checked = current.has(i.inputName);
        lab.append(cb, ' ' + i.inputName);
        cb.addEventListener('change', () => {
          C.sound.duck.inputs = [...box.querySelectorAll('input:checked')].map(c => c.value);
          keep('duck-inputs', C.sound.duck.inputs);
          // si se desmarca una fuente que está bajada ahora mismo, se le devuelve su volumen original
          if (!cb.checked) restoreInputNow(cb.value);
          renderAudioSummary();
        });
        box.appendChild(lab);
      });
    } catch (e) { box.innerHTML = '<div class="bank-empty">No pude leer las fuentes de OBS.</div>'; }
  }

  // ---------- CASE FILES: expedientes únicos (historia/evidencia/pista/testimonio), con
  // relación opcional a evidencia del banco (§04/§05). Autoguardado en este navegador.
  // Migra las notas del sistema anterior (lci-notes-v2) la primera vez, sin borrar esa clave.
  const CF_KEY = 'lci-casefiles-v1';
  const NOTES_KEY_OLD2 = 'lci-notes-v1';
  const NOTES_KEY2 = 'lci-notes-v2';
  const CF_TYPE_LABEL = { historia: 'HISTORIA', evidencia: 'EVIDENCIA', pista: 'PISTA', testimonio: 'TESTIMONIO' };
  const cfTypeLabel = t => CF_TYPE_LABEL[t] || String(t || '').toUpperCase();
  const cfTypePlural = t => cfTypeLabel(t) + 'S';
  const pad2 = n => String(n).padStart(2, '0');

  let cf = { items: [], nextNum: 1 };
  try {
    const raw = localStorage.getItem(CF_KEY);
    if (raw) {
      const v = JSON.parse(raw);
      if (isObj(v) && Array.isArray(v.items)) cf = { items: v.items, nextNum: Number.isFinite(v.nextNum) ? v.nextNum : (v.items.length + 1) };
    } else {
      // migración desde lci-notes-v2 (una sola vez; no se borra la clave vieja)
      let oldNotes = [];
      try { oldNotes = JSON.parse(localStorage.getItem(NOTES_KEY2) || '[]') || []; } catch (e) { oldNotes = []; }
      if (Array.isArray(oldNotes) && oldNotes.length) {
        let n = 1;
        cf.items = oldNotes.map(note => ({
          id: 'cf' + Date.now() + Math.random().toString(36).slice(2, 7),
          num: n++,
          type: 'historia',
          title: note.title || '',
          body: note.body || '',
          status: 'activo',
          relatedEvidenceIds: [],
          ts: Number.isFinite(note.ts) ? note.ts : Date.now()
        }));
        cf.nextNum = n;
        saveCaseFiles();
      }
    }
  } catch (e) { cf = { items: [], nextNum: 1 }; }
  void NOTES_KEY_OLD2; // conservada sin borrar, igual que antes; solo documentando que no se toca

  function saveCaseFiles() {
    try { localStorage.setItem(CF_KEY, JSON.stringify(cf)); } catch (e) { /* sin almacenamiento */ }
  }

  let cfOpenId = null;
  let cfTimer = null;
  let cfFilter = ['all'].concat(Object.keys(CF_TYPE_LABEL)).includes(saved['cf-filter']) ? saved['cf-filter'] : 'all';
  let cfShowArchived = !!saved['cf-show-archived'];
  let cfQuery = '';
  let cfOnlyUntold = !!saved['cf-untold'];
  let cfOnlyEv = !!saved['cf-onlyev'];
  const CF_FS = [13, 16, 20, 26]; // tamaños de letra del lector (px)
  let cfFs = Math.min(CF_FS.length - 1, Math.max(0, Number.isInteger(saved['cf-fs']) ? saved['cf-fs'] : 1));

  function cfTypesPresent() {
    const set = new Set(Object.keys(CF_TYPE_LABEL));
    cf.items.forEach(i => set.add(i.type));
    return [...set];
  }
  function cfVisibleItems() { return cfShowArchived ? cf.items.slice() : cf.items.filter(i => i.status !== 'archivado'); }
  function cfFilteredList() {
    const items = cfVisibleItems();
    let list = cfFilter === 'all' ? items : items.filter(i => i.type === cfFilter);
    if (cfOnlyUntold) list = list.filter(i => !i.told);
    if (cfOnlyEv) list = list.filter(i => (i.relatedEvidenceIds || []).length);
    const toks = norm(cfQuery).split(/\s+/).filter(Boolean);
    if (toks.length) list = list.filter(i => { const hay = norm('#' + i.num + ' ' + pad3(i.num) + ' ' + (i.title || '') + ' ' + (i.body || '') + ' ' + cfTypeLabel(i.type)); return toks.every(t => hay.includes(t)); });
    return list.slice().sort((a, b) => b.num - a.num);
  }
  function cfDotClass(item) {
    if (item.status === 'archivado') return 'archived';
    if (item.id === cfOpenId) return 'live';
    if (Date.now() - (item.ts || 0) < 24 * 3600 * 1000) return 'new';
    return 'off';
  }

  function renderCfTabs() {
    const box = $('#cf-tabs');
    if (!box) return;
    box.innerHTML = '';
    ['all'].concat(cfTypesPresent()).forEach(t => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'cf-tab' + (cfFilter === t ? ' on' : '');
      b.textContent = t === 'all' ? 'TODOS' : cfTypePlural(t);
      b.addEventListener('click', () => { cfFilter = t; keep('cf-filter', t); renderCaseFiles(); });
      box.appendChild(b);
    });
  }

  function renderCfCounters() {
    const el = $('#cf-counters');
    if (!el) return;
    const total = cf.items.length;
    const active = cf.items.filter(i => i.status === 'activo').length;
    const live = cfOpenId ? 1 : 0;
    el.textContent = `${pad2(total)} EXPEDIENTE${total === 1 ? '' : 'S'} · ${pad2(active)} ACTIVO${active === 1 ? '' : 'S'} · ${pad2(live)} EN EMISIÓN`;
  }

  function renderCaseFiles() {
    renderCfTabs();
    const box = $('#cf-list');
    const list = cfFilteredList();
    if (!list.length) { box.innerHTML = `<div class="empty">${cfQuery || cfOnlyUntold || cfOnlyEv ? 'Nada coincide con los filtros.' : 'Sin expedientes en esta vista.'}</div>`; renderCfCounters(); renderCfReader(); return; }
    box.innerHTML = '';
    list.forEach(item => {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'cf-item' + (item.status === 'archivado' ? ' cf-item--archived' : '') + (item.id === cfOpenId ? ' cf-item--sel' : '');
      row.innerHTML = `<span class="cf-dot cf-dot--${cfDotClass(item)}"></span><span class="cf-num">#${pad3(item.num)}</span><span class="cf-t"></span>${item.told ? '<span class="cf-told" title="Ya contado en el programa">✓</span>' : ''}<span class="cf-ty">${esc(cfTypeLabel(item.type))}</span>`;
      row.querySelector('.cf-t').textContent = (item.title || '(sin título)') + (item.status === 'archivado' ? ' · ARCHIVADO' : '');
      row.addEventListener('click', () => openCaseFile(item.id));
      box.appendChild(row);
    });
    renderCfCounters();
    renderCfReader();
  }

  // ---------- lector integrado: el expediente se LEE dentro del propio módulo (sin modal) ----------
  const cfItem = () => cf.items.find(x => x.id === cfOpenId) || null;
  function renderCfReader() {
    const item = cfItem();
    $('#cf-reader-empty').hidden = !!item;
    $('#cf-reader-main').hidden = !item;
    if (!item) return;
    $('#cf-r-num').textContent = '#' + pad3(item.num);
    $('#cf-r-type').textContent = cfTypeLabel(item.type);
    $('#cf-r-title').textContent = item.title || '(sin título)';
    const body = $('#cf-r-body');
    const paras = (item.body || '').split(/\n+/).map(t => t.trim()).filter(Boolean);
    const sig = item.id + '|' + (item.body || '');
    if (body._cfSig !== sig) {
      const sameItem = body._cfId === item.id;
      body.innerHTML = '';
      if (!paras.length) { const p = document.createElement('p'); p.textContent = '(sin contenido todavía: usa EDITAR para escribir la historia)'; body.appendChild(p); }
      paras.forEach((t, i) => {
        const p = document.createElement('p');
        p.textContent = t; p.dataset.i = i;
        p.addEventListener('click', () => { if (String(window.getSelection()).trim()) return; cfSetMark(i); });
        body.appendChild(p);
      });
      if (!sameItem) body.scrollTop = 0; // otro expediente: arranca arriba; el mismo conserva su scroll
      body._cfSig = sig; body._cfId = item.id;
    }
    body.style.setProperty('--cf-fs', CF_FS[cfFs] + 'px');
    cfPaintMark(item);
    $('#cf-r-told').classList.toggle('on', !!item.told);
    $('#cf-r-told').textContent = item.told ? '✓ CONTADO' : '○ MARCAR CONTADO';
    $('#cf-fs-m').disabled = cfFs === 0; $('#cf-fs-p').disabled = cfFs === CF_FS.length - 1;
    body.classList.toggle('is-empty', !item.body);
    $('#cf-r-archive').textContent = item.status === 'archivado' ? '↺ REACTIVAR' : '🗄 ARCHIVAR';
    renderCfRelated();
    const list = cfFilteredList(), idx = list.findIndex(x => x.id === item.id);
    $('#cf-r-prev').disabled = !(idx >= 0 && idx < list.length - 1);
    $('#cf-r-next').disabled = !(idx > 0);
  }

  // ---------- relación con el banco de evidencias (§04/§05): reusa bank / cue / cola de §04 ----------
  function cfEvidenceStateLabel(bankItem) {
    if (!bankItem) return { text: '○ YA NO ESTÁ EN EL BANCO', cls: 'gone' };
    if (live.ev && live.ev.visible && live.ev.bankId === bankItem.id) return { text: '● AL AIRE', cls: 'live' };
    if (bankItem.id === cuedId) return { text: '◇ SIGUIENTE', cls: 'live' };
    const q = evQueue.indexOf(bankItem.id);
    if (q >= 0) return { text: `○ EN COLA · ${q + (evQueue[0] === cuedId ? 0 : 1)}`, cls: 'queue' };
    if (bankItem.used) return { text: `● YA ENVIADA · #${pad3(bankItem.num || 0)}`, cls: 'used' };
    return { text: '○ EN BANCO, SIN PREPARAR', cls: 'off' };
  }
  function renderCfRelated() {
    const item = cfItem(), list = $('#cf-r-evlist');
    if (!item || !list) return;
    const related = item.relatedEvidenceIds || [];
    list.innerHTML = '';
    if (!related.length) { list.innerHTML = '<div class="cf-evidence-empty">Sin evidencia relacionada (se relaciona desde EDITAR).</div>'; return; }
    related.forEach(id => {
      const bankItem = bank.find(b => b.id === id);
      const st = cfEvidenceStateLabel(bankItem);
      const row = document.createElement('div');
      row.className = 'cf-evidence-row';
      row.innerHTML = `${bankItem ? `<img class="cf-ev-img" src="${esc(bankItem.dataURL)}" alt="">` : ''}<span class="cf-ev-name">${esc((bankItem && bankItem.name) || 'EVIDENCIA')}</span><span class="cf-ev-st cf-ev-st--${st.cls}">${st.text}</span>`;
      list.appendChild(row);
    });
  }
  // el editor sí es modal: editar es distinto de leer. Relacionar evidencia = clic en su miniatura del archivo.
  function renderCfEvidenceSection(item) {
    const list = $('#cf-evidence-list'), pick = $('#cf-evidence-pick');
    if (!list || !pick) return;
    const related = item.relatedEvidenceIds || [];
    const changed = () => { saveCaseFiles(); if (evQueueCase === item.id) cfPrepare(item, true); renderCfEvidenceSection(item); renderCfReader(); };
    $('#cf-ev-count').textContent = related.length;
    // relacionadas, en orden de salida (1.ª = SIGUIENTE)
    list.innerHTML = '';
    if (!related.length) list.innerHTML = '<div class="cfe-empty">Sin evidencia relacionada. Elige abajo, en el archivo.</div>';
    related.forEach((id, idx) => {
      const bankItem = bank.find(b => b.id === id);
      const st = cfEvidenceStateLabel(bankItem);
      const row = document.createElement('div');
      row.className = 'cfe-rel' + (idx === 0 ? ' cfe-rel--next' : '');
      row.innerHTML = `<span class="cfe-ord">${idx + 1}</span>${bankItem ? `<img src="${esc(bankItem.dataURL)}" alt="">` : '<span class="cfe-gone">?</span>'}` +
        `<span class="cfe-rn"></span><span class="cfe-rt">${idx === 0 ? 'SIGUIENTE' : 'COLA'}</span><span class="cf-ev-st cf-ev-st--${st.cls}">${st.text}</span>` +
        `<button type="button" class="btn--sm btn--ghost cf-ev-up" title="Subir en el orden" ${idx === 0 ? 'disabled' : ''}>↑</button>` +
        `<button type="button" class="btn--sm btn--ghost cf-ev-unlink" title="Quitar relación">✕</button>`;
      row.querySelector('.cfe-rn').textContent = (bankItem && bankItem.name) || 'Ya no está en el archivo';
      row.querySelector('.cf-ev-up').addEventListener('click', () => {
        const r = related.slice(); [r[idx - 1], r[idx]] = [r[idx], r[idx - 1]];
        item.relatedEvidenceIds = r; changed();
      });
      row.querySelector('.cf-ev-unlink').addEventListener('click', () => { item.relatedEvidenceIds = related.filter(x => x !== id); changed(); });
      list.appendChild(row);
    });
    // archivo completo: clic = relacionar / quitar (el número indica su orden)
    pick.innerHTML = '';
    if (!bank.length) pick.innerHTML = '<div class="cfe-empty">El archivo de evidencias está vacío. Sube imágenes en §05.</div>';
    bank.forEach(b => {
      const pos = related.indexOf(b.id);
      const t = document.createElement('button');
      t.type = 'button';
      t.className = 'cfe-th' + (pos >= 0 ? ' on' : '');
      t.title = (b.name || 'imagen') + (pos >= 0 ? ` · relacionada (#${pos + 1}) — clic para quitar` : ' — clic para relacionar');
      t.innerHTML = `<img src="${esc(b.dataURL)}" alt="">${pos >= 0 ? `<span class="cfe-badge">${pos + 1}</span>` : ''}`;
      t.addEventListener('click', () => {
        item.relatedEvidenceIds = pos >= 0 ? related.filter(x => x !== b.id) : related.concat(b.id);
        changed();
      });
      pick.appendChild(t);
    });
  }
  const cfWords = t => { const n = (t.match(/\S+/g) || []).length; return n + (n === 1 ? ' palabra' : ' palabras'); };
  const cfSyncType = () => $$('#cf-type-seg [data-cftype]').forEach(b => b.classList.toggle('on', b.dataset.cftype === $('#cf-type').value));
  $$('#cf-type-seg [data-cftype]').forEach(b => b.addEventListener('click', () => { $('#cf-type').value = b.dataset.cftype; cfSyncType(); saveCurrentCaseFile(); renderCaseFiles(); }));

  // seleccionar = leer aquí + PREPARAR (nunca emitir) sus evidencias en §04
  function openCaseFile(id) {
    const item = cf.items.find(x => x.id === id);
    if (!item) return;
    const changedItem = cfOpenId !== id;
    cfOpenId = id;
    renderCaseFiles();
    if (changedItem) cfPrepare(item);
  }
  // marcador de lectura: un párrafo resaltado ("voy por aquí"); flechas ↑↓ lo mueven con el lector enfocado
  function cfPaintMark(item) {
    const body = $('#cf-r-body'), m = Number.isInteger(item.mark) ? item.mark : -1;
    body.classList.toggle('has-mark', m >= 0);
    [...body.children].forEach((p, i) => p.classList.toggle('is-mark', i === m));
  }
  function cfSetMark(i, scroll) {
    const item = cfItem();
    if (!item) return;
    const n = $('#cf-r-body').children.length;
    item.mark = (i === item.mark || i < 0 || i >= n) ? -1 : i;
    saveCaseFiles();
    cfPaintMark(item);
    const p = $('#cf-r-body').children[item.mark];
    if (scroll && p) p.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
  $('#cf-r-body').addEventListener('keydown', e => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const item = cfItem();
    if (!item) return;
    e.preventDefault();
    const cur = Number.isInteger(item.mark) ? item.mark : -1, n = $('#cf-r-body').children.length;
    const next = Math.max(0, Math.min(n - 1, e.key === 'ArrowDown' ? cur + 1 : cur - 1));
    if (next !== cur) { item.mark = -1; cfSetMark(next, true); }
  });
  $('#cf-r-told').addEventListener('click', () => {
    const item = cfItem();
    if (!item) return;
    item.told = !item.told;
    saveCaseFiles(); renderCaseFiles();
  });
  const cfFsSet = d => { cfFs = Math.min(CF_FS.length - 1, Math.max(0, cfFs + d)); keep('cf-fs', cfFs); renderCfReader(); };
  $('#cf-fs-m').addEventListener('click', () => cfFsSet(-1));
  $('#cf-fs-p').addEventListener('click', () => cfFsSet(1));
  // → LOWER THIRD: PREPARA los campos con la selección (o el título); no manda nada al aire
  $('#cf-r-lt').addEventListener('click', () => {
    const item = cfItem();
    if (!item) return;
    const sel = String(window.getSelection() || '').replace(/\s+/g, ' ').trim();
    const name = (sel || item.title || '').slice(0, 60);
    [['#lt-label', 'EXPEDIENTE'], ['#lt-num', item.num], ['#lt-name', name]].forEach(([q, v]) => {
      const n = $(q); n.value = v;
      n.dispatchEvent(new Event('input')); n.dispatchEvent(new Event('change'));
    });
    toast(`→ LOWER THIRD PREPARADO · ${name || '—'} (aún no sale al aire)`, 'info');
    $('#card-lt').classList.add('flash-prep'); setTimeout(() => $('#card-lt').classList.remove('flash-prep'), 1200);
  });
  // búsqueda y filtros de la lista
  $('#cf-search').addEventListener('input', () => { cfQuery = $('#cf-search').value; renderCaseFiles(); });
  const cfSyncChips = () => { $('#cf-f-untold').classList.toggle('on', cfOnlyUntold); $('#cf-f-ev').classList.toggle('on', cfOnlyEv); };
  $('#cf-f-untold').addEventListener('click', () => { cfOnlyUntold = !cfOnlyUntold; keep('cf-untold', cfOnlyUntold); cfSyncChips(); renderCaseFiles(); });
  $('#cf-f-ev').addEventListener('click', () => { cfOnlyEv = !cfOnlyEv; keep('cf-onlyev', cfOnlyEv); cfSyncChips(); renderCaseFiles(); });
  cfSyncChips();
  // importar .txt / .md: cada archivo = un expediente; si trae líneas «# Título», cada una abre uno nuevo
  function cfSplitMd(text, base) {
    const lines = text.split('\n'), parts = [];
    let cur = null;
    lines.forEach(l => {
      const m = /^#\s+(.+)/.exec(l);
      if (m) { cur = { title: m[1].trim(), body: [] }; parts.push(cur); }
      else { if (!cur) { cur = { title: base, body: [] }; parts.push(cur); } cur.body.push(l); }
    });
    return parts.map(pt => ({ title: pt.title, body: pt.body.join('\n').trim() })).filter(pt => pt.title || pt.body);
  }
  $('#cf-import').addEventListener('change', async e => {
    const files = [...e.target.files]; e.target.value = '';
    let added = 0, bad = 0;
    const type = cfFilter !== 'all' ? cfFilter : 'historia';
    for (const f of files) {
      if (!/\.(txt|md)$/i.test(f.name) && !/^text\//.test(f.type)) { bad++; continue; }
      if (f.size > 500 * 1024) { bad++; continue; }
      let text = '';
      try { text = (await f.text()).replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').trim(); } catch (err) { bad++; continue; }
      if (!text) { bad++; continue; }
      cfSplitMd(text, f.name.replace(/\.[^.]+$/, '')).forEach(pt => {
        cf.items.push({ id: 'cf' + Date.now() + Math.random().toString(36).slice(2, 7), num: cf.nextNum++, type, title: pt.title.slice(0, 120), body: pt.body, status: 'activo', relatedEvidenceIds: [], ts: Date.now() });
        added++;
      });
    }
    saveCaseFiles(); renderCaseFiles();
    if (added) { toast(`✓ ${added} EXPEDIENTE(S) IMPORTADO(S)`, 'ok'); activity(`+ ${added} expediente(s) importado(s)`, 'info'); }
    if (bad) toast(`✕ ${bad} ARCHIVO(S) NO VÁLIDO(S) · SOLO .TXT / .MD ≤ 500 KB`, 'err');
  });

  function cfEdit() {
    const item = cfItem();
    if (!item) return;
    $('#cf-num').textContent = '#' + pad3(item.num);
    $('#cf-type').value = item.type;
    cfSyncType();
    $('#cf-title').value = item.title || '';
    $('#cf-body').value = item.body || '';
    $('#cf-count').textContent = cfWords(item.body || '');
    $('#cf-meta').textContent = 'GUARDADO';
    $('#cf-archive').textContent = item.status === 'archivado' ? '↺ REACTIVAR' : '🗄 ARCHIVAR';
    renderCfEvidenceSection(item);
    $('#cf-modal').hidden = false;
    $('#cf-title').focus();
  }
  function cfCloseEditor() {
    clearTimeout(cfTimer);
    saveCurrentCaseFile();
    $('#cf-modal').hidden = true;
    renderCaseFiles();
  }
  function cfRemove(id) {
    cf.items = cf.items.filter(x => x.id !== id);
    saveCaseFiles();
    if (evQueueCase === id) cfDropQueue();
    if (cfOpenId === id) cfOpenId = null;
    $('#cf-modal').hidden = true;
    renderCaseFiles();
  }
  function cfToggleArchive() {
    const item = cfItem();
    if (!item) return;
    item.status = item.status === 'archivado' ? 'activo' : 'archivado';
    saveCaseFiles();
    $('#cf-archive').textContent = item.status === 'archivado' ? '↺ REACTIVAR' : '🗄 ARCHIVAR';
    renderCaseFiles();
  }
  function cfConfirmDelete() {
    const item = cfItem();
    if (!item) return;
    if (!confirm(`¿Borrar el expediente "${item.title || '(sin título)'}"? No se puede deshacer.`)) return;
    cfRemove(item.id);
  }
  function saveCurrentCaseFile() {
    if ($('#cf-modal').hidden) return; // solo el editor escribe; el lector no toca los datos
    const item = cfItem();
    if (!item) return;
    item.type = $('#cf-type').value;
    item.title = $('#cf-title').value;
    item.body = $('#cf-body').value;
    saveCaseFiles();
    $('#cf-meta').textContent = 'GUARDADO';
    $('#cf-meta').classList.remove('is-busy');
  }
  function cfNavigate(dir) {
    // La lista está ordenada del más nuevo al más viejo (cfFilteredList ordena por num descendente),
    // así que ir al índice +1 es "anterior" (más viejo) e ir al índice -1 es "siguiente" (más nuevo).
    const current = cfItem();
    if (!current) return;
    const list = cfFilteredList();
    const idx = list.findIndex(x => x.id === current.id);
    const target = idx < 0 ? null : list[idx + dir];
    if (target) openCaseFile(target.id);
  }

  // autoguardado del editor (el lector se refresca al guardar)
  const cfTyping = () => {
    $('#cf-meta').textContent = 'ESCRIBIENDO…';
    $('#cf-meta').classList.add('is-busy');
    $('#cf-count').textContent = cfWords($('#cf-body').value);
    clearTimeout(cfTimer);
    cfTimer = setTimeout(() => { saveCurrentCaseFile(); renderCaseFiles(); }, 400);
  };
  $('#cf-modal').addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); cfCloseEditor(); } });
  $('#cf-title').addEventListener('input', cfTyping);
  $('#cf-body').addEventListener('input', cfTyping);
  $('#cf-type').addEventListener('change', () => { saveCurrentCaseFile(); renderCaseFiles(); });
  $('#cf-close').addEventListener('click', cfCloseEditor);
  $('#cf-modal').addEventListener('click', e => { if (e.target.id === 'cf-modal') cfCloseEditor(); });
  $('#cf-delete').addEventListener('click', cfConfirmDelete);
  $('#cf-archive').addEventListener('click', cfToggleArchive);
  $('#cf-r-edit').addEventListener('click', cfEdit);
  $('#cf-r-archive').addEventListener('click', cfToggleArchive);
  $('#cf-r-delete').addEventListener('click', cfConfirmDelete);
  $('#cf-r-prev').addEventListener('click', () => cfNavigate(1));
  $('#cf-r-next').addEventListener('click', () => cfNavigate(-1));
  // MOSTRAR: vuelve a PREPARAR las evidencias del expediente (1.ª = SIGUIENTE, resto = COLA).
  // No manda nada al overlay: el operador decide cuándo pulsar MANDAR AL AIRE.
  $('#cf-r-show').addEventListener('click', () => { const item = cfItem(); if (item) cfPrepare(item, false, true); });

  $('#notes-add').addEventListener('click', () => {
    const item = {
      id: 'cf' + Date.now() + Math.random().toString(36).slice(2, 7),
      num: cf.nextNum++,
      type: 'historia',
      title: 'Expediente ' + (cf.nextNum - 1),
      body: '',
      status: 'activo',
      relatedEvidenceIds: [],
      ts: Date.now()
    };
    cf.items.push(item);
    saveCaseFiles();
    openCaseFile(item.id);
    cfEdit(); // un expediente nuevo nace en el editor para escribirlo
  });

  $('#notes-clear-all').addEventListener('click', () => {
    if (!cf.items.length) return;
    if (!confirm('¿Vaciar todos los expedientes? No se puede deshacer.')) return;
    cf.items = [];
    saveCaseFiles();
    cfDropQueue();
    cfOpenId = null;
    $('#cf-modal').hidden = true;
    renderCaseFiles();
  });

  const cfArchivedBtn = $('#cf-show-archived');
  function cfSyncArchivedBtn() { cfArchivedBtn.classList.toggle('on', cfShowArchived); cfArchivedBtn.textContent = cfShowArchived ? '🗄 OCULTAR ARCHIVADOS' : '🗄 VER ARCHIVADOS'; }
  cfSyncArchivedBtn();
  cfArchivedBtn.addEventListener('click', () => {
    cfShowArchived = !cfShowArchived;
    keep('cf-show-archived', cfShowArchived);
    cfSyncArchivedBtn();
    renderCaseFiles();
  });

  renderCaseFiles();

  // ---------- memoria de encuadre: OBS no recuerda el tamaño/posición de una cámara por
  // separado para cada escena si usas la misma fuente en varias (es un único "scene item"
  // por escena, pero si lo moviste mal en una se queda así). Esto guarda el transform
  // (posición, tamaño, recorte) de la fuente elegida por cada escena y lo vuelve a aplicar
  // solo, en el instante en que esa escena pasa a ser la activa.
  const FRAMING_KEY = 'lci-framing-v1';
  const framing = (() => { const v = readJSON(FRAMING_KEY); return isObj(v) ? v : {}; })();
  const saveFraming = () => { try { localStorage.setItem(FRAMING_KEY, JSON.stringify(framing)); } catch (e) { /* sin almacenamiento */ } };
  const TRANSFORM_KEYS = ['positionX', 'positionY', 'rotation', 'scaleX', 'scaleY', 'alignment',
    'boundsType', 'boundsAlignment', 'boundsWidth', 'boundsHeight', 'cropLeft', 'cropRight', 'cropTop', 'cropBottom'];
  async function loadFramingSources() {
    try {
      const { inputs } = await obs.request('GetInputList');
      // Solo cámaras reales (dshow/captura de video): nada de audio ni de las fuentes de
      // Navegador del overlay (LCI Broadcast/Vertical), que antes no estorbaban porque eran
      // pocas, pero ahora hay 8 (una por escena) y llenaban el desplegable de opciones que
      // no son cámaras.
      const videoInputs = inputs.filter(i => !AUDIO_KINDS.test(i.inputKind) && i.inputKind !== 'browser_source');
      [1, 2].forEach(id => {
        const sel = $(`#cam${id}-source`);
        const current = sel.value;
        sel.innerHTML = '<option value="">— elegir fuente de OBS —</option>';
        videoInputs.forEach(i => sel.appendChild(new Option(i.inputName, i.inputName)));
        if (current && videoInputs.some(i => i.inputName === current)) sel.value = current;
      });
    } catch (e) { /* sin lista, los selects quedan solo con lo que ya estaba guardado */ }
  }
  // ---------- lista de las 8 escenas (4 horizontales del canvas Main + 4 verticales del canvas
  // de Aitum) para el selector manual de "ENCUADRE POR ESCENA". No se hardcodea el uuid del
  // canvas vertical (puede cambiar si Rox lo recrea): se busca con GetCanvasList el canvas que
  // NO sea el principal (canvasFlags.MAIN === false) y se le pide su GetSceneList aparte, porque
  // GetCurrentProgramScene/GetSceneList con canvasUuid de un canvas no-Main no informan la
  // escena activa de ese canvas (limitación confirmada de OBS/Aitum) — por eso esto es un
  // selector A MANO, no detección automática.
  let framingScenes = [];
  async function loadFramingScenes() {
    if (!obs.connected) return;
    const combined = [];
    try {
      const { scenes } = await obs.request('GetSceneList');
      (scenes || []).forEach(s => combined.push({ uuid: s.sceneUuid, name: s.sceneName, kind: 'horizontal' }));
    } catch (e) { /* sin canvas principal: no debería pasar si OBS está conectado */ }
    try {
      const { canvases } = await obs.request('GetCanvasList');
      const vCanvas = (canvases || []).find(c => c.canvasFlags && c.canvasFlags.MAIN === false);
      if (vCanvas) {
        const { scenes } = await obs.request('GetSceneList', { canvasUuid: vCanvas.canvasUuid });
        (scenes || []).forEach(s => combined.push({ uuid: s.sceneUuid, name: s.sceneName, kind: 'vertical' }));
      }
    } catch (e) { /* Aitum no está instalado o no hay canvas secundario: solo quedan las horizontales */ }
    framingScenes = combined;
    [1, 2].forEach(id => {
      const sel = $(`#cam${id}-scene`);
      // ojo: no se usa sel.value acá como "valor actual" porque al arrancar el <select> solo
      // tiene la opción vacía (data-keep no pudo fijar el uuid guardado porque esa <option>
      // todavía no existía) — se lee directo de lo persistido.
      const current = sel.value || saved[`cam${id}-scene`] || '';
      sel.innerHTML = '<option value="">— elegir escena —</option>';
      combined.forEach(s => sel.appendChild(new Option(`${s.kind === 'vertical' ? '▐ VERTICAL · ' : '▬ '}${s.name}`, s.uuid)));
      if (current && combined.some(s => s.uuid === current)) sel.value = current;
    });
  }
  // migración: si había encuadres guardados por NOMBRE (formato viejo) y recién se aprendió el
  // uuid de ese nombre, se mueven a la clave uuid (una sola vez por escena). No es crítico si
  // algún caso raro no migra: el encuadre viejo simplemente queda huérfano.
  function migrateFramingToUuid(sceneName, sceneUuid) {
    if (!sceneName || !sceneUuid || !framing[sceneName] || framing[sceneUuid]) return;
    framing[sceneUuid] = framing[sceneName];
    delete framing[sceneName];
    saveFraming();
  }
  // El encuadre ahora se guarda para la escena elegida en el selector nuevo (#cam{id}-scene,
  // horizontal o vertical). Si no se elige ninguna, cae en la escena ACTIVA (comportamiento
  // viejo, sigue andando igual para quien no toque el selector nuevo).
  async function saveFramingFor(id) {
    const sourceName = $(`#cam${id}-source`).value;
    const pickedUuid = $(`#cam${id}-scene`).value;
    const sceneUuid = pickedUuid || live.obsSceneUuid;
    const pickedEntry = framingScenes.find(s => s.uuid === sceneUuid);
    const sceneName = (pickedEntry && pickedEntry.name) || (sceneUuid === live.obsSceneUuid ? live.obsScene : sceneUuid);
    if (!sourceName) { toast('✕ ELIGE PRIMERO LA FUENTE DE OBS', 'err'); return; }
    if (!sceneUuid) { toast('✕ ELEGÍ UNA ESCENA (O ACTIVÁ UNA EN OBS)', 'err'); return; }
    try {
      const { sceneItemId } = await obs.request('GetSceneItemId', { sceneUuid, sourceName });
      const { sceneItemTransform } = await obs.request('GetSceneItemTransform', { sceneUuid, sceneItemId });
      const clean = {};
      TRANSFORM_KEYS.forEach(k => { if (sceneItemTransform[k] !== undefined) clean[k] = sceneItemTransform[k]; });
      framing[sceneUuid] = framing[sceneUuid] || {};
      framing[sceneUuid][sourceName] = clean;
      saveFraming();
      toast(`📐 ENCUADRE GUARDADO · ${sceneName}`, 'ok');
      activity(`📐 Encuadre de "${sourceName}" guardado para ${sceneName}`);
      $(`#cam${id}-framing-hint`).textContent = `guardado para "${sceneName}"`;
    } catch (e) {
      toast('✕ ' + (/sourceName|item/i.test(e.message) ? 'ESA FUENTE NO ESTÁ EN LA ESCENA ELEGIDA' : e.message), 'err');
    }
  }
  // automático: se dispara solo cuando OBS informa el cambio de escena ACTIVA (solo pasa para
  // el canvas Main/horizontal — el canvas vertical de Aitum nunca manda ese evento, confirmado).
  async function applyFramingForScene() {
    const sceneUuid = live.obsSceneUuid;
    if (!sceneUuid || !obs.connected) return;
    const bySource = framing[sceneUuid];
    if (!bySource) return;
    for (const sourceName of Object.keys(bySource)) {
      try {
        const { sceneItemId } = await obs.request('GetSceneItemId', { sceneUuid, sourceName });
        await obs.request('SetSceneItemTransform', { sceneUuid, sceneItemId, sceneItemTransform: bySource[sourceName] });
      } catch (e) { /* esa fuente ya no está en esta escena: se ignora */ }
    }
  }
  // manual: botón "APLICAR A ESTA ESCENA". Restaura el encuadre guardado de la cámara+escena
  // elegidas en el selector nuevo, sin importar cuál esté activa ahora. Es el único modo posible
  // para las escenas verticales (no hay forma de detectarlas solas); también sirve para las
  // horizontales si Rox quiere reaplicar a mano.
  async function applyFramingManual(id) {
    const sourceName = $(`#cam${id}-source`).value;
    const sceneUuid = $(`#cam${id}-scene`).value;
    const pickedEntry = framingScenes.find(s => s.uuid === sceneUuid);
    const sceneName = (pickedEntry && pickedEntry.name) || sceneUuid;
    if (!sourceName) { toast('✕ ELIGE PRIMERO LA FUENTE DE OBS', 'err'); return; }
    if (!sceneUuid) { toast('✕ ELEGÍ LA ESCENA A APLICAR', 'err'); return; }
    const saved_ = framing[sceneUuid] && framing[sceneUuid][sourceName];
    if (!saved_) { toast(`✕ NO HAY ENCUADRE GUARDADO PARA "${sceneName}"`, 'err'); return; }
    try {
      const { sceneItemId } = await obs.request('GetSceneItemId', { sceneUuid, sourceName });
      await obs.request('SetSceneItemTransform', { sceneUuid, sceneItemId, sceneItemTransform: saved_ });
      toast(`↺ ENCUADRE APLICADO · ${sceneName}`, 'ok');
      activity(`↺ Encuadre de "${sourceName}" aplicado a ${sceneName}`);
    } catch (e) {
      toast('✕ ' + (/sourceName|item/i.test(e.message) ? 'ESA FUENTE NO ESTÁ EN LA ESCENA ELEGIDA' : e.message), 'err');
    }
  }
  [1, 2].forEach(id => {
    $(`#cam${id}-save-framing`).addEventListener('click', () => saveFramingFor(id));
    $(`#cam${id}-apply-framing`).addEventListener('click', () => applyFramingManual(id));
  });

  // ---------- ducking: baja el volumen de las fuentes de OBS que elijas mientras suena un
  // efecto, y lo sube de vuelta gradualmente. Trabaja sobre fuentes reales de OBS (no
  // necesita que existan los .mp3 todavía).
  const DUCK_TRIGGERS = new Set(['alert', 'stamp', 'transition', 'intro', 'outro', 'evidence', 'cameraSwitch']);
  // origVolumeDb solo tiene entradas MIENTRAS una fuente está bajada: el original se lee cuando
  // no hay duck activo en esa fuente y se borra al terminar de restaurarla. duckGen invalida
  // timers y restauraciones viejas cuando llega un disparo nuevo (nada queda huérfano).
  const origVolumeDb = new Map();
  let duckTimer = null, duckGen = 0;
  function duckConfig() { return (C.sound && C.sound.duck) || { enabled: false, inputs: [] }; }
  async function duckAudio() {
    const cfg = duckConfig();
    if (!cfg.enabled || !cfg.inputs || !cfg.inputs.length || !obs.connected) return;
    const gen = ++duckGen;
    clearTimeout(duckTimer); duckTimer = null;
    for (const name of cfg.inputs.slice()) {
      try {
        if (!origVolumeDb.has(name)) {
          const v = await obs.request('GetInputVolume', { inputName: name });
          // otro disparo simultáneo pudo guardarlo antes (con el valor bueno): el primero gana
          if (!origVolumeDb.has(name)) origVolumeDb.set(name, Number(v.inputVolumeDb));
        }
        if (gen !== duckGen) return; // llegó un disparo más nuevo: él se encarga
        if (!duckConfig().inputs.includes(name)) continue; // la desmarcaron mientras tanto
        const orig = origVolumeDb.get(name);
        await obs.request('SetInputVolume', { inputName: name, inputVolumeDb: Math.max(orig + Number(cfg.amountDb || -14), -60) });
      } catch (e) { log(`Ducking: no encontré la fuente "${name}" en OBS`, true); }
    }
    if (gen !== duckGen) return;
    duckTimer = setTimeout(() => { duckTimer = null; restoreAudio(gen); }, Number(cfg.holdMs) || 700);
  }
  async function restoreAudio(gen) {
    const cfg = duckConfig();
    const steps = 6, stepMs = Math.max(20, Math.round((Number(cfg.fadeMs) || 300) / steps));
    for (const name of [...origVolumeDb.keys()]) {
      if (gen !== duckGen) return;
      const orig = origVolumeDb.get(name);
      if (orig === undefined) continue;
      try {
        let cur = Number((await obs.request('GetInputVolume', { inputName: name })).inputVolumeDb);
        for (let i = 1; i <= steps; i++) {
          if (gen !== duckGen) return; // un disparo nuevo la vuelve a bajar: no se pelea con él
          cur = cur + (orig - cur) * (i / steps);
          await obs.request('SetInputVolume', { inputName: name, inputVolumeDb: i === steps ? orig : cur });
          if (i < steps) await new Promise(r => setTimeout(r, stepMs));
        }
        if (gen === duckGen) origVolumeDb.delete(name);
      } catch (e) {
        // sin OBS se conserva el original: al reconectar se restaura. Si la fuente ya no existe, se olvida.
        if (obs.connected) origVolumeDb.delete(name);
      }
    }
  }
  // devuelve YA una sola fuente a su volumen original (al desmarcarla durante un duck)
  function restoreInputNow(name) {
    if (!origVolumeDb.has(name)) return;
    const orig = origVolumeDb.get(name);
    origVolumeDb.delete(name);
    obs.request('SetInputVolume', { inputName: name, inputVolumeDb: orig })
      .catch(e => { origVolumeDb.set(name, orig); log(`Ducking: no pude devolver el volumen de "${name}"`, true); });
  }

  /* ---------- escenas: transición en el overlay y, justo cuando cubre la pantalla, corte en OBS ---------- */
  const trSel = $('#tr');
  ['none'].concat(Object.keys(C.transitionTimings)).forEach(n => {
    const o = document.createElement('option');
    o.value = n; o.textContent = n === 'none' ? 'sin transición (corte)' : n;
    trSel.appendChild(o);
  });
  if (saved.tr) trSel.value = saved.tr; else trSel.value = C.transitions.sceneChange;
  trSel.addEventListener('change', () => renderAll());

  // Pictogramas de cada transición (SVG en línea: sin imágenes que cargar ni mantener)
  const TR_ICON = {
    none: '<rect x="3" y="9" width="9" height="12"/><rect x="18" y="9" width="9" height="12"/><path d="M15 6v18" stroke-dasharray="2 2"/>',
    tape: '<g transform="rotate(-20 15 15)"><rect x="1" y="10" width="28" height="10" class="y"/><path d="M6 10l-4 10M13 10l-4 10M20 10l-4 10M27 10l-4 10"/></g>',
    flash: '<path d="M17 3L7 17h7l-2 10 11-15h-7z" class="y"/>',
    paper: '<path d="M7 3h12l5 5v19H7z"/><path d="M19 3v5h5"/><path d="M11 14h9M11 18h9M11 22h6"/>',
    file: '<path d="M3 8h8l2 3h14v14H3z"/><path d="M3 13h24"/>',
    cctv: '<rect x="3" y="9" width="18" height="11" rx="1"/><path d="M21 13l7-3v10l-7-3"/><circle cx="8" cy="14.5" r="1.6" class="r"/><path d="M8 24h10"/>',
    stamp: '<path d="M12 4h6v8h-3l3 4H12l3-4h-3z"/><rect x="5" y="17" width="20" height="5"/><path d="M5 26h20"/>',
    redflash: '<circle cx="15" cy="15" r="9" class="r"/><circle cx="15" cy="15" r="4"/><path d="M15 2v4M15 24v4M2 15h4M24 15h4"/>',
    document: '<rect x="6" y="3" width="18" height="24"/><path d="M10 8h10M10 12h10M10 16h10M10 20h6"/><circle cx="21" cy="22" r="3" class="y"/>',
    glitch: '<rect x="3" y="6" width="17" height="6"/><rect x="10" y="13" width="17" height="5" class="r"/><rect x="5" y="20" width="14" height="5"/>',
    evidence: '<rect x="5" y="5" width="20" height="22"/><rect x="8" y="8" width="14" height="12"/><path d="M8 20l5-5 4 4 2-2 3 3"/><path d="M10 24h10"/><circle cx="15" cy="5" r="2" class="r"/>'
  };
  const TR_ICON_DEFAULT = '<rect x="4" y="6" width="22" height="18"/><path d="M4 12h22"/>';
  const trTiles = $('#tr-tiles');
  [...trSel.options].forEach(o => {
    const n = o.value, tm = C.transitionTimings[n];
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'tr-tile'; b.dataset.trpick = n;
    b.setAttribute('role', 'radio');
    b.title = n === 'none' ? 'Corte directo, sin efecto' : `${n} · ${tm ? tm.total : '?'} ms · doble clic = probarla sola`;
    b.innerHTML = `<svg viewBox="0 0 30 30" aria-hidden="true">${TR_ICON[n] || TR_ICON_DEFAULT}</svg><span class="tr-n"></span><span class="tr-ms"></span>`;
    b.querySelector('.tr-n').textContent = n === 'none' ? 'corte' : n;
    b.querySelector('.tr-ms').textContent = tm ? (tm.total / 1000).toFixed(1) + ' s' : '0 s';
    b.addEventListener('click', () => { trSel.value = n; trSel.dispatchEvent(new Event('change')); });
    b.addEventListener('dblclick', () => fireTransition(n === 'none' ? currentTr() : n));
    trTiles.appendChild(b);
  });
  // barra compacta: ◂ [transición elegida ▾] ▸ ▶ ; la rejilla completa es un popover
  const trPop = $('#tr-pop'), trCur = $('#tr-cur');
  const trPopOpen = () => !trPop.hidden;
  function trPopSet(open) { trPop.hidden = !open; trCur.setAttribute('aria-expanded', String(open)); }
  trCur.addEventListener('click', () => trPopSet(!trPopOpen()));
  document.addEventListener('click', e => { if (trPopOpen() && !trPop.contains(e.target) && !trCur.contains(e.target)) trPopSet(false); });
  const trStep = d => {
    const opts = [...trSel.options], i = opts.findIndex(o => o.value === trSel.value);
    trSel.value = opts[(i + d + opts.length) % opts.length].value;
    trSel.dispatchEvent(new Event('change'));
  };
  $('#tr-prev').addEventListener('click', () => trStep(-1));
  $('#tr-next').addEventListener('click', () => trStep(1));
  // con la barra enfocada (Tab o clic), ← → cambian de transición
  $('.tr-bar').addEventListener('keydown', e => { if (e.key === 'ArrowLeft') { e.preventDefault(); trStep(-1); } else if (e.key === 'ArrowRight') { e.preventDefault(); trStep(1); } });
  trTiles.addEventListener('click', () => trPopSet(false));
  function renderTrCur() {
    const t = trSel.value, tm = C.transitionTimings[t];
    trCur.innerHTML = `<svg viewBox="0 0 30 30" aria-hidden="true">${TR_ICON[t] || TR_ICON_DEFAULT}</svg><span class="tr-n">${t === 'none' ? 'CORTE' : esc(t)}</span><span class="tr-ms">${tm ? (tm.total / 1000).toFixed(1) + ' s' : '0 s'}</span><span class="tr-caret">▾</span>`;
  }
  let cueScene = null;
  async function goScene(key) {
    if (!C.scenes[key]) return;
    const tr = trSel.value;
    cueScene = key; renderScenes();
    const ok = await send({ cmd: 'scene', scene: key, transition: tr }, { ok: `▶ ESCENA → ${sceneLabel(key).toUpperCase()}` + (tr !== 'none' ? ` · ${tr.toUpperCase()}` : '') });
    // si el overlay no recibió la transición, NO se corta la escena en OBS (quedaría un corte seco a medias)
    if (!ok) { if (cueScene === key) cueScene = null; renderScenes(); return; }
    const mid = tr === 'none' ? 0 : (C.transitionTimings[tr] || { mid: 300 }).mid;
    setTimeout(() => {
      cueScene = null;
      if (!obsNameFor[key]) { renderScenes(); return; }
      obs.request('SetCurrentProgramScene', { sceneName: obsNameFor[key] })
        .then(() => setObsScene(obsNameFor[key]))
        .catch(e => { log(e.message, true); toast('✕ OBS NO CAMBIÓ LA ESCENA · ' + e.message, 'err'); })
        .finally(renderScenes);
    }, mid);
  }
  $$('[data-scene]').forEach(b => b.addEventListener('click', () => goScene(b.dataset.scene)));

  /* ---------- modo y efectos ---------- */
  const FX_KEYS = ['grain', 'particles', 'scanlines', 'vignette', 'redGlow', 'filmDust', 'vhs', 'chromaticAberration', 'glitch', 'cameraNoise', 'papers', 'markers', 'shadows'];
  const fxForMode = m => Object.assign({}, C.effects, (C.modes && C.modes[m]) || {});
  const setMode = m => send({ cmd: 'mode', mode: m }, {
    ok: `◆ MODO → ${m.toUpperCase()}`,
    apply: () => { live.mode = m; live.fx = fxForMode(m); }
  });
  $$('[data-mode]').forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
  const fxBox = $('#fx');
  FX_KEYS.forEach(k => {
    const lab = document.createElement('label');
    lab.innerHTML = `<input type="checkbox" data-fx="${k}"> ${k}`;
    fxBox.appendChild(lab);
    const cb = lab.querySelector('input');
    cb.addEventListener('change', async () => {
      const v = cb.checked;
      const ok = await send({ cmd: 'effect', key: k, value: v }, {
        ok: `✓ EFECTO ${k.toUpperCase()} → ${v ? 'ON' : 'OFF'}`,
        apply: () => { if (!live.fx) live.fx = live.mode ? fxForMode(live.mode) : {}; live.fx[k] = v; }
      });
      if (!ok) { cb.checked = !v; renderFx(); }
    });
  });

  /* ---------- cámaras ---------- */
  const camPayload = (id, status) => ({ label: $(`#cam${id}-label`).value, status: status || $(`#cam${id}-status`).value, subject: $(`#cam${id}-subject`).value });
  const camApplied = (id, p) => () => { live.cams[id] = { label: p.label, status: p.status, subject: p.subject }; };
  [1, 2].forEach(id => {
    $(`#cam${id}-apply`).addEventListener('click', () => {
      const p = camPayload(id);
      send(Object.assign({ cmd: 'camera', id }, p), { ok: `● ${p.label} → ${p.status}`, apply: camApplied(id, p) });
    });
    $(`#cam${id}-switch`).addEventListener('click', () => {
      const p = camPayload(id);
      send(Object.assign({ cmd: 'cameraSwitch', frame: id }, p), { ok: `● ${p.label} → ${p.status} · INTERFERENCIA`, apply: camApplied(id, p) });
    });
    $(`#cam${id}-label`).addEventListener('input', renderCams);
  });
  // botones rápidos de estado (un clic: cambia el select, guarda y aplica con interferencia)
  function camQuick(id, status) {
    const sel = $(`#cam${id}-status`);
    setKept(sel, status);
    const p = camPayload(id, status);
    return send(Object.assign({ cmd: 'cameraSwitch', frame: Number(id) }, p), { ok: `● ${p.label} → ${status}`, apply: camApplied(id, p) });
  }
  $$('[data-camq]').forEach(b => b.addEventListener('click', () => {
    const [id, status] = b.dataset.camq.split(':');
    camQuick(id, status);
  }));

  /* ---------- enfoque (lo dibuja el overlay; el panel solo manda el comando) ---------- */
  const FOCUS_LABEL = { evidence: 'EVIDENCIA', cam1: 'CAM 01', cam2: 'CAM 02', none: 'NADA' };
  const focus = (target, ms) => send({ cmd: 'focus', target, ms: ms === undefined ? 6000 : ms },
    { ok: target === 'none' ? '◎ ENFOQUE QUITADO' : `◎ ENFOQUE → ${FOCUS_LABEL[target] || target}` });
  $('#ev-focus').addEventListener('click', () => focus('evidence'));
  $('#cam1-focus').addEventListener('click', () => focus('cam1'));
  $('#cam2-focus').addEventListener('click', () => focus('cam2'));

  /* ---------- show / emergencia ---------- */
  const hideAll = () => send({ cmd: 'hideAll' }, {
    ok: '■ TODO OCULTO',
    apply: () => { if (live.ev) live.ev.visible = false; if (live.lt) live.lt.visible = false; }
  });
  $('#hideall').addEventListener('click', hideAll);
  const outro = text => send({ cmd: 'outro', text }, { ok: `■ OUTRO · ${text}` });
  // los outros de EMERGENCY también piden 2 toques (están junto al botón de pánico)
  $('#outro1').addEventListener('click', () => arm('outro1', '¿OUTRO · CASO CERRADO? PULSA OTRA VEZ', () => outro('CASO CERRADO')));
  $('#outro2').addEventListener('click', () => arm('outro2', '¿OUTRO · CONTINUARÁ? PULSA OTRA VEZ', () => outro('CONTINUARÁ...')));
  $('#reset').addEventListener('click', () => send({ cmd: 'reset' }, { ok: '✓ INTRO/OUTRO QUITADOS' }));
  $('#reload').addEventListener('click', () => send({ cmd: 'reload' }, { ok: '↻ OVERLAY RECARGADO' }));

  // acciones de cierre: necesitan 2 toques en 3 s (sin diálogos nativos)
  let armed = null, armTimer = null;
  function arm(id, label, run) {
    if (armed === id) { disarm(); run(); return; }
    disarm();
    armed = id;
    toast(label, 'warn');
    renderArm();
    armTimer = setTimeout(disarm, 3000);
  }
  function disarm() { clearTimeout(armTimer); armed = null; renderArm(); }
  const ARM_BTN = { outro1: '#outro1', outro2: '#outro2' };
  function renderArm() {
    const b = $('#qa-outro');
    b.classList.toggle('armed', armed === 'outro');
    $('#qa-outro-s').textContent = armed === 'outro' ? '¡otra vez para cerrar!' : '2 toques · caso cerrado';
    Object.entries(ARM_BTN).forEach(([id, sel]) => {
      const el = $(sel);
      if (!el.dataset.label) el.dataset.label = el.textContent;
      el.classList.toggle('armed', armed === id);
      el.textContent = armed === id ? '¡OTRA VEZ PARA CONFIRMAR!' : el.dataset.label;
    });
  }

  /* ---------- evidencia ---------- */
  const evType = $('#ev-type');
  ['photo', 'image', 'profile', 'video', 'document', 'news', 'map', 'clipping', 'archive', 'capture', 'social', 'message'].forEach(t => {
    const o = document.createElement('option'); o.value = t; o.textContent = t; evType.appendChild(o);
  });
  if (saved['ev-type']) evType.value = saved['ev-type'];
  let pendingImage = null, pendingName = '';
  let airImageMem = null; // imagen al aire si vino de un archivo suelto (no se guarda: pesa mucho)
  function fileToDataURL(file, max = 1400, quality = 0.9) {
    return new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => {
        const img = new Image();
        img.onload = () => {
          const s = Math.min(1, max / Math.max(img.width, img.height));
          const c = document.createElement('canvas');
          c.width = Math.round(img.width * s);
          c.height = Math.round(img.height * s);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          res(c.toDataURL('image/jpeg', quality));
        };
        img.onerror = rej;
        img.src = fr.result;
      };
      fr.onerror = rej;
      fr.readAsDataURL(file);
    });
  }
  $('#ev-file').addEventListener('change', async e => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.type.startsWith('video/')) { log('Los videos van por ruta: cópialo a assets/evidence y escribe la ruta.', true); toast('✕ VIDEO: USA UNA RUTA (assets/evidence/…)', 'err'); return; }
    if (!f.type.startsWith('image/')) { toast('✕ ARCHIVO NO VÁLIDO', 'err'); return; }
    try { pendingImage = await fileToDataURL(f); pendingName = f.name; $('#ev-url').value = ''; log('Imagen lista: ' + f.name); toast('✓ ARCHIVO LISTO · ' + f.name, 'info'); }
    catch (err) { log('No se pudo leer la imagen', true); toast('✕ ARCHIVO NO VÁLIDO', 'err'); }
    renderEvidence();
  });
  $('#ev-url').addEventListener('input', renderEvidence);

  // Reserva el número al instante (dos clics rápidos nunca repiten número); si el envío falla lo devuelve.
  let evSending = 0; // envíos de evidencia esperando respuesta de OBS
  function sendEvidence(image, extra) {
    const number = Number($('#ev-num').value) || 1;
    setKept($('#ev-num'), number + 1);
    const type = evType.value, caption = $('#ev-caption').value;
    evSending++;
    return send({ cmd: 'evidence', image, type, number, caption, description: $('#ev-desc').value }, {
      ok: `✓ EVIDENCIA #${pad3(number)} AL AIRE`,
      apply: () => {
        live.ev = Object.assign({ num: number, type, caption, visible: true, at: Date.now() }, extra && extra.state);
        if (extra && extra.apply) extra.apply(number);
      }
    }).then(ok => {
      evSending--;
      if (!ok && Number($('#ev-num').value) === number + 1) setKept($('#ev-num'), number);
      return ok;
    });
  }
  // fuente manual (archivo suelto o ruta): mismo comportamiento que el botón original
  function showManual() {
    const url = $('#ev-url').value.trim();
    const image = pendingImage || url || null;
    const mem = pendingImage;
    const p = sendEvidence(image, { state: { src: mem ? null : url || null, bankId: null }, apply: () => { airImageMem = mem; } });
    pendingImage = null; pendingName = '';
    $('#ev-file').value = '';
    renderEvidence();
    return p;
  }
  $('#ev-show').addEventListener('click', showManual);
  $('#ev-clear').addEventListener('click', () => send({ cmd: 'evidenceClear' }, { ok: '■ EVIDENCIA OCULTA', apply: () => { if (live.ev) live.ev.visible = false; } }));

  // banco de imágenes: subir muchas de una vez, miniatura chica, clic para usarla (se pone gris)
  // tamaño moderado (820px / calidad .74): se ve bien en el marco de evidencia y rinde ~3x más liviano
  // que a resolución completa, así entran 30-50+ imágenes sin acercarse al límite del navegador.
  const BANK_KEY = 'lci-evidence-bank-v1';
  // solo entran items con forma válida (un banco corrupto no debe romper el arranque)
  const validItem = x => isObj(x) && typeof x.id === 'string' && typeof x.dataURL === 'string';
  const loadBank = () => {
    const v = readJSON(BANK_KEY);
    if (!Array.isArray(v)) return [];
    return v.filter(validItem).map(x => ({ id: x.id, dataURL: x.dataURL, used: !!x.used, name: typeof x.name === 'string' ? x.name : '', num: Number.isFinite(x.num) ? x.num : undefined }));
  };
  const trySaveBank = b => { try { localStorage.setItem(BANK_KEY, JSON.stringify(b)); return true; } catch (e) { return false; } };
  const saveBank = b => {
    if (trySaveBank(b)) return true;
    log('Banco lleno: borra algunas imágenes (Vaciar banco) o usa menos', true);
    toast('✕ BANCO LLENO · BORRA ALGUNAS IMÁGENES', 'err');
    return false;
  };
  let bank = loadBank();
  const bankBox = $('#ev-bank'), bankWrap = $('#ev-bank-wrap');
  let dragId = null; // id de la miniatura que se está arrastrando (orden manual)
  let cuedId = null; // miniatura preparada = "SIGUIENTE" (modo PREPARAR o 1.ª evidencia de un expediente)
  // COLA temporal derivada de las relaciones del expediente abierto: solo ids del banco maestro
  // (nunca copias). evQueue[0] coincide con cuedId mientras el SIGUIENTE viene de la cola.
  let evQueue = [];
  let evQueueCase = null; // id del expediente que originó la cola
  // filtro: migra el viejo checkbox "solo sin usar"
  let bankFilter = ['all', 'available', 'used'].includes(saved['ev-bank-filter']) ? saved['ev-bank-filter'] : (saved['ev-bank-onlyunused'] ? 'available' : 'all');
  let clickMode = saved['ev-clickmode'] === 'cue' ? 'cue' : 'direct';
  // inFlight: miniaturas enviadas que OBS aún no confirma (item.used se marca recién al confirmar)
  const inFlight = new Set();
  const nextBankItem = () => (cuedId && !inFlight.has(cuedId) && bank.find(b => b.id === cuedId)) || bank.find(b => !b.used && !inFlight.has(b.id)) || null;

  function sendBankItem(item) {
    if (inFlight.has(item.id)) return Promise.resolve(false);
    inFlight.add(item.id);
    // al mandar: sale de la cola y el siguiente de la cola pasa a SIGUIENTE
    const wasCued = cuedId === item.id, qIdx = evQueue.indexOf(item.id);
    evQueue = evQueue.filter(x => x !== item.id);
    if (wasCued) cuedId = evQueue[0] || null;
    return sendEvidence(item.dataURL, {
      state: { bankId: item.id, src: null },
      apply: number => { item.used = true; item.num = number; saveBank(bank); }
    }).then(ok => {
      inFlight.delete(item.id);
      if (!ok && qIdx >= 0 && !evQueue.includes(item.id)) { // falló el envío: vuelve a su lugar
        evQueue.splice(Math.min(qIdx, evQueue.length), 0, item.id);
        if (wasCued) cuedId = item.id;
      }
      renderBank();
      return ok;
    });
  }
  function evNext() {
    // E / Enter repetido mientras la anterior viaja a OBS: se ignora (una pulsación = una evidencia)
    if (evSending > 0) return Promise.resolve(false);
    const item = nextBankItem();
    if (item) return sendBankItem(item);
    if (pendingImage || $('#ev-url').value.trim()) return showManual();
    toast(bank.length ? '✕ NO QUEDAN EVIDENCIAS DISPONIBLES' : '✕ BANCO VACÍO · SUBE IMÁGENES', 'err');
    return Promise.resolve(false);
  }
  function cue(item, quiet) {
    cuedId = item ? item.id : null;
    if (!item) { evQueue = []; evQueueCase = null; } // cancelar = soltar también la cola
    else if (evQueue.includes(item.id)) evQueue = [item.id].concat(evQueue.filter(x => x !== item.id)); // subir de la cola a SIGUIENTE
    renderBank();
    if (item && !quiet) toast(`◇ PREPARADA · ${item.name || 'imagen'}`, 'info');
  }
  // ◂ ▸ del PREVIEW: recorre el archivo sin tocar el banco (salta lo que está viajando a OBS)
  function stepCandidate(d) {
    const n = bank.length;
    if (!n) { toast('✕ BANCO VACÍO · SUBE IMÁGENES', 'err'); return; }
    const cur = nextBankItem(), i = cur ? bank.indexOf(cur) : (d > 0 ? -1 : n);
    for (let k = 1; k <= n; k++) {
      const it = bank[(((i + d * k) % n) + n) % n];
      if (!inFlight.has(it.id)) { cue(it, true); return; }
    }
  }
  $('#ev-prev-cand').addEventListener('click', () => stepCandidate(-1));
  $('#ev-next-cand').addEventListener('click', () => stepCandidate(1));
  function cfDropQueue() {
    if (evQueue.includes(cuedId)) cuedId = null;
    evQueue = []; evQueueCase = null;
    renderBank();
  }
  // Prepara (NUNCA emite) las evidencias relacionadas de un expediente: la 1.ª pasa a SIGUIENTE y
  // el resto a la COLA. El banco maestro no se toca.
  function cfPrepare(item, quiet, explicit) {
    const hadQueued = evQueue.includes(cuedId);
    const onAir = id => !!(live.ev && live.ev.visible && live.ev.bankId === id);
    evQueueCase = item.id;
    evQueue = (item.relatedEvidenceIds || []).filter((id, i, a) => a.indexOf(id) === i && bank.some(b => b.id === id) && !inFlight.has(id) && !onAir(id));
    if (evQueue.length) cuedId = evQueue[0];
    else if (hadQueued) cuedId = null;
    renderBank();
    if (quiet) return;
    if (evQueue.length) {
      const first = bank.find(b => b.id === evQueue[0]);
      toast(`◇ EXP #${pad3(item.num)} · SIGUIENTE: ${(first && first.name) || 'imagen'}${evQueue.length > 1 ? ` · COLA ${evQueue.length - 1}` : ''}`, 'info');
      activity(`EXP #${pad3(item.num)} → ${evQueue.length} evidencia(s) preparada(s)`, 'info');
    } else if (explicit) toast('👁 LEÍDO · SIN EVIDENCIA PARA PREPARAR', 'info');
  }
  $('#ev-uncue').addEventListener('click', () => cue(null));
  $('#ev-queue-clear').addEventListener('click', () => cue(null));

  let lastThumbClick = { id: null, at: 0 };
  // renderBank reconstruye las miniaturas: devuelve el foco a la misma (navegación por teclado)
  const focusThumb = id => { const el = [...bankBox.querySelectorAll('.thumb')].find(x => x.dataset.id === id); if (el) el.focus(); };
  function renderBank() {
    bankBox.innerHTML = '';
    const used = bank.filter(b => b.used).length, avail = bank.length - used;
    $('#ev-bank-count').textContent = bank.length ? `${avail} DISPONIBLES / ${bank.length} TOTAL` : 'VACÍO';
    $('#ev-f-all').textContent = bank.length; $('#ev-f-available').textContent = avail; $('#ev-f-used').textContent = used;
    $$('#ev-filter [data-filter]').forEach(b => b.classList.toggle('on', b.dataset.filter === bankFilter));
    $$('#ev-clickmode [data-clickmode]').forEach(b => b.classList.toggle('on', b.dataset.clickmode === clickMode));
    evQueue = evQueue.filter(id => bank.some(b => b.id === id)); // borrada del banco: sale de la cola
    if (cuedId && !bank.some(b => b.id === cuedId)) cuedId = evQueue[0] || null;
    const q = norm($('#ev-bank-search').value);
    const next = nextBankItem();
    // el orden es el que tú armes arrastrando; el filtro solo esconde, no reordena.
    const list = bank.map((item, i) => ({ item, pos: i + 1 })).filter(({ item }) =>
      (bankFilter === 'all' || (bankFilter === 'available' ? !item.used : item.used)) && (!q || norm(item.name).includes(q)));
    if (!list.length) {
      const msg = !bank.length ? 'Sin imágenes todavía. Usa "+ SUBIR IMÁGENES" o arrastra varias aquí.'
        : q ? 'Ninguna coincide con la búsqueda.'
        : bankFilter === 'available' ? 'Todas están usadas (cambia a TODAS o rehabilita las usadas).' : 'Ninguna usada todavía.';
      bankBox.innerHTML = `<div class="bank-empty">${msg}</div>`;
      renderEvidence();
      return;
    }
    list.forEach(({ item, pos }) => {
      const t = document.createElement('div');
      const isAir = live.ev && live.ev.visible && live.ev.bankId === item.id;
      t.dataset.id = item.id;
      t.className = 'thumb' + (item.used ? ' used' : '') + (item.id === cuedId ? ' cued' : '') + (next && next.id === item.id ? ' next' : '') + (isAir ? ' air' : '');
      t.title = (item.name || '') + (item.used ? ` · usada como #${pad3(item.num || 0)}` : '') + (clickMode === 'cue' ? ' · clic = preparar, doble clic = al aire' : ' · clic = al aire');
      t.draggable = true;
      t.tabIndex = 0;
      t.setAttribute('role', 'button');
      t.setAttribute('aria-label', `Evidencia ${pos}: ${item.name || 'imagen'}` + (item.used ? ' (usada)' : ''));
      t.innerHTML = `<img src="${esc(item.dataURL)}" alt=""><span class="num">${item.used && item.num ? '#' + pad3(item.num) : String(pos).padStart(2, '0')}</span><button type="button" class="x" title="Borrar del banco" aria-label="Borrar del banco">×</button>`;
      t.querySelector('.x').addEventListener('click', ev => {
        ev.stopPropagation();
        if (!confirm(`¿Borrar "${item.name || 'esta imagen'}" del banco?`)) return;
        bank = bank.filter(b => b.id !== item.id);
        saveBank(bank);
        renderBank();
        toast('✓ IMAGEN BORRADA DEL BANCO', 'info');
      });
      t.addEventListener('click', () => {
        const now = Date.now();
        const dbl = lastThumbClick.id === item.id && now - lastThumbClick.at < 400;
        // tras detectar un doble clic se reinicia: un triple clic NO cuenta como segundo doble clic
        lastThumbClick = dbl ? { id: null, at: 0 } : { id: item.id, at: now };
        if (clickMode === 'cue') { if (dbl) sendBankItem(item); else cue(item); return; }
        if (dbl) return; // en modo directo un doble clic NO manda dos evidencias
        sendBankItem(item);
      });
      // teclado: Enter/Espacio respetan el modo (AL AIRE = manda; PREPARAR = prepara, y otra vez = manda)
      t.addEventListener('keydown', ev => {
        if (ev.target !== t || (ev.key !== 'Enter' && ev.key !== ' ') || ev.repeat) return;
        ev.preventDefault(); ev.stopPropagation();
        if (clickMode === 'cue' && cuedId !== item.id) { cue(item); focusThumb(item.id); return; }
        sendBankItem(item);
      });
      // orden manual: arrastrar una miniatura y soltarla sobre otra la mueve a ese lugar
      t.addEventListener('dragstart', e => { dragId = item.id; t.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', item.id); } catch (err) { /* algunos navegadores lo exigen igual */ } });
      t.addEventListener('dragend', () => { t.classList.remove('dragging'); bankBox.querySelectorAll('.thumb').forEach(x => x.classList.remove('drag-over')); dragId = null; });
      t.addEventListener('dragover', e => { if (!dragId || dragId === item.id) return; e.preventDefault(); e.stopPropagation(); t.classList.add('drag-over'); });
      t.addEventListener('dragleave', () => t.classList.remove('drag-over'));
      t.addEventListener('drop', e => {
        if (!dragId || dragId === item.id) return;
        e.preventDefault();
        e.stopPropagation();
        t.classList.remove('drag-over');
        const from = bank.findIndex(b => b.id === dragId);
        if (from < 0) return;
        const [moved] = bank.splice(from, 1);
        const to = bank.findIndex(b => b.id === item.id);
        const rect = t.getBoundingClientRect();
        const after = (e.clientX - rect.left) > rect.width / 2;
        bank.splice(after ? to + 1 : to, 0, moved);
        saveBank(bank);
        renderBank();
      });
      bankBox.appendChild(t);
    });
    renderEvidence();
  }
  $$('#ev-filter [data-filter]').forEach(b => b.addEventListener('click', () => { bankFilter = b.dataset.filter; keep('ev-bank-filter', bankFilter); renderBank(); }));
  $$('#ev-clickmode [data-clickmode]').forEach(b => b.addEventListener('click', () => {
    clickMode = b.dataset.clickmode; keep('ev-clickmode', clickMode);
    if (clickMode === 'direct') { cuedId = null; evQueue = []; evQueueCase = null; }
    renderBank();
  }));
  $('#ev-bank-search').addEventListener('input', renderBank);
  async function addFilesToBank(fileList) {
    const all = [...fileList];
    const files = all.filter(f => f.type.startsWith('image/'));
    if (!files.length) { toast('✕ ARCHIVO NO VÁLIDO · SOLO IMÁGENES', 'err'); return; }
    const before = bank.length;
    let read = 0;
    for (const f of files) {
      try {
        const dataURL = await fileToDataURL(f, 820, 0.74);
        bank.push({ id: 'b' + Date.now() + Math.random().toString(36).slice(2, 7), dataURL, used: false, name: f.name });
        read++;
      } catch (err) { /* imagen ilegible: se salta */ }
    }
    // si no entra todo en el almacenamiento, se quitan del lote (de la última hacia atrás) las que
    // no caben: así nunca quedan imágenes "fantasma" solo en memoria que se pierden al recargar.
    let dropped = 0;
    while (!trySaveBank(bank) && bank.length > before) { bank.pop(); dropped++; }
    const added = read - dropped;
    renderBank();
    if (added > 0) {
      log(`Agregadas ${added} imagen(es) al banco (total ${bank.length})`);
      toast(`✓ ${added} EVIDENCIA(S) AÑADIDA(S) AL ARCHIVO`, 'ok');
      activity(`+ ${added} imagen(es) al archivo (total ${bank.length})`, 'info');
    }
    if (dropped) {
      log(`Banco lleno: ${dropped} imagen(es) no entraron`, true);
      toast(`✕ BANCO LLENO · ${dropped} IMAGEN(ES) NO ENTRARON`, 'err');
      activity(`✕ Banco lleno: ${dropped} imagen(es) no entraron`, 'err');
    }
    if (all.length > read) toast(`✕ ${all.length - read} ARCHIVO(S) NO VÁLIDO(S)`, 'err');
  }
  $('#ev-bank-add').addEventListener('change', e => { addFilesToBank(e.target.files); e.target.value = ''; });
  $('#ev-bank-clear').addEventListener('click', () => {
    if (!bank.length) return;
    if (confirm(`¿Vaciar todo el banco de imágenes? (${bank.length} imágenes, no se puede deshacer)`)) { bank = []; cuedId = null; evQueue = []; evQueueCase = null; saveBank(bank); renderBank(); toast('✓ BANCO VACIADO', 'info'); activity('Banco vaciado', 'info'); }
  });
  $('#ev-bank-reset').addEventListener('click', () => {
    const n = bank.filter(b => b.used).length;
    if (!n) { toast('NO HAY USADAS', 'info'); return; }
    bank.forEach(b => { b.used = false; delete b.num; });
    saveBank(bank); renderBank();
    toast(`✓ ${n} EVIDENCIA(S) DISPONIBLES OTRA VEZ`, 'info');
  });
  // arrastrar y soltar imágenes directo sobre el archivo (los arrastres internos solo reordenan)
  const isFileDrag = e => !dragId && e.dataTransfer && [...(e.dataTransfer.types || [])].includes('Files');
  ['dragenter', 'dragover'].forEach(ev => bankWrap.addEventListener(ev, e => { if (!isFileDrag(e)) return; e.preventDefault(); bankWrap.classList.add('drag'); }));
  bankWrap.addEventListener('dragleave', e => { if (!bankWrap.contains(e.relatedTarget)) bankWrap.classList.remove('drag'); });
  bankWrap.addEventListener('drop', e => {
    bankWrap.classList.remove('drag');
    if (dragId) return;
    e.preventDefault();
    if (e.dataTransfer && e.dataTransfer.files.length) addFilesToBank(e.dataTransfer.files);
  });
  // si sueltan un archivo fuera del archivo de evidencias, que el dock NO navegue a la imagen
  ['dragover', 'drop'].forEach(ev => window.addEventListener(ev, e => { if (!dragId && e.dataTransfer && [...(e.dataTransfer.types || [])].includes('Files')) e.preventDefault(); }));
  // si renderBank reconstruyó las miniaturas a mitad de un arrastre, el dragend de la miniatura
  // original no llega: se limpia igual aquí para que dragId no quede atascado
  ['drop', 'dragend'].forEach(ev => window.addEventListener(ev, () => { dragId = null; bankWrap.classList.remove('drag'); }));

  /* ---------- audio: volumen/mute en vivo + ducking + botones de prueba ---------- */
  const sndEnabled = $('#snd-enabled'), sndVolume = $('#snd-volume'), sndVolumeVal = $('#snd-volume-val');
  if (live.sound) { C.sound.enabled = !!live.sound.enabled; C.sound.volume = Number(live.sound.volume); } // último enviado
  sndEnabled.checked = !!C.sound.enabled;
  sndVolume.value = C.sound.volume;
  sndVolumeVal.textContent = Math.round(C.sound.volume * 100) + '%';
  const soundState = () => ({ enabled: C.sound.enabled, volume: C.sound.volume, amb: live.sound && live.sound.amb });
  sndEnabled.addEventListener('change', () => {
    const v = sndEnabled.checked;
    send({ cmd: 'sound', enabled: v }, { ok: `♪ SFX → ${v ? 'ON' : 'OFF'}`, apply: () => { C.sound.enabled = v; live.sound = soundState(); } })
      .then(ok => { if (!ok) sndEnabled.checked = !v; renderAudioSummary(); });
  });
  sndVolume.addEventListener('input', () => { sndVolumeVal.textContent = Math.round(sndVolume.value * 100) + '%'; });
  sndVolume.addEventListener('change', () => {
    const v = Number(sndVolume.value);
    send({ cmd: 'sound', volume: v }, { ok: `♪ VOLUMEN → ${Math.round(v * 100)}%`, apply: () => { C.sound.volume = v; live.sound = soundState(); } });
  });

  // ambiente (room tone del overlay). Valor inicial = último enviado desde el panel; si nunca se
  // mandó, los valores por defecto del overlay (apagado, 0.18).
  const ambEnabled = $('#amb-enabled'), ambVolume = $('#amb-volume'), ambVolumeVal = $('#amb-volume-val');
  const amb = Object.assign({ ambient: false, ambientVolume: 0.18 }, (live.sound && live.sound.amb) || {});
  ambEnabled.checked = !!amb.ambient;
  ambVolume.value = amb.ambientVolume;
  ambVolumeVal.textContent = Math.round(amb.ambientVolume * 100) + '%';
  const saveAmb = () => { live.sound = Object.assign(live.sound || soundState(), { amb: { ambient: amb.ambient, ambientVolume: amb.ambientVolume } }); };
  ambEnabled.addEventListener('change', () => {
    const v = ambEnabled.checked;
    send({ cmd: 'sound', ambient: v, ambientVolume: amb.ambientVolume }, { ok: `♪ AMBIENTE → ${v ? 'ON' : 'OFF'}`, apply: () => { amb.ambient = v; saveAmb(); } })
      .then(ok => { if (!ok) ambEnabled.checked = !v; renderAudioSummary(); });
  });
  ambVolume.addEventListener('input', () => { ambVolumeVal.textContent = Math.round(ambVolume.value * 100) + '%'; });
  ambVolume.addEventListener('change', () => {
    const v = Number(ambVolume.value);
    send({ cmd: 'sound', ambientVolume: v }, { ok: `♪ AMBIENTE → ${Math.round(v * 100)}%`, apply: () => { amb.ambientVolume = v; saveAmb(); } });
  });

  const sndTests = $('#snd-tests');
  Object.keys(C.sound.files || {}).forEach(name => {
    const b = document.createElement('button');
    b.textContent = name;
    b.addEventListener('click', () => obs.emit({ cmd: 'testSound', name }).then(() => log('→ probar sonido · ' + name), e => { log(e.message, true); toast('✕ ' + errText(e), 'err'); }));
    sndTests.appendChild(b);
  });

  // ducking: lo guardado en el panel manda; si no hay nada guardado, config.js
  const duckEnabled = $('#duck-enabled'), duckAmount = $('#duck-amount'), duckHold = $('#duck-hold');
  if (saved['duck-enabled'] !== undefined) C.sound.duck.enabled = !!saved['duck-enabled'];
  if (saved['duck-amount'] !== undefined) C.sound.duck.amountDb = Number(saved['duck-amount']) || -14;
  if (saved['duck-hold'] !== undefined) C.sound.duck.holdMs = Number(saved['duck-hold']) || 700;
  if (Array.isArray(saved['duck-inputs'])) C.sound.duck.inputs = saved['duck-inputs'].filter(x => typeof x === 'string');
  if (!Array.isArray(C.sound.duck.inputs)) C.sound.duck.inputs = [];
  duckEnabled.checked = !!C.sound.duck.enabled;
  duckAmount.value = C.sound.duck.amountDb;
  duckHold.value = C.sound.duck.holdMs;
  duckEnabled.addEventListener('change', () => { C.sound.duck.enabled = duckEnabled.checked; renderAudioSummary(); });
  duckAmount.addEventListener('change', () => { C.sound.duck.amountDb = Number(duckAmount.value) || -14; });
  duckHold.addEventListener('change', () => { C.sound.duck.holdMs = Number(duckHold.value) || 700; });
  $('#duck-test').addEventListener('click', () => {
    if (!obs.connected) { toast('✕ OBS OFFLINE · NO SE PUEDE PROBAR', 'err'); return; }
    if (!(C.sound.duck.inputs || []).length) { toast('✕ ELIGE AL MENOS UNA FUENTE', 'err'); return; }
    const was = C.sound.duck.enabled;
    C.sound.duck.enabled = true;
    duckAudio().finally(() => { C.sound.duck.enabled = was; });
    log(`Probando ducking: baja ahora, sube en ~${Number(duckHold.value) || 700} ms`);
    toast('♪ PROBANDO DUCKING', 'info');
  });

  /* ---------- lower third ---------- */
  const ltData = () => ({ label: $('#lt-label').value, number: Number($('#lt-num').value) || 1, name: $('#lt-name').value, role: $('#lt-role').value });
  const ltShow = () => {
    const d = ltData();
    return send(Object.assign({ cmd: 'lowerThird' }, d), { ok: `✓ LOWER THIRD · ${d.name || d.label}`, apply: () => { live.lt = Object.assign({ visible: true }, d); } });
  };
  const ltHide = () => send({ cmd: 'lowerThirdHide' }, { ok: '■ LOWER THIRD OCULTO', apply: () => { live.lt = Object.assign({}, live.lt || {}, { visible: false }); } });
  $('#lt-show').addEventListener('click', ltShow);
  $('#lt-hide').addEventListener('click', ltHide);
  ['#lt-label', '#lt-num', '#lt-name', '#lt-role'].forEach(s => $(s).addEventListener('input', renderLtPreview));

  /* ---------- alertas, sellos, transiciones ---------- */
  const ALERTS = ['NUEVA EVIDENCIA', 'NUEVA PISTA', 'ATENCIÓN', 'CASO ABIERTO', 'ARCHIVO ENCONTRADO', 'TESTIMONIO', 'NUEVA INFORMACIÓN', 'ÚLTIMA HORA'];
  const CRITICAL = new Set(['ÚLTIMA HORA', 'CASO ABIERTO', 'ATENCIÓN']);
  const STAMPS = ['CASO ABIERTO', 'CONFIDENCIAL', 'EVIDENCIA', 'VERIFICADO', 'PENDIENTE', 'ARCHIVADO', 'EN INVESTIGACIÓN'];
  // destello breve en el botón que SÍ se envió (antes quedaba marcado para siempre, aun sin haber enviado nada)
  const flashAlert = t => {
    const b = document.querySelector(`#alerts [data-alert="${t}"]`);
    if (b) { b.classList.add('fired'); setTimeout(() => b.classList.remove('fired'), 700); }
  };
  const fireAlert = t => send({ cmd: 'alert', text: t }, { ok: `${CRITICAL.has(t) ? '▲' : '⚠'} ALERTA · ${t}`, apply: () => { live.lastAlert = t; flashAlert(t); } });
  const fireStamp = t => send({ cmd: 'stamp', text: t }, { ok: `✓ SELLO · ${t}` });
  const fireTransition = n => send({ cmd: 'transition', name: n }, { ok: `✓ TRANSICIÓN → ${n.toUpperCase()}` });
  ALERTS.forEach(t => {
    const b = document.createElement('button');
    b.textContent = t; b.dataset.alert = t;
    if (CRITICAL.has(t)) b.className = 'crit';
    b.addEventListener('click', () => fireAlert(t));
    $('#alerts').appendChild(b);
  });
  STAMPS.forEach(t => {
    const b = document.createElement('button');
    b.textContent = t;
    b.addEventListener('click', () => fireStamp(t));
    $('#stamps').appendChild(b);
  });
  const allTr = Object.keys(C.transitionTimings);
  const currentTr = () => (trSel.value && trSel.value !== 'none' ? trSel.value : 'tape');

  /* =====================================================================================
     ACCIONES: un registro único que usan los tiles, los atajos y la paleta (Ctrl+K).
     Es la base para presets/macros/favoritos: una macro = lista de ids de este registro.
     ===================================================================================== */
  const ACTIONS = [];
  const ACT = {};
  const act = (id, group, label, run, key) => { const a = { id, group, label, run, key }; ACTIONS.push(a); ACT[id] = a; };
  // CANDADO: bloquea botones y atajos (excepto OCULTAR TODO y el propio candado) para no tocar nada sin querer
  let panelLocked = false;
  const LOCKABLE = '.cdeck-body, .ev-row, #card-lt, #card-cams, #card-emergency .emerg-row, .nowbar';
  function setLocked(on) {
    panelLocked = on;
    document.body.classList.toggle('is-locked', on);
    $$(LOCKABLE).forEach(el => { if (on) el.setAttribute('inert', ''); else el.removeAttribute('inert'); });
    $('#lock-banner').hidden = !on;
    const b = $('#panel-lock');
    b.innerHTML = (on ? '🔒 DESBLOQUEAR ' : '🔓 BLOQUEAR ') + '<kbd data-kbd="panel-lock"></kbd>';
    b.classList.toggle('on', on);
    if (typeof syncKbd === 'function') syncKbd(b);
    if (on && typeof trPopSet === 'function') trPopSet(false);
    toast(on ? '🔒 PANEL BLOQUEADO' : '🔓 PANEL DESBLOQUEADO', on ? 'info' : 'ok');
  }
  $('#panel-lock').addEventListener('click', () => setLocked(!panelLocked));
  const runAction = id => { const a = ACT[id]; if (!a) return; if (panelLocked && id !== 'hideall' && id !== 'panel-lock') return; a.run(); };
  // solo las escenas con botón en el panel (las verticales V01-V04 las maneja Aitum Vertical)
  Object.keys(C.scenes).filter(k => document.querySelector(`[data-scene="${k}"]`)).forEach((k, i) => act('scene-' + (i + 1), 'ESCENA', sceneLabel(k), () => goScene(k), i < 9 ? String(i + 1) : null));
  act('ev-next', 'EVIDENCIA', 'Mostrar siguiente evidencia', evNext, 'E');
  act('ev-hide', 'EVIDENCIA', 'Ocultar evidencia', () => $('#ev-clear').click());
  act('ev-manual', 'EVIDENCIA', 'Mostrar desde archivo / ruta', showManual);
  act('ev-search', 'EVIDENCIA', 'Buscar en el archivo de evidencias', () => { const s = $('#ev-bank-search'); s.scrollIntoView({ block: 'center' }); s.focus(); });
  act('mode-investigation', 'MODO', 'Investigation mode', () => setMode('investigation'), 'I');
  act('mode-clean', 'MODO', 'Clean mode', () => setMode('clean'), 'C');
  act('lt-toggle', 'LOWER THIRD', 'Mostrar / ocultar lower third', () => (live.lt && live.lt.visible ? ltHide() : ltShow()), 'L');
  act('lt-show', 'LOWER THIRD', 'Mostrar lower third', ltShow);
  act('lt-hide', 'LOWER THIRD', 'Ocultar lower third', ltHide);
  act('alert-last', 'ALERTA', 'Repetir última alerta', () => fireAlert(live.lastAlert || 'NUEVA EVIDENCIA'), 'A');
  ALERTS.forEach(t => act('alert:' + t, 'ALERTA', t, () => fireAlert(t)));
  STAMPS.forEach(t => act('stamp:' + t, 'SELLO', t, () => fireStamp(t)));
  act('tr-run', 'TRANSICIÓN', 'Lanzar la transición elegida', () => fireTransition(currentTr()), 'T');
  allTr.forEach(n => act('tr:' + n, 'TRANSICIÓN', n, () => fireTransition(n)));
  [1, 2].forEach(id => ['REC', 'LIVE', 'WAITING', 'OFFLINE'].forEach(st => act(`cam${id}:${st}`, 'CÁMARA', `CAM 0${id} → ${st}`, () => camQuick(id, st))));
  [1, 2].forEach(id => act(`cam${id}:switch`, 'CÁMARA', `CAM 0${id} · aplicar con interferencia`, () => $(`#cam${id}-switch`).click()));
  act('focus:evidence', 'ENFOQUE', 'Enfocar evidencia (6 s)', () => focus('evidence'));
  act('focus:cam1', 'ENFOQUE', 'Enfocar CAM 01 (6 s)', () => focus('cam1'));
  act('focus:cam2', 'ENFOQUE', 'Enfocar CAM 02 (6 s)', () => focus('cam2'));
  act('focus:none', 'ENFOQUE', 'Quitar enfoque', () => focus('none', 0));
  act('ambient-toggle', 'AUDIO', 'Ambiente on / off', () => { ambEnabled.checked = !ambEnabled.checked; ambEnabled.dispatchEvent(new Event('change')); });
  act('intro', 'SHOW', 'Intro', () => send({ cmd: 'intro' }, { ok: '▶ INTRO' }));
  act('outro-arm', 'SHOW', 'Outro · caso cerrado (2 toques)', () => arm('outro', '¿CERRAR EL CASO? PULSA OTRA VEZ', () => outro('CASO CERRADO')), 'O');
  act('outro-cont', 'SHOW', 'Outro · continuará (2 toques)', () => arm('outro2', '¿OUTRO · CONTINUARÁ? PULSA OTRA VEZ', () => outro('CONTINUARÁ...')));
  act('reset', 'SHOW', 'Quitar intro / outro', () => $('#reset').click());
  act('tr-prev', 'TRANSICIÓN', 'Transición anterior (la de cambio de escena)', () => trStep(-1));
  act('tr-next', 'TRANSICIÓN', 'Transición siguiente (la de cambio de escena)', () => trStep(1));
  act('panel-lock', 'PANEL', 'Bloquear / desbloquear el panel', () => setLocked(!panelLocked), 'Ctrl+Shift+L');
  act('hideall', 'EMERGENCIA', 'Ocultar todo (pánico)', hideAll);
  act('sound-toggle', 'AUDIO', 'Sonidos on / off', () => { sndEnabled.checked = !sndEnabled.checked; sndEnabled.dispatchEvent(new Event('change')); });
  act('duck-test', 'AUDIO', 'Probar ducking', () => $('#duck-test').click());
  act('reconnect', 'OBS', 'Reconectar a OBS', () => connect(true));
  act('reload', 'OBS', 'Recargar overlay', () => $('#reload').click());
  $$('[data-act]').forEach(b => b.addEventListener('click', () => runAction(b.dataset.act)));

  /* =====================================================================================
     ATAJOS DE TECLADO: personalizables (como en un editor de video). Cada acción del registro
     ACTIONS trae una tecla de fábrica; el operador la cambia, quita o restablece desde ⌨ ATAJOS.
     Una tecla = una combinación canónica: "E", "F8", "Ctrl+Shift+A"… Se guardan solo las diferencias.
     ===================================================================================== */
  const KM_KEY = 'lci-keymap-v1';
  let kmOver = (() => { const v = readJSON(KM_KEY); return isObj(v) ? v : {}; })(); // { idAcción: combo | '' }
  const saveKm = () => { try { localStorage.setItem(KM_KEY, JSON.stringify(kmOver)); } catch (e) { toast('✕ NO PUDE GUARDAR LOS ATAJOS', 'err'); } };
  const KEYMAP = {}; // combo → id de acción (se reconstruye al cambiar)
  const keyOf = a => (a.id in kmOver ? kmOver[a.id] : (a.key || ''));
  function rebuildKeymap() {
    Object.keys(KEYMAP).forEach(k => delete KEYMAP[k]);
    ACTIONS.forEach(a => { const k = keyOf(a); if (k) KEYMAP[k] = a.id; });
  }
  rebuildKeymap();
  // teclas que el sistema o el navegador ya usan: no se pueden reasignar
  const KEY_RESERVED = new Set(['Escape', 'Enter', 'Tab', 'Backspace', 'Delete', 'Space', '?', 'F5', 'F11', 'F12', 'Ctrl+K', 'Ctrl+R', 'Ctrl+W', 'Ctrl+T', 'Ctrl+N', 'Ctrl+L', 'Ctrl+F5', 'Ctrl+Shift+I', 'Ctrl+Shift+J', 'Ctrl+Shift+C', 'Ctrl+Shift+R', 'Alt+F4', 'Alt+Left', 'Alt+Right']);
  const MODIFIER_ONLY = /^(Shift|Control|Alt|Meta|AltGraph|CapsLock|Dead|Unidentified)$/;
  // combinación canónica de un evento; null si solo es un modificador
  function comboFromEvent(e) {
    const k = e.key;
    if (!k || MODIFIER_ONLY.test(k)) return null;
    const key = k === ' ' ? 'Space' : k.length === 1 ? k.toUpperCase() : k.replace(/^Arrow/, '');
    const mods = [];
    if (e.ctrlKey) mods.push('Ctrl');
    if (e.altKey) mods.push('Alt');
    if (e.shiftKey && !(k.length === 1 && !/[a-z]/i.test(k))) mods.push('Shift'); // en símbolos (?, !) el Shift ya va en la tecla
    if (e.metaKey) mods.push('Meta');
    return mods.concat(key).join('+');
  }
  const normCombo = k => (typeof k === 'string' && k.length === 1 ? k.toUpperCase() : (k || ''));
  const comboLabel = c => String(c || '').replace('Left', '←').replace('Right', '→').replace('Up', '↑').replace('Down', '↓');
  // ¿quién tiene esta combinación? self = { kind: 'act' | 'cb', id } para no chocar consigo mismo
  function keyOwner(combo, self) {
    if (!combo) return null;
    if (KEY_RESERVED.has(combo)) return { reserved: true, label: 'reservada para el sistema' };
    const aid = KEYMAP[combo];
    if (aid && !(self && self.kind === 'act' && self.id === aid)) return { kind: 'act', id: aid, label: ACT[aid].label };
    const cb = cbList.find(b => b.key === combo && !(self && self.kind === 'cb' && self.id === b.id));
    return cb ? { kind: 'cb', id: cb.id, label: `botón "${cb.name}"` } : null;
  }
  const kbdText = id => { const a = ACT[id]; return a ? comboLabel(keyOf(a)) : ''; };
  // todos los <kbd data-kbd="idAcción"> de la interfaz muestran la tecla vigente
  function syncKbd(root) {
    $$('kbd[data-kbd]', root).forEach(k => { const t = kbdText(k.dataset.kbd); k.textContent = t; k.hidden = !t; });
  }
  const isTyping = el => !!el && (el.isContentEditable || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' ||
    (el.tagName === 'INPUT' && !/^(checkbox|radio|range|button|submit|file)$/i.test(el.type)));
  const kmOpen = () => !$('#km-modal').hidden;
  document.addEventListener('keydown', e => {
    const k = e.key;
    if ((e.ctrlKey || e.metaKey) && !e.altKey && k.toLowerCase() === 'k') { e.preventDefault(); palOpen() ? palClose() : palShow(); return; }
    if (k === 'Escape') {
      if (palOpen()) { palClose(); return; }
      if (!$('#cb-modal').hidden) { $('#cb-modal').hidden = true; return; }
      if (kmOpen()) { kmClose(); return; }
      if (!$('#cf-modal').hidden) { cfCloseEditor(); return; }
      if (macroRun) { macroRun.cancelled = true; toast('MACRO CANCELADA', 'info'); return; }
      if (trPopOpen()) { trPopSet(false); return; }
      if (panelLocked) return;
      if (armed) { disarm(); toast('CANCELADO', 'info'); return; }
      if (isTyping(document.activeElement)) { document.activeElement.blur(); return; }
      if (cuedId) { cue(null); return; }
      return;
    }
    if (palOpen() || kmOpen() || !$('#cb-modal').hidden) return;
    if (isTyping(document.activeElement) || e.repeat) return;
    if (panelLocked) { // con candado solo se atiende desbloquear y el pánico
      const c = comboFromEvent(e);
      if (c && (KEYMAP[c] === 'panel-lock' || KEYMAP[c] === 'hideall')) { e.preventDefault(); runAction(KEYMAP[c]); }
      return;
    }
    if (k === '?') { e.preventDefault(); kmShow(); return; }
    if (k === 'Enter' && !e.ctrlKey && !e.metaKey && !e.altKey && cuedId && document.activeElement === document.body) { e.preventDefault(); runAction('ev-next'); return; }
    const combo = comboFromEvent(e);
    if (!combo) return;
    const cb = cbList.find(b => b.key === combo);
    if (cb) { e.preventDefault(); runCustom(cb); return; }
    const id = KEYMAP[combo];
    if (!id) return; // sin atajo: no se toca (los atajos del navegador siguen funcionando)
    e.preventDefault();
    runAction(id);
    const tile = document.querySelector(`[data-act="${id}"]`);
    if (tile) { tile.classList.add('fired'); setTimeout(() => tile.classList.remove('fired'), 220); }
  });

  /* ---------- editor de atajos (⌨ ATAJOS / tecla ?) ---------- */
  const kmModal = $('#km-modal'), kmList = $('#km-list'), kmSearch = $('#km-search'), kmGroup = $('#km-group'), kmAssigned = $('#km-assigned');
  let kmListening = null; // { row, btn } mientras se espera la nueva tecla
  const kmRows = () => ACTIONS.map(a => ({ kind: 'act', id: a.id, group: a.group, label: a.label, key: keyOf(a), def: a.key || '' }))
    .concat(cbList.map(b => ({ kind: 'cb', id: b.id, group: 'PERSONALIZADO', label: b.name, key: b.key, def: '' })));
  function kmFillGroups() {
    const groups = [...new Set(kmRows().map(r => r.group))];
    const cur = kmGroup.value;
    kmGroup.innerHTML = '<option value="">TODOS LOS TIPOS</option>' + groups.map(g => `<option>${esc(g)}</option>`).join('');
    kmGroup.value = groups.includes(cur) ? cur : '';
  }
  function kmRender() {
    const toks = norm(kmSearch.value).split(/\s+/).filter(Boolean);
    const rows = kmRows().filter(r => (!kmGroup.value || r.group === kmGroup.value) && (!kmAssigned.checked || r.key) &&
      toks.every(t => norm(r.group + ' ' + r.label + ' ' + r.key).includes(t)));
    kmList.innerHTML = '';
    if (!rows.length) { kmList.innerHTML = '<div class="bank-empty">Nada coincide.</div>'; }
    let lastGroup = null;
    rows.forEach(r => {
      if (r.group !== lastGroup) { lastGroup = r.group; kmList.insertAdjacentHTML('beforeend', `<div class="km-g">${esc(r.group)}</div>`); }
      const row = document.createElement('div');
      row.className = 'km-row' + (r.key !== r.def && r.kind === 'act' ? ' km-row--custom' : '');
      row.innerHTML = '<span class="km-l"></span><button type="button" class="km-key" title="Clic y pulsa la nueva combinación"></button>' +
        '<button type="button" class="btn--sm btn--ghost km-x" title="Quitar el atajo">✕</button>' +
        `<button type="button" class="btn--sm btn--ghost km-reset" title="Volver al de fábrica${r.def ? ' (' + esc(comboLabel(r.def)) + ')' : ' (ninguno)'}" ${r.kind === 'cb' || r.key === r.def ? 'disabled' : ''}>↺</button>`;
      row.querySelector('.km-l').textContent = r.label;
      const btn = row.querySelector('.km-key');
      btn.textContent = r.key ? comboLabel(r.key) : 'sin atajo';
      btn.classList.toggle('km-key--empty', !r.key);
      btn.addEventListener('click', () => kmListen(r, btn));
      row.querySelector('.km-x').disabled = !r.key;
      row.querySelector('.km-x').addEventListener('click', () => kmAssign(r, ''));
      row.querySelector('.km-reset').addEventListener('click', () => kmAssign(r, r.def));
      kmList.appendChild(row);
    });
  }
  function kmListen(row, btn) {
    kmStopListen();
    kmListening = { row, btn };
    btn.classList.add('km-key--listen');
    btn.textContent = 'PULSA UNA TECLA…';
  }
  function kmStopListen() {
    if (!kmListening) return;
    kmListening = null;
    kmRender();
  }
  // asigna (o quita, con '') una combinación; si ya era de otra acción, pregunta antes de quitársela
  function kmAssign(row, combo) {
    if (combo) {
      const owner = keyOwner(combo, row);
      if (owner && owner.reserved) { toast(`✕ ${comboLabel(combo)} ESTÁ ${owner.label.toUpperCase()}`, 'err'); return false; }
      if (owner) {
        if (!confirm(`${comboLabel(combo)} ya es de: ${owner.label}.\n¿Quitársela y asignarla aquí?`)) return false;
        if (owner.kind === 'act') kmOver[owner.id] = '';
        else { const b = cbList.find(x => x.id === owner.id); if (b) b.key = ''; saveCb(); }
      }
    }
    if (row.kind === 'cb') { const b = cbList.find(x => x.id === row.id); if (b) b.key = combo; saveCb(); renderCustom(); }
    else if (combo === row.def) delete kmOver[row.id]; // vuelve al de fábrica: no hace falta guardar nada
    else kmOver[row.id] = combo;
    saveKm(); rebuildKeymap(); syncKbd(); kmListening = null; kmRender();
    return true;
  }
  // captura global (fase de captura): mientras se escucha, la tecla pulsada NO dispara nada más
  window.addEventListener('keydown', e => {
    if (!kmListening) return;
    e.preventDefault(); e.stopPropagation();
    if (e.key === 'Escape') { kmStopListen(); return; }
    if (e.key === 'Backspace' || e.key === 'Delete') { kmAssign(kmListening.row, ''); return; }
    const combo = comboFromEvent(e);
    if (!combo) return; // solo un modificador: sigue esperando
    kmAssign(kmListening.row, combo);
  }, true);
  function kmShow() { kmFillGroups(); kmSearch.value = ''; kmAssigned.checked = false; kmRender(); kmFixed(); kmModal.hidden = false; kmSearch.focus(); }
  function kmClose() { kmListening = null; kmModal.hidden = true; }
  function kmFixed() {
    $('#km-fixed').innerHTML = [['ENTER', 'Mandar al aire la evidencia en SIGUIENTE'], ['ESC', 'Cerrar / cancelar (paleta, outro armado, selección, salir de un campo)'], ['CTRL K', 'Paleta de comandos'], ['?', 'Abrir este editor']]
      .map(([k, d]) => `<kbd>${k}</kbd><span>${d}</span>`).join('') + '<span class="km-fixed-t">FIJAS (no se pueden cambiar)</span>';
  }
  kmSearch.addEventListener('input', kmRender);
  kmGroup.addEventListener('change', kmRender);
  kmAssigned.addEventListener('change', kmRender);
  $('#km-close').addEventListener('click', kmClose);
  kmModal.addEventListener('click', e => { if (e.target === kmModal) kmClose(); });
  $('#km-reset-all').addEventListener('click', () => {
    if (!confirm('¿Restablecer TODOS los atajos a los de fábrica? (los botones personalizados conservan los suyos salvo que choquen)')) return;
    kmOver = {}; rebuildKeymap();
    cbList.forEach(b => { if (b.key && KEYMAP[b.key]) b.key = ''; }); // el de fábrica manda sobre un personalizado repetido
    saveKm(); saveCb(); syncKbd(); renderCustom(); kmRender();
    toast('✓ ATAJOS RESTABLECIDOS', 'ok');
  });
  $('#open-keys').addEventListener('click', kmShow);
  $('#cdeck-keys').addEventListener('click', kmShow);

  /* ---------- paleta de comandos (Ctrl+K) ---------- */
  const pal = $('#palette'), palInput = $('#pal-input'), palList = $('#pal-list');
  let palItems = [], palSel = 0;
  const palOpen = () => !pal.hidden;
  function palShow() { if (panelLocked) { toast('🔒 PANEL BLOQUEADO', 'info'); return; } palPh(); pal.hidden = false; palInput.value = ''; palFilter(); palInput.focus(); }
  function palClose() { pal.hidden = true; palInput.blur(); }
  function palFilter() {
    const toks = norm(palInput.value).split(/\s+/).filter(Boolean);
    palItems = ACTIONS.filter(a => { const hay = norm(a.group + ' ' + a.label + ' ' + keyOf(a)); return toks.every(t => hay.includes(t)); });
    palSel = 0;
    palRender();
  }
  // placeholder corto en el dock angosto
  const palPh = () => { palInput.placeholder = window.matchMedia('(max-width: 620px)').matches ? 'Buscar acción…' : 'Escribe una acción: evidencia, cam 02 rec, última hora, tape…'; };
  function palRender() {
    if (!palItems.length) { palList.innerHTML = '<li class="none">Nada coincide.</li>'; return; }
    palList.innerHTML = palItems.map((a, i) => `<li data-i="${i}" class="${i === palSel ? 'sel' : ''}"><span class="g">${esc(a.group)}</span><span class="l">${esc(a.label)}</span>${keyOf(a) ? `<kbd>${esc(comboLabel(keyOf(a)))}</kbd>` : '<span></span>'}</li>`).join('');
    const cur = palList.querySelector('.sel');
    if (cur) cur.scrollIntoView({ block: 'nearest' });
  }
  function palRun(i) { const a = palItems[i]; if (!a) return; palClose(); a.run(); }
  palInput.addEventListener('input', palFilter);
  palInput.addEventListener('keydown', e => {
    if (e.isComposing || e.keyCode === 229) return; // escribiendo con IME: Enter confirma el texto, no ejecuta
    if (e.key === 'ArrowDown') { e.preventDefault(); palSel = Math.max(0, Math.min(palItems.length - 1, palSel + 1)); palRender(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); palSel = Math.max(0, palSel - 1); palRender(); }
    else if (e.key === 'Enter') { e.preventDefault(); if (palItems.length) palRun(palSel); }
  });
  palList.addEventListener('click', e => { const li = e.target.closest('li[data-i]'); if (li) palRun(Number(li.dataset.i)); });
  pal.addEventListener('click', e => { if (e.target === pal) palClose(); });
  $('#open-palette').addEventListener('click', palShow);

  /* =====================================================================================
     CONTROL DECK: barra fija (no se arrastra ni se redimensiona); solo se contrae / expande.
     Reusa los mismos botones y ids de siempre (QA, alertas, modo, escenas), solo cambió dónde viven.
     ===================================================================================== */
  const cdeck = $('#cdeck');
  function setDeckCollapsed(c) {
    cdeck.classList.toggle('cdeck--collapsed', c);
    $('#cdeck-toggle').textContent = c ? '▸ EXPANDIR' : '▾ CONTRAER';
    $('#cdeck-toggle').setAttribute('aria-expanded', String(!c));
    keep('cdeck-collapsed', c);
  }
  setDeckCollapsed(!!saved['cdeck-collapsed']);
  $('#cdeck-toggle').addEventListener('click', () => setDeckCollapsed(!cdeck.classList.contains('cdeck--collapsed')));

  /* ---------- PERSONALIZADOS: botones propios que ejecutan acciones REALES del registro ACTIONS ---------- */
  const CB_KEY = 'lci-custom-buttons-v1';
  // un botón = lista de pasos [{ action, delay }]; con 1 paso es un botón simple, con varios es una MACRO
  const normSteps = x => {
    const raw = Array.isArray(x.steps) ? x.steps : (typeof x.action === 'string' ? [{ action: x.action, delay: 0 }] : []);
    return raw.filter(st => isObj(st) && typeof st.action === 'string').slice(0, 12)
      .map(st => ({ action: st.action, delay: Math.max(0, Math.min(10000, Number(st.delay) || 0)) }));
  };
  let cbList = (() => {
    const v = readJSON(CB_KEY);
    return Array.isArray(v) ? v.filter(x => isObj(x) && typeof x.id === 'string' && typeof x.name === 'string')
      .map(x => ({ id: x.id, name: x.name.slice(0, 28), steps: normSteps(x), key: normCombo(typeof x.key === 'string' ? x.key : '') }))
      .filter(x => x.steps.length) : [];
  })();
  const saveCb = () => { try { localStorage.setItem(CB_KEY, JSON.stringify(cbList)); } catch (e) { toast('✕ NO PUDE GUARDAR LOS BOTONES', 'err'); } };
  // presets de show de fábrica (una sola vez): son macros normales, se editan o se borran como cualquier botón
  if (!cbList.length && !saved['cb-seeded'] && localStorage.getItem(CB_KEY) === null) {
    cbList = [
      { id: 'cbp1', name: 'ENTREVISTA', key: '', steps: [{ action: 'scene-2', delay: 700 }, { action: 'mode-clean', delay: 0 }] },
      { id: 'cbp2', name: 'INVESTIGACIÓN', key: '', steps: [{ action: 'scene-3', delay: 700 }, { action: 'mode-investigation', delay: 0 }] },
      { id: 'cbp3', name: 'ÚLTIMA HORA', key: '', steps: [{ action: 'scene-1', delay: 700 }, { action: 'alert:ÚLTIMA HORA', delay: 0 }] }
    ];
    saveCb();
  }
  keep('cb-seeded', true);
  const keyLabel = comboLabel;
  function cbKeyConflict(key, exceptId) {
    if (!key) return '';
    const o = keyOwner(key, { kind: 'cb', id: exceptId });
    return o ? (o.reserved ? 'Esa tecla está reservada.' : `Esa tecla ya es de: ${o.label}. (Se reasigna desde ⌨ ATAJOS.)`) : '';
  }
  const stepLabel = st => (ACT[st.action] ? `${ACT[st.action].group} · ${ACT[st.action].label}` : '⚠ acción inexistente');
  // ejecución: pasos en orden con su espera; Esc cancela una macro en curso; no se solapan dos macros
  let macroRun = null;
  async function runCustom(b) {
    if (panelLocked) return;
    if (macroRun) { toast('⏳ MACRO EN CURSO · ESC PARA CANCELAR', 'info'); return; }
    const el = document.querySelector(`[data-cb="${b.id}"]`);
    if (el) { el.classList.add('fired'); setTimeout(() => el.classList.remove('fired'), 220); }
    if (b.steps.length === 1) {
      const a = ACT[b.steps[0].action];
      if (!a) { toast(`✕ "${b.name}": LA ACCIÓN YA NO EXISTE`, 'err'); return; }
      a.run();
      return;
    }
    const run = macroRun = { id: b.id, cancelled: false };
    if (el) el.classList.add('is-running');
    activity(`▶ MACRO ${b.name} (${b.steps.length} pasos)`, 'info');
    try {
      for (let i = 0; i < b.steps.length && !run.cancelled; i++) {
        const st = b.steps[i], a = ACT[st.action];
        if (a) { try { a.run(); } catch (e) { log('Macro: ' + e.message, true); } }
        else toast(`✕ MACRO "${b.name}" · PASO ${i + 1}: LA ACCIÓN YA NO EXISTE`, 'err');
        if (st.delay > 0 && i < b.steps.length - 1) {
          const end = Date.now() + st.delay;
          while (!run.cancelled && Date.now() < end) await new Promise(r => setTimeout(r, Math.min(80, end - Date.now())));
        }
      }
    } finally {
      macroRun = null;
      document.querySelectorAll('.cb.is-running').forEach(n => n.classList.remove('is-running'));
    }
  }
  let cbEditMode = false, cbEditingId = null;
  function renderCustom() {
    const box = $('#cb-grid');
    box.innerHTML = '';
    box.classList.toggle('editing', cbEditMode);
    $('#cb-edit-toggle').classList.toggle('on', cbEditMode);
    cbList.forEach(b => {
      const bad = b.steps.some(st => !ACT[st.action]);
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'cb' + (bad ? ' cb--bad' : '') + (b.steps.length > 1 ? ' cb--macro' : '');
      el.dataset.cb = b.id;
      el.title = (bad ? '⚠ Algún paso apunta a una acción que ya no existe: edítalo.\n' : '') + b.steps.map((st, i) => `${i + 1}. ${stepLabel(st)}${st.delay && i < b.steps.length - 1 ? ` (+${st.delay} ms)` : ''}`).join('\n') + (cbEditMode ? '\n— clic para editar' : '');
      el.innerHTML = '<span class="cb-n"></span><span class="cb-foot"><span class="cb-m"></span><kbd></kbd></span>';
      el.querySelector('.cb-n').textContent = b.name;
      el.querySelector('.cb-m').textContent = b.steps.length > 1 ? `▶ ${b.steps.length} PASOS` : '';
      const kbd = el.querySelector('kbd');
      if (b.key) kbd.textContent = comboLabel(b.key); else kbd.remove();
      if (cbEditMode) el.insertAdjacentHTML('beforeend', '<span class="cb-pen">✎</span>');
      el.addEventListener('click', () => (cbEditMode ? cbOpen(b.id) : runCustom(b)));
      box.appendChild(el);
    });
    const add = document.createElement('button');
    add.type = 'button'; add.className = 'cb cb--add'; add.title = 'Crear un botón o una macro';
    add.innerHTML = '<span class="cb-plus">+</span><span class="cb-add-t">NUEVO</span>';
    add.addEventListener('click', () => cbOpen(null));
    box.appendChild(add);
  }
  const cbName = $('#cb-name'), cbKey = $('#cb-key'), cbErr = $('#cb-err'), cbStepsBox = $('#cb-steps');
  const cbGroups = [...new Set(ACTIONS.map(a => a.group))];
  let cbDraft = []; // pasos en edición
  function cbRenderSteps() {
    cbStepsBox.innerHTML = '';
    cbDraft.forEach((st, i) => {
      const row = document.createElement('div');
      row.className = 'cb-step';
      const group = (ACT[st.action] && ACT[st.action].group) || cbGroups[0];
      row.innerHTML = `<span class="cb-step-n">${i + 1}</span><select class="cb-sg" aria-label="Tipo de acción">${cbGroups.map(g => `<option${g === group ? ' selected' : ''}>${esc(g)}</option>`).join('')}</select>` +
        '<select class="cb-sa" aria-label="Acción"></select>' +
        `<label class="cb-sd" title="Espera antes del siguiente paso (ms)">+<input type="number" min="0" max="10000" step="100" value="${st.delay}" aria-label="Espera en milisegundos"> ms</label>` +
        `<button type="button" class="btn--sm btn--ghost cb-up" title="Subir" ${i === 0 ? 'disabled' : ''}>↑</button><button type="button" class="btn--sm btn--ghost cb-rm" title="Quitar paso" ${cbDraft.length === 1 ? 'disabled' : ''}>✕</button>`;
      const sg = row.querySelector('.cb-sg'), sa = row.querySelector('.cb-sa');
      const fill = () => { sa.innerHTML = ''; ACTIONS.filter(a => a.group === sg.value).forEach(a => sa.appendChild(new Option(a.label, a.id))); if (ACT[st.action] && ACT[st.action].group === sg.value) sa.value = st.action; else st.action = sa.value; };
      fill();
      sg.addEventListener('change', () => { fill(); });
      sa.addEventListener('change', () => { st.action = sa.value; });
      row.querySelector('input').addEventListener('input', e => { st.delay = Math.max(0, Math.min(10000, Number(e.target.value) || 0)); });
      row.querySelector('.cb-up').addEventListener('click', () => { [cbDraft[i - 1], cbDraft[i]] = [cbDraft[i], cbDraft[i - 1]]; cbRenderSteps(); });
      row.querySelector('.cb-rm').addEventListener('click', () => { cbDraft.splice(i, 1); cbRenderSteps(); });
      cbStepsBox.appendChild(row);
    });
    $('#cb-add-step').disabled = cbDraft.length >= 12;
  }
  $('#cb-add-step').addEventListener('click', () => {
    if (cbDraft.length) cbDraft[cbDraft.length - 1].delay = cbDraft[cbDraft.length - 1].delay || 700; // el paso anterior ya no es el último: espera sugerida
    cbDraft.push({ action: ACTIONS[0].id, delay: 0 }); cbRenderSteps();
  });
  function cbOpen(id) {
    cbEditingId = id || null;
    const b = id && cbList.find(x => x.id === id);
    $('#cb-title').textContent = b ? 'EDITAR BOTÓN / MACRO' : 'NUEVO BOTÓN / MACRO';
    cbName.value = b ? b.name : '';
    cbDraft = b ? b.steps.map(st => Object.assign({}, st)) : [{ action: ACTIONS[0].id, delay: 0 }];
    cbRenderSteps();
    cbKey.value = b ? keyLabel(b.key) : '';
    cbKey.dataset.raw = b ? b.key : '';
    cbErr.textContent = '';
    $('#cb-delete').hidden = !b;
    $('#cb-modal').hidden = false;
    cbName.focus();
  }
  // captura de atajo: clic en el campo y pulsa la combinación; no dispara los atajos del panel
  cbKey.addEventListener('keydown', e => {
    if (e.key === 'Escape' || e.key === 'Tab') return;
    e.preventDefault(); e.stopPropagation();
    const combo = comboFromEvent(e);
    if (!combo) return;
    cbKey.dataset.raw = combo; cbKey.value = comboLabel(combo);
    cbErr.textContent = cbKeyConflict(combo, cbEditingId);
  });
  $('#cb-key-clear').addEventListener('click', () => { cbKey.value = ''; cbKey.dataset.raw = ''; cbErr.textContent = ''; });
  $('#cb-new').addEventListener('click', () => cbOpen(null));
  $('#cb-edit-toggle').addEventListener('click', () => { cbEditMode = !cbEditMode; renderCustom(); });
  $('#cb-cancel').addEventListener('click', () => { $('#cb-modal').hidden = true; });
  $('#cb-modal').addEventListener('click', e => { if (e.target.id === 'cb-modal') $('#cb-modal').hidden = true; });
  $('#cb-save').addEventListener('click', () => {
    const key = cbKey.dataset.raw || '';
    const steps = cbDraft.filter(st => ACT[st.action]).map(st => ({ action: st.action, delay: st.delay }));
    if (!steps.length) { cbErr.textContent = 'Elige al menos una acción.'; return; }
    const conflict = cbKeyConflict(key, cbEditingId);
    if (conflict) { cbErr.textContent = conflict; return; }
    steps[steps.length - 1].delay = 0; // la espera del último paso no sirve de nada
    const name = cbName.value.trim().slice(0, 28) || (steps.length === 1 ? ACT[steps[0].action].label.slice(0, 28) : 'MACRO');
    if (cbEditingId) Object.assign(cbList.find(x => x.id === cbEditingId) || {}, { name, steps, key });
    else cbList.push({ id: 'cb' + Date.now() + Math.random().toString(36).slice(2, 6), name, steps, key });
    saveCb(); renderCustom();
    $('#cb-modal').hidden = true;
    toast(`✓ ${steps.length > 1 ? 'MACRO' : 'BOTÓN'} "${name}" GUARDADO`, 'ok');
  });
  $('#cb-delete').addEventListener('click', () => {
    const b = cbList.find(x => x.id === cbEditingId);
    if (!b || !confirm(`¿Borrar "${b.name}"?`)) return;
    cbList = cbList.filter(x => x.id !== cbEditingId);
    saveCb(); renderCustom();
    $('#cb-modal').hidden = true;
  });
  renderCustom();

  /* =====================================================================================
     RENDER: pinta el estado conocido en todos los módulos
     ===================================================================================== */
  const ST_LABEL = { REC: 'REC', LIVE: 'LIVE', WAITING: 'WAITING', OFFLINE: 'OFFLINE' };
  function setNp(boxSel, valSel, html, st) {
    $(valSel).innerHTML = html;
    if (st) $(boxSel).dataset.st = st; else delete $(boxSel).dataset.st;
  }
  function renderScenes() {
    $$('[data-scene]').forEach(b => {
      b.classList.toggle('is-air', !!live.scene && b.dataset.scene === live.scene);
      b.classList.toggle('is-cue', cueScene === b.dataset.scene && live.scene !== cueScene);
    });
  }
  // "SIN DATO" = este panel aún no envió ese estado (no es lo mismo que OFFLINE). Nunca se inventa.
  const NODATA = '<span class="nodata" title="aún no enviado desde este panel">SIN DATO</span>';
  function renderNow() {
    // escena (OBS)
    let sc = NODATA;
    if (live.scene) sc = esc(sceneLabel(live.scene).toUpperCase());
    else if (live.obsScene) sc = esc(live.obsScene) + '<small>fuera de LCI</small>';
    else if (!obs.connected) sc = '—<small>OBS OFFLINE</small>';
    else sc = '<span class="nodata" title="esperando respuesta de OBS">SIN DATO</span>';
    $('#np-scene').innerHTML = sc;
    // cámaras
    [1, 2].forEach(id => {
      const c = live.cams[id];
      $(`#np-cam${id}-k`).textContent = (c && c.label) || $(`#cam${id}-label`).value || `CAM 0${id}`;
      setNp(`#np-cam${id}-box`, `#np-cam${id}`, c ? `${esc(ST_LABEL[c.status] || c.status)}<small>${esc(c.subject || '')}</small>` : NODATA, c && c.status);
    });
    // evidencia
    const ev = live.ev;
    if (!ev) setNp('#np-ev-box', '#np-ev', NODATA);
    else if (!ev.visible) setNp('#np-ev-box', '#np-ev', `OCULTA<small>#${pad3(ev.num)}</small>`);
    else if (live.scene && C.scenes[live.scene] && !C.scenes[live.scene].evidence) setNp('#np-ev-box', '#np-ev', `#${pad3(ev.num)}<small>sin marco aquí</small>`, 'WARN');
    else setNp('#np-ev-box', '#np-ev', `#${pad3(ev.num)}<small>${esc(ev.type || '')}</small>`, 'ON');
    // lower third
    const lt = live.lt;
    if (!lt) setNp('#np-lt-box', '#np-lt', NODATA);
    else setNp('#np-lt-box', '#np-lt', lt.visible ? `ON<small>${esc(lt.name || lt.label || '')}</small>` : 'OFF', lt.visible ? 'ON' : null);
    // modo
    setNp('#np-mode-box', '#np-mode', live.mode ? esc(live.mode.toUpperCase()) : NODATA, live.mode === 'investigation' ? 'INV' : null);
    $('#cdeck-sum').innerHTML = `<span class="chip-s chip-s--air"><i></i>${live.scene ? esc(sceneLabel(live.scene).toUpperCase()) : 'SIN ESCENA'}</span><span class="chip-s${live.mode === 'investigation' ? ' chip-s--inv' : ''}"><i></i>${live.mode ? esc(live.mode.toUpperCase()) : 'SIN MODO'}</span>`;
    $('#top-scene').innerHTML = `ESCENA <b>${live.scene ? esc(sceneLabel(live.scene).toUpperCase()) : (live.obsScene ? esc(live.obsScene) : 'SIN DATO')}</b>`;
    $('#top-mode').innerHTML = `MODE <b>${live.mode ? esc(live.mode.toUpperCase()) : 'SIN DATO'}</b>`;
    $('#top-mode').classList.toggle('chip--inv', live.mode === 'investigation');
  }
  function renderCams() {
    [1, 2].forEach(id => {
      const c = live.cams[id];
      const st = c && c.status;
      $(`#cam${id}-id`).textContent = $(`#cam${id}-label`).value || `CAM 0${id}`;
      $(`#cam${id}-now`).innerHTML = c ? `<b>${esc(st)}</b> · ${esc(c.subject || '')}` : 'ESTADO DESCONOCIDO · elige uno';
      if (st) { $(`#cam${id}-box`).dataset.st = st; $(`#cam${id}-dot`).dataset.st = st; }
      else { delete $(`#cam${id}-box`).dataset.st; delete $(`#cam${id}-dot`).dataset.st; }
      $$(`[data-camq^="${id}:"]`).forEach(b => b.classList.toggle('on', !!st && b.dataset.camq === `${id}:${st}`));
    });
  }
  function renderModes() {
    $$('[data-mode]').forEach(b => b.classList.toggle('on', b.dataset.mode === live.mode));
    $('#qa-inv').classList.toggle('on', live.mode === 'investigation');
    $('#qa-clean').classList.toggle('on', live.mode === 'clean');
    $('#mode-meta').innerHTML = live.mode ? `ACTIVO: <b>${esc(live.mode.toUpperCase())}</b>` : 'DESCONOCIDO';
  }
  function renderFx() {
    const known = !!live.fx;
    let n = 0;
    $$('#fx input[data-fx]').forEach(cb => {
      const k = cb.dataset.fx;
      cb.indeterminate = !known;
      cb.checked = known && !!live.fx[k];
      if (known && live.fx[k]) n++;
    });
    $('#fx-summary').innerHTML = known ? `<b>${n}</b> ACTIVE / ${FX_KEYS.length}` : 'ESTADO DESCONOCIDO · elige un modo';
  }
  function renderAudioSummary() {
    const d = C.sound.duck || {};
    $('#audio-summary').innerHTML = `SFX ${C.sound.enabled ? '<b>● ON</b>' : '○ OFF'} · VOL ${Math.round(C.sound.volume * 100)}% · AMB ${amb.ambient ? '<b>ON</b>' : 'OFF'} · DUCK ${d.enabled ? `<b>ON</b> (${(d.inputs || []).length})` : 'OFF'}`;
  }
  function renderOverlay() {
    const c = $('#top-overlay');
    let txt = 'OVERLAY <b>—</b>', cls = 'chip';
    if (obs.connected && overlayActive === true) { txt = 'OVERLAY <b>● EN PROGRAMA</b>'; cls = 'chip chip--inv'; }
    else if (obs.connected && overlayActive === false) { txt = 'OVERLAY <b class="bad">FUERA DEL PROGRAMA</b>'; cls = 'chip chip--bad'; }
    else if (obs.connected && overlayActive === 'missing') { txt = `OVERLAY <b class="bad">NO ENCONTRADO</b>`; cls = 'chip chip--bad'; }
    c.innerHTML = txt; c.className = cls;
    c.title = `Fuentes "${OVERLAY_SOURCES.join(', ')}" en OBS — se consulta al conectar y al cambiar de escena`;
  }
  function renderObs() {
    const host = $('#host').value || C.obs.host, port = $('#port').value || C.obs.port;
    const st = obs.connected ? '<b>● CONNECTED</b>' : authFailed ? '<span class="bad">AUTH FAILED</span>' : lastCls === 'wait' ? 'CONNECTING…' : '<span class="bad">○ OFFLINE</span>';
    $('#obs-summary').innerHTML = `${st} · ${esc(host)}:${esc(port)}`;
    $('#obs-detail').textContent = obs.connected ? `ws://${host}:${port} · escena: ${live.obsScene || '—'}` : `ws://${host}:${port} · sin conexión`;
  }
  function thumbHTML(src, tag) {
    return src ? `<img src="${esc(src)}" alt="">${tag ? `<span class="tag">${esc(tag)}</span>` : ''}` : null;
  }
  function renderEvidence() {
    // al aire
    const ev = live.ev;
    const air = $('#ev-air'), airThumb = $('#ev-air-thumb'), st = $('#ev-air-state');
    let src = null;
    if (ev) {
      if (ev.bankId) { const it = bank.find(b => b.id === ev.bankId); src = it && it.dataURL; }
      else if (ev.src && !/^data:/.test(ev.src)) src = ev.src;
      else src = airImageMem;
    }
    airThumb.innerHTML = (ev && thumbHTML(src)) || (ev ? 'SIN IMAGEN' : 'SIN EVIDENCIA');
    $('#ev-air-num').textContent = ev ? '#' + pad3(ev.num) : '—';
    $('#ev-air-type').textContent = ev ? ev.type || '' : '';
    let stTxt = 'ESTADO DESCONOCIDO', stK = null;
    if (ev && !ev.visible) stTxt = '○ OCULTA';
    else if (ev && live.scene && C.scenes[live.scene] && !C.scenes[live.scene].evidence) { stTxt = '◐ ENVIADA · ESTA ESCENA NO TIENE MARCO (usa 03/04)'; stK = 'WARN'; }
    else if (ev) { stTxt = '● VISIBLE'; stK = 'ON'; }
    st.textContent = stTxt;
    if (stK) st.dataset.st = stK; else delete st.dataset.st;
    if (ev && ev.visible) air.dataset.st = 'ON'; else delete air.dataset.st;
    $('#ev-meta').innerHTML = ev ? `ÚLTIMA <b>#${pad3(ev.num)}</b> · PRÓXIMA #${pad3(Number($('#ev-num').value) || 1)}` : `PRÓXIMA #${pad3(Number($('#ev-num').value) || 1)}`;
    // siguiente
    const item = nextBankItem();
    const manual = pendingImage || $('#ev-url').value.trim();
    const num = Number($('#ev-num').value) || 1;
    const nextThumb = $('#ev-next-thumb');
    let srcLabel = 'BANCO', srcTitle = '';
    if (item) {
      // posición en el banco (no el nombre del archivo, que suele ser un hash): el nombre va en title
      const fromCase = cuedId === item.id && evQueueCase && cf.items.find(x => x.id === evQueueCase);
      srcLabel = (fromCase ? `EXP #${pad3(fromCase.num)} · ` : '') + (cuedId === item.id ? 'PREPARADA · #' : 'BANCO · #') + pad3(bank.indexOf(item) + 1);
      srcTitle = item.name || '';
      nextThumb.innerHTML = thumbHTML(item.dataURL, '#' + pad3(num));
    } else if (manual) {
      srcLabel = pendingImage ? 'ARCHIVO SUELTO' : 'RUTA';
      srcTitle = pendingImage ? pendingName : $('#ev-url').value.trim();
      nextThumb.innerHTML = thumbHTML(pendingImage || $('#ev-url').value.trim(), '#' + pad3(num));
    } else {
      srcLabel = bank.length ? 'NO QUEDAN DISPONIBLES' : 'BANCO VACÍO';
      nextThumb.textContent = evSending ? 'ENVIANDO…' : bank.length ? 'TODAS USADAS' : 'SUBE IMÁGENES AL ARCHIVO';
    }
    $('#ev-next-src').textContent = srcLabel;
    $('#ev-next-src').title = srcTitle;
    $('#ev-next-slot').classList.toggle('cued', !!(item && cuedId === item.id));
    $('#ev-uncue').hidden = !(item && cuedId === item.id);
    const can = !!(item || manual);
    $('#ev-next').classList.toggle('is-empty', !can);
    $('#ev-next').innerHTML = can ? `<span class="take-k">TAKE</span><span class="take-n">#${pad3(num)}</span><span class="take-s">AL AIRE</span><kbd data-kbd="ev-next"></kbd>` : '<span class="take-k">TAKE</span><span class="take-s">SIN EVIDENCIA</span><kbd data-kbd="ev-next"></kbd>';
    syncKbd($('#ev-next'));
    renderEvQueue();
    renderCfRelated();
    $('#qa-ev-s').textContent = can ? `siguiente · #${pad3(num)}` : (bank.length ? 'no quedan disponibles' : 'banco vacío');
  }
  function renderEvQueue() {
    const box = $('#ev-queue'), list = $('#ev-queue-list');
    const ids = evQueue.filter(id => id !== cuedId);
    const owner = evQueueCase && cf.items.find(x => x.id === evQueueCase);
    box.hidden = !(owner || ids.length);
    if (box.hidden) return;
    $('#ev-queue-case').textContent = owner ? `EXP #${pad3(owner.num)}` : 'MANUAL';
    list.innerHTML = '';
    if (!ids.length) { list.innerHTML = '<li class="empty">Cola vacía.</li>'; return; }
    ids.forEach(id => {
      const b = bank.find(x => x.id === id);
      if (!b) return;
      const li = document.createElement('li');
      li.innerHTML = `<img src="${esc(b.dataURL)}" alt=""><span class="q-name"></span><button type="button" class="btn--sm btn--ghost q-up" title="Pasar a SIGUIENTE">▲</button><button type="button" class="btn--sm btn--ghost q-x" title="Quitar de la cola (no toca el banco)">✕</button>`;
      li.querySelector('.q-name').textContent = b.name || 'imagen';
      li.querySelector('.q-up').addEventListener('click', () => cue(b));
      li.querySelector('.q-x').addEventListener('click', () => { evQueue = evQueue.filter(x => x !== id); renderBank(); });
      list.appendChild(li);
    });
  }
  function renderLtPreview() {
    const d = ltData();
    $('#ltp-tag').textContent = `${d.label || 'EXPEDIENTE'} #${pad3(d.number)}`;
    $('#ltp-name').textContent = d.name || 'NOMBRE DEL INVITADO';
    $('#ltp-role').textContent = d.role || 'Rol o descripción';
  }
  function renderLt() {
    const lt = live.lt;
    $('#lt-meta').innerHTML = !lt ? 'ESTADO DESCONOCIDO' : lt.visible ? `<b>● AL AIRE</b> · ${esc(lt.name || '')}` : '○ OCULTO';
    if (lt && lt.visible) $('#lt-preview').dataset.st = 'ON'; else delete $('#lt-preview').dataset.st;
    $('#qa-lt').classList.toggle('on', !!(lt && lt.visible));
    $('#qa-lt-s').textContent = lt && lt.visible ? 'al aire · L oculta' : 'mostrar';
    renderLtPreview();
  }
  function renderAlerts() {
    $('#qa-alert-s').textContent = live.lastAlert || 'NUEVA EVIDENCIA';
  }
  function renderTr() {
    const t = trSel.value;
    $('#qa-tr-s').textContent = currentTr();
    renderTrCur();
    $$('#tr-tiles [data-trpick]').forEach(b => { const on = b.dataset.trpick === t; b.classList.toggle('on', on); b.setAttribute('aria-checked', String(on)); });
    $('#tr-sel-label').innerHTML = `AL CAMBIAR DE ESCENA: <b>${esc(t === 'none' ? 'CORTE' : t.toUpperCase())}</b>`;
  }
  function renderAll() {
    renderNow(); renderScenes(); renderCams(); renderModes(); renderFx();
    renderEvidence(); renderLt(); renderAlerts(); renderTr(); renderAudioSummary(); renderObs(); renderOverlay();
  }


  /* =====================================================================================
     TIEMPO AL AIRE + CARTELA DE HORA / UBICACIÓN
     Lee de OBS (GetStreamStatus / GetRecordStatus, cada 3 s mientras hay conexión) cuánto lleva
     transmitiendo y graba; si "seguir OBS" está activo, manda ese inicio al overlay (cmd clockStart)
     para que «EN VIVO 01:23:45» sea el tiempo real al aire y coincida en todas las escenas.
     ===================================================================================== */
  const onair = { stream: false, rec: false, paused: false, streamMs: 0, recMs: 0, at: 0, syncedStart: null, timer: null };
  const fmtHMS = ms => { const e = Math.max(0, Math.floor(ms / 1000)); return [Math.floor(e / 3600), Math.floor(e / 60) % 60, e % 60].map(v => String(v).padStart(2, '0')).join(':'); };
  async function pollOutputs() {
    if (!obs.connected) return;
    try {
      const [st, rc] = await Promise.all([obs.request('GetStreamStatus'), obs.request('GetRecordStatus')]);
      onair.at = Date.now();
      onair.stream = !!st.outputActive; onair.streamMs = Number(st.outputDuration) || 0;
      onair.rec = !!rc.outputActive; onair.paused = !!rc.outputPaused; onair.recMs = Number(rc.outputDuration) || 0;
      if (onair.stream && $('#hud-follow').checked) syncOverlayClock(false);
      if (!onair.stream) onair.syncedStart = null; // al cortar la transmisión, la próxima vuelve a sincronizar
    } catch (e) { /* OBS sin esas solicitudes: el panel sigue igual */ }
    renderOnAir();
  }
  function startOutputsPoll() { if (onair.timer) return; pollOutputs(); onair.timer = setInterval(pollOutputs, 3000); }
  function stopOutputsPoll() { clearInterval(onair.timer); onair.timer = null; onair.stream = onair.rec = false; onair.syncedStart = null; renderOnAir(); }
  // manda el inicio real de la transmisión al overlay (solo si cambió más de 5 s, o si es manual)
  function syncOverlayClock(manual) {
    if (!onair.stream) { if (manual) toast('OBS NO ESTÁ TRANSMITIENDO · NADA QUE SINCRONIZAR', 'info'); return; }
    const start = onair.at - onair.streamMs;
    if (!manual && onair.syncedStart && Math.abs(start - onair.syncedStart) < 5000) return;
    onair.syncedStart = start;
    send({ cmd: 'clockStart', start }, { ok: manual ? '✓ CRONÓMETRO SINCRONIZADO CON OBS' : false });
  }
  function renderOnAir() {
    const age = onair.at ? Date.now() - onair.at : 0; // el tiempo sigue corriendo entre consultas
    const s = onair.stream ? fmtHMS(onair.streamMs + age) : null, r = onair.rec ? fmtHMS(onair.recMs + (onair.paused ? 0 : age)) : null;
    const chip = $('#top-live');
    if (!obs.connected) { chip.innerHTML = 'AIRE <b>—</b>'; chip.className = 'chip'; }
    else if (s) { chip.innerHTML = `● EN VIVO <b>${s}</b>`; chip.className = 'chip chip--air'; }
    else if (r) { chip.innerHTML = `● REC <b>${r}</b>`; chip.className = 'chip chip--air'; }
    else { chip.innerHTML = 'FUERA DEL AIRE'; chip.className = 'chip'; }
    $('#live-stream').textContent = obs.connected ? (s || 'no transmite') : '—';
    $('#live-rec').textContent = obs.connected ? (r ? r + (onair.paused ? ' (pausa)' : '') : 'no graba') : '—';
    $('#live-overlay').textContent = onair.syncedStart ? fmtHMS(Date.now() - onair.syncedStart) : 'sin sincronizar';
    $('#hud-summary').textContent = ($('#hud-location').value || 'SIN UBICACIÓN') + ' · ' + ($('#hud-tz').value === 'auto' ? 'hora del PC' : $('#hud-tz').value.split('/').pop().replace(/_/g, ' '));
  }
  const hudPayload = () => ({ cmd: 'hud', location: $('#hud-location').value.trim(), timezone: $('#hud-tz').value, timeFormat: $('#hud-fmt').value,
    showSeconds: $('#hud-seconds').checked, showDate: $('#hud-date').checked, showLocation: $('#hud-showloc').checked, showElapsed: $('#hud-showel').checked });
  // valores de arranque = los de config.js (si no hay nada guardado en este navegador)
  (function initHudFields() {
    const h = C.hud || {};
    if (saved['hud-location'] === undefined) $('#hud-location').value = h.location || '';
    if (saved['hud-tz'] === undefined) $('#hud-tz').value = h.timezone || 'auto';
    if (saved['hud-fmt'] === undefined) $('#hud-fmt').value = h.timeFormat === '24h' ? '24h' : '12h';
    if (saved['hud-seconds'] === undefined) $('#hud-seconds').checked = !!h.showSeconds;
    if ($('#hud-tz').value !== (saved['hud-tz'] === undefined ? (h.timezone || 'auto') : saved['hud-tz'])) $('#hud-tz').value = 'auto';
  })();
  $('#hud-apply').addEventListener('click', () => send(hudPayload(), { ok: '✓ HORA Y UBICACIÓN ACTUALIZADAS' }).then(() => renderOnAir()));
  $('#clock-sync').addEventListener('click', () => syncOverlayClock(true));
  $('#clock-reset').addEventListener('click', () => send({ cmd: 'clockStart', start: Date.now() }, { ok: '✓ CRONÓMETRO EN 00:00:00' }).then(() => { onair.syncedStart = null; renderOnAir(); }));
  ['#hud-location', '#hud-tz'].forEach(q => $(q).addEventListener('input', renderOnAir));
  $('#hud-follow').addEventListener('change', () => { if ($('#hud-follow').checked) { onair.syncedStart = null; pollOutputs(); } });


  /* =====================================================================================
     RESPALDO Y RESTAURACIÓN: todo lo del panel vive en localStorage; esto lo saca a un .json
     ===================================================================================== */
  const BK_META = 'lci-backup-meta-v1';
  const BK_QUOTA = 5 * 1024 * 1024; // ~5 M de caracteres por origen en Chromium
  const bkKeys = () => { const k = []; try { for (let i = 0; i < localStorage.length; i++) { const n = localStorage.key(i); if (/^lci[-.]/.test(n) && n !== BK_META) k.push(n); } } catch (e) { /* sin acceso */ } return k; };
  const bkUsage = () => bkKeys().reduce((t, k) => { try { return t + k.length + (localStorage.getItem(k) || '').length; } catch (e) { return t; } }, 0);
  const bkLastAt = () => { const m = readJSON(BK_META); return m && Number.isFinite(m.at) ? m.at : null; };
  const bkAgo = at => { if (!at) return 'nunca'; const d = Math.floor((Date.now() - at) / 86400000); return d <= 0 ? 'hoy' : d === 1 ? 'ayer' : `hace ${d} días`; };
  function renderBackup() {
    const used = bkUsage(), pct = Math.min(100, Math.round(used / BK_QUOTA * 100)), last = bkLastAt();
    $('#bk-last').textContent = bkAgo(last);
    $('#bk-counts').textContent = `${cf.items.length} · ${bank.length}`;
    $('#bk-usage').textContent = `${(used / 1048576).toFixed(1)} MB (${pct} %)`;
    const bar = $('#bk-bar'); bar.style.width = pct + '%'; bar.className = pct >= 85 ? 'bad' : pct >= 60 ? 'warn' : '';
    $('#bk-summary').innerHTML = `${last ? 'ÚLTIMO ' + bkAgo(last).toUpperCase() : '<span class="bad">SIN RESPALDO</span>'} · ${pct} % ESPACIO`;
  }
  function bkExport() {
    const data = {};
    bkKeys().forEach(k => { try { data[k] = localStorage.getItem(k); } catch (e) { /* se omite */ } });
    const payload = JSON.stringify({ app: 'lci-panel', version: 1, exportedAt: new Date().toISOString(), data });
    const d = new Date(), pad = n => String(n).padStart(2, '0');
    const url = URL.createObjectURL(new Blob([payload], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url; a.download = `lci-respaldo-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000); // se libera el objeto: nada de fugas
    try { localStorage.setItem(BK_META, JSON.stringify({ at: Date.now() })); } catch (e) { /* sin almacenamiento */ }
    toast(`✓ RESPALDO DESCARGADO · ${Object.keys(data).length} DATOS`, 'ok'); activity('Respaldo descargado', 'info');
    renderBackup();
  }
  async function bkImport(file) {
    if (!file) return;
    if (file.size > 60 * 1024 * 1024) { toast('✕ ARCHIVO DEMASIADO GRANDE (MÁX. 60 MB)', 'err'); return; }
    let obj;
    try { obj = JSON.parse(await file.text()); } catch (e) { toast('✕ ARCHIVO NO COMPATIBLE · NO ES UN RESPALDO', 'err'); return; }
    if (!isObj(obj) || obj.app !== 'lci-panel' || !isObj(obj.data)) { toast('✕ ARCHIVO NO COMPATIBLE · NO ES UN RESPALDO DEL PANEL', 'err'); return; }
    const entries = Object.entries(obj.data).filter(([k, v]) => /^lci[-.]/.test(k) && k !== BK_META && typeof v === 'string');
    if (!entries.length) { toast('✕ EL RESPALDO ESTÁ VACÍO', 'err'); return; }
    if (!confirm(`Vas a RESTAURAR ${entries.length} datos del respaldo${obj.exportedAt ? ' del ' + new Date(obj.exportedAt).toLocaleString() : ''}.\n\nSe REEMPLAZAN los expedientes, el banco, los atajos y los ajustes de este navegador. ¿Continuar?`)) return;
    const before = {}; bkKeys().forEach(k => { before[k] = localStorage.getItem(k); });
    try {
      bkKeys().forEach(k => localStorage.removeItem(k));
      entries.forEach(([k, v]) => localStorage.setItem(k, v));
    } catch (e) { // no cabe: se devuelve todo como estaba
      try { bkKeys().forEach(k => localStorage.removeItem(k)); Object.entries(before).forEach(([k, v]) => localStorage.setItem(k, v)); } catch (e2) { /* nada más que hacer */ }
      toast('✕ NO CABE EN ESTE NAVEGADOR · NO SE CAMBIÓ NADA', 'err');
      return;
    }
    toast('✓ RESPALDO RESTAURADO · RECARGANDO…', 'ok');
    setTimeout(() => location.reload(), 900);
  }
  $('#bk-export').addEventListener('click', bkExport);
  $('#bk-import').addEventListener('change', e => { const f = e.target.files[0]; e.target.value = ''; bkImport(f); });
  $('#dr-backup').addEventListener('toggle', renderBackup);
  // aviso amable (una vez por sesión) si hay datos y hace mucho que no se respalda
  setTimeout(() => {
    const at = bkLastAt(), hasData = cf.items.length || bank.length;
    if (hasData && (!at || Date.now() - at > 14 * 86400000)) toast(`💾 RESPALDO: ${at ? 'hace ' + Math.floor((Date.now() - at) / 86400000) + ' días' : 'nunca'} · Ajustes → RESPALDO`, 'info');
  }, 5000);

  /* ---------- cabecera: marca y reloj ---------- */
  if (C.brand) { $('#brand-title').textContent = C.brand.title || 'LA CÁPSULA INSÓLITA'; $('#case-no').textContent = C.brand.caseNumber || '—'; }
  (function tick() { $('#clock').textContent = hhmmss(); renderOnAir(); setTimeout(tick, 1000 - (Date.now() % 1000)); })();
  ['#host', '#port'].forEach(s => $(s).addEventListener('change', renderObs));
  $('#ev-num').addEventListener('input', renderEvidence);

  /* ---------- layout ----------
     --topbar-h = alto real de la barra (cambia con el aviso de conexión perdida): lo usan los
     toasts, la paleta y el scroll. */
  const topbar = $('.topbar');
  const setTopbarH = () => document.documentElement.style.setProperty('--topbar-h', topbar.offsetHeight + 'px');
  setTopbarH();
  if (window.ResizeObserver) new ResizeObserver(setTopbarH).observe(topbar); else window.addEventListener('resize', setTopbarH);
  // vista del panel (NORMAL 50/50 · LECTURA · OPERACIÓN · COMPACTO) y tamaño de texto
  const VIEWS = ['normal', 'lectura', 'operacion', 'compacto'];
  function setView(v) { if (!VIEWS.includes(v)) v = 'normal'; document.body.dataset.view = v; $('#view-select').value = v; keep('view', v); }
  $('#view-select').addEventListener('change', e => setView(e.target.value));
  setView(saved.view);
  const UI_SIZES = [0.9, 1, 1.1, 1.2, 1.3];
  let uiSize = UI_SIZES.includes(saved['ui-size']) ? saved['ui-size'] : 1;
  function setUiSize(z) { uiSize = z; document.documentElement.style.zoom = z === 1 ? '' : String(z); keep('ui-size', z); $('#ui-smaller').disabled = z === UI_SIZES[0]; $('#ui-bigger').disabled = z === UI_SIZES[UI_SIZES.length - 1]; if (window.ResizeObserver === undefined) setTopbarH(); }
  $('#ui-smaller').addEventListener('click', () => setUiSize(UI_SIZES[Math.max(0, UI_SIZES.indexOf(uiSize) - 1)]));
  $('#ui-bigger').addEventListener('click', () => setUiSize(UI_SIZES[Math.min(UI_SIZES.length - 1, UI_SIZES.indexOf(uiSize) + 1)]));
  setUiSize(uiSize);

  renderBank();
  renderAll();
  syncKbd();
  renderBackup();
  connect(true);
})();
