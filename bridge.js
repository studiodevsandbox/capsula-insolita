/* La Cápsula Insólita — puente para Stream Deck.
 *
 * Corre en esta PC junto a OBS. Convierte peticiones web simples (las que puede mandar
 * la acción "Website" del Stream Deck, sin plugins) en comandos para el overlay, hablando
 * por obs-websocket igual que el panel de control (control.html).
 *
 * Uso:  node bridge.js      (o doble clic en iniciar-puente.bat)
 * Prueba en el navegador:  http://localhost:8787/
 */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

global.window = {};
require('./config.js');
const C = global.window.LCI_CONFIG;
const { Obs } = require('./js/control.js');

const PORT = (C.obs && C.obs.bridgePort) || 8787;
const EVIDENCE_DIR = path.join(__dirname, 'assets', 'evidence');

/* ---------- conexión a OBS, con reintento automático ---------- */
const obs = new Obs();
let connected = false;
function connectLoop() {
  obs.onstatus = (t, cls) => {
    connected = cls === 'ok';
    console.log('[OBS]', t);
  };
  obs.connect(C.obs.host, C.obs.port, C.obs.password).catch(() => { /* se reintenta solo */ });
}
connectLoop();
setInterval(() => { if (!connected) connectLoop(); }, 4000);

/* ---------- escenas: igual que el panel — transición en el overlay y, al cubrir la
   pantalla, corte de escena en OBS ---------- */
const ALIASES = { '1': 'SCENE_01_CAMERA', '2': 'SCENE_02_DUAL_CAMERA', '3': 'SCENE_03_CAMERA_EVIDENCE', '4': 'SCENE_04_DUAL_CAMERA_EVIDENCE' };
const obsNameFor = {};
Object.entries(C.obs.sceneMap || {}).forEach(([obsName, key]) => { obsNameFor[key] = obsName; });
const resolveScene = key => (C.scenes[key] ? key : ALIASES[String(key)] || null);

async function doScene(key, tr) {
  const scene = resolveScene(key);
  if (!scene) throw new Error('Escena desconocida: ' + key);
  const transition = tr || C.transitions.sceneChange;
  await obs.emit({ cmd: 'scene', scene, transition });
  const mid = transition === 'none' ? 0 : (C.transitionTimings[transition] || { mid: 300 }).mid;
  setTimeout(() => {
    const obsName = obsNameFor[scene];
    if (obsName) obs.request('SetCurrentProgramScene', { sceneName: obsName }).catch(() => {});
  }, mid);
  return scene;
}

/* ---------- banco de evidencia por carpeta: para los botones "siguiente" / "anterior" del
   Stream Deck. Lee directo de assets/evidence — es independiente del banco del panel
   (ese vive en el navegador). Pon imágenes ahí y ya se pueden recorrer con un botón. ---------- */
function listEvidenceFiles() {
  try {
    return fs.readdirSync(EVIDENCE_DIR)
      .filter(f => /\.(jpe?g|png|webp|gif|svg|mp4|webm)$/i.test(f))
      .sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));
  } catch (e) { return []; }
}
let evIndex = -1;
let evNumber = Number(C.evidence.number) || 1;
function showEvidenceAt(i, extra) {
  const files = listEvidenceFiles();
  if (!files.length) throw new Error('No hay imágenes en assets/evidence');
  evIndex = ((i % files.length) + files.length) % files.length;
  const file = files[evIndex];
  const type = /\.(mp4|webm)$/i.test(file) ? 'video' : (extra && extra.type) || 'photo';
  const number = (extra && extra.number) || evNumber++;
  obs.emit({ cmd: 'evidence', image: 'assets/evidence/' + file, type, number, caption: (extra && extra.caption) || 'ARCHIVO RECUPERADO', description: (extra && extra.description) || '' });
  return { file, index: evIndex, total: files.length, number };
}

