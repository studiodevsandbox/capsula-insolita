/* La Cápsula Insólita — SceneController, puente con OBS y arranque */
(function () {
  'use strict';
  const LCI = window.LCI, C = LCI.config, u = LCI.u, P = LCI.params;

  const ALIASES = {
    '1': 'SCENE_01_CAMERA', camera: 'SCENE_01_CAMERA',
    '2': 'SCENE_02_DUAL_CAMERA', 'dual-camera': 'SCENE_02_DUAL_CAMERA',
    '3': 'SCENE_03_CAMERA_EVIDENCE', 'camera-evidence': 'SCENE_03_CAMERA_EVIDENCE',
    '4': 'SCENE_04_DUAL_CAMERA_EVIDENCE', 'dual-camera-evidence': 'SCENE_04_DUAL_CAMERA_EVIDENCE'
  };
  const resolveScene = n => (C.scenes[n] ? n : ALIASES[String(n || '').toLowerCase()] || null);

  /* ===================== SceneController ===================== */
  const SC = (LCI.SceneController = {
    current: null,
    pending: null,
    async set(name, opts = {}) {
      const s = resolveScene(name);
      if (!s) return;
      const tr = opts.transition;
      if (!this.current || !tr || tr === 'none' || LCI.still) { this.apply(s, { enter: !!this.current }); return; }
      this.pending = s;
      await LCI.Transitions.run(tr, () => this.apply(s, { enter: true }));
      this.pending = null;
    },
    apply(name, opts = {}) {
      const L = C.scenes[name];
      LCI.layout = L;
      this.current = name;
      document.getElementById('stage').dataset.scene = name;
      LCI.state.save({ scene: name });

      LCI.Cameras.hideAll();
      const holes = [];
      (L.cams || []).forEach(r => {
        const cfg = C['camera' + r.id];
        if (cfg && cfg.enabled === false) return;
        LCI.Cameras.place(r.id, r);
        holes.push(r);
      });
      LCI.holes.update(holes);
      LCI.Evidence.place(L.evidence);
      LCI.Tape.place(L.tapes, opts.enter && !LCI.still);
      LCI.Decor.render(L.decor);
      LCI.LowerThird.anchor(L.lowerThird);
      if (P.get('debug') === '1') drawDebug(holes, L);
      LCI.bus.emit('scene', name);
    }
  });

  function drawDebug(holes, L) {
    const ui = document.getElementById('ui');
    ui.querySelectorAll('.dbg-hole').forEach(n => n.remove());
    holes.concat(L.evidence ? [Object.assign({ id: 'EV' }, L.evidence)] : []).forEach(r => {
      const d = u.el('div', 'dbg-hole', `${r.id === 'EV' ? 'EVIDENCIA' : 'CAM ' + r.id} · x ${r.x} y ${r.y} · ${r.w}×${r.h}`);
      Object.assign(d.style, { left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px' });
      ui.appendChild(d);
    });
  }

  /* ===================== Dev Mode: FPS, escena, efectos y últimos eventos sobre el overlay ===================== */
  const DevMode = {
    active: false, frames: 0, fps: 0, lastAt: 0,
    init() {
      this.active = true;
      const el = document.getElementById('devmode');
      el.hidden = false;
      this.lastAt = performance.now();
      const tick = t => {
        if (!this.active) return;
        this.frames++;
        if (t - this.lastAt >= 1000) { this.fps = this.frames; this.frames = 0; this.lastAt = t; this.render(); }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      LCI.bus.on('scene', () => this.render());
      LCI.bus.on('effects', () => this.render());
      LCI.bus.on('devlog', () => this.render());
      this.render();
    },
    render() {
      const el = document.getElementById('devmode');
      if (!el || el.hidden) return;
      const fx = Object.entries(LCI.effects.current || {}).filter(([k, v]) => v && k !== 'enabled').map(([k]) => k);
      const events = LCI.devlog.entries.slice(0, 8).map(e => `<div>${u.esc(e)}</div>`).join('');
      el.innerHTML = `
        <div><b>DEV MODE</b> · ?debug=1</div>
        <div>FPS <b>${this.fps}</b> &nbsp; MODO <b>${C.mode}</b></div>
        <div>ESCENA <b>${SC.current || '—'}</b></div>
        <div>EFECTOS <b>${fx.join(', ') || '—'}</b></div>
        <div class="dev-events">${events}</div>`;
    }
  };

  /* ===================== comandos (panel de control, OBS, teclado) ===================== */
  function pickFields(o, keys) {
    const r = {};
    keys.forEach(k => { if (o[k] !== undefined) r[k] = o[k]; });
    return r;
  }
  LCI.command = function (raw) {
    let cmd = raw;
    if (typeof cmd === 'string') { try { cmd = JSON.parse(cmd); } catch (e) { return; } }
    if (!cmd || !cmd.cmd) return;
    LCI.devlog.push(cmd.cmd + (cmd.scene ? ' → ' + cmd.scene : cmd.name ? ' → ' + cmd.name : cmd.text ? ' → ' + cmd.text : cmd.status ? ' → ' + cmd.status : ''));
    const data = Object.assign({}, cmd.data || {}, cmd);
    delete data.cmd;
    delete data.data;
    switch (cmd.cmd) {
      case 'scene':
        SC.set(cmd.scene, { transition: cmd.transition === undefined ? C.transitions.sceneChange : cmd.transition });
        break;
      case 'mode':
        LCI.effects.setMode(cmd.mode);
        LCI.state.save({ mode: C.mode, effects: null });
        break;
      case 'effect':
        LCI.effects.set(cmd.key, !!cmd.value);
        LCI.state.save({ effects: LCI.effects.current });
        break;
      case 'camera': {
        const id = Number(cmd.id) || 1;
        const patch = pickFields(data, ['label', 'status', 'subject', 'enabled']);
        LCI.Cameras.update(id, patch);
        LCI.state.save({ ['camera' + id]: C['camera' + id] });
        if (patch.enabled !== undefined && SC.current) SC.apply(SC.current);
        break;
      }
      case 'cameraSwitch': {
        const id = Number(cmd.frame || cmd.id) || 1;
        LCI.Cameras.switchFx(id, pickFields(data, ['label', 'status', 'subject']));
        LCI.state.save({ ['camera' + id]: C['camera' + id] });
        break;
      }
      case 'evidence':
        LCI.Evidence.show(pickFields(data, ['image', 'type', 'number', 'caption', 'description', 'timestamp']));
        break;
      case 'evidenceClear':
        LCI.Evidence.show({ image: null });
        break;
      case 'evidenceToggle':
        C.evidence.enabled = !!cmd.value;
        LCI.state.save({ evidence: C.evidence });
        if (SC.current) SC.apply(SC.current);
        break;
      case 'lowerThird':
        LCI.LowerThird.show(pickFields(data, ['label', 'number', 'name', 'role']));
        break;
      case 'lowerThirdHide':
        LCI.LowerThird.hide();
        break;
      case 'alert':
        LCI.Alerts.show(cmd.text);
        break;
      case 'stamp':
        LCI.Stamps.show(cmd.text);
        break;
      case 'focus':
        LCI.Focus.set(data.target, data.ms);
        break;
      case 'transition':
        LCI.Transitions.run(cmd.name || 'tape', cmd.scene ? () => SC.apply(resolveScene(cmd.scene) || SC.current, { enter: true }) : null);
        break;
      case 'intro':
        LCI.Show.intro();
        break;
      case 'outro':
        LCI.Show.outro({ text: cmd.text });
        break;
      case 'sound': {
        const s = C.sound, unit = (x, d) => (Number.isFinite(Number(x)) ? Math.max(0, Math.min(1, Number(x))) : d);
        if (cmd.enabled !== undefined) s.enabled = !!cmd.enabled;
        if (cmd.volume !== undefined) s.volume = unit(cmd.volume, s.volume);
        if (cmd.ambient !== undefined) s.ambient = !!cmd.ambient;
        if (cmd.ambientVolume !== undefined) s.ambientVolume = unit(cmd.ambientVolume, s.ambientVolume);
        LCI.state.save({ sound: { enabled: s.enabled, volume: s.volume, ambient: !!s.ambient, ambientVolume: s.ambientVolume } });
        LCI.sound.sync(); // aplica volumen maestro y arranca/detiene el ambiente
        break;
      }
      case 'testSound':
        LCI.sound.play(cmd.name);
        break;
      case 'hideAll':
        LCI.LowerThird.hide();
        LCI.Evidence.show({ image: null });
        document.getElementById('alerts').innerHTML = '';
        break;
      case 'reset':
        LCI.Show.reset();
        break;
      case 'reload':
        location.reload();
        break;
      case 'resetState':
        LCI.state.clear();
        location.reload();
        break;
      default:
        break;
    }
  };

  function mapObsScene(name) {
    if (!name) return null;
    const map = (C.obs && C.obs.sceneMap) || {};
    if (map[name]) return map[name];
    const norm = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
    const hit = Object.keys(map).find(k => norm(k) === norm(name));
    return hit ? map[hit] : null;
  }

  function bridge() {
    // Comandos enviados vía obs-websocket → CallVendorRequest("obs-browser", "emit_event", { event_name: "lci" })
    window.addEventListener('lci', e => LCI.command(e.detail));
    // La fuente es compartida por las 4 escenas: al cambiar de escena en OBS, la página cambia de layout sin recargar.
    window.addEventListener('obsSceneChanged', e => {
      if (!C.obs || !C.obs.followScenes) return;
      const s = mapObsScene(e.detail && e.detail.name);
      if (!s || s === SC.current || s === SC.pending) return;
      SC.set(s, { transition: C.transitions.manualSceneChange });
    });
    // Atajos para probar en el navegador o con "Interactuar" en OBS.
    const keys = {
      '1': () => SC.set('SCENE_01_CAMERA', { transition: C.transitions.sceneChange }),
      '2': () => SC.set('SCENE_02_DUAL_CAMERA', { transition: C.transitions.sceneChange }),
      '3': () => SC.set('SCENE_03_CAMERA_EVIDENCE', { transition: C.transitions.sceneChange }),
      '4': () => SC.set('SCENE_04_DUAL_CAMERA_EVIDENCE', { transition: C.transitions.sceneChange }),
      c: () => LCI.command({ cmd: 'mode', mode: 'clean' }),
      i: () => LCI.command({ cmd: 'mode', mode: 'investigation' }),
      e: () => LCI.command({ cmd: 'evidence', image: 'assets/evidence/demo-01.svg', type: 'photo', number: (Number(C.evidence.number) || 0) + 1 }),
      d: () => LCI.command({ cmd: 'evidence', image: 'assets/evidence/demo-02.svg', type: 'document', number: (Number(C.evidence.number) || 0) + 1 }),
      l: () => (LCI.LowerThird.node ? LCI.LowerThird.hide() : LCI.LowerThird.show()),
      a: () => LCI.Alerts.show('NUEVA EVIDENCIA'),
      s: () => LCI.Stamps.show('VERIFICADO'),
      k: () => LCI.Cameras.switchFx(1, {}),
      t: () => { keys._t = ((keys._t || 0) + 1) % LCI.Transitions.names.length; LCI.Transitions.run(LCI.Transitions.names[keys._t]); },
      n: () => LCI.Show.intro(),
      o: () => LCI.Show.outro(),
      r: () => LCI.Show.reset(),
      p: () => document.body.classList.toggle('is-preview')
    };
    window.addEventListener('keydown', e => { const f = keys[e.key.toLowerCase()]; if (f && e.key !== '_t') f(); });
  }

  function fit() {
    const s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080) || 1;
    const x = (window.innerWidth - 1920 * s) / 2, y = (window.innerHeight - 1080 * s) / 2;
    document.getElementById('stage').style.transform = `translate(${x}px, ${y}px) scale(${s})`;
  }

  function scheduleGlitch() {
    setTimeout(() => {
      const fx = LCI.effects.current;
      if (fx.enabled !== false && fx.glitch) {
        const list = [...document.querySelectorAll('[data-glitch]')].filter(n => n.offsetParent !== null);
        const n = list.length ? u.pick(list) : null;
        if (n) { n.classList.add('is-glitch'); setTimeout(() => n.classList.remove('is-glitch'), 280); }
      }
      scheduleGlitch();
    }, u.rand(9000, 17000));
  }

  /* ===================== arranque ===================== */
  function boot() {
    if (P.get('reset') === '1') LCI.state.clear();
    const saved = P.get('demo') === '1' ? {} : LCI.state.load();
    ['camera1', 'camera2', 'evidence', 'lowerThird', 'sound'].forEach(k => { if (saved[k]) Object.assign(C[k], saved[k]); });

    if (P.get('preview') === '1') document.body.classList.add('is-preview');
    fit();
    window.addEventListener('resize', fit);

    LCI.textures.init();
    LCI.Wall.paint();
    LCI.Particles.init();
    LCI.FilmDust.init();
    LCI.Brand.render();
    LCI.Hud.render();

    const mode = P.get('mode') || saved.mode || C.mode;
    LCI.effects.setMode(mode, P.get('mode') ? null : saved.effects);

    if (P.get('demo') === '1') {
      Object.assign(C.evidence, { image: 'assets/evidence/demo-01.svg', type: 'photo', number: 4, description: 'Pasillo B, 3er piso. Nadie reconoce a la persona.' });
      Object.assign(C.lowerThird, { name: 'DANIELA ROJAS', role: 'Periodista de investigación', number: 4 });
    }

    const start = resolveScene(P.get('scene')) || resolveScene(saved.scene) || resolveScene(C.scene) || 'SCENE_01_CAMERA';
    SC.apply(start);

    // Si OBS informa la escena activa, manda ella.
    if (window.obsstudio && typeof window.obsstudio.getCurrentScene === 'function' && !P.get('scene')) {
      try { window.obsstudio.getCurrentScene(sc => { const s = mapObsScene(sc && sc.name); if (s && s !== SC.current) SC.apply(s); }); } catch (e) { /* sin permiso de lectura */ }
    }

    if (P.get('demo') === '1' || saved.lowerThirdVisible) LCI.LowerThird.show();
    bridge();
    LCI.clock.run();
    LCI.sound.sync(); // volumen guardado + ambiente si quedó activo
    scheduleGlitch();
    if (P.get('debug') === '1') DevMode.init();
    if (P.get('intro') === '1') LCI.Show.intro();
    // ?run=alert&text=... ejecuta un comando al cargar (útil para probar y para documentación).
    if (P.get('run')) setTimeout(() => LCI.command({ cmd: P.get('run'), text: P.get('text') || undefined, name: P.get('name') || undefined }), 300);
  }

  boot();
})();
