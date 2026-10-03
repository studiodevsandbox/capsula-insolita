# La Cápsula Insólita · Broadcast Package

> "Cada imagen es una evidencia. Cada cámara es un testigo. Cada transmisión abre el caso."

Sistema visual completo para OBS: 4 escenas, evidencia dinámica, cinta, sellos, alertas, lower thirds, 10 transiciones, intro, outro, Clean / Investigation mode y panel de control.

---

## 1. Estructura

```
capsula/
├─ index.html            ← el overlay (UNA sola Fuente de Navegador para las 4 escenas)
├─ control.html          ← panel de control (dock de OBS o navegador)
├─ config.js             ← CONFIGURACIÓN CENTRAL (textos, cámaras, efectos, escenas, OBS)
├─ css/
│  ├─ tokens.css         ← design tokens: colores, tipografías, sombras, tiempos
│  ├─ stage.css          ← escenario, fondo en 10 capas, conmutadores de efectos
│  ├─ components.css     ← cámaras, evidencia, cinta, papeles, lower third, sellos, alertas
│  ├─ motion.css         ← transiciones, intro, outro
│  └─ control.css        ← estilos del panel de control (solo control.html)
├─ js/
│  ├─ core.js            ← utilidades, estado, efectos, sonido, reloj, huecos de cámara
│  ├─ components.js      ← BrandHeader, CameraFrame, EvidenceFrame, EvidenceTape, CaseStamp,
│  │                       LowerThird, AlertSystem, Decor (papeles/hilo/marcas), partículas
│  ├─ transitions.js     ← TransitionManager (10 transiciones) + intro/outro
│  ├─ app.js             ← SceneController, puente con OBS, atajos de teclado, arranque
│  └─ control.js         ← panel: cliente obs-websocket, estado, atajos, paleta de comandos
└─ assets/
   ├─ evidence/          ← tus imágenes/videos de evidencia (+ 2 demos)
   └─ sounds/            ← efectos de sonido opcionales
```

Sin compilación ni dependencias: HTML/CSS/JS puro (los módulos ES no cargan desde `file://` en OBS).
Texturas (pared, grano, tinta de sellos) se generan por código: cero imágenes pesadas.

## 2. Cómo funciona con OBS

- Una sola fuente **`LCI · Broadcast`** está en las 4 escenas. Como es la misma fuente, no se recarga al cambiar de escena: escucha `obsSceneChanged` y cambia de layout.
- Las cámaras son fuentes de OBS **debajo** del overlay. El fondo del overlay se recorta (`clip-path`) exactamente donde va cada cámara: son huecos reales.
- Los comandos (evidencia, alertas, lower third…) viajan por obs-websocket → `CallVendorRequest("obs-browser", "emit_event", { event_name: "lci" })`. Los manda el panel de control (o Claude por MCP).
- Al cambiar de escena desde el panel, la transición del overlay cubre la pantalla y **en ese instante** el panel corta la escena de OBS: las cámaras nunca se ven saltar. Por eso la transición de OBS está en **Corte**.

### Escenas en OBS (ya creadas)

| Escena OBS | Layout |
|---|---|
| `LCI 01 · Cámara` | SCENE_01_CAMERA |
| `LCI 02 · Dos Cámaras` | SCENE_02_DUAL_CAMERA |
| `LCI 03 · Cámara + Evidencia` | SCENE_03_CAMERA_EVIDENCE |
| `LCI 04 · Dos Cámaras + Evidencia` | SCENE_04_DUAL_CAMERA_EVIDENCE |

Si renombras una escena en OBS, cambia también `obs.sceneMap` en `config.js`.

### Fuente de navegador

- Archivo local: `R:/Leonardo obs IA/capsula/index.html`
- Ancho/alto: **igual que tu lienzo de OBS** (ahora 2560×1440). El overlay se escala solo; el diseño base es 1920×1080.
- Permisos de página: "Acceso de lectura" (para seguir la escena activa).
- "Controlar audio mediante OBS": activado (para los sonidos).