/* ---------- servidor HTTP ---------- */
function send(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(obj));
}
function ok(res, extra) { send(res, 200, Object.assign({ ok: true }, extra)); }
function fail(res, error) { send(res, 200, { ok: false, error: String(error && error.message || error) }); }

// cada fila: descripción, URL de ejemplo YA FUNCIONAL (clic la prueba), y el patrón para armar otras variantes
const HELP_ROUTES = [
  ['Escena 1 · una cámara', '/scene?key=1', '/scene?key=1..4  (&tr=tape|flash|paper|file|cctv|stamp|redflash|document|glitch|evidence|none opcional)'],
  ['Escena 2 · dos cámaras', '/scene?key=2', ''],
  ['Escena 3 · cámara + evidencia', '/scene?key=3', ''],
  ['Escena 4 · dos cám. + evidencia', '/scene?key=4', ''],
  ['Clean mode', '/mode?value=clean', '/mode?value=clean|investigation'],
  ['Investigation mode', '/mode?value=investigation', ''],
  ['CAM 01 → REC', '/camq?id=1&status=REC', '/camq?id=1|2&status=REC|LIVE|WAITING|OFFLINE'],
  ['CAM 01 → OFFLINE', '/camq?id=1&status=OFFLINE', ''],
  ['CAM 02 → LIVE', '/camq?id=2&status=LIVE', ''],
  ['Siguiente evidencia (carpeta)', '/evidence/next', 'recorre assets/evidence en orden'],
  ['Evidencia anterior', '/evidence/prev', ''],
  ['Vaciar evidencia', '/evidence/clear', ''],
  ['Mostrar lower third', '/lowerthird/show?name=INVITADO&role=Rol', '/lowerthird/show?name=...&role=...&label=EXPEDIENTE&number=4'],
  ['Ocultar lower third', '/lowerthird/hide', ''],
  ['Alerta: nueva evidencia', '/alert?text=NUEVA%20EVIDENCIA', '/alert?text=...'],
  ['Alerta: última hora', '/alert?text=%C3%9ALTIMA%20HORA', ''],
  ['Sello: verificado', '/stamp?text=VERIFICADO', '/stamp?text=...'],
  ['Sello: confidencial', '/stamp?text=CONFIDENCIAL', ''],
  ['Transición: cinta', '/transition?name=tape', '/transition?name=tape|flash|paper|file|cctv|stamp|redflash|document|glitch|evidence'],
  ['Intro', '/intro', ''],
  ['Outro · caso cerrado', '/outro?text=CASO%20CERRADO', ''],
  ['Outro · continuará', '/outro?text=CONTINUAR%C3%81...', ''],
  ['Sonidos: mutear', '/sound?enabled=0', '/sound?enabled=1|0&volume=0..1'],
  ['Sonidos: activar', '/sound?enabled=1', ''],
  ['Botón de pánico: ocultar todo', '/hideall', ''],
  ['Recargar overlay', '/reload', ''],
  ['Estado del puente', '/status', '']
];
function helpPage() {
  const rows = HELP_ROUTES.map(([label, href, pattern]) =>
    `<tr><td>${label}</td><td><a href="${href}" target="_blank">${href}</a></td><td class="pat">${pattern || ''}</td></tr>`).join('');
  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>LCI · Puente Stream Deck</title>
  <style>body{background:#0b0b0b;color:#e9e1d0;font:13px/1.5 Consolas,monospace;padding:20px}
  h1{color:#F3C900;font-size:20px}a{color:#F3C900;text-decoration:none}a:hover{text-decoration:underline}
  table{border-collapse:collapse;width:100%}td{border-bottom:1px solid #242424;padding:6px 8px;vertical-align:top}
  .pat{color:#8d8d8d;font-size:11.5px}code{background:#161616;padding:1px 4px}</style></head><body>
  <h1>La Cápsula Insólita · Puente para Stream Deck</h1>
  <p>Estado de OBS: <b style="color:${connected ? '#F3C900' : '#ff6b6b'}">${connected ? 'CONECTADO' : 'DESCONECTADO'}</b> ·
  Puerto del puente: <code>${PORT}</code></p>
  <p>En el Stream Deck: acción <b>"Website"</b> (categoría Sistema) → pega la URL completa del botón que quieras
  (columna del medio, ya probada). Marca "abrir en segundo plano" si tu versión lo pide, así no se abre un
  navegador cada vez que aprietas el botón. La columna de la derecha es el patrón para armar otras variantes.</p>
  <table><tr><th align="left">Botón</th><th align="left">URL (clic para probar)</th><th align="left">Patrón</th></tr>${rows}</table>
  </body></html>`;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const q = url.searchParams;
  try {
    switch (url.pathname) {
      case '/': res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(helpPage()); return;
      case '/status': return ok(res, { connected, port: PORT, evidenceFiles: listEvidenceFiles().length });

      case '/scene': return ok(res, { scene: await doScene(q.get('key'), q.get('tr')) });
      case '/mode': await obs.emit({ cmd: 'mode', mode: q.get('value') }); return ok(res);
      case '/effect': await obs.emit({ cmd: 'effect', key: q.get('key'), value: q.get('value') === '1' || q.get('value') === 'true' }); return ok(res);

      case '/camq': await obs.emit({ cmd: 'cameraSwitch', frame: Number(q.get('id')) || 1, status: q.get('status') }); return ok(res);
      case '/camera': await obs.emit({ cmd: 'camera', id: Number(q.get('id')) || 1, label: q.get('label') || undefined, status: q.get('status') || undefined, subject: q.get('subject') || undefined }); return ok(res);

      case '/evidence/next': return ok(res, showEvidenceAt(evIndex + 1));
      case '/evidence/prev': return ok(res, showEvidenceAt(evIndex - 1));
      case '/evidence/show': {
        const files = listEvidenceFiles();
        const file = q.get('file');
        if (!file) throw new Error('Falta &file=nombre.jpg');
        const i = files.indexOf(file);
        if (i < 0) throw new Error('No está en assets/evidence: ' + file);
        return ok(res, showEvidenceAt(i, { type: q.get('type'), number: q.get('number') && Number(q.get('number')), caption: q.get('caption'), description: q.get('description') }));
      }
      case '/evidence/clear': await obs.emit({ cmd: 'evidenceClear' }); return ok(res);

      case '/lowerthird/show': await obs.emit({ cmd: 'lowerThird', label: q.get('label') || undefined, number: q.get('number') && Number(q.get('number')), name: q.get('name') || undefined, role: q.get('role') || undefined }); return ok(res);
      case '/lowerthird/hide': await obs.emit({ cmd: 'lowerThirdHide' }); return ok(res);

      case '/alert': await obs.emit({ cmd: 'alert', text: q.get('text') }); return ok(res);
      case '/stamp': await obs.emit({ cmd: 'stamp', text: q.get('text') }); return ok(res);
      case '/transition': await obs.emit({ cmd: 'transition', name: q.get('name') || 'tape' }); return ok(res);
      case '/intro': await obs.emit({ cmd: 'intro' }); return ok(res);
      case '/outro': await obs.emit({ cmd: 'outro', text: q.get('text') || undefined }); return ok(res);
      case '/sound': await obs.emit({ cmd: 'sound', enabled: q.has('enabled') ? (q.get('enabled') === '1' || q.get('enabled') === 'true') : undefined, volume: q.has('volume') ? Number(q.get('volume')) : undefined }); return ok(res);
      case '/hideall': await obs.emit({ cmd: 'hideAll' }); return ok(res);
      case '/reload': await obs.emit({ cmd: 'reload' }); return ok(res);

      default: return send(res, 404, { ok: false, error: 'Ruta desconocida: ' + url.pathname });
    }
  } catch (e) { return fail(res, e); }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Puente de La Cápsula Insólita escuchando en http://localhost:${PORT}  (abre esa URL para ver los botones disponibles)`);
});
