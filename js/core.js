/* La Cápsula Insólita — núcleo: utilidades, estado, efectos, sonido, reloj y huecos de cámara */
/* Tamaño del lienzo: index-vertical.html lo define antes (1080×1920); por defecto horizontal. */
window.LCI_STAGE = window.LCI_STAGE || { w: 1920, h: 1080 };
(function () {
  'use strict';
  const LCI = (window.LCI = window.LCI || {});

  function isObj(v) { return v !== null && typeof v === 'object' && !Array.isArray(v); }
  function deepMerge(t, s) {
    if (!isObj(s)) return t;
    Object.keys(s).forEach(k => {
      if (isObj(s[k])) { if (!isObj(t[k])) t[k] = {}; deepMerge(t[k], s[k]); }
      else if (s[k] !== undefined) t[k] = s[k];
    });
    return t;
  }

  const C = (LCI.config = deepMerge({}, window.LCI_CONFIG || {}));
  const P = (LCI.params = new URLSearchParams(location.search));
  LCI.still = P.get('still') === '1';

  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

  const u = (LCI.u = {
    deepMerge,
    el(tag, cls, html) {
      const e = document.createElement(tag);
      if (cls) e.className = cls;
      if (html != null) e.innerHTML = html;
      return e;
    },
    wait(ms) { return new Promise(r => setTimeout(r, LCI.still ? 0 : ms)); },
    rand(a, b) { return a + Math.random() * (b - a); },
    pick(a) { return a[Math.floor(Math.random() * a.length)]; },
    pad(n, l = 3) { return String(n).padStart(l, '0'); },
    esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ESC[c]); },
    clock(d = new Date()) { return [d.getHours(), d.getMinutes(), d.getSeconds()].map(n => String(n).padStart(2, '0')).join(':'); },
    time12(d = new Date()) {
      let h = d.getHours();
      const m = String(d.getMinutes()).padStart(2, '0');
      const ap = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      return `${String(h).padStart(2, '0')}:${m} ${ap}`;
    },
    seeded(seed) {
      let a = seed >>> 0;
      return function () {
        a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    },
    // Web Animations: al terminar fija el estilo final y libera la animación (no deja capas colgando).
    anim(node, frames, opts) {
      if (!node || !node.animate) return Promise.resolve();
      const o = Object.assign({ fill: 'both' }, opts);
      if (LCI.still) { o.duration = 1; o.delay = 0; }
      const a = node.animate(frames, o);
      return a.finished.then(() => {
        if (o.fill !== 'none') { try { a.commitStyles(); } catch (e) { /* nodo fuera del DOM */ } }
        a.cancel();
      }, () => {});
    },
    typewrite(node, text, speed = 26) {
      const s = String(text == null ? '' : text);
      if (LCI.still || !s) { node.textContent = s; return Promise.resolve(); }
      return new Promise(res => {
        let i = 0;
        node.textContent = '';
        const step = () => {
          node.textContent = s.slice(0, ++i);
          if (i < s.length) setTimeout(step, speed); else res();
        };
        step();
      });
    }
  });

  /* ---------- bus de eventos ---------- */
  const handlers = {};
  LCI.bus = {
    on(n, f) { (handlers[n] = handlers[n] || []).push(f); },
    emit(n, d) { (handlers[n] || []).forEach(f => { try { f(d); } catch (e) { console.error(e); } }); }
  };

  /* ---------- estado persistente (sobrevive a recargas de la fuente) ---------- */
  const KEY = 'lci-state-v1';
  LCI.state = {
    load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } },
    save(patch) { try { localStorage.setItem(KEY, JSON.stringify(Object.assign(this.load(), patch))); } catch (e) { /* almacenamiento lleno o bloqueado */ } },
    clear() { try { localStorage.removeItem(KEY); } catch (e) { /* sin acceso */ } }
  };

  /* ---------- texturas generadas (sin assets pesados) ---------- */
  function noiseTile(size, alphaFn, seed) {
    const r = u.seeded(seed);
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const x = c.getContext('2d');
    const d = x.createImageData(size, size);
    for (let i = 0; i < d.data.length; i += 4) {
      const v = (r() * 255) | 0;
      d.data[i] = d.data[i + 1] = d.data[i + 2] = v;
      d.data[i + 3] = alphaFn(r);
    }
    x.putImageData(d, 0, 0);
    return c.toDataURL('image/png');
  }
  LCI.textures = {
    init() {
      const root = document.documentElement.style;
      root.setProperty('--noise', `url(${noiseTile(256, r => (r() * 34) | 0, 11)})`);
      root.setProperty('--noise-strong', `url(${noiseTile(256, () => 255, 23)})`);
      root.setProperty('--ink', `url(${noiseTile(220, r => (r() < 0.2 ? (r() * 110) | 0 : 255), 31)})`);
    }
  };

  /* ---------- efectos ---------- */
  const FX = ['grain', 'scanlines', 'vignette', 'redGlow', 'filmDust', 'vhs', 'chromaticAberration',
    'particles', 'glitch', 'cameraNoise', 'papers', 'markers', 'shadows'];
  LCI.effects = {
    keys: FX,
    current: {},
    setMode(mode, overrides) {
      if (!C.modes || !C.modes[mode]) mode = 'investigation';
      C.mode = mode;
      this.current = Object.assign({}, C.effects, C.modes[mode], overrides || {});
      document.body.dataset.mode = mode;
      this.apply();
    },
    set(k, v) { this.current[k] = v; this.apply(); },
    apply() {
      const on = this.current.enabled !== false;
      FX.forEach(k => document.body.classList.toggle('fx-' + k, on && !!this.current[k]));
      LCI.bus.emit('effects', this.current);
    }
  };

  /* ---------- sonido: efectos sintetizados (Web Audio) + .mp3 opcionales + ambiente de sala ----------
     Cada efecto es una receta (ctx, destino, t0, variación) que agenda sus nodos y devuelve cuándo termina:
     suena igual en vivo que renderizada en un OfflineAudioContext. Si el .mp3 de sound.files existe de verdad
     (se comprueba una vez al cargar), suena el archivo; si no, la receta.
     Cadena: voces → bus SFX ─────────────────────────────────────┐
             ambiente → fundido → nivel (ambientVolume) → ducking ─┴→ maestra (volume) → limitador → salida */
  LCI.sound = (function () {
    const FLOOR = 1e-4;     // las rampas exponenciales nunca llegan a 0 exacto (−80 dB)
    const MAX_VOICES = 8;   // con 8 voces sonando, el disparo nuevo se descarta
    const DUCK = 0.316;     // el ambiente baja −10 dB mientras suena un efecto
    const IDLE_MS = 3000;   // sin voces ni ambiente, el contexto se suspende: cero trabajo en reposo
    const TRIM = 0.854;     // compensa la ganancia automática ("makeup", +1.37 dB medidos) del compresor de Chrome
    // Nivel de cada efecto (medido): pico ≤ ≈ −6 dBFS a volumen 1 antes del limitador, y sonoridad jerarquizada
    // (impact > stamp > alert > tape/whoosh > shutter/static/paper > beep) para que ninguno tape la voz.
    const LEVEL = { shutter: 0.326, stamp: 0.406, tape: 0.457, whoosh: 0.531, paper: 0.851, alert: 0.327, impact: 0.368, beep: 0.119, static: 0.166 };
    // Variación aleatoria de tono y tiempo por disparo (±5%); los tonales casi fijos para no desafinar.
    const SPREAD = { alert: 0.01, beep: 0.01 };
    const ROOM = { rumble: 0.45, air: 0.045 };   // mezcla interna del ambiente (a ambientVolume 1)
    const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

    /* materiales compartidos: ruido blanco (4 s) e impulso de reverb, creados una sola vez por contexto */
    const store = new WeakMap();
    function mat(ctx) { let m = store.get(ctx); if (!m) store.set(ctx, (m = {})); return m; }
    function noise(ctx) {
      const m = mat(ctx);
      if (!m.noise) {
        const n = Math.round(ctx.sampleRate * 4);
        m.noise = ctx.createBuffer(1, n, ctx.sampleRate);
        const d = m.noise.getChannelData(0);
        for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      }
      return m.noise;
    }
    function impulse(ctx) {   // sala pequeña: cola estéreo de ~1.3 s que se oscurece al apagarse
      const m = mat(ctx);
      if (!m.ir) {
        const sr = ctx.sampleRate, pre = Math.round(sr * 0.012), n = pre + Math.round(sr * 1.3);
        m.ir = ctx.createBuffer(2, n, sr);
        for (let c = 0; c < 2; c++) {
          const d = m.ir.getChannelData(c);
          for (let i = pre, y = 0; i < n; i++) {
            const x = (i - pre) / (n - pre);
            y += (0.85 - 0.75 * x) * (Math.random() * 2 - 1 - y);   // los agudos se apagan antes
            d[i] = y * Math.exp(-7 * x) * Math.min(1, (i - pre) / (sr * 0.004));
          }
        }
      }
      return m.ir;
    }

    /* piezas de las recetas; "bag" junta los nodos de la voz en armado para desconectarlos al terminar */
    let bag = null;
    const keep = n => { if (bag) bag.push(n); return n; };
    function chain(...n) { for (let i = 1; i < n.length; i++) n[i - 1].connect(n[i]); return n[n.length - 1]; }
    function hiss(ctx, v, t, dur) {   // ruido desde un punto al azar del buffer compartido
      const s = keep(ctx.createBufferSource()), b = noise(ctx);
      s.buffer = b;
      s.start(t, v.r() * Math.max(0, b.duration - dur - 0.01), dur);
      return s;
    }
    function tone(ctx, type, f, t, dur) {
      const o = keep(ctx.createOscillator());
      o.type = type;
      o.frequency.setValueAtTime(f, t);
      o.start(t);
      o.stop(t + dur);
      return o;
    }
    function filt(ctx, type, f, q, db) {
      const n = keep(ctx.createBiquadFilter());
      n.type = type;
      n.frequency.value = f;
      if (q != null) n.Q.value = q;
      if (db != null) n.gain.value = db;
      return n;
    }
    function sweep(param, t, from, to, t2) { param.setValueAtTime(from, t); param.exponentialRampToValueAtTime(to, t2); }
    function amp(ctx, g) { const n = keep(ctx.createGain()); n.gain.value = g; return n; }
    function hit(ctx, t, a, peak, d) {   // ataque lineal + caída exponencial
      const n = keep(ctx.createGain()), p = n.gain;
      p.setValueAtTime(0, t);
      p.linearRampToValueAtTime(peak, t + a);
      p.exponentialRampToValueAtTime(FLOOR, t + a + d);
      return n;
    }
    function shape(ctx, t, dur, c) {   // envolvente libre (curva de valores)
      const n = keep(ctx.createGain());
      n.gain.setValueCurveAtTime(c, t, dur);
      return n;
    }

    const R = {
      // obturador: dos clics (cortinillas) de ruido agudo + cuerpo mecánico grave y muy corto
      shutter(ctx, out, t0, v) {
        const k = v.t, p = v.p;
        [[0, 2600, 1, 0.5], [0.045 * k, 2200, 0.8, 0.3]].forEach(([dt, f, pk, body]) => {
          const t = t0 + dt, o = tone(ctx, 'sine', 160 * p, t, 0.06);
          chain(hiss(ctx, v, t, 0.03), filt(ctx, 'highpass', f * p, 0.8), filt(ctx, 'peaking', 4800 * p, 2.5, 5), hit(ctx, t, 0.0005, pk, 0.014), out);
          chain(hiss(ctx, v, t, 0.03), filt(ctx, 'lowpass', 600 * p, 0.8), hit(ctx, t, 0.001, body, 0.02), out);
          o.frequency.exponentialRampToValueAtTime(75 * p, t + 0.045);
          chain(o, hit(ctx, t, 0.002, body, 0.05), out);
        });
        chain(hiss(ctx, v, t0, 0.15 * k), filt(ctx, 'bandpass', 3200 * p, 2), hit(ctx, t0, 0.008, 0.05, 0.14 * k), out); // mecanismo
        return t0 + 0.18 * k;
      },
      // sello de goma: golpe grave 110→45 Hz + transitorio de goma + "slap" de papel + resonancia de la mesa
      stamp(ctx, out, t0, v) {
        const k = v.t, p = v.p, o = tone(ctx, 'sine', 110 * p, t0, 0.35 * k);
        o.frequency.exponentialRampToValueAtTime(45 * p, t0 + 0.12 * k);
        chain(o, hit(ctx, t0, 0.002, 1, 0.3 * k), out);
        chain(hiss(ctx, v, t0, 0.06), filt(ctx, 'lowpass', 900 * p, 0.7), hit(ctx, t0, 0.001, 0.7, 0.045), out);
        chain(hiss(ctx, v, t0 + 0.003, 0.09), filt(ctx, 'bandpass', 1800 * p, 1.2), hit(ctx, t0 + 0.003, 0.001, 0.8, 0.07 * k), out);
        chain(hiss(ctx, v, t0, 0.16), filt(ctx, 'bandpass', 240 * p, 5), hit(ctx, t0, 0.002, 1.5, 0.14 * k), out);
        return t0 + 0.35 * k;
      },
      // cinta adhesiva arrancándose: banda de ruido que sube 1.2→5 kHz con crepitar (despegue a tirones)
      tape(ctx, out, t0, v) {
        const k = v.t, p = v.p, dur = 0.6 * k, n = Math.round(dur * 1000), c = new Float32Array(n);
        for (let i = 0; i < n; i++) {
          const x = i / (n - 1), env = Math.min(1, x / 0.05) * Math.min(1, (1 - x) / 0.1);
          c[i] = env * (v.r() < 0.12 + 0.3 * x ? 0.6 + 0.4 * v.r() : 0.15 + 0.15 * v.r());
        }
        const s = hiss(ctx, v, t0, dur), g = shape(ctx, t0, dur, c);
        const hi = filt(ctx, 'bandpass', 1200 * p, 1.6), lo = filt(ctx, 'bandpass', 520 * p, 1.2);
        sweep(hi.frequency, t0, 1200 * p, 5000 * p, t0 + dur * 0.9);
        sweep(lo.frequency, t0, 520 * p, 1300 * p, t0 + dur * 0.9);
        chain(s, hi, g);
        chain(s, lo, amp(ctx, 0.45), g);
        g.connect(out);
        return t0 + dur;
      },
      // barrido: banda de ruido que sube y baja mientras cruza de izquierda a derecha
      whoosh(ctx, out, t0, v) {
        const k = v.t, p = v.p, dur = 0.45 * k, n = 96, c = new Float32Array(n);
        for (let i = 0; i < n; i++) c[i] = Math.pow(Math.sin(Math.PI * Math.pow(i / (n - 1), 0.8)), 2);
        const s = hiss(ctx, v, t0, dur), g = shape(ctx, t0, dur, c), bp = filt(ctx, 'bandpass', 380 * p, 1.1), pan = keep(ctx.createStereoPanner());
        sweep(bp.frequency, t0, 380 * p, 2400 * p, t0 + dur * 0.42);
        bp.frequency.exponentialRampToValueAtTime(650 * p, t0 + dur);
        pan.pan.setValueAtTime(-0.7, t0);
        pan.pan.linearRampToValueAtTime(0.7, t0 + dur);
        chain(s, bp, g);
        chain(s, filt(ctx, 'lowpass', 480 * p, 0.6), amp(ctx, 0.5), g);
        chain(g, pan, out);
        return t0 + dur;
      },
      // papel: roce suave + 6–10 crujidos cortos en tiempos al azar
      paper(ctx, out, t0, v) {
        const k = v.t, p = v.p, dur = 0.32 * k, g = keep(ctx.createGain()), q = g.gain, bp = filt(ctx, 'bandpass', 2000 * p, 0.7);
        q.setValueAtTime(0, t0);
        q.linearRampToValueAtTime(0.25, t0 + 0.06 * k);
        q.setValueAtTime(0.25, t0 + dur * 0.5);
        q.exponentialRampToValueAtTime(FLOOR, t0 + dur);
        bp.frequency.setValueAtTime(2000 * p, t0);
        bp.frequency.linearRampToValueAtTime(3600 * p, t0 + dur);
        chain(hiss(ctx, v, t0, dur), filt(ctx, 'highpass', 600, 0.7), bp, g, out);
        for (let i = 0, n = 6 + Math.floor(v.r() * 5); i < n; i++) {
          const t = t0 + v.r() * dur * 0.85, len = 0.006 + v.r() * 0.022;
          chain(hiss(ctx, v, t, len + 0.004), filt(ctx, 'bandpass', (1500 + v.r() * 4500) * p, 0.8 + v.r() * 1.6),
            hit(ctx, t, 0.0015, 0.3 + v.r() * 0.6, len), out);
        }
        return t0 + dur;
      },
      // alerta: stinger de noticiero discreto, dos notas en tercera menor (La4 → Do5), triángulo + seno
      alert(ctx, out, t0, v) {
        const k = v.t, p = v.p, lp = filt(ctx, 'lowpass', 2400, 0.5);
        lp.connect(out);
        [[0, 440, 0.5, 0.6], [0.11 * k, 523.25, 0.55, 0.54]].forEach(([dt, f, pk, len]) => {
          const t = t0 + dt, e = hit(ctx, t, 0.005, pk, len * k - 0.01);
          chain(tone(ctx, 'triangle', f * p, t, len * k), e);
          chain(tone(ctx, 'sine', f * p * 1.0035, t, len * k), amp(ctx, 0.7), e);
          chain(tone(ctx, 'sine', f * p * 2, t, 0.2), hit(ctx, t, 0.003, 0.12, 0.15), lp);   // brillo del ataque
          e.connect(lp);
        });
        return t0 + 0.65 * k;
      },
      // impacto cinematográfico: sub 70→32 Hz + cuerpo + golpe medio de ruido + crack agudo + cola de reverb
      impact(ctx, out, t0, v) {
        const k = v.t, p = v.p, verb = keep(ctx.createConvolver());
        verb.buffer = impulse(ctx);
        chain(verb, amp(ctx, 0.6), out);
        const sub = tone(ctx, 'sine', 70 * p, t0, 1.3 * k);
        sub.frequency.exponentialRampToValueAtTime(32 * p, t0 + 0.8 * k);
        chain(sub, hit(ctx, t0, 0.004, 1, 1.25 * k), out);
        const body = tone(ctx, 'sine', 160 * p, t0, 0.35 * k);
        body.frequency.exponentialRampToValueAtTime(55 * p, t0 + 0.15 * k);
        chain(body, hit(ctx, t0, 0.003, 0.5, 0.3 * k), out);
        const mid = chain(hiss(ctx, v, t0, 0.32 * k), filt(ctx, 'lowpass', 1500 * p, 0.8), hit(ctx, t0, 0.002, 0.8, 0.3 * k));
        const crack = chain(hiss(ctx, v, t0, 0.05), filt(ctx, 'highpass', 3200 * p, 0.7), hit(ctx, t0, 0.0004, 0.6, 0.03));
        [mid, crack].forEach(n => { n.connect(out); n.connect(verb); });
        return t0 + 0.32 * k + 1.32;   // incluye la cola de la reverb
      },
      // pitido electrónico limpio (~1 kHz) con ataque y relajación suaves
      beep(ctx, out, t0, v) {
        const k = v.t, dur = 0.15 * k, g = keep(ctx.createGain()), q = g.gain;
        q.setValueAtTime(0, t0);
        q.linearRampToValueAtTime(1, t0 + 0.012);
        q.setValueAtTime(1, t0 + dur - 0.045);
        q.linearRampToValueAtTime(0, t0 + dur);
        chain(tone(ctx, 'sine', 1000 * v.p, t0, dur + 0.005), g, out);
        return t0 + dur + 0.005;
      },
      // estática CCTV: banda de ruido que salta de sintonía, con fluctuaciones, micro-cortes y zumbido leve
      static(ctx, out, t0, v) {
        const k = v.t, p = v.p, dur = 0.42 * k, n = Math.round(dur * 500), c = new Float32Array(n);
        for (let i = 0, lvl = 0.8, cut = 0; i < n; i++) {
          const x = i / (n - 1), env = Math.min(1, x / 0.012) * Math.min(1, (1 - x) / 0.1);
          lvl += (0.5 + 0.5 * v.r() - lvl) * 0.35;
          if (cut > 0) cut--; else if (v.r() < 0.04) cut = 2 + Math.floor(v.r() * 8);
          c[i] = env * (cut > 0 ? 0.05 : lvl);
        }
        const g = shape(ctx, t0, dur, c), bp = filt(ctx, 'bandpass', 2400 * p, 0.6);
        bp.frequency.setValueAtTime(2400 * p, t0);
        for (let t = t0 + 0.04 * k; t < t0 + dur - 0.02; t += (0.03 + 0.07 * v.r()) * k) bp.frequency.setValueAtTime((1400 + 3000 * v.r()) * p, t);
        chain(hiss(ctx, v, t0, dur), filt(ctx, 'highpass', 300, 0.7), bp, g, out);
        chain(tone(ctx, 'sawtooth', 120, t0, dur), filt(ctx, 'lowpass', 500, 0.7), amp(ctx, 0.08), g);
        return t0 + dur;
      }
    };

    // ambiente de sala: rumor grave estéreo (ruido en bucle → lowpass ~300 Hz) + aire agudísimo + LFO lentísimo
    function room(ctx, out, t0) {
      const b = noise(ctx), merge = keep(ctx.createChannelMerger(2)), mix = amp(ctx, 1), srcs = [];
      const loop = rate => {
        const s = keep(ctx.createBufferSource());
        s.buffer = b; s.loop = true; s.playbackRate.value = rate;
        s.start(t0, Math.random() * b.duration);
        srcs.push(s);
        return s;
      };
      [1, 0.97].forEach((rate, ch) => chain(loop(rate), filt(ctx, 'lowpass', 300, 0.6), filt(ctx, 'lowpass', 300, 0.6),
        filt(ctx, 'highpass', 35, 0.7), amp(ctx, ROOM.rumble)).connect(merge, 0, ch));
      merge.connect(mix);
      chain(loop(0.93), filt(ctx, 'highpass', 7500, 0.7), amp(ctx, ROOM.air), mix);
      const lfo = keep(ctx.createOscillator());
      lfo.frequency.value = 0.06;
      lfo.start(t0);
      srcs.push(lfo);
      chain(lfo, amp(ctx, 0.18), mix.gain);
      mix.connect(out);
      return srcs;
    }

    // sección maestra: bus SFX + bus de ambiente (con ducking) → maestra → compresor-limitador → salida
    function desk(c) {
      const d = { sfx: c.createGain(), amb: c.createGain(), duck: c.createGain(), master: c.createGain() };
      const lim = c.createDynamicsCompressor(), trim = c.createGain();
      lim.threshold.value = -3; lim.knee.value = 2; lim.ratio.value = 20; lim.attack.value = 0.002; lim.release.value = 0.15;
      trim.gain.value = TRIM;
      chain(d.sfx, d.master, lim, trim, c.destination);
      chain(d.amb, d.duck, d.master);
      return d;
    }

    /* ---- motor en vivo ---- */
    let ctx = null, D = null, voices = 0, layers = 0, cur = null, idle = 0, napping = false, duckEnd = 0;
    const avail = {};   // sondeo de archivos: true = el .mp3 existe, false = no existe
    const S = () => C.sound || {};
    const unit = (x, d) => { x = Number(x); return Number.isFinite(x) ? Math.max(0, Math.min(1, x)) : d; };
    const vol = () => unit(S().volume, 0.6);
    const off = n => { try { n.disconnect(); } catch (e) { /* ya estaba desconectado */ } };
    function hold(param, now) {   // congela la automatización en su valor actual
      if (param.cancelAndHoldAtTime) param.cancelAndHoldAtTime(now);
      else { param.cancelScheduledValues(now); param.setValueAtTime(param.value, now); }
    }

    function ensure() {   // crea el contexto la primera vez (perezoso) y lo despierta si estaba suspendido
      if (!S().enabled) return null;
      if (ctx && ctx.state === 'closed') ctx = null;
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        let c = null;
        try {
          c = new AC({ latencyHint: 'interactive' });
          D = desk(c);
          D.master.gain.value = vol();
          D.amb.gain.value = unit(S().ambientVolume, 0.18);
          noise(c);
          ctx = c;
        } catch (e) { try { if (c) c.close(); } catch (e2) { /* nada */ } return null; }
      }
      clearTimeout(idle);
      idle = 0;
      if (ctx.state !== 'running' || napping) ctx.resume().catch(() => {});
      return ctx;
    }

    function rest() {   // en reposo (sin voces ni ambiente) suspende el contexto tras IDLE_MS
      if (!ctx || voices || layers || idle) return;
      idle = setTimeout(() => {
        idle = 0;
        if (!ctx || voices || layers || ctx.state !== 'running') return;
        napping = true;
        ctx.suspend().then(() => { napping = false; if (voices || layers) ctx.resume().catch(() => {}); }, () => { napping = false; });
      }, IDLE_MS);
    }

    function duckUntil(end) {   // baja el ambiente en ~60 ms y lo devuelve en ~600 ms al terminar el último efecto
      const g = D.duck.gain, now = ctx.currentTime;
      duckEnd = Math.max(duckEnd, end, now + 0.06);
      hold(g, now);
      g.linearRampToValueAtTime(DUCK, now + 0.06);
      g.setValueAtTime(DUCK, duckEnd);
      g.exponentialRampToValueAtTime(1, duckEnd + 0.6);
    }

    function voice(name) {
      const c = ensure();
      if (!c || voices >= MAX_VOICES) return;
      const d = has(SPREAD, name) ? SPREAD[name] : 0.05;
      const v = { p: 1 + d * (2 * Math.random() - 1), t: 1 + d * (2 * Math.random() - 1), r: Math.random };
      const t0 = c.currentTime + 0.02, out = c.createGain();
      let end = 0;
      out.gain.value = has(LEVEL, name) ? LEVEL[name] : 1;
      bag = [];
      try { end = R[name](c, out, t0, v); } catch (e) { end = 0; }
      const nodes = bag;
      bag = null;
      if (!(end > t0)) { nodes.forEach(off); return; }
      const done = c.createConstantSource();   // marca el final de la voz (cola de reverb incluida)
      done.offset.value = 0;
      done.connect(out);
      done.onended = () => { nodes.forEach(off); off(done); off(out); voices--; rest(); };
      done.start(t0);
      done.stop(end + 0.03);
      out.connect(D.sfx);
      voices++;
      D.master.gain.setTargetAtTime(vol(), c.currentTime, 0.02);
      duckUntil(end);
    }

    function playFile(src) {   // como antes: HTMLAudio con el volumen general
      const a = new Audio(src);
      a.volume = vol();
      a.play().catch(() => {});
      if (cur) a.addEventListener('playing', () => { if (ctx && cur) duckUntil(ctx.currentTime + (Number.isFinite(a.duration) ? a.duration : 1)); }, { once: true });
    }

    function roomOn() {
      if (cur) return;
      const c = ctx, t = c.currentTime + 0.02, fade = c.createGain();
      let srcs = [];
      fade.gain.value = 0;
      fade.gain.setValueAtTime(0, t);
      fade.gain.linearRampToValueAtTime(1, t + 1.5);   // fundido de entrada 1.5 s
      bag = [];
      try { srcs = room(c, fade, t); } catch (e) { srcs = []; }
      const nodes = bag;
      bag = null;
      fade.connect(D.amb);
      cur = { fade, srcs, nodes };
      layers++;
    }
    function roomOff() {
      const r = cur;
      if (!r) return;
      cur = null;
      const now = ctx.currentTime;
      let left = r.srcs.length;
      const end = () => { r.nodes.forEach(off); off(r.fade); layers--; rest(); };
      hold(r.fade.gain, now);
      r.fade.gain.linearRampToValueAtTime(0, now + 1);   // fundido de salida 1 s
      if (!left) { end(); return; }
      r.srcs.forEach(s => { s.onended = () => { if (--left === 0) end(); }; s.stop(now + 1.05); });
    }

    function sync() {   // aplica C.sound: interruptor, volumen maestro y ambiente (arranca/detiene)
      try {
        const s = S(), on = !!s.enabled, want = on && !!s.ambient;
        if (want && !ensure()) return;
        if (!ctx) return;
        const now = ctx.currentTime;
        D.master.gain.setTargetAtTime(on ? vol() : 0, now, 0.03);
        D.amb.gain.setTargetAtTime(unit(s.ambientVolume, 0.18), now, 0.08);
        if (want) roomOn(); else { roomOff(); rest(); }
      } catch (e) { /* el sonido nunca rompe el overlay */ }
    }

    // sondeo: ¿el archivo de un efecto existe de verdad? (si no, se sintetiza). Se hace al cargar y cada vez que cambia
    function probe(name) {
      try {
        const src = (S().files || {})[name];
        if (!src) { delete avail[name]; return; }
        delete avail[name];
        let a = new Audio(), timer = 0;
        const fin = ok => {
          if (!a) return;
          clearTimeout(timer);
          a.oncanplaythrough = a.onerror = null;
          avail[name] = ok;
          a.removeAttribute('src');
          a.load();
          a = null;
        };
        a.preload = 'auto';
        a.oncanplaythrough = () => fin(true);
        a.onerror = () => fin(false);
        timer = setTimeout(() => fin(!!a && a.readyState >= 1), 4000);
        a.src = src;
      } catch (e) { /* sin HTMLAudio: todo sintetizado */ }
    }
    const DEFAULT_FILES = Object.assign({}, S().files || {});
    Object.keys(DEFAULT_FILES).forEach(probe);
    // URL aceptable: ruta relativa, http(s) o audio incrustado (nunca javascript: ni otros esquemas)
    const okUrl = u => typeof u === 'string' && u.length <= 3000000 && (/^data:audio\//i.test(u) || /^https?:\/\//i.test(u) || !/^[a-z][a-z0-9+.-]*:/i.test(u));

    return {
      play(name) {
        try {
          const s = S();
          if (!s.enabled || !name) return;
          const file = s.files && has(s.files, name) && s.files[name];
          if (file && (avail[name] === true || (s.synth === false && avail[name] !== false))) { playFile(file); return; }
          if (s.synth !== false && has(R, name)) voice(name);
        } catch (e) { /* el sonido nunca rompe el overlay */ }
      },
      // cambia (o restablece, con '') el archivo de un efecto del programa y lo vuelve a sondear
      setFile(name, url) {
        const s = S();
        if (!has(R, name) && !has(DEFAULT_FILES, name)) return false;
        s.files = s.files || {};
        if (url) { if (!okUrl(url)) return false; s.files[name] = url; }
        else if (has(DEFAULT_FILES, name)) s.files[name] = DEFAULT_FILES[name];
        else delete s.files[name];
        probe(name);
        return true;
      },
      defaults: () => Object.assign({}, DEFAULT_FILES),
      // sonido suelto (soundboard del panel): archivo o link, con su volumen relativo
      playUrl(url, level) {
        try {
          const s = S();
          if (!s.enabled || !okUrl(url)) return;
          const a = new Audio(url);
          a.volume = Math.max(0, Math.min(1, vol() * unit(level, 1)));
          a.play().catch(() => {});
        } catch (e) { /* el sonido nunca rompe el overlay */ }
      },
      sync,
      stats() {   // estado para pruebas y diagnóstico
        return {
          context: ctx ? ctx.state : 'none', voices, ambient: !!cur, ambientLayers: layers,
          master: D ? D.master.gain.value : null, ambientVolume: D ? D.amb.gain.value : null,
          ambientFade: cur ? cur.fade.gain.value : 0, duck: D ? D.duck.gain.value : null,
          files: Object.assign({}, avail)
        };
      },
      lab: { recipes: R, levels: LEVEL, room, desk }   // para renderizar offline (pruebas y vistas previas)
    };
  })();

  /* ---------- reloj y tiempo en vivo ---------- */
  LCI.clock = {
    start: Date.now(), // inicio del cronómetro "en vivo" (el panel lo sincroniza con OBS; se guarda entre recargas)
    fmtTime: null, fmtDate: null,
    // (re)crea los formateadores según C.hud (zona horaria, 12/24 h, segundos). Una zona inválida cae a la del PC.
    setup() {
      const h = C.hud || {};
      const tz = h.timezone && h.timezone !== 'auto' ? h.timezone : undefined;
      const make = opts => { try { return new Intl.DateTimeFormat('es', Object.assign({ timeZone: tz }, opts)); } catch (e) { return new Intl.DateTimeFormat('es', opts); } };
      this.fmtTime = make({ hour: '2-digit', minute: '2-digit', second: h.showSeconds ? '2-digit' : undefined, hour12: h.timeFormat !== '24h' });
      this.fmtDate = make({ weekday: 'short', day: '2-digit', month: 'short' });
    },
    hudTime(d = new Date()) {
      if (!this.fmtTime) this.setup();
      return this.fmtTime.format(d).replace(/\s*([ap])\.?\s?m\.?/i, (m, x) => ' ' + x.toUpperCase() + 'M').toUpperCase();
    },
    hudDate(d = new Date()) {
      if (!this.fmtDate) this.setup();
      return this.fmtDate.format(d).replace(/[.,]/g, '').toUpperCase();
    },
    elapsed() {
      const e = Math.max(0, Math.floor((Date.now() - this.start) / 1000));
      return [Math.floor(e / 3600), Math.floor(e / 60) % 60, e % 60].map(v => String(v).padStart(2, '0')).join(':');
    },
    tick() {
      const now = new Date(), t = u.clock(now);
      document.querySelectorAll('[data-clock]').forEach(n => { n.textContent = t; });
      const s = this.elapsed();
      document.querySelectorAll('[data-elapsed]').forEach(n => { n.textContent = s; });
      const ht = this.hudTime(now), hd = this.hudDate(now);
      document.querySelectorAll('[data-hudtime]').forEach(n => { n.textContent = ht; });
      document.querySelectorAll('[data-huddate]').forEach(n => { n.textContent = hd; });
    },
    run() { this.setup(); this.tick(); setInterval(() => this.tick(), 1000); }
  };

  /* ---------- huecos reales: la atmósfera se recorta donde van las cámaras ---------- */
  LCI.holes = {
    rects: [],
    update(rects) {
      this.rects = rects || [];
      const a = document.getElementById('atmosphere');
      if (!this.rects.length) { a.style.clipPath = 'none'; return; }
      let d = `M0 0H${window.LCI_STAGE.w}V${window.LCI_STAGE.h}H0Z`;
      this.rects.forEach(r => { d += ` M${r.x} ${r.y}h${r.w}v${r.h}h${-r.w}Z`; });
      a.style.clipPath = `path(evenodd, "${d}")`;
    }
  };

  /* ---------- registro de eventos para Dev Mode (siempre activo, es solo un array) ---------- */
  LCI.devlog = {
    entries: [],
    push(msg) {
      const t = new Date();
      const ts = [t.getHours(), t.getMinutes(), t.getSeconds()].map(n => String(n).padStart(2, '0')).join(':');
      this.entries.unshift(`${ts}  ${msg}`);
      if (this.entries.length > 20) this.entries.length = 20;
      LCI.bus.emit('devlog', this.entries);
    }
  };

  /* ---------- destellos ---------- */
  LCI.fx = {
    flash(o = {}) {
      const f = document.getElementById('flash');
      f.style.background = o.color || '#fff';
      return u.anim(f, [{ opacity: 0 }, { opacity: o.opacity == null ? 0.6 : o.opacity, offset: 0.14 }, { opacity: 0 }],
        { duration: o.duration || 420, easing: 'ease-out', fill: 'none' });
    },
    edge() {
      return this.flash({ color: 'radial-gradient(ellipse 70% 65% at 50% 50%, rgba(163,19,27,0) 52%, rgba(163,19,27,.8) 100%)', opacity: 1, duration: 560 });
    }
  };
})();