## 3. Cambiar cámaras

Cada hueco tiene coordenadas exactas. En OBS, coloca la cámara en esa posición y tamaño (clic derecho → Transformar → Editar transformación; usa "Tipo de caja delimitadora: Estirar a los límites" para fijar el tamaño exacto).

| Escena | Cámara | 1920×1080 (x, y, ancho×alto) | 2560×1440 (tu lienzo) |
|---|---|---|---|
| 01 | CAM 01 | 288, 196, 1344×756 | 384, 261.3, 1792×1008 |
| 02 | CAM 01 | 112, 236, 832×468 | 149.3, 314.7, 1109.3×624 |
| 02 | CAM 02 | 976, 316, 832×468 | 1301.3, 421.3, 1109.3×624 |
| 03 | CAM 01 | 112, 204, 1152×648 | 149.3, 272, 1536×864 |
| 04 | CAM 01 | 96, 204, 960×540 | 128, 272, 1280×720 |
| 04 | CAM 02 | 1120, 204, 704×396 | 1493.3, 272, 938.7×528 |

Para otro lienzo: multiplica por `ancho del lienzo / 1920` (1600×900 → ×0.8333; 1280×720 → ×0.6667).
Ver los huecos marcados: abre `index.html?debug=1&preview=1`.

- **Estado** (REC / LIVE / WAITING / OFFLINE): panel → Cámaras, un clic en el botón del estado (aplica con interferencia CCTV). El activo queda pintado (REC rojo, LIVE amarillo, WAITING crema, OFFLINE gris).
- **Testigo**: campo de texto + `APLICAR` (sin efecto) o `⚡ INTERF.` (con glitch). Etiqueta y estado manual: desplegable "ETIQUETA · ESTADO MANUAL".
- **◎ ENFOCAR**: pide al overlay enfocar esa cámara 6 s.
- **Desactivar una cámara**: `camera1.enabled: false` en `config.js`.

## 4. Cambiar imágenes (evidencia)

Panel → **Archivo de evidencias** + **Evidence control**:
1. Sube muchas imágenes de una vez (`+ SUBIR IMÁGENES` o arrastrándolas sobre el archivo: aparece "SUELTA PARA AÑADIR EVIDENCIA"). Se guardan en el panel (localStorage, 820 px).
2. Ordénalas arrastrando una miniatura sobre otra. Filtros TODAS / DISPONIBLES / USADAS y búsqueda por nombre.
3. Elige tipo, leyenda y descripción en "SIGUIENTE" (el número sube solo).
4. Manda: tecla **E** / botón `MOSTRAR #NNN` = la siguiente disponible del archivo, o clic en una miniatura.
   - "CLIC EN MINIATURA: AL AIRE" (por defecto) = un clic la manda directo (queda gris con ✓ y su número).
   - "PREPARAR" = un clic la deja en SIGUIENTE con vista grande; **E**, **Enter** o `MOSTRAR` la mandan (doble clic = directo). **Esc** quita la selección.
5. "AL AIRE" muestra la evidencia activa (miniatura, número, tipo, visible/oculta; avisa si la escena actual no tiene marco). `OCULTAR` la quita, `◎ ENFOCAR` la enfoca 6 s.

Archivo suelto o ruta (videos incluidos): desplegable "FUENTE MANUAL" → `MOSTRAR DESDE ARCHIVO / RUTA` (se reduce a 1400 px).
`REHABILITAR USADAS` las vuelve a dejar disponibles; `VACIAR BANCO` y la × de cada miniatura piden confirmación.

Cada tipo cambia el soporte físico:
- **print** (photo, image, profile, video): fotografía revelada con leyenda manuscrita.
- **sheet** (document, news, map, clipping, archive): hoja de expediente con sello CONFIDENCIAL.
- **capture** (capture, social, message): captura impresa con clip.

