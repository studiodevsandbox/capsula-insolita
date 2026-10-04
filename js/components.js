/* La Cápsula Insólita — componentes reutilizables */
(function () {
  'use strict';
  const LCI = window.LCI, C = LCI.config, u = LCI.u, el = u.el, esc = u.esc;

  /* ===================== BackgroundAtmosphere: pared de concreto ===================== */
  LCI.Wall = {
    paint() {
      const c = document.getElementById('wall');
      const x = c.getContext('2d');
      const W = window.LCI_STAGE.w, H = window.LCI_STAGE.h, R = u.seeded(17);
      x.fillStyle = '#080707';
      x.fillRect(0, 0, W, H);
      for (let i = 0; i < 90; i++) {
        const cx = R() * W, cy = R() * H, r = 60 + R() * 300;
        const light = R() < 0.5;
        const a = light ? 0.016 + R() * 0.028 : 0.1 + R() * 0.18;
        const g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
        g.addColorStop(0, light ? `rgba(255,238,228,${a})` : `rgba(0,0,0,${a})`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        x.fillStyle = g;
        x.fillRect(cx - r, cy - r, r * 2, r * 2);
      }
      for (let i = 0; i < 16; i++) {
        const sx = R() * W, sy = R() * H * 0.5, len = 120 + R() * 420, w = 6 + R() * 34;
        const g = x.createLinearGradient(sx, sy, sx, sy + len);
        g.addColorStop(0, 'rgba(0,0,0,.2)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        x.fillStyle = g;
        x.fillRect(sx, sy, w, len);
      }
      // juntas de paneles de concreto y agujeros de encofrado
      const joint = (x1, y1, x2, y2) => {
        x.lineWidth = 2; x.strokeStyle = 'rgba(0,0,0,.5)';
        x.beginPath(); x.moveTo(x1, y1); x.lineTo(x2, y2); x.stroke();
        x.lineWidth = 1; x.strokeStyle = 'rgba(255,255,255,.035)';
        x.beginPath(); x.moveTo(x1 + 2, y1 + 2); x.lineTo(x2 + 2, y2 + 2); x.stroke();
      };
      [300, 980, 1640].forEach(vx => joint(vx, 0, vx, H));
      joint(0, 640, W, 640);
      [[150, 320], [640, 320], [1310, 320], [1790, 320], [150, 860], [640, 860], [1310, 860], [1790, 860]].forEach(([hx, hy]) => {
        const g = x.createRadialGradient(hx, hy, 0, hx, hy, 9);
        g.addColorStop(0, 'rgba(0,0,0,.75)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        x.fillStyle = g; x.fillRect(hx - 10, hy - 10, 20, 20);
      });
      const n = document.createElement('canvas');
      n.width = n.height = 256;
      const nx = n.getContext('2d');
      const d = nx.createImageData(256, 256);
      for (let i = 0; i < d.data.length; i += 4) {
        const v = (R() * 255) | 0;
        d.data[i] = d.data[i + 1] = d.data[i + 2] = v;
        d.data[i + 3] = (R() * 24) | 0;
      }
      nx.putImageData(d, 0, 0);
      x.fillStyle = x.createPattern(n, 'repeat');
      x.fillRect(0, 0, W, H);
    }
  };

  /* ===================== ParticleSystem: polvo en el cono de luz ===================== */
  LCI.Particles = {
    init() {
      const box = document.getElementById('particles');
      const R = u.seeded(5);
      for (let i = 0; i < 28; i++) {
        const p = el('i', 'dust');
        const s = p.style;
        s.left = (700 + R() * 520) + 'px';
        s.top = (60 + R() * 600) + 'px';
        s.setProperty('--s', (1 + R() * 1.8).toFixed(1) + 'px');
        s.setProperty('--o', (0.2 + R() * 0.5).toFixed(2));
        s.setProperty('--dx', ((R() - 0.5) * 120).toFixed(0) + 'px');
        s.setProperty('--dy', ((R() - 0.6) * 200).toFixed(0) + 'px');
        const dur = 14 + R() * 16;
        s.setProperty('--d', dur.toFixed(1) + 's');
        s.setProperty('--delay', (-R() * dur).toFixed(1) + 's');
        box.appendChild(p);
      }
    }
  };

  /* ===================== FilmGrain: motas de película ===================== */
  LCI.FilmDust = {
    init() {
      const box = document.getElementById('filmdust');
      const move = sp => {
        sp.style.left = u.rand(40, 1880) + 'px';
        sp.style.top = u.rand(30, 1050) + 'px';
      };
      for (let i = 0; i < 7; i++) {
        const hair = i % 3 === 0;
        const sp = el('i', 'speck' + (hair ? ' speck--hair' : ''));
        const sz = hair ? u.rand(18, 40) : u.rand(2, 4);
        sp.style.width = sz + 'px';
        sp.style.height = (hair ? sz * 0.6 : sz) + 'px';
        sp.style.borderRadius = hair ? '50%' : '50%';
        sp.style.setProperty('--d', u.rand(3.2, 7.5).toFixed(2) + 's');
        sp.style.setProperty('--delay', (-u.rand(0, 6)).toFixed(2) + 's');
        move(sp);
        sp.addEventListener('animationiteration', () => move(sp));
        box.appendChild(sp);
      }
    }
  };

  /* ===================== BrandHeader + HUD ===================== */
  LCI.Brand = {
    render() {
      document.getElementById('brand').innerHTML = `
        <div class="brand__lamp"><i class="cord"></i><i class="shade"></i><i class="bulb"></i></div>
        <div class="brand__title"><span class="capsule-mark"></span><h1 data-glitch>${esc(C.brand.title)}</h1></div>
        <div class="brand__sub"><span class="led led--blink"></span><span>${esc(C.brand.subtitle)}</span></div>`;
    }
  };
  LCI.Hud = {
    render() {
      const h = C.hud || {};
      const pin = '<svg class="hud__pin" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.6"/></svg>';
      const when = [];
      if (h.showDate !== false) when.push('<span data-huddate>---</span>');
      when.push('<b class="hud__time" data-hudtime>--:--</b>');
      const where = h.showLocation !== false && h.location ? `<div class="hud__row hud__row--where">${pin}<span class="hud__loc">${esc(h.location)}</span></div>` : '';
      document.getElementById('hud').innerHTML = `
        <div class="hud hud--tl"><span class="k">CASE</span><b>#${esc(C.brand.caseNumber)}</b><span class="sep">/</span><span>FILE OPEN</span><span class="sep">/</span><span>${esc(C.brand.caseId)}</span></div>
        <div class="hud hud--tr">
          ${h.showElapsed !== false ? '<div class="hud__row hud__row--live"><span class="led led--blink"></span><b class="hud__rec">EN VIVO</b><b class="hud__elapsed" data-elapsed>00:00:00</b></div>' : ''}
          <div class="hud__row hud__row--sub">${when.join('<span class="sep">·</span>')}</div>
          ${where}
        </div>`;
      if (LCI.clock && LCI.clock.tick) { LCI.clock.setup(); LCI.clock.tick(); }
    }
  };

  /* ===================== CameraFrame ===================== */
  const STATUS = {
    LIVE: { led: 'led led--yellow', text: 'LIVE' },
    REC: { led: 'led led--blink', text: 'REC' },
    OFFLINE: { led: 'led led--off', text: 'OFFLINE', title: 'SIN SEÑAL', sub: 'OFFLINE' },
    WAITING: { led: 'led led--yellow led--blink', text: 'WAITING', title: 'EN ESPERA', sub: 'CONECTANDO TESTIGO' }
  };
  LCI.Cameras = {
    els: {},
    ensure(id) {
      if (this.els[id]) return this.els[id];
      const e = el('div', 'cam');
      e.dataset.cam = id;
      e.innerHTML = `
        <div class="cam__mount"></div>
        <div class="cam__inner">
          <div class="cam__preview"><div class="cam__preview-sil"></div><span>SEÑAL DE PRUEBA · CAM ${u.pad(id, 2)}</span></div>
          <div class="cam__scan" data-fx="scanlines"></div>
          <div class="cam__noise" data-fx="cameraNoise"></div>
          <div class="cam__vhs" data-fx="vhs"></div>
          <div class="cam__dim"></div>
          <div class="cam__glitch"></div>
          <div class="cam__state"><div class="cam__state-noise"></div><b class="cam__state-title"></b><span class="cam__state-sub"></span></div>
          <i class="cam__br b1"></i><i class="cam__br b2"></i><i class="cam__br b3"></i><i class="cam__br b4"></i>
        </div>
        <i class="cam__corner cam__corner--tl"></i><i class="cam__corner cam__corner--br"></i>
        <i class="tape-bit tape-bit--tr"></i><i class="tape-bit tape-bit--bl"></i>
        <div class="cam__tag" data-glitch><span class="led"></span><b class="cam__label"></b><span class="cam__status"></span></div>
        <div class="cam__meta"><span>LIVE FEED</span><span class="sep">·</span><span data-clock>--:--:--</span></div>
        <div class="cam__foot"><span class="cam__subject"></span><span class="sep">·</span><span>CASE ${esc(C.brand.caseNumber)}</span></div>`;
      document.getElementById('cams').appendChild(e);
      this.els[id] = e;
      this.update(id);
      return e;
    },
    update(id, patch) {
      const key = 'camera' + id;
      C[key] = Object.assign(C[key] || {}, patch || {});
      const cfg = C[key];
      const e = this.els[id];
      if (!e) return;
      const st = STATUS[String(cfg.status || 'LIVE').toUpperCase()] || STATUS.LIVE;
      e.dataset.status = st.text;
      e.querySelector('.cam__tag .led').className = st.led;
      e.querySelector('.cam__label').textContent = cfg.label || 'CAM ' + u.pad(id, 2);
      e.querySelector('.cam__status').textContent = st.text;
      e.querySelector('.cam__subject').textContent = cfg.subject || '';
      e.querySelector('.cam__state-title').textContent = st.title || '';
      e.querySelector('.cam__state-sub').textContent = st.sub ? `${cfg.label || 'CAM ' + u.pad(id, 2)} · ${st.sub}` : '';
    },
    place(id, r) {
      const e = this.ensure(id);
      Object.assign(e.style, { left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px' });
      e.dataset.size = r.w >= 1000 ? 'lg' : r.w >= 760 ? 'md' : 'sm';
      e.hidden = false;
    },
    hideAll() { Object.values(this.els).forEach(e => { e.hidden = true; }); },
    // Cambio de cámara: interferencia CCTV breve dentro del marco
    switchFx(id, patch) {
      const e = this.els[id];
      if (!e || e.hidden) { this.update(id, patch); return; }
      const g = e.querySelector('.cam__glitch');
      LCI.sound.play('static');
      u.anim(g, [{ opacity: 0 }, { opacity: 0.9, offset: 0.15 }, { opacity: 0.25, offset: 0.4 }, { opacity: 0.75, offset: 0.55 }, { opacity: 0 }],
        { duration: 380, easing: 'steps(6, end)', fill: 'none' });
      const tag = e.querySelector('.cam__tag');
      tag.classList.add('is-glitch');
      setTimeout(() => { this.update(id, patch); tag.classList.remove('is-glitch'); }, 160);
    }
  };

  /* ===================== EvidenceTape ===================== */
  LCI.Tape = {
    make(text, opts = {}) {
      const w = opts.w || 1200;
      const e = el('div', 'tape' + (opts.size === 'xl' ? ' tape--xl' : ''));
      const unitW = String(text).length * (opts.size === 'xl' ? 40 : 15) + 80;
      const unit = `<span>${esc(text)}</span><i></i>`;
      e.innerHTML = `<div class="tape__run">${unit.repeat(Math.ceil(w / unitW) + 2)}</div>`;
      e.style.width = w + 'px';
      return e;
    },
    place(list, animate) {
      const box = document.getElementById('tapes');
      box.innerHTML = '';
      (list || []).forEach((t, i) => {
        const e = this.make(t.text, { w: t.w });
        Object.assign(e.style, { left: t.x + 'px', top: t.y + 'px', transform: `rotate(${t.rot || 0}deg)` });
        box.appendChild(e);
        if (animate) {
          const from = t.x < 960 ? -t.w - 200 : t.w + 200;
          u.anim(e, [{ transform: `rotate(${t.rot || 0}deg) translateX(${from}px)` }, { transform: `rotate(${t.rot || 0}deg) translateX(0)` }],
            { duration: 620, delay: 140 + i * 90, easing: 'cubic-bezier(.2,.8,.2,1)' });
        }
      });
    }
  };

  /* ===================== Papeles, hilo rojo y marcas (InvestigationMarker / InvestigationLine) ===================== */
  const DECOR = {
    single: {
      papers: [
        { k: 'photo', x: 46, y: 236, w: 178, h: 206, r: -5, pin: [89, 8], dim: 0.5 },
        { k: 'doc', x: -34, y: 500, w: 262, h: 330, r: 3, pin: [150, 10], dim: 0.55, title: 'INFORME 17-B' },
        { k: 'note', x: 52, y: 868, w: 150, h: 112, r: -4, text: '¿23:41?', dim: 0.38 },
        { k: 'news', x: 1668, y: 226, w: 226, h: 286, r: 4, pin: [110, 10], dim: 0.55 },
        { k: 'map', x: 1700, y: 560, w: 250, h: 230, r: -3, pin: [90, 12], dim: 0.5 },
        { k: 'note', x: 1700, y: 836, w: 150, h: 112, r: 5, text: 'no encaja', dim: 0.38 }
      ],
      strings: [[135, 244, 1778, 236], [116, 510, 1790, 572]],
      marks: [
        { k: 'circle', x: 40, y: 690, w: 150, h: 46, r: -4 },
        { k: 'arrow', x1: 1770, y1: 832, x2: 1800, y2: 778 },
        { k: 'underline', x: 1690, y: 436, w: 160 },
        { k: 'num', x: 26, y: 238, t: '1' },
        { k: 'num', x: 1646, y: 228, t: '2' }
      ]
    },
    dual: {
      papers: [
        { k: 'photo', x: 1586, y: 132, w: 160, h: 150, r: 6, pin: [80, 8], dim: 0.45 },
        { k: 'doc', x: -70, y: 744, w: 250, h: 310, r: -4, pin: [150, 10], dim: 0.55, title: 'DECLARACIÓN' },
        { k: 'news', x: 1480, y: 826, w: 270, h: 236, r: 3, pin: [130, 10], dim: 0.55 },
        { k: 'note', x: 986, y: 836, w: 156, h: 116, r: -5, pin: [78, 10], text: '¿coinciden?', dim: 0.38 }
      ],
      strings: [[1064, 846, 860, 690], [80, 754, 1610, 836]],
      marks: [
        { k: 'circle', x: 1500, y: 905, w: 170, h: 50, r: 3 },
        { k: 'arrow', x1: 1074, y1: 830, x2: 1012, y2: 800 },
        { k: 'num', x: 1550, y: 124, t: '3' }
      ]
    },
    evidence: {
      papers: [
        { k: 'doc', x: 1712, y: 118, w: 236, h: 300, r: 6, pin: [100, 10], dim: 0.6, title: 'ANEXO 4' },
        { k: 'map', x: 1340, y: 866, w: 250, h: 210, r: -3, pin: [120, 10], dim: 0.5 },
        { k: 'note', x: 1640, y: 872, w: 160, h: 118, r: 6, pin: [80, 10], text: '¿quién la tomó?', dim: 0.38 },
        { k: 'news', x: -80, y: 874, w: 250, h: 220, r: 4, dim: 0.55 }
      ],
      strings: [[1812, 128, 1460, 876], [1720, 882, 1264, 560]],
      marks: [
        { k: 'circle', x: 1370, y: 930, w: 150, h: 60, r: -6 },
        { k: 'num', x: 1288, y: 862, t: '?' }
      ]
    },
    dualEvidence: {
      papers: [
        { k: 'note', x: 1676, y: 656, w: 156, h: 118, r: 4, pin: [78, 10], text: '¿mismo lugar?', dim: 0.38 },
        { k: 'doc', x: 1716, y: 806, w: 240, h: 290, r: -3, pin: [120, 10], dim: 0.55, title: 'REGISTRO' },
        { k: 'news', x: 744, y: 808, w: 270, h: 230, r: 3, pin: [135, 10], dim: 0.55 }
      ],
      strings: [[1754, 666, 1520, 600], [879, 818, 1200, 760]],
      marks: [
        { k: 'circle', x: 770, y: 884, w: 170, h: 52, r: 2 },
        { k: 'arrow', x1: 1690, y1: 700, x2: 1640, y2: 742 }
      ]
    },
    // Lienzo vertical 1080×1920: cámara (y 180-720) + evidencia (y 790-1590) ocupan el centro,
    // así que el decorado va en los márgenes libres (bordes y franja superior) para no taparlas.
    vertical: {
      papers: [
        { k: 'photo', x: 18, y: 130, w: 126, h: 148, r: -6, pin: [63, 8], dim: 0.5 },
        { k: 'note', x: 924, y: 140, w: 140, h: 108, r: 5, text: '¿hora exacta?', dim: 0.38 },
        { k: 'doc', x: -46, y: 870, w: 206, h: 262, r: 4, pin: [100, 10], dim: 0.55, title: 'ANEXO 4' },
        { k: 'map', x: 912, y: 930, w: 200, h: 188, r: -4, pin: [90, 10], dim: 0.5 },
        // Más pegado a la evidencia (la tarjeta visible termina antes de los 1620 de la caja).
        { k: 'note', x: 60, y: 1470, w: 190, h: 128, r: -5, pin: [95, 10], text: 'archivo cerrado', dim: 0.38 },
        { k: 'news', x: 700, y: 1440, w: 260, h: 220, r: 4, pin: [130, 10], dim: 0.55 }
      ],
      strings: [[90, 270, 960, 190], [60, 930, 1000, 990], [250, 1534, 700, 1500]],
      marks: [
        { k: 'num', x: 24, y: 132, t: '1' },
        { k: 'num', x: 930, y: 142, t: '2' },
        { k: 'underline', x: 150, y: 810, w: 140 },
        { k: 'circle', x: 330, y: 1800, w: 170, h: 50, r: -2 }
      ]
    },
    // V2 (1080×1920): cámara y 560-1122, lower third ~1180-1300; decorado en la franja superior
    // (y 150-500) y la inferior (y 1340-1800).
    verticalSingle: {
      papers: [
        { k: 'photo', x: 60, y: 200, w: 200, h: 236, r: -5, pin: [100, 8], dim: 0.5 },
        { k: 'news', x: 400, y: 190, w: 260, h: 260, r: 3, pin: [130, 10], dim: 0.55 },
        { k: 'note', x: 800, y: 230, w: 160, h: 120, r: 6, text: '¿23:41?', dim: 0.38 },
        { k: 'doc', x: 80, y: 1360, w: 240, h: 300, r: 4, pin: [120, 10], dim: 0.55, title: 'INFORME 17-B' },
        { k: 'map', x: 720, y: 1380, w: 260, h: 240, r: -3, pin: [130, 12], dim: 0.5 },
        { k: 'note', x: 420, y: 1500, w: 160, h: 120, r: -4, text: 'no encaja', dim: 0.38 }
      ],
      strings: [[160, 210, 530, 200], [200, 1370, 850, 1392]],
      marks: [
        { k: 'num', x: 40, y: 202, t: '1' },
        { k: 'num', x: 700, y: 1380, t: '2' },
        { k: 'circle', x: 410, y: 1640, w: 180, h: 50, r: -3 }
      ]
    },
    // V3 (1080×1920): cámaras y 200-718 y 790-1308, lower third ~1380-1480; decorado en la franja
    // inferior (y 1500-1800) y esquinas superiores pequeñas.
    verticalDual: {
      papers: [
        { k: 'photo', x: 20, y: 40, w: 120, h: 140, r: -6, pin: [60, 8], dim: 0.45 },
        { k: 'doc', x: 60, y: 1520, w: 230, h: 280, r: -4, pin: [115, 10], dim: 0.55, title: 'DECLARACIÓN' },
        { k: 'note', x: 430, y: 1560, w: 170, h: 124, r: 4, pin: [85, 10], text: '¿coinciden?', dim: 0.38 },
        { k: 'news', x: 740, y: 1520, w: 260, h: 250, r: 3, pin: [130, 10], dim: 0.55 }
      ],
      strings: [[175, 1530, 870, 1530], [515, 1570, 870, 1530]],
      marks: [
        { k: 'num', x: 26, y: 42, t: '3' },
        { k: 'circle', x: 760, y: 1700, w: 170, h: 50, r: 3 }
      ]
    },
    // V4 (1080×1920): cam1 y 180-720, cam2 x 300-1020 y 760-1165, evidencia y 1210-1650,
    // lower third ~1700. El decorado va en la columna libre a la izquierda de cam2 (x 0-280).
    verticalDualEvidence: {
      papers: [
        { k: 'note', x: 40, y: 790, w: 200, h: 130, r: -5, pin: [100, 10], text: '¿mismo lugar?', dim: 0.38 },
        { k: 'doc', x: 30, y: 950, w: 220, h: 230, r: 4, pin: [110, 10], dim: 0.55, title: 'REGISTRO' },
        { k: 'photo', x: 20, y: 40, w: 120, h: 130, r: -6, pin: [60, 8], dim: 0.45 }
      ],
      strings: [[140, 800, 300, 760], [140, 960, 300, 1100]],
      marks: [
        { k: 'arrow', x1: 220, y1: 860, x2: 280, y2: 840 },
        { k: 'num', x: 26, y: 42, t: '1' }
      ]
    }
  };

  function roughEllipse(cx, cy, rx, ry, R) {
    const steps = 30, turns = 1.12, start = R() * Math.PI * 2;
    let d = '';
    for (let i = 0; i <= steps; i++) {
      const t = start + (i / steps) * Math.PI * 2 * turns;
      const j = 1 + (R() - 0.5) * 0.08 + (i / steps) * 0.05;
      d += (i ? 'L' : 'M') + (cx + Math.cos(t) * rx * j).toFixed(1) + ' ' + (cy + Math.sin(t) * ry * j).toFixed(1);
    }
    return d;
  }

  function paperHTML(p, R) {
    switch (p.k) {
      case 'doc': {
        let red = '';
        for (let i = 0; i < 3; i++) red += `<i class="redact" style="left:${14 + R() * 30}px;top:${70 + R() * (p.h - 120)}px;width:${40 + R() * (p.w - 110)}px"></i>`;
        return `<div class="pp-head"><span>${esc(p.title || 'INFORME')}</span><span>CONF.</span></div><div class="pp-lines"></div>${red}`;
      }
      case 'photo': return '<div class="pp-img"></div>';
      case 'news': return '<div class="pp-mast">EL VESPERTINO</div><div class="pp-headline"></div><div class="pp-cols"></div>';
      case 'map': return '<svg class="pp-map" viewBox="0 0 100 100" preserveAspectRatio="none"><path d="M6 84 C 22 64, 34 74, 48 50 S 72 22, 94 16"/><path d="M10 20 L 40 34 L 60 30 L 88 60"/></svg>';
      case 'note': return `<div class="pp-note">${esc(p.text || '')}</div>`;
      default: return '';
    }
  }

  LCI.Decor = {
    render(key) {
      const d = DECOR[key];
      const papersBox = document.getElementById('decor-papers');
      const svg = document.getElementById('decor-svg');
      papersBox.innerHTML = '';
      svg.innerHTML = '';
      if (!d) return;
      const R = u.seeded(key.length * 97 + 3);
      d.papers.forEach(p => {
        const e = el('div', 'paper paper--' + p.k, paperHTML(p, R));
        Object.assign(e.style, { left: p.x + 'px', top: p.y + 'px', width: p.w + 'px', height: p.h + 'px', transform: `rotate(${p.r || 0}deg)` });
        e.style.setProperty('--dim', p.dim == null ? 0.55 : p.dim);
        papersBox.appendChild(e);
        if (p.pin) {
          const pin = el('i', 'pin');
          pin.style.left = (p.x + p.pin[0]) + 'px';
          pin.style.top = (p.y + p.pin[1]) + 'px';
          papersBox.appendChild(pin);
        }
      });
      const NS = 'http://www.w3.org/2000/svg';
      const path = (dAttr, cls, delay) => {
        const n = document.createElementNS(NS, 'path');
        n.setAttribute('d', dAttr);
        n.setAttribute('class', cls);
        n.setAttribute('pathLength', '1');
        if (delay != null) n.style.setProperty('--dl', delay + 'ms');
        return n;
      };
      const strings = document.createElementNS(NS, 'g');
      strings.setAttribute('data-fx', 'papers');
      const marks = document.createElementNS(NS, 'g');
      marks.setAttribute('data-fx', 'markers');
      d.strings.forEach(([x1, y1, x2, y2], i) => {
        const cx = (x1 + x2) / 2, cy = Math.max(y1, y2) + 70;
        const dd = `M${x1} ${y1} Q${cx} ${cy} ${x2} ${y2}`;
        const sh = path(dd, 'string-shadow draw', 300 + i * 220);
        sh.setAttribute('transform', 'translate(3 6)');
        strings.appendChild(sh);
        strings.appendChild(path(dd, 'string draw', 300 + i * 220));
      });
      d.marks.forEach((m, i) => {
        const delay = 700 + i * 160;
        if (m.k === 'circle') {
          const n = path(roughEllipse(m.x + m.w / 2, m.y + m.h / 2, m.w / 2, m.h / 2, R), 'mark draw', delay);
          n.setAttribute('transform', `rotate(${m.r || 0} ${m.x + m.w / 2} ${m.y + m.h / 2})`);
          marks.appendChild(n);
        } else if (m.k === 'arrow') {
          const mx = (m.x1 + m.x2) / 2 + 16, my = (m.y1 + m.y2) / 2 - 8;
          marks.appendChild(path(`M${m.x1} ${m.y1} Q${mx} ${my} ${m.x2} ${m.y2}`, 'mark draw', delay));
          const a = Math.atan2(m.y2 - my, m.x2 - mx);
          const h1 = [m.x2 - Math.cos(a - 0.5) * 16, m.y2 - Math.sin(a - 0.5) * 16];
          const h2 = [m.x2 - Math.cos(a + 0.5) * 16, m.y2 - Math.sin(a + 0.5) * 16];
          marks.appendChild(path(`M${h1[0].toFixed(1)} ${h1[1].toFixed(1)} L${m.x2} ${m.y2} L${h2[0].toFixed(1)} ${h2[1].toFixed(1)}`, 'mark draw', delay + 420));
        } else if (m.k === 'underline') {
          let dd = `M${m.x} ${m.y}`;
          for (let s = 1; s <= 6; s++) dd += ` L${(m.x + (m.w / 6) * s).toFixed(1)} ${(m.y + (s % 2 ? 3 : -2) + (R() - 0.5) * 2).toFixed(1)}`;
          marks.appendChild(path(dd, 'mark draw', delay));
        } else if (m.k === 'num') {
          const t = document.createElementNS(NS, 'text');
          t.setAttribute('x', m.x);
          t.setAttribute('y', m.y);
          t.setAttribute('font-size', m.size || 34);
          t.setAttribute('class', 'mark-text fade-in');
          t.style.setProperty('--dl', delay + 'ms');
          t.textContent = m.t;
          marks.appendChild(t);
        }
      });
      svg.appendChild(strings);
      svg.appendChild(marks);
    }
  };

  /* ===================== EvidenceFrame / Evidence Engine ===================== */
  const TYPES = {
    photo: { label: 'FOTOGRAFÍA', style: 'print' },
    image: { label: 'IMAGEN', style: 'print' },
    profile: { label: 'PERFIL', style: 'print' },
    video: { label: 'VIDEO', style: 'print' },
    document: { label: 'DOCUMENTO', style: 'sheet' },
    news: { label: 'NOTICIA', style: 'sheet' },
    map: { label: 'MAPA', style: 'sheet' },
    clipping: { label: 'RECORTE', style: 'sheet' },
    archive: { label: 'ARCHIVO', style: 'sheet' },
    capture: { label: 'CAPTURA', style: 'capture' },
    social: { label: 'RED SOCIAL', style: 'capture' },
    message: { label: 'MENSAJE', style: 'capture' }
  };
  const EV_FAIL = { missing: 'ARCHIVO NO ENCONTRADO', format: 'ARCHIVO NO COMPATIBLE' };
  // Chrome da el mismo error para archivo inexistente y corrupto: se decide por la fuente.
  function failReason(src) {
    const s = String(src || '');
    if (/^(data|blob):/i.test(s)) return 'format';
    const ext = (s.split(/[?#]/)[0].match(/\.([a-z0-9]+)$/i) || [])[1] || '';
    return /^(jpe?g|png|gif|webp|avif|svg|bmp|ico|mp4|webm|mov|m4v|ogv)$/i.test(ext) ? 'missing' : 'format';
  }
  const shortSrc = s => (/^data:/i.test(s) ? s.slice(0, Math.min(40, s.indexOf(',') + 1 || 40)) + '…' : s.split(/[\\/]/).pop().slice(0, 60));
  const isVideo = s => /\.(mp4|webm|mov)(\?|$)/i.test(String(s || '')) || /^data:video\//.test(String(s || ''));

  LCI.Evidence = {
    types: TYPES,
    rect: null,
    root() { return document.getElementById('evidence'); },
    place(r) {
      const root = this.root();
      this.rect = r && C.evidence.enabled !== false ? r : null;
      if (!this.rect) { root.hidden = true; root.innerHTML = ''; return; }
      root.hidden = false;
      root.classList.toggle('is-compact', !!r.compact);
      Object.assign(root.style, { left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px' });
      root.style.setProperty('--ev-mw', (r.compact ? r.w - 320 : r.w - 60) + 'px');
      root.style.setProperty('--ev-mh', (r.compact ? r.h - 100 : r.h - 170) + 'px');
      this.render(false);
    },
    markup(ev) {
      const t = TYPES[ev.type] || TYPES.photo;
      const time = ev.timestamp && ev.timestamp !== 'auto' ? ev.timestamp : (ev._time || u.time12());
      const src = esc(ev.image || '');
      const media = ev.image
        ? (isVideo(ev.image) ? `<video src="${src}" autoplay muted loop playsinline></video>` : `<img src="${src}" alt="">`)
        : `<div class="ev__empty"><b>EN ESPERA DE EVIDENCIA</b><span>ARCHIVO PENDIENTE</span></div>`;
      const head = t.style === 'sheet' ? `<div class="ev__sheet-head"><span>${t.label}</span><span>${esc(C.brand.caseId)}</span></div>` : '';
      const foot = t.style === 'print' ? `<div class="ev__caption">${esc(ev.caption || 'ARCHIVO RECUPERADO')}</div>`
        : t.style === 'capture' ? `<div class="ev__printed">IMPRESO · ${esc(time)}</div>` : '';
      return `
        <div class="ev__obj ev--${t.style}">${head}<div class="ev__media">${media}</div>${foot}
          <i class="ev__tape"></i>${t.style === 'capture' ? '<i class="ev__clip"></i>' : ''}</div>
        <div class="ev__marker"><small>EVIDENCIA</small><b>#<span class="ev__num">${u.pad(ev.number || 1)}</span></b></div>
        <div class="ev__card">
          <div class="ev__line" data-text="${esc(C.brand.caseId)}"><span class="k">CASO</span><span class="v">${esc(C.brand.caseId)}</span></div>
          <div class="ev__line" data-text="${esc(time)}"><span class="k">HORA</span><span class="v">${esc(time)}</span></div>
          <div class="ev__line" data-text="${t.label}"><span class="k">TIPO</span><span class="v">${t.label}</span></div>
          ${ev.description ? `<div class="ev__desc">${esc(ev.description)}</div>` : ''}
        </div>`;
    },
    // Comprueba que la imagen/video cargue; si no, cambia el medio por "EVIDENCIA NO DISPONIBLE" (nunca un ícono roto).
    async probe(g, ev) {
      const m = g.querySelector('.ev__media img, .ev__media video');
      if (!m) return true;
      const src = String(ev.image || '');
      let failed = false;
      const fail = reason => {
        if (failed) return;
        failed = true;
        const box = g.querySelector('.ev__media');
        if (box) box.innerHTML = `<div class="ev__empty ev__empty--fail"><b>EVIDENCIA NO DISPONIBLE</b><i class="ev__fail-rule"></i><span>${EV_FAIL[reason]}</span></div>`;
        LCI.devlog.push(`EVIDENCIA #${u.pad(ev.number || 1)} NO DISPONIBLE · ${EV_FAIL[reason]} (${shortSrc(src)})`);
      };
      m.addEventListener('error', () => {
        const err = m.error; // solo video
        const fmt = err && (err.code === 3 || /DEMUXER|decode/i.test(err.message || ''));
        fail(fmt ? 'format' : failReason(src));
      }, { once: true });
      if (m.tagName === 'IMG') {
        let ok = true;
        if (m.decode) { try { await m.decode(); } catch (e) { ok = false; } }
        if (ok && m.complete && !m.naturalWidth) ok = false;
        if (!ok) fail(failReason(src));
        return ok;
      }
      // video: espera metadatos o error (máx. 1,5 s) para entrar ya con su tamaño real
      if (m.readyState >= 1) return true;
      await new Promise(res => {
        const t = setTimeout(done, 1500);
        function done() { clearTimeout(t); m.removeEventListener('loadedmetadata', done); m.removeEventListener('error', done); res(); }
        m.addEventListener('loadedmetadata', done);
        m.addEventListener('error', done);
      });
      return !failed;
    },
    seq: 0,
    async render(animate) {
      if (!this.rect) return;
      // Solo el render más reciente llega a pintar (evita evidencias duplicadas si llegan comandos seguidos).
      const seq = ++this.seq;
      const root = this.root();
      const ev = C.evidence;
      const tilt = this.rect.tilt || 0;
      const old = root.querySelector('.ev__group');
      if (old && animate) {
        await u.anim(old, [{ transform: 'translate(0,0) rotate(0deg)', opacity: 1 }, { transform: 'translate(70px,40px) rotate(9deg)', opacity: 0 }],
          { duration: 240, easing: 'cubic-bezier(.6,0,.9,.4)' });
      }
      if (seq !== this.seq) return;
      const g = el('div', 'ev__group', this.markup(ev));
      const obj = g.querySelector('.ev__obj');
      obj.style.transform = `rotate(${tilt}deg)`;
      await this.probe(g, ev);
      if (seq !== this.seq) return;
      root.querySelectorAll('.ev__group').forEach(n => n.remove());
      root.appendChild(g);
      if (!animate) return;
      const mk = g.querySelector('.ev__marker'), card = g.querySelector('.ev__card'), num = g.querySelector('.ev__num');
      mk.style.opacity = 0;
      card.style.opacity = 0;
      LCI.fx.flash({ opacity: 0.5, duration: 420 });
      LCI.sound.play('shutter');
      await u.anim(obj, [
        { transform: `translateY(-90px) rotate(${tilt + 7}deg) scale(1.08)`, opacity: 0 },
        { opacity: 1, offset: 0.5 },
        { transform: `translateY(0) rotate(${tilt}deg) scale(1)`, opacity: 1 }
      ], { duration: 560, easing: 'cubic-bezier(.2,.8,.2,1)' });
      u.anim(mk, [{ transform: 'scale(.4) rotate(-14deg)', opacity: 0 }, { transform: 'scale(1) rotate(-4deg)', opacity: 1 }],
        { duration: 260, easing: 'cubic-bezier(.3,1.4,.5,1)' });
      const target = Number(ev.number) || 1;
      for (let i = 0; i <= 6; i++) { num.textContent = u.pad(Math.round((target * i) / 6)); await u.wait(40); }
      card.style.opacity = 1;
      for (const line of card.querySelectorAll('.ev__line .v')) {
        await u.typewrite(line, line.parentNode.dataset.text, 18);
      }
    },
    async show(patch, opts = {}) {
      const p = Object.assign({}, patch || {});
      if (p.image || p.number != null) p._time = u.time12();
      Object.assign(C.evidence, p);
      LCI.state.save({ evidence: C.evidence });
      if (!this.rect) return;
      await this.render(opts.animate !== false);
    }
  };

  /* ===================== LowerThird ===================== */
  LCI.LowerThird = {
    node: null,
    pos: { x: 112, y: 812 },
    anchor(p) {
      if (p) this.pos = p;
      if (this.node) { this.node.style.left = this.pos.x + 'px'; this.node.style.top = this.pos.y + 'px'; }
    },
    async show(patch) {
      Object.assign(C.lowerThird, patch || {});
      LCI.state.save({ lowerThird: C.lowerThird, lowerThirdVisible: true });
      if (this.node) await this.hide(true);
      const d = C.lowerThird;
      const words = String(d.name || '').trim().split(/\s+/).map(w => `<span class="w">${esc(w)}</span>`).join(' ');
      const e = el('div', 'lt', `
        <div class="lt__tab"><span class="capsule-mark"></span><span>${esc(d.label || 'EXPEDIENTE')} #${u.pad(d.number || 1)}</span></div>
        <div class="lt__paper"><div class="lt__name">${words}</div><div class="lt__role"></div><i class="lt__clip"></i></div>`);
      this.node = e;
      this.anchor();
      document.getElementById('lowerthird').appendChild(e);
      const tab = e.querySelector('.lt__tab'), paper = e.querySelector('.lt__paper'), role = e.querySelector('.lt__role');
      const ws = [...e.querySelectorAll('.lt__name .w')];
      ws.forEach(w => { w.style.opacity = 0; });
      LCI.sound.play('paper');
      u.anim(tab, [{ transform: 'translateX(-30px)', opacity: 0 }, { transform: 'translateX(0)', opacity: 1 }], { duration: 260, easing: 'cubic-bezier(.2,.8,.2,1)' });
      await u.anim(paper, [{ clipPath: 'inset(-40px 100% -40px 0)' }, { clipPath: 'inset(-40px 0% -40px 0)' }], { duration: 460, delay: 90, easing: 'cubic-bezier(.65,0,.2,1)' });
      paper.style.clipPath = '';
      ws.forEach((w, i) => u.anim(w, [{ transform: 'translateY(10px)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }], { duration: 260, delay: i * 70, easing: 'cubic-bezier(.2,.8,.2,1)' }));
      await u.wait(ws.length * 70 + 120);
      await u.typewrite(role, d.role || '', 20);
    },
    async hide(keepState) {
      if (!this.node) return;
      const e = this.node;
      this.node = null;
      if (!keepState) LCI.state.save({ lowerThirdVisible: false });
      await u.anim(e, [{ opacity: 1, transform: 'translateX(0)' }, { opacity: 0, transform: 'translateX(-24px)' }], { duration: 280, easing: 'ease-in' });
      e.remove();
    }
  };

  /* ===================== CaseStamp ===================== */
  const STAMP_COLOR = { ARCHIVADO: 'gray', PENDIENTE: 'gray' };
  async function slam(stamp) {
    LCI.sound.play('stamp');
    await u.anim(stamp, [
      { transform: 'scale(2.3) rotate(-12deg)', opacity: 0 },
      { transform: 'scale(.95) rotate(-6deg)', opacity: 1, offset: 0.75 },
      { transform: 'scale(1) rotate(-6deg)', opacity: 1 }
    ], { duration: 250, easing: 'cubic-bezier(.55,0,.75,.2)' });
  }
  LCI.Stamps = {
    async show(text, color) {
      const t = String(text || 'CONFIDENCIAL').toUpperCase().slice(0, 28);
      const col = ['red', 'gray', 'green', 'amber'].includes(color) ? color : (STAMP_COLOR[t] || 'red');
      const st = el('div', 'stamp stamp--' + col, `<span>${esc(t)}</span>`);
      const group = document.querySelector('#evidence:not([hidden]) .ev__group');
      let host;
      if (group) {
        host = el('div', 'stamp-pos');
        host.appendChild(st);
        group.appendChild(host);
      } else {
        const a = (LCI.layout && LCI.layout.alert) || { x: 1600, y: 116 };
        host = el('div', 'alert');
        host.style.left = a.x + 'px';
        host.style.top = a.y + 'px';
        const slip = el('div', 'stamp-slip');
        slip.appendChild(st);
        host.appendChild(slip);
        document.getElementById('alerts').appendChild(host);
      }
      await slam(st);
      await u.wait(2600);
      await u.anim(host, [{ opacity: 1 }, { opacity: 0 }], { duration: 380, easing: 'ease-in' });
      host.remove();
    }
  };

  /* ===================== AlertSystem ===================== */
  LCI.Alerts = {
    queue: Promise.resolve(),
    show(text) { this.queue = this.queue.then(() => this.run(text)); return this.queue; },
    async run(text) {
      const a = (LCI.layout && LCI.layout.alert) || { x: 1600, y: 116 };
      const e = el('div', 'alert', `
        <div class="alert__tag"><span class="led led--blink"></span><span>ACTUALIZACIÓN DEL CASO</span></div>
        <div class="stamp-slip"><div class="stamp"><span>${esc(String(text || 'ATENCIÓN').toUpperCase())}</span></div></div>
        <div class="alert__meta"></div>`);
      e.style.left = a.x + 'px';
      e.style.top = a.y + 'px';
      document.getElementById('alerts').appendChild(e);
      const tag = e.querySelector('.alert__tag'), slip = e.querySelector('.stamp-slip'), st = e.querySelector('.stamp'), meta = e.querySelector('.alert__meta');
      st.style.opacity = 0;
      LCI.fx.edge();
      LCI.sound.play('alert');
      u.anim(tag, [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)' }], { duration: 260, easing: 'cubic-bezier(.65,0,.2,1)' });
      u.anim(slip, [{ transform: 'translateY(-14px) rotate(-3deg)', opacity: 0 }, { transform: 'translateY(0) rotate(-3deg)', opacity: 1 }], { duration: 220, delay: 60, easing: 'ease-out' });
      await u.wait(150);
      await slam(st);
      u.anim(slip, [{ transform: 'translate(0,0) rotate(-3deg)' }, { transform: 'translate(2px,3px) rotate(-3.5deg)' }, { transform: 'translate(0,0) rotate(-3deg)' }], { duration: 150 });
      u.typewrite(meta, `${u.clock()} · CASE #${C.brand.caseNumber}`, 22);
      await u.wait(3400);
      await u.anim(e, [{ opacity: 1 }, { opacity: 0 }], { duration: 380, easing: 'ease-in' });
      e.remove();
    }
  };

  /* ===================== FocusSystem: enfoca una evidencia o una cámara y vuelve solo ===================== */
  // Estado en el DOM: body[data-focus="evidence|camN"] mientras dura; .cam.is-focus / .cam.is-unfocus;
  // body[data-focus-fx] mantiene 420 ms de transición en .cam__dim también al volver (el outro conserva su 1,1 s).
  const FOCUS_MS = 6000, FOCUS_RELEASE = 480;
  LCI.Focus = {
    target: null, timer: 0, releaseTimer: 0, watch: null,
    parse(t) {
      const s = String(t == null ? '' : t).toLowerCase().replace(/[\s_-]/g, '');
      if (!s || s === 'none' || s === 'off') return 'none';
      if (s === 'evidence' || s === 'evidencia') return 'evidence';
      const m = s.match(/^(?:cam|camera|camara)0*(\d+)$/);
      return m ? 'cam' + Number(m[1]) : null;
    },
    label(t) { return t === 'evidence' ? 'EVIDENCIA #' + u.pad(C.evidence.number || 1) : 'CAM ' + u.pad(t.slice(3), 2); },
    available(t) {
      if (t === 'evidence') { const r = document.getElementById('evidence'); return !!(LCI.Evidence.rect && r && !r.hidden); }
      const e = LCI.Cameras.els[t.slice(3)];
      return !!(e && !e.hidden);
    },
    layer() {
      let l = document.getElementById('atm-focus');
      if (!l) {
        l = el('div', 'layer atm-focus');
        l.id = 'atm-focus';
        document.getElementById('atmosphere').appendChild(l);
        void getComputedStyle(l).opacity; // fija el estado inicial para que la transición corra
      }
      return l;
    },
    set(target, ms) {
      const t = this.parse(target);
      if (t === 'none') { this.clear(); return true; }
      if (!t) { LCI.devlog.push(`FOCUS → "${target}" no reconocido`); return false; }
      if (document.body.classList.contains('is-outro')) { LCI.devlog.push('FOCUS ignorado: outro en curso'); return false; }
      if (!this.available(t)) { LCI.devlog.push(`FOCUS → ${this.label(t)} no está en esta escena (ignorado)`); return false; }
      clearTimeout(this.timer); this.timer = 0;
      clearTimeout(this.releaseTimer); this.releaseTimer = 0;
      this.layer();
      const b = document.body;
      b.dataset.focusFx = '1';
      b.dataset.focus = t;
      Object.keys(LCI.Cameras.els).forEach(id => {
        const e = LCI.Cameras.els[id];
        e.classList.toggle('is-focus', t === 'cam' + id);
        e.classList.toggle('is-unfocus', t !== 'cam' + id);
      });
      if (!this.watch && typeof MutationObserver !== 'undefined') {
        this.watch = new MutationObserver(() => { if (b.classList.contains('is-outro')) this.clear(); });
        this.watch.observe(b, { attributes: true, attributeFilter: ['class'] });
      }
      const n = Number(ms);
      const dur = ms == null || ms === '' || !isFinite(n) || n < 0 ? FOCUS_MS : Math.min(n, 3600000);
      if (dur > 0) this.timer = setTimeout(() => { this.timer = 0; this.clear(); }, dur);
      this.target = t;
      LCI.sound.play('beep');
      LCI.devlog.push(`FOCUS → ${this.label(t)} · ${dur ? (dur / 1000) + ' s' : 'fijo'}`);
      return true;
    },
    clear() {
      clearTimeout(this.timer); this.timer = 0;
      if (this.watch) { this.watch.disconnect(); this.watch = null; }
      if (!this.target) return false;
      const prev = this.target, b = document.body;
      this.target = null;
      delete b.dataset.focus;
      Object.values(LCI.Cameras.els).forEach(e => e.classList.remove('is-focus', 'is-unfocus'));
      clearTimeout(this.releaseTimer);
      this.releaseTimer = setTimeout(() => { this.releaseTimer = 0; if (!this.target) delete b.dataset.focusFx; }, FOCUS_RELEASE);
      LCI.devlog.push(`FOCUS → OFF (${this.label(prev)})`);
      return true;
    }
  };
  LCI.bus.on('scene', () => LCI.Focus.clear());
})();
