/* La Cápsula Insólita — TransitionManager, intro y outro.
   Cada transición cubre el 100% de la pantalla en su "mid" (config.transitionTimings): ahí se cambia el layout
   y el panel de control cambia la escena de OBS, así las cámaras nunca se ven saltar. */
(function () {
  'use strict';
  const LCI = window.LCI, C = LCI.config, u = LCI.u, el = u.el, esc = u.esc;
  const T = n => (C.transitionTimings && C.transitionTimings[n]) || { mid: 300, total: 800 };
  const layer = () => document.getElementById('fx-transition');
  const SOUND = { tape: 'tape', flash: 'shutter', paper: 'paper', file: 'paper', cctv: 'static', stamp: 'impact', redflash: 'impact', document: 'paper', glitch: 'static', evidence: 'shutter' };

  function docLines(n, R) {
    let s = '';
    for (let i = 0; i < n; i++) {
      const red = R() < 0.22;
      s += `<i class="${red ? 'r' : ''}" style="width:${(red ? 18 + R() * 40 : 55 + R() * 45).toFixed(0)}%"></i>`;
    }
    return s;
  }
  function bigPaper(title) {
    const R = u.seeded(Date.now() & 0xffff);
    return `<div class="tp-head"><span class="capsule-mark"></span><b>EXPEDIENTE ${esc(C.brand.caseId)}</b><span>${title}</span></div>
      <div class="tp-body">${docLines(16, R)}</div><div class="stamp"><span>CONFIDENCIAL</span></div>`;
  }

  const lib = {
    async tape(box, mid) {
      const t = T('tape');
      const black = el('div', 'tr__black');
      box.appendChild(black);
      const rows = [-90, 200, 490, 780, 1070];
      const tapes = rows.map((y, i) => {
        const tp = LCI.Tape.make(i % 2 ? 'NO CRUZAR · EVIDENCIA · CASO ABIERTO' : 'PRECAUCIÓN · NO CRUZAR · LA CÁPSULA INSÓLITA', { w: 2900, size: 'xl' });
        tp.style.left = '-490px';
        tp.style.top = y + 'px';
        tp.style.transformOrigin = '50% 50%';
        box.appendChild(tp);
        return tp;
      });
      const dir = i => (i % 2 ? 1 : -1);
      u.anim(black, [{ opacity: 0 }, { opacity: 1 }], { duration: t.mid * 0.8, easing: 'cubic-bezier(.5,0,.9,.5)' });
      await Promise.all(tapes.map((tp, i) => u.anim(tp,
        [{ transform: `translateX(${dir(i) * 3000}px) rotate(-11deg)` }, { transform: 'translateX(0) rotate(-11deg)' }],
        { duration: t.mid - 40, delay: i * 10, easing: 'cubic-bezier(.25,.8,.25,1)' })));
      await mid();
      await u.wait(60);
      const out = t.total - t.mid - 60;
      u.anim(black, [{ opacity: 1 }, { opacity: 0 }], { duration: out, easing: 'ease-out' });
      await Promise.all(tapes.map((tp, i) => u.anim(tp,
        [{ transform: 'translateX(0) rotate(-11deg)' }, { transform: `translateX(${-dir(i) * 3000}px) rotate(-11deg)` }],
        { duration: out - 20, delay: i * 10, easing: 'cubic-bezier(.6,0,.8,.3)' })));
    },

    async flash(box, mid) {
      const t = T('flash');
      const w = el('div', 'tr__black tr__white');
      box.appendChild(w);
      await u.anim(w, [{ opacity: 0 }, { opacity: 1 }], { duration: t.mid, easing: 'ease-in' });
      await mid();
      await u.anim(w, [{ opacity: 1 }, { opacity: 0 }], { duration: t.total - t.mid, easing: 'cubic-bezier(.1,.6,.3,1)' });
    },

    async paper(box, mid) {
      const t = T('paper');
      const p = el('div', 'tr__paper', bigPaper('ARCHIVO DE INVESTIGACIÓN'));
      box.appendChild(p);
      await u.anim(p, [{ transform: 'translateX(2600px) rotate(-7deg)' }, { transform: 'translateX(0) rotate(-4deg)' }], { duration: t.mid, easing: 'cubic-bezier(.3,.7,.2,1)' });
      await mid();
      await u.anim(p, [{ transform: 'translateX(0) rotate(-4deg)' }, { transform: 'translateX(-2700px) rotate(-1deg)' }], { duration: t.total - t.mid, easing: 'cubic-bezier(.6,0,.8,.3)' });
    },

    async file(box, mid) {
      const t = T('file');
      const l = el('div', 'tr__folder tr__folder--l');
      const r = el('div', 'tr__folder tr__folder--r', `<div class="tr__folder-tab"><span class="capsule-mark"></span>CASE FILE · ${esc(C.brand.caseId)}</div>`);
      box.append(l, r);
      const ease = 'cubic-bezier(.5,0,.2,1)';
      await Promise.all([
        u.anim(l, [{ transform: 'translateX(-101%)' }, { transform: 'translateX(0)' }], { duration: t.mid, easing: ease }),
        u.anim(r, [{ transform: 'translateX(101%)' }, { transform: 'translateX(0)' }], { duration: t.mid, easing: ease })
      ]);
      await mid();
      await u.wait(140);
      const out = t.total - t.mid - 140;
      await Promise.all([
        u.anim(l, [{ transform: 'translateX(0)' }, { transform: 'translateX(-101%)' }], { duration: out, easing: 'cubic-bezier(.6,0,.4,1)' }),
        u.anim(r, [{ transform: 'translateX(0)' }, { transform: 'translateX(101%)' }], { duration: out, easing: 'cubic-bezier(.6,0,.4,1)' })
      ]);
    },

    async cctv(box, mid) {
      const t = T('cctv');
      box.innerHTML = '<div class="tr__static"></div><div class="tr__tear"></div><div class="tr__sig"><span class="led led--blink"></span>SEÑAL INTERRUMPIDA</div>';
      await u.anim(box, [{ opacity: 0 }, { opacity: 1 }], { duration: t.mid, easing: 'steps(3,end)' });
      await mid();
      await u.wait(Math.max(0, t.total - t.mid - 180));
      await u.anim(box, [{ opacity: 1 }, { opacity: 0 }], { duration: 180, easing: 'steps(3,end)' });
    },

    async stamp(box, mid) {
      const t = T('stamp');
      const b = el('div', 'tr__black');
      const s = el('div', 'tr__stamp', '<div class="stamp stamp--xl"><span>CASO ABIERTO</span></div>');
      const st = s.firstChild;
      st.style.opacity = 0;
      box.append(b, s);
      await u.anim(b, [{ opacity: 0 }, { opacity: 1 }], { duration: t.mid });
      await mid();
      LCI.sound.play('stamp');
      await u.anim(st, [
        { transform: 'scale(2.6) rotate(-14deg)', opacity: 0 },
        { transform: 'scale(.94) rotate(-7deg)', opacity: 1, offset: 0.7 },
        { transform: 'scale(1) rotate(-7deg)', opacity: 1 }
      ], { duration: 240, easing: 'cubic-bezier(.5,0,.75,0)' });
      await u.wait(Math.max(0, t.total - t.mid - 240 - 260));
      await u.anim(box, [{ opacity: 1 }, { opacity: 0 }], { duration: 260 });
    },

    async redflash(box, mid) {
      const t = T('redflash');
      const r = el('div', 'tr__black tr__red');
      box.appendChild(r);
      await u.anim(r, [{ opacity: 0 }, { opacity: 1 }], { duration: t.mid, easing: 'ease-in' });
      await mid();
      await u.anim(r, [{ opacity: 1 }, { opacity: 0 }], { duration: t.total - t.mid, easing: 'ease-out' });
    },

    async document(box, mid) {
      const t = T('document');
      const p = el('div', 'tr__paper', bigPaper('DOCUMENTO CLASIFICADO'));
      box.appendChild(p);
      await u.anim(p, [{ transform: 'translateY(1700px) rotate(14deg)' }, { transform: 'translateY(0) rotate(-3deg)' }], { duration: t.mid, easing: 'cubic-bezier(.25,.75,.2,1)' });
      await mid();
      await u.anim(p, [{ transform: 'translateY(0) rotate(-3deg)' }, { transform: 'translateY(-1800px) rotate(-12deg)' }], { duration: t.total - t.mid, easing: 'cubic-bezier(.6,0,.8,.3)' });
    },

    async glitch(box, mid) {
      const t = T('glitch');
      const slices = [];
      let y = 0;
      const SH = window.LCI_STAGE.h;
      while (y < SH) {
        const h = Math.min(Math.round(u.rand(40, 140)), SH - y);
        const s = el('div', 'tr__slice');
        s.style.top = y + 'px';
        s.style.height = (h + 1) + 'px';
        box.appendChild(s);
        slices.push(s);
        y += h;
      }
      box.appendChild(el('div', 'tr__ghost'));
      await Promise.all(slices.map(s => {
        const d = u.rand(0, t.mid * 0.45), x = u.rand(-80, 80);
        return u.anim(s, [
          { transform: `translateX(${x * 6}px)`, opacity: 0 },
          { transform: `translateX(${x}px)`, opacity: 1, offset: 0.6 },
          { transform: 'translateX(0)', opacity: 1 }
        ], { duration: t.mid - d, delay: d, easing: 'steps(3,end)' });
      }));
      await mid();
      await u.wait(40);
      const out = t.total - t.mid - 40;
      await Promise.all(slices.map(s => {
        const d = u.rand(0, out * 0.5);
        return u.anim(s, [{ transform: 'translateX(0)', opacity: 1 }, { transform: `translateX(${u.rand(-200, 200)}px)`, opacity: 0 }],
          { duration: out - d, delay: d, easing: 'steps(2,end)' });
      }));
    },

    async evidence(box, mid) {
      const t = T('evidence');
      const b = el('div', 'tr__black');
      const img = C.evidence.image ? `style="background-image:url('${esc(C.evidence.image)}')"` : '';
      const pol = el('div', 'tr__polaroid', `<div class="tr__polaroid-img" ${img}></div><span>EVIDENCIA #${u.pad(C.evidence.number || 1)}</span>`);
      const fl = el('div', 'tr__localflash');
      pol.style.opacity = 0;
      box.append(b, pol, fl);
      await u.anim(b, [{ opacity: 0 }, { opacity: 1 }], { duration: t.mid });
      await mid();
      LCI.sound.play('shutter');
      u.anim(fl, [{ opacity: 0 }, { opacity: 0.85, offset: 0.12 }, { opacity: 0 }], { duration: 320, fill: 'none' });
      await u.anim(pol, [
        { transform: 'translate(-50%,-62%) rotate(12deg) scale(1.2)', opacity: 0 },
        { transform: 'translate(-50%,-50%) rotate(-4deg) scale(1)', opacity: 1 }
      ], { duration: 360, easing: 'cubic-bezier(.2,.8,.2,1)' });
      await u.wait(Math.max(0, t.total - t.mid - 360 - 300));
      await u.anim(box, [{ opacity: 1 }, { opacity: 0 }], { duration: 300 });
    }
  };

  LCI.Transitions = {
    names: Object.keys(lib),
    busy: false,
    async run(name, onMid) {
      const fn = lib[name] || lib.tape;
      const box = el('div', 'tr tr--' + name);
      layer().appendChild(box);
      LCI.sound.play('whoosh');
      LCI.sound.play(SOUND[name]);
      this.busy = true;
      let midDone = false;
      const mid = async () => { if (!midDone) { midDone = true; if (onMid) await onMid(); } };
      try { await fn(box, mid); await mid(); }
      catch (e) { console.error(e); await mid(); }
      finally { box.remove(); this.busy = false; }
    }
  };

  /* ===================== Intro / Outro ===================== */
  LCI.Show = {
    node: null,
    clear() {
      layer().querySelectorAll('.intro, .outro').forEach(n => n.remove());
      document.body.classList.remove('is-outro');
      this.node = null;
    },

    async intro() {
      this.clear();
      const box = el('div', 'intro', `
        <div class="intro__black"></div>
        <div class="intro__static"></div>
        <div class="intro__red"></div>
        <div class="intro__case"><span class="intro__case-k"></span><span class="intro__case-n"></span></div>
        <div class="intro__tapehost"></div>
        <div class="intro__photo"><div class="img ${C.evidence.image ? '' : 'sil'}"></div><span>${esc(C.evidence.caption || 'ARCHIVO RECUPERADO')}</span></div>
        <div class="intro__brand"><span class="capsule-mark"></span><h1>${esc(C.brand.title)}</h1><p>${esc(C.brand.subtitle)}</p>
          <div class="intro__live"><span class="led led--blink"></span>LIVE</div></div>
        <div class="intro__flash"></div>`);
      this.node = box;
      layer().appendChild(box);
      const q = s => box.querySelector(s);
      if (C.evidence.image) q('.intro__photo .img').style.backgroundImage = `url('${C.evidence.image.replace(/'/g, '%27')}')`;

      LCI.sound.play('static');
      u.anim(q('.intro__static'), [{ opacity: 0 }, { opacity: 0.35, offset: 0.2 }, { opacity: 0.1, offset: 0.4 }, { opacity: 0.3, offset: 0.6 }, { opacity: 0 }], { duration: 900, easing: 'steps(6,end)' });
      await u.wait(450);
      await u.typewrite(q('.intro__case-k'), 'CASE FILE', 55);
      u.typewrite(q('.intro__case-n'), `Nº ${C.brand.caseNumber} · ${C.brand.caseId}`, 28);
      await u.wait(500);
      u.anim(q('.intro__red'), [{ opacity: 0 }, { opacity: 1 }], { duration: 1400, easing: 'ease-in-out' });
      await u.wait(450);
      const tape = LCI.Tape.make('PRECAUCIÓN · NO CRUZAR', { w: 2600, size: 'xl' });
      Object.assign(tape.style, { left: '-340px', top: '620px', transform: 'rotate(-4deg)', transformOrigin: '50% 50%' });
      q('.intro__tapehost').appendChild(tape);
      LCI.sound.play('tape');
      await u.anim(tape, [{ transform: 'translateX(-2700px) rotate(-4deg)' }, { transform: 'translateX(0) rotate(-4deg)' }], { duration: 520, easing: 'cubic-bezier(.2,.8,.2,1)' });
      await u.wait(150);
      const ph = q('.intro__photo');
      LCI.sound.play('paper');
      await u.anim(ph, [{ transform: 'translateY(-60px) rotate(12deg)', opacity: 0 }, { transform: 'translateY(0) rotate(5deg)', opacity: 1 }], { duration: 460, easing: 'cubic-bezier(.2,.8,.2,1)' });
      await u.wait(420);
      // FLASH
      LCI.sound.play('shutter');
      const fl = q('.intro__flash');
      await u.anim(fl, [{ opacity: 0 }, { opacity: 1 }], { duration: 70 });
      ['.intro__case', '.intro__tapehost', '.intro__photo', '.intro__static'].forEach(s => { q(s).style.display = 'none'; });
      const brand = q('.intro__brand');
      brand.style.opacity = 1;
      const h1 = brand.querySelector('h1'), p = brand.querySelector('p'), live = brand.querySelector('.intro__live'), mark = brand.querySelector('.capsule-mark');
      h1.style.clipPath = 'inset(0 100% 0 0)';
      p.style.opacity = 0;
      mark.style.opacity = 0;
      u.anim(fl, [{ opacity: 1 }, { opacity: 0 }], { duration: 520, easing: 'cubic-bezier(.1,.6,.3,1)' });
      LCI.sound.play('impact');
      u.anim(mark, [{ transform: 'rotate(-32deg) scale(.6)', opacity: 0 }, { transform: 'rotate(-32deg) scale(1)', opacity: 1 }], { duration: 360, easing: 'cubic-bezier(.2,.8,.2,1)' });
      await u.anim(h1, [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)' }], { duration: 620, easing: 'cubic-bezier(.65,0,.2,1)' });
      h1.style.clipPath = '';
      await u.anim(p, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 380, easing: 'ease-out' });
      await u.wait(450);
      LCI.sound.play('beep');
      await u.anim(live, [{ opacity: 0 }, { opacity: 1 }], { duration: 240, easing: 'steps(3,end)' });
      await u.wait(900);
      await u.anim(box, [{ opacity: 1 }, { opacity: 0 }], { duration: 700, easing: 'ease-in-out' });
      box.remove();
      if (this.node === box) this.node = null;
      LCI.clock.start = Date.now();
    },

    async outro(opts = {}) {
      this.clear();
      const text = String(opts.text || 'CASO CERRADO').toUpperCase();
      document.body.classList.add('is-outro');
      const box = el('div', 'outro');
      this.node = box;
      layer().appendChild(box);
      await u.wait(1100);
      const l = el('div', 'tr__folder tr__folder--l');
      const r = el('div', 'tr__folder tr__folder--r', `<div class="tr__folder-tab"><span class="capsule-mark"></span>CASE FILE · ${esc(C.brand.caseId)}</div>`);
      box.append(l, r);
      LCI.sound.play('paper');
      await Promise.all([
        u.anim(l, [{ transform: 'translateX(-101%)' }, { transform: 'translateX(0)' }], { duration: 520, easing: 'cubic-bezier(.5,0,.2,1)' }),
        u.anim(r, [{ transform: 'translateX(101%)' }, { transform: 'translateX(0)' }], { duration: 520, easing: 'cubic-bezier(.5,0,.2,1)' })
      ]);
      const msg = el('div', 'outro__msg');
      box.appendChild(msg);
      if (/CONTIN/.test(text)) {
        const ty = el('div', 'outro__type');
        msg.appendChild(ty);
        await u.typewrite(ty, text, 70);
      } else {
        const st = el('div', 'stamp stamp--xl', `<span>${esc(text)}</span>`);
        st.style.opacity = 0;
        msg.appendChild(st);
        LCI.sound.play('stamp');
        await u.anim(st, [
          { transform: 'scale(2.6) rotate(-14deg)', opacity: 0 },
          { transform: 'scale(.94) rotate(-7deg)', opacity: 1, offset: 0.7 },
          { transform: 'scale(1) rotate(-7deg)', opacity: 1 }
        ], { duration: 260, easing: 'cubic-bezier(.5,0,.75,0)' });
      }
      await u.wait(1100);
      const tape = LCI.Tape.make('CASO CERRADO · LA CÁPSULA INSÓLITA', { w: 2700, size: 'xl' });
      Object.assign(tape.style, { left: '-390px', top: '760px', transform: 'rotate(-6deg)', transformOrigin: '50% 50%' });
      box.appendChild(tape);
      LCI.sound.play('tape');
      await u.anim(tape, [{ transform: 'translateX(-2800px) rotate(-6deg)' }, { transform: 'translateX(0) rotate(-6deg)' }], { duration: 640, easing: 'cubic-bezier(.2,.8,.2,1)' });
      await u.wait(500);
      const black = el('div', 'outro__black');
      box.appendChild(black);
      await u.anim(black, [{ opacity: 0 }, { opacity: 1 }], { duration: 900, easing: 'ease-in' });
    },

    reset() { this.clear(); }
  };
})();