Videos: cópialos a `assets/evidence/` y usa la ruta (no se suben desde el panel).

## 5. Cambiar textos

Todo en `config.js`:
- `brand.title`, `brand.subtitle`, `brand.caseNumber`, `brand.caseId`
- `camera1` / `camera2`: `label`, `status`, `subject`
- `lowerThird`: `label`, `number`, `name`, `role` (o desde el panel)
- Textos de la cinta por escena: `scenes.<ESCENA>.tapes[].text`

Después de editar `config.js`: panel → "Recargar overlay".

## 6. Crear nuevas evidencias

Copia la imagen a `assets/evidence/` → panel → Evidence control → "FUENTE MANUAL" → ruta → Mostrar (o súbela al archivo de evidencias).
Para dejar una evidencia fija al arrancar: `evidence.image` en `config.js`.

## 7. Crear nuevas escenas

1. En `config.js → scenes` agrega por ejemplo `SCENE_05_FULL_EVIDENCE` con `cams`, `evidence`, `lowerThird`, `alert`, `tapes`, `decor`.
2. Si quieres papeles/hilo propios, agrega una entrada en `DECOR` (`js/components.js`) y referénciala en `decor`.
3. En OBS crea la escena, añade las cámaras debajo y la fuente `LCI · Broadcast` encima.
4. Agrégala a `obs.sceneMap` y (opcional) un botón en `control.html` con `data-scene="SCENE_05_..."`.

Preparadas en la arquitectura (no implementadas): FULL_EVIDENCE, ONLY_EVIDENCE, BREAK, INTERMISSION, INTRO, OUTRO.

## 8. Panel de control

- **En OBS**: Acoples → Acoples de navegador personalizados → Nombre `LCI Control`, URL `file:///R:/Leonardo%20obs%20IA/capsula/control.html`.
- **O en cualquier navegador**: abre `control.html` (conecta a `ws://localhost:4455`).
- La contraseña de obs-websocket está en `config.js → obs.password`. Si la regeneras en OBS, actualízala ahí.

Después de cambiar `control.html`, `css/control.css` o `js/control.js`: en OBS, clic derecho en el acople → **Recargar** (o ciérralo y ábrelo).

### Mover cajas y presets de orden (topbar)

El panel entero se puede reordenar a gusto:

- **⠿ MOVER CAJAS**: activa el modo edición (arranca bloqueado para no mover nada sin querer en vivo). Con el modo activo, arrastrá una caja tomándola por su título y soltala sobre otra — se intercambian de lugar, las demás se acomodan solas (nunca se superponen). También se puede soltar en el espacio vacío de abajo de una columna. Clic de nuevo en el botón para bloquear.
- **Desplegable de presets**: guardá el orden actual con un nombre (**💾 GUARDAR PRESET**, te pide el nombre) y volvé a cargarlo cuando quieras eligiéndolo de la lista. **✕** borra el preset elegido. La opción **BASE · ORDEN ORIGINAL** vuelve al orden de fábrica (recarga la página).
- **RESTABLECER ORDEN**: igual que elegir BASE, por si el desplegable da problemas.
- Todo se guarda en este navegador (localStorage), no viaja a OBS ni a otra PC — cada PC/perfil de navegador tiene su propio acomodo.
- Código: `js/layout-drag.js` (independiente de `js/control.js`).

### CASE FILES (§01)

Reemplaza a las notas sueltas de antes: es una base de **expedientes**, cada uno con:

- **Tipo principal**: Historia · Evidencia · Pista · Testimonio.
- **Título y cuerpo** (la historia completa, para leer en vivo).
- **Evidencia relacionada** (opcional): uno o más ítems del banco de evidencias (§06). Al presionar **👁 MOSTRAR** en un expediente, el primero de sus relacionados se **prepara solo** en §05 (pasa a "SIGUIENTE", listo para mandar al aire con `E`) — el resto queda solo como referencia, no se preparan todos.
- **Archivar / reactivar**: un expediente archivado desaparece de la lista; el botón **🗄 VER ARCHIVADOS** (abajo de la lista) los vuelve a mostrar (atenuados, en itálica) para poder reactivarlos.

Encabezado con contadores en vivo (expedientes totales · activos · "en emisión" = si hay un expediente abierto ahora mismo) y pestañas para filtrar por tipo (se generan solas según los tipos que existan, no hay que tocar código para agregar uno nuevo). Dentro del detalle, **← ANTERIOR / SIGUIENTE →** navegan dentro de la pestaña filtrada actual (del más viejo al más nuevo).

> **Importante:** "MOSTRAR" un expediente es solo para vos — **no manda nada al overlay de OBS** (a diferencia de evidencia o lower third, que sí viajan al overlay). Es una chuleta de lectura con preparación automática de evidencia, nada más.

Se guarda en este navegador bajo `lci-casefiles-v1`. Si existían notas del sistema viejo (`lci-notes-v2` / `lci-notes-v1`), se migran solas como expedientes tipo "historia" la primera vez que cargás el panel nuevo — no se pierde nada. Código en `js/control.js`, buscá `CF_KEY` / `cf.items`.

### Organización ("control room")

- **Barra superior**: estado real de OBS (`OBS CONNECTED` / `CONNECTING` / `OBS OFFLINE` / `CONNECTION LOST` / `AUTH FAILED`), si la fuente `LCI · Broadcast` está en el programa (`OVERLAY`), modo, buscador (Ctrl+K) y `?` (atajos). Si se pierde OBS aparece una franja roja con **RECONNECT**; además reintenta solo (2 s, 4 s, 8 s… hasta 15 s) sin abrir conexiones duplicadas. Con contraseña incorrecta no reintenta.
- **Now playing**: escena al aire (lo que dice OBS, en tiempo real), CAM 01, CAM 02, evidencia, lower third y modo. Todo salvo la escena es **lo último que el panel envió con éxito** (el overlay no responde estado); lo desconocido se muestra como "—".
- **§01 CASE FILES** (ver sección propia más abajo) · **§02 Scene switcher** (la escena al aire marcada ON AIR; transición elegida abajo) · **§03 Cámaras**.
- **§04 Quick actions**: evidencia siguiente, investigation, clean, lower third, alerta (repite la última usada), transición (la elegida en §02), intro, outro (dos toques).
- **§05 Evidence control** + **§06 Archivo de evidencias** (ver sección 4).
- **§07 Modo** (investigation = amarillo, clean = blanco) · **§08 Lower third** (vista previa del texto en vivo) · **§09 Alertas** (▲ rojas = críticas: ATENCIÓN, CASO ABIERTO, ÚLTIMA HORA) y sellos.
- **§10 Emergency**: OCULTAR TODO (1 toque), outro caso cerrado / continuará (**2 toques en 3 s**, el botón parpadea en rojo al armarse), quitar intro/outro. En el dock (≤900 px) sube al 3.er lugar y además hay un botón **■ OCULTAR TODO** fijo en la barra superior.
- Avisos (toasts): salen arriba, bajo la barra, sin tapar el pánico; en el dock se ven máximo 2.
- NOW PLAYING: **SIN DATO** = ese estado aún no se envió desde este panel (no es lo mismo que OFFLINE).
- Tras clicar un botón con el mouse, Enter/Espacio ya no lo repiten. Las miniaturas del banco se usan también con Tab + Enter/Espacio.
- **§11 Activity log**: últimas 20 acciones con hora (errores en rojo).
- Cajones cerrados con resumen: **Efectos** (N ACTIVE), **Transiciones** (agrupadas: físicas, digitales, cinematográficas, alerta), **Audio** (SFX, volumen, ambiente, ducking, pruebas), **OBS** (host/puerto/contraseña en "avanzado"), **Debug** (bitácora técnica, recargar overlay).
- Cada acción muestra un aviso breve abajo a la derecha (verde = enviado, rojo = no se envió, p. ej. "OBS OFFLINE · NO SE ENVIÓ"). El estado solo cambia si OBS aceptó el comando.
- Se adapta a pantalla grande (3 columnas), laptop (2) y dock angosto de OBS (1 columna, ~400-500 px).

### Atajos de teclado del panel

Funcionan con el foco en el panel (en OBS: clic en el acople primero). **No se disparan mientras escribes en un campo**; `Esc` sale del campo.

| Tecla | Acción |
|---|---|
| `1`–`4` | Escena 01–04 (con la transición elegida) |
| `E` | Mostrar la siguiente evidencia (la preparada o la primera disponible del archivo) |
| `I` / `C` | Investigation / Clean |
| `L` | Mostrar / ocultar lower third |
| `A` | Repetir la última alerta usada |
| `T` | Lanzar la transición elegida |
| `O` `O` | Outro "caso cerrado" (hay que pulsarla dos veces en 3 s) |
| `Enter` | Mandar la evidencia preparada (modo PREPARAR) |
| `Esc` | Cerrar paleta/ayuda, cancelar outro armado, quitar selección, salir de un campo |
| `Ctrl+K` | Paleta de comandos |
| `?` | Ayuda de atajos |

### Paleta de comandos (Ctrl+K)

Escribe parte del nombre ("cam 02 rec", "ultima hora", "tape", "enfocar") → flechas → Enter. Incluye todas las acciones: escenas, evidencia, modos, lower third, cada alerta y sello, cada transición, estados de cámara, enfoque, intro/outro, pánico, audio, reconectar y recargar overlay.
Todas las acciones viven en un registro único en `js/control.js` (`act(...)`): es la base para futuros presets/macros/favoritos.

## 9. Modos y efectos

- **Clean mode**: quita partículas, polvo, grano, glitch, scanlines, papeles y marcas. Mantiene cámaras, marca, evidencia e información.
- **Investigation mode**: todo lo anterior + marcas CCTV en cámaras, ruido de cámara, aberración cromática mínima.

Efectos individuales (`config.js → effects` o panel): `grain`, `particles`, `scanlines`, `vignette`, `redGlow`, `filmDust`, `vhs`, `chromaticAberration`, `glitch`, `cameraNoise`, `papers`, `markers`, `shadows`. `effects.enabled: false` apaga todo.

## 10. Transiciones

`tape` (cinta policial), `flash` (flash de cámara), `paper` (papel cruza), `file` (expediente se cierra/abre), `cctv` (interferencia), `stamp` (negro + sello CASO ABIERTO), `redflash`, `document`, `glitch`, `evidence` (evidencia aparece). Duraciones en `config.js → transitionTimings` (300–980 ms; `mid` = momento de cobertura total).

## 11. Intro / Outro

- **Intro (~6 s)**: negro + interferencia → CASE FILE → luz roja → cinta → fotografía → FLASH → LA CÁPSULA INSÓLITA / CASO ABIERTO · EN VIVO → ● LIVE.
- **Outro**: cámaras bajan intensidad, REC se apaga, el expediente se cierra, sello CASO CERRADO (o "CONTINUARÁ..." a máquina), cinta, fundido a negro. Queda en negro hasta "Quitar intro/outro".

## 12. Sonido

Pon archivos en `assets/sounds/` con estos nombres y activa `sound.enabled: true`:
`tape.mp3, whoosh.mp3, shutter.mp3, stamp.mp3, alert.mp3, impact.mp3, paper.mp3, beep.mp3, static.mp3`.
Sincronización: cambio de escena → whoosh + tape · nueva evidencia → shutter · alerta → alert + stamp · CASO ABIERTO → impact · REC/LIVE → beep.

## 13. Probar sin OBS

Abre `index.html` en Chrome con parámetros:
- `?scene=1..4` escena · `&preview=1` cámaras de prueba · `&demo=1` evidencia y lower third de ejemplo
- `&mode=clean` · `&intro=1` · `&debug=1` · `&run=alert&text=NUEVA%20PISTA`
- Atajos del overlay (solo al abrir `index.html` en el navegador; dentro de OBS usa los del panel): `1-4` escenas, `E`/`D` evidencia demo, `L` lower third, `A` alerta, `S` sello, `T` transiciones, `K` cambio de cámara, `N` intro, `O` outro, `R` quitar, `C`/`I` modos, `P` vista previa.

## 14. Stream Deck

El plugin oficial de Stream Deck para OBS ya sirve **tal cual** para cambiar de escena (usa obs-websocket
directo y el overlay detecta el cambio solo, disparando la transición "glitch"). Para todo lo demás
(evidencia, alertas, sellos, lower third, estados de cámara, intro/outro) hace falta el puente porque esos
comandos van por un canal propio (`emit_event`) que Stream Deck no sabe mandar de fábrica.

**Arrancar el puente:** doble clic en `iniciar-puente.bat` (o `node bridge.js`), y déjalo corriendo junto a OBS.
Reintenta solo la conexión si abres el puente antes que OBS, o si OBS se reinicia.

**Ver todos los botones disponibles:** abre `http://localhost:8787/` en el navegador — lista cada botón con
su URL ya armada (clic para probarlo) y el patrón para hacer variantes.

**Configurar un botón en Stream Deck:** acción **"Website"** (categoría Sistema, no hace falta plugin) →
pega la URL del puente, por ejemplo `http://localhost:8787/scene?key=2`. Si tu versión del Stream Deck
ofrece "abrir en segundo plano", actívalo para que no abra una ventana de navegador cada vez.

**Botones más útiles para armar primero:**
- Las 4 escenas: `/scene?key=1` … `/scene?key=4`
- Evidencia siguiente/anterior (recorre `assets/evidence` en orden): `/evidence/next`, `/evidence/prev`
- Pánico: `/hideall`
- Estados de cámara: `/camq?id=1&status=REC`, `/camq?id=1&status=OFFLINE`, etc.
- Intro / outro: `/intro`, `/outro?text=CASO%20CERRADO`

El puente usa la misma contraseña y escenas de `config.js` — si cambias algo ahí, reinícialo.
Puerto configurable en `config.js → obs.bridgePort` (por defecto 8787).

## 15. Rendimiento

- Solo se animan `transform` y `opacity` (GPU); la pared se pinta una vez en un canvas.
- Grano y ruido: una textura de 256 px desplazada por pasos, no regenerada.
- Polvo: 28 partículas CSS; polvo de película: 7 elementos.
- Las animaciones de Web Animations se liberan al terminar (sin capas colgando).
- Sin `requestAnimationFrame` continuo; el reloj actualiza 1 vez por segundo.
- Si OBS va justo de CPU: Clean mode, o apaga `particles`, `filmDust` y `grain`.

## 16. Escenas verticales (TikTok / Reels / Shorts)

Hay **4 escenas verticales** de **1080×1920**, una equivalente a cada escena horizontal:

| Escena | Contenido |
|---|---|
| `SCENE_V01_VERTICAL` | cámara arriba + evidencia debajo |
| `SCENE_V02_SINGLE_VERTICAL` | 1 cámara sola, sin evidencia |
| `SCENE_V03_DUAL_VERTICAL` | 2 cámaras apiladas, sin evidencia |
| `SCENE_V04_DUAL_EVIDENCE_VERTICAL` | 2 cámaras apiladas + evidencia |

**Para qué:** transmitir a 2 plataformas a la vez. La escena horizontal de OBS va a una
plataforma y la vertical a otra (por ejemplo TikTok).

### Cómo está armado (plugin Aitum, canvas vertical nativo de OBS 32)

Usamos el plugin **Aitum**, que crea un **canvas secundario** llamado "Aitum Vertical"
(1080×1920) dentro de OBS 32 — es un canvas de video aparte, no el mismo canvas
horizontal de siempre ("Main"). Ese canvas tiene sus propias 4 escenas, visibles en el
panel **"Vertical Escenas"** de Aitum (no en la lista normal de Escenas de OBS).

> **Importante — no reusar la misma fuente en las 4 escenas.** La primera versión de esto
> usaba una sola fuente de Navegador compartida entre las 4 escenas, cambiando el layout
> por comando desde el panel de control. Eso rompía: el comando de cambio de escena (del
> panel, o simplemente el que manda OBS solo al cambiar de escena) es **global** — llega a
> **todas** las fuentes de Navegador abiertas en OBS a la vez, no solo a la fuente activa.
> Resultado: las 4 escenas mostraban siempre el mismo layout. Por eso cada escena vertical
> tiene que tener **su propia fuente de Navegador independiente**, con el layout fijado en
> la URL (ver tabla de abajo) — así, aunque el comando global le llegue, la ignora (ver
> `js/app.js`, variable `LOCKED_SCENE`).

Cada una de las 4 escenas del canvas "Aitum Vertical" tiene:
- Su propia fuente de Navegador (1080×1920), apuntando a `index-vertical.html` con el
  parámetro `?scene=` fijo para esa escena — **no la reutilices en otra escena**:

  | Escena de Aitum | URL de la fuente de Navegador |
  |---|---|
  | V1 (cámara + evidencia) | `file:///R:/Leonardo%20obs%20IA/capsula/index-vertical.html?scene=SCENE_V01_VERTICAL` |
  | V2 (una cámara) | `file:///R:/Leonardo%20obs%20IA/capsula/index-vertical.html?scene=SCENE_V02_SINGLE_VERTICAL` |
  | V3 (dos cámaras) | `file:///R:/Leonardo%20obs%20IA/capsula/index-vertical.html?scene=SCENE_V03_DUAL_VERTICAL` |
  | V4 (dos cám. + evidencia) | `file:///R:/Leonardo%20obs%20IA/capsula/index-vertical.html?scene=SCENE_V04_DUAL_EVIDENCE_VERTICAL` |

- Debajo de esa fuente (en orden de capas, más abajo = más atrás), la(s) cámara(s) real(es)
  (`Webcam`/`Webcam 2`, las mismas fuentes dshow que usa la escena horizontal, agregadas
  como "fuente existente") posicionadas con tamaño/posición manual para calzar con el
  hueco transparente que deja el overlay en esa escena — coordenadas en `config.js`,
  sección `scenes.SCENE_VXX_VERTICAL.cams`:

  | Escena | Cámara 1 (x, y, ancho, alto) | Cámara 2 |
  |---|---|---|
  | V1 | 60, 180, 960×540 | — |
  | V2 | 40, 560, 1000×562 | — |
  | V3 | 80, 180, 920×518 | 80, 808, 920×518 |
  | V4 | 60, 180, 960×540 | 300, 820, 720×405 |

  El orden de capas importa: la cámara va **debajo** de la fuente de Navegador (si no, el
  marco/decoración del overlay no tapa los bordes de la cámara).

> **Ya configurado en este equipo** (verificado 2026-10-03): las 4 escenas y sus fuentes
> ya existen en el canvas "Aitum Vertical" y están probadas — no hace falta recrearlas acá.
> Si se reinstala OBS/Aitum o se pierde la configuración, seguir esta misma estructura
> (canvas propio → 4 escenas → fuente de Navegador dedicada por escena con su `?scene=`
> → cámara(s) debajo con las coordenadas de arriba).
