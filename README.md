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

- Cada escena horizontal tiene **su propia fuente de Navegador** (`LCI Broadcast V1`…`V4`), apuntando a `index.html` con `?scene=` fijo para esa escena — no se comparte una sola fuente entre las 4 (antes sí se compartía; se cambió porque un cambio de escena en OBS es un evento global que le llega a todas las fuentes de Navegador abiertas, y eso podía pisarlas entre sí). Ver sección 16 para el mismo criterio aplicado a las verticales.
- Las cámaras son fuentes de OBS **debajo** del overlay. El fondo del overlay se recorta (`clip-path`) exactamente donde va cada cámara: son huecos reales.
- Los comandos (evidencia, alertas, lower third…) viajan por obs-websocket → `CallVendorRequest("obs-browser", "emit_event", { event_name: "lci" })`. Los manda el panel de control (o Claude por MCP).
- Por tener una fuente por escena, cambiar de escena en OBS ahora carga esa página de cero (es un archivo local, prácticamente instantáneo) en vez de solo cambiar el layout de una página ya abierta. Transición de OBS: **Corte**.

### Escenas en OBS (ya creadas)

| Escena OBS | Layout |
|---|---|
| `LCI 01 · Cámara` | SCENE_01_CAMERA |
| `LCI 02 · Dos Cámaras` | SCENE_02_DUAL_CAMERA |
| `LCI 03 · Cámara + Evidencia` | SCENE_03_CAMERA_EVIDENCE |
| `LCI 04 · Dos Cámaras + Evidencia` | SCENE_04_DUAL_CAMERA_EVIDENCE |

Si renombras una escena en OBS, cambia también `obs.sceneMap` en `config.js`.

### Fuente de navegador

Una por escena, no compartida (ver arriba). Para cada una:
- Archivo local: `R:/Leonardo obs IA/capsula/index.html`, con `?scene=SCENE_0N_...` agregado a la URL según la escena.
- Ancho/alto: **igual que tu lienzo de OBS** (ahora 2560×1440). El overlay se escala solo; el diseño base es 1920×1080.
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
3. En OBS crea la escena, añade las cámaras debajo y una fuente de Navegador propia encima apuntando a `index.html?scene=SCENE_05_...` (no reutilices la de otra escena).
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

### CASE FILES (§02)

Base única de **expedientes** (Historia · Evidencia · Pista · Testimonio). Las pestañas **TODOS · HISTORIAS · EVIDENCIAS · PISTAS · TESTIMONIOS** son filtros de esa misma lista, no bancos separados.

- **Leer sin modal**: al hacer clic en un expediente, su contenido se muestra *dentro del propio módulo* (número, tipo, título, historia completa con scroll interno, evidencias relacionadas). Cámaras, Evidence Control, el banco y el Control Deck siguen visibles y operables.
- **▶ MOSTRAR**: vuelve a preparar las evidencias del expediente en §04 (útil tras haber mandado algunas). **✎ EDITAR** abre el editor (modal de dos zonas): a la izquierda título, tipo (botones) y texto con contador de palabras; a la derecha las evidencias relacionadas en su orden de salida (1.ª = SIGUIENTE, con ↑ y ✕) y, debajo, las miniaturas del archivo: un clic relaciona o quita (el número indica el orden). Se guarda solo; `Ctrl+Enter` o `Esc` cierran. **🗄 ARCHIVAR**, **✕ BORRAR** y **← →** (navegar dentro de la pestaña actual) están en el lector.
- **Relación con Evidence Control**: seleccionar un expediente **prepara, nunca emite**. La 1.ª evidencia relacionada pasa a **SIGUIENTE** y las demás a la **COLA** (visible en §05). Con **MANDAR AL AIRE** (`E` / `Enter`) la 1.ª pasa a AL AIRE, la 2.ª pasa sola a SIGUIENTE y la cola avanza. La cola solo guarda ids del banco maestro (no copia ni mueve nada); al cambiar de expediente se reconstruye. En la cola puedes subir (▲) o quitar (✕) una evidencia; `Esc` / `VACIAR COLA` la suelta.
- **Contar la historia**: el lector parte el texto en párrafos; un clic (o ↑ ↓ con el lector enfocado) deja el **marcador de lectura** («voy por aquí») y atenúa el resto. **○ MARCAR CONTADO** deja una ✓ en la lista; filtros **SIN CONTAR** y **CON EVIDENCIA** y buscador (número, título, texto). **→ LOWER THIRD** prepara el lower third con el texto seleccionado (o el título) sin sacarlo al aire. **⇪ IMPORTAR** crea expedientes desde `.txt` / `.md` (cada archivo uno; si trae líneas `# Título`, cada una abre uno nuevo; ≤ 500 KB).
- Contadores en vivo y **🗄 VER ARCHIVADOS**. Se guarda en este navegador (`lci-casefiles-v1`); las notas del sistema viejo se migran solas. Código en `js/control.js` (`CF_KEY`, `cfPrepare`, `evQueue`).

### Sonidos: enlaces de los efectos y soundboard con teclas

Ajustes → **AUDIO**:

- **Efectos del programa** (alerta, sello, flash, papel, cinta, barrido, impacto, bip, estática): cada uno suena *sintetizado* por defecto, sin archivos. Para cambiarlo, escribe un **link** (`https://…/sonido.mp3`), una **ruta** (`assets/sounds/alerta.mp3`) o elige un **archivo** (📁, ≤ 500 KB; queda guardado dentro del panel y del overlay). **▶** lo prueba al instante; **↺** vuelve al sintetizado. Los cambios se mandan al overlay y se guardan allí; al conectar con OBS el panel los reenvía por si acaso. Solo se aceptan `https://`, rutas relativas y audio incrustado.
- **Mis sonidos** (soundboard): **+ NUEVO SONIDO** → nombre, link/ruta/archivo, volumen y **tecla rápida** (clic en el campo y pulsa la combinación, p. ej. `F9` o `Ctrl+Shift+1`). Cada sonido es una acción más: aparece en **⌨ ATAJOS** (grupo SONIDO), en la paleta `Ctrl+K` y se puede usar dentro de **macros** y botones personalizados. **✎ EDITAR** cambia o borra uno.
- **Teclas rápidas, a la vista**: cada efecto del programa y cada sonido de «Mis sonidos» tiene un botón **＋ TECLA** (o la tecla ya asignada). Haz clic y pulsa la combinación (`F7`, `Ctrl+Shift+1`…); `⌫` la quita y `Esc` cancela. Si la tecla ya era de otra acción, pregunta si se la quitas. Todo queda también en **⌨ ATAJOS**, grupo SONIDO.
- Sigue valiendo el interruptor general «Sonidos de la transmisión activados» (si está apagado, nada suena).

### Respaldo, Preview/TAKE y macros

- **Respaldo** (Ajustes → RESPALDO): **⬇ DESCARGAR RESPALDO** guarda en un `.json` expedientes, banco de evidencias, atajos, botones/macros y ajustes (todo lo `lci-*` de este navegador). **⬆ RESTAURAR…** lo devuelve (pide confirmación, valida el archivo y, si no cabe, deja todo como estaba). Muestra el último respaldo y cuánto espacio queda (~5 MB por navegador); avisa si llevas más de 14 días sin respaldar.
- **Evidence Control = mezclador**: **PREVIEW** (SIGUIENTE, con ◂ ▸ para recorrer el archivo) · **TAKE** (rojo, `E`/`Enter`) · **PROGRAMA** (lo que está al aire). TAKE manda el PREVIEW al aire y la siguiente de la cola pasa a PREVIEW. Los datos (tipo, nº, leyenda) están en el desplegable «DATOS DE LA EVIDENCIA».
- **Macros**: un botón personalizado puede tener **varios pasos** con espera entre ellos (p. ej. escena + 700 ms + alerta). `Esc` cancela una macro en curso; el candado la bloquea. Vienen 3 **presets de fábrica** editables o borrables: ENTREVISTA (escena 2 + clean), INVESTIGACIÓN (escena 3 + investigation) y ÚLTIMA HORA (escena 1 + alerta ÚLTIMA HORA).

### Hora, ubicación y tiempo al aire

- **En el overlay (horizontal, arriba a la derecha)**: `● EN VIVO 01:23:45` (cronómetro), `DOM 04 OCT · 09:09 AM` y `📍 BUENOS AIRES · ARGENTINA`. En vertical no se muestra (no hay sitio sin tapar la cámara).
- **Cajón «HORA · UBICACIÓN · EN VIVO»** (Ajustes): escribes el lugar, eliges zona horaria (hora del PC, Buenos Aires, Madrid, México…), 12 h o 24 h, con o sin segundos / fecha / ubicación / cronómetro, y **APLICAR AL OVERLAY**. Los valores de fábrica están en `config.js → hud`. Se guarda en OBS y sobrevive a recargas.
- **Tiempo al aire real**: el panel le pregunta a OBS cada 3 s cuánto lleva transmitiendo (y grabando) y lo muestra arriba (`● EN VIVO 01:02:04`). Con «Seguir automáticamente el tiempo de transmisión de OBS» activo, ese inicio se manda al overlay, así que el `EN VIVO` del público es el tiempo real y coincide en todas las escenas. **SINCRONIZAR** lo fuerza; **PONER EN 00:00:00** lo reinicia a mano.

### Lectura de colores, candado, vistas y tamaño de texto

- **Colores con un solo significado**: 🔴 **rojo = al aire** (escena ON AIR, evidencia y lower third visibles, botones que sacan algo al aire como MANDAR AL AIRE) · 🟡 **amarillo = seleccionado / preparado** (SIGUIENTE, pestaña, transición elegida) · ⚪ **blanco = modo activo** (clean / investigation).
- **🔓 BLOQUEAR** (`Ctrl+Shift+L`, cambiable en ⌨ ATAJOS): desactiva botones y atajos del Deck, Evidence Control, Cámaras, Lower Third y los OUTRO, para no tocar nada sin querer mientras hablas. **OCULTAR TODO** sigue funcionando y Case Files se puede seguir leyendo.
- **VISTA** (barra superior): NORMAL (50/50) · LECTURA (Case Files más grande) · OPERACIÓN (Evidence Control + Archivo suben sobre Case Files y el Deck) · COMPACTO (menos aire entre cajas). Se recuerda.
- **A− / A+**: tamaño de todo el panel (90 % a 130 %). Con letra grande el diseño se reordena solo (Case Files arriba y el Deck debajo, a todo el ancho) para que nada se aplaste. Dentro de Case Files, el lector tiene además su propio A− / A+ para leer a distancia.
- Los avisos salen abajo a la derecha y ya no tapan "Now playing".

### ESCALETA (rundown) en Case Files

Pestaña **ESCALETA** (al lado de EXPEDIENTES, en Case Files): los temas del programa en orden, como en una producción de TV.

- **Armarla**: botón **＋ ESCALETA** en el lector, o el selector «+ añadir expediente…», o un **bloque libre** (PUBLICIDAD, CIERRE…). Los minutos de cada expediente se estiman por la longitud del texto (~130 palabras por minuto) y se corrigen a mano. Reordena con ↑ ↓ o arrastrando; ✕ quita.
- **Resumen**: PLAN (suma de minutos), SHOW MIN (la duración del programa que tú fijas), MARGEN (+ te sobran / − te pasas) y VAS (ATRASADO / ADELANTADO / A TIEMPO frente al plan). Una barra muestra el avance de cada tema.
- **En directo**: **▶ INICIAR ESCALETA** abre el primer tema; **SIGUIENTE TEMA ▸▸** cierra el actual con su tiempo real (verde si cumples, ámbar/rojo si te pasas), lo marca como CONTADO, abre el siguiente en el lector y **prepara sus evidencias** en §04 (nada sale al aire). ◂ ANT. vuelve atrás; ▶ en una fila salta a ese tema; ↺ reinicia el avance. Arriba aparece un chip `ESCALETA 3/7 · 04:12 / 5:00`.
- **Teclas**: «Escaleta · siguiente tema / anterior / iniciar» están en ⌨ ATAJOS (sin tecla de fábrica; ponles la que quieras) y se pueden usar en macros. El candado las bloquea.
- Se guarda en este navegador (`lci-rundown-v1`) y entra en el respaldo.

### Distribución: CASE FILES + CONTROL DECK (zona superior 50 % / 50 %)

Bajo "Now playing" hay dos áreas de igual peso, fijas (no se arrastran ni se redimensionan):

- **Izquierda · CASE FILES** — "¿qué estoy contando?": pestañas, lista única de expedientes (a la izquierda) y lector con scroll interno (a la derecha). Debajo del lector: evidencias relacionadas y los botones MOSTRAR / EDITAR / ARCHIVAR / BORRAR / ← →.
- **Derecha · CONTROL DECK** — "¿qué necesito pulsar?": **1 Quick Actions · 2 Scene Switcher · 3 Alertas (+ sellos) · 4 Modo · 5 Transición · 6 Personalizados**. Se puede **▾ CONTRAER / ▸ EXPANDIR** (queda una línea con lo esencial; el estado se recuerda).
- Arriba de todo, justo bajo "Now playing": **EMERGENCY (§01)** como barra delgada siempre visible (OCULTAR TODO · OUTRO caso cerrado / continuará · QUITAR INTRO/OUTRO; ■ OCULTAR TODO también está en la barra superior en pantallas angostas). Debajo de Case Files y Control Deck: **EVIDENCE CONTROL y ARCHIVO DE EVIDENCIAS lado a lado** (fila fija, a mano), y debajo Cámaras · Activity Log + Lower Third · Ajustes (Efectos, Audio, OBS, Debug). Las 3 columnas de abajo sí se reordenan con ⠿ MOVER CAJAS.
- En pantallas ≤ 1100 px (dock de OBS) Case Files y Control Deck se apilan.

**Transición**: lo frecuente está a la vista y el ajuste se esconde: una barra `◂ [TAPE ▾] ▸ ▶` (◂ ▸ cambian de transición —también con ← → si la barra está enfocada, o con atajos que puedes asignar en ⌨ ATAJOS: «Transición anterior / siguiente»—, ▾ abre la rejilla de baldosas con pictograma, ▶ la prueba). (el cajón TRANSICIONES de Ajustes ya no existe; **doble clic** en una baldosa la prueba sola) (corte, tape, flash, paper, file, cctv, stamp, redflash, document, glitch, evidence). La elegida es la que se usa al cambiar de escena (se recuerda); **▶ PROBAR** (`T`) la lanza sola sin cambiar de escena. Una transición nueva en `config.js → transitionTimings` aparece sola con un icono genérico (el pictograma propio se agrega en `TR_ICON`, `js/control.js`).

**Transcripción**: el proyecto no incluye ningún sistema de transcripción, por eso no hay módulo en el Deck.

**Personalizados**: **+ NUEVO BOTÓN** → nombre, pasos (tipo de acción + acción + espera) y atajo (clic en el campo y pulsa la tecla, p. ej. `F8`). Solo ofrece acciones reales del registro del panel (las de Ctrl+K). **✎ EDITAR** permite renombrar, cambiar acción/atajo o borrar. Rechaza teclas reservadas o ya usadas. Se guardan en `lci-custom-buttons-v1`.

### Organización ("control room")

- **Barra superior**: estado real de OBS (`OBS CONNECTED` / `CONNECTING` / `OBS OFFLINE` / `CONNECTION LOST` / `AUTH FAILED`), si alguna de las 4 fuentes del overlay (`LCI Broadcast V1`…`V4`) está en el programa (`OVERLAY`), modo, buscador (Ctrl+K) y `?` (atajos). Si se pierde OBS aparece una franja roja con **RECONNECT**; además reintenta solo (2 s, 4 s, 8 s… hasta 15 s) sin abrir conexiones duplicadas. Con contraseña incorrecta no reintenta.
- **Now playing**: escena al aire (lo que dice OBS, en tiempo real), CAM 01, CAM 02, evidencia, lower third y modo. Todo salvo la escena es **lo último que el panel envió con éxito** (el overlay no responde estado); lo desconocido se muestra como "—".
- **CONTROL DECK** (ver sección propia): quick actions, alertas, modo y scene switcher (la escena al aire marcada ON AIR) · **§02 CASE FILES** · **§06 Cámaras**.
- **§04 Evidence control** + **§05 Archivo de evidencias** (ver sección 4).
- **§08 Lower third** (vista previa del texto en vivo). Modo (investigation = amarillo, clean = blanco) y alertas (▲ rojas = críticas) están en el Control Deck.
- **§01 Emergency**: OCULTAR TODO (1 toque), outro caso cerrado / continuará (**2 toques en 3 s**, el botón parpadea en rojo al armarse), quitar intro/outro. En el dock (≤900 px) sube al 3.er lugar y además hay un botón **■ OCULTAR TODO** fijo en la barra superior.
- Avisos (toasts): salen arriba, bajo la barra, sin tapar el pánico; en el dock se ven máximo 2.
- NOW PLAYING: **SIN DATO** = ese estado aún no se envió desde este panel (no es lo mismo que OFFLINE).
- Tras clicar un botón con el mouse, Enter/Espacio ya no lo repiten. Las miniaturas del banco se usan también con Tab + Enter/Espacio.
- **§07 Activity log**: últimas 20 acciones con hora (errores en rojo).
- Cajones cerrados con resumen: **Efectos** (N ACTIVE), **Transiciones** (agrupadas: físicas, digitales, cinematográficas, alerta), **Audio** (SFX, volumen, ambiente, ducking, pruebas), **OBS** (host/puerto/contraseña en "avanzado"), **Debug** (bitácora técnica, recargar overlay).
- Cada acción muestra un aviso breve abajo a la derecha (verde = enviado, rojo = no se envió, p. ej. "OBS OFFLINE · NO SE ENVIÓ"). El estado solo cambia si OBS aceptó el comando.
- Se adapta a pantalla grande (3 columnas), laptop (2) y dock angosto de OBS (1 columna, ~400-500 px).

### Atajos de teclado (personalizables)

Botón **⌨ ATAJOS** (barra superior o cabecera del Control Deck) o la tecla `?`: editor de atajos como el de un programa de video.

- Cada acción del panel (escenas, evidencia, modo, alertas, sellos, transiciones, cámaras, enfoque, audio, show…) y cada botón personalizado tiene su fila. Búscala, haz clic en su tecla y pulsa la nueva combinación: admite **Ctrl / Alt / Shift** (por ejemplo `Ctrl+Shift+X`, `F9`).
- **⌫** quita el atajo, **Esc** cancela, **↺** vuelve al de fábrica, **RESTABLECER TODO** vuelve todo a fábrica.
- Si la combinación ya era de otra acción, pregunta si quitársela. Las teclas del sistema o del navegador (Esc, Enter, F5, F12, Ctrl+K, Ctrl+R…) no se pueden asignar.
- Las teclas que se ven en los botones (E, I, C, 1–4…) se actualizan solas. Se guarda en este navegador (`lci-keymap-v1`; solo las diferencias con la fábrica). No se disparan mientras escribes en un campo.
- Fijas: `Enter` manda al aire la evidencia en SIGUIENTE · `Esc` cierra/cancela · `Ctrl+K` paleta de comandos.
- De fábrica: `1`–`4` escena · `E` evidencia · `I`/`C` modo · `L` lower third · `A` alerta · `T` transición · `O` `O` outro.

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

4 escenas de **1080×1920** para transmitir en vertical a la vez que la horizontal (ej. TikTok mientras la principal va a otra plataforma). Viven en un **canvas aparte de OBS 32**, el "Aitum Vertical" que crea el plugin **Aitum** — no es el canvas "Main" de siempre, así que estas 4 escenas se ven en el panel **"Vertical Escenas"** de Aitum, no en la lista normal de Escenas.

| Escena | Contenido | URL de la fuente de Navegador |
|---|---|---|
| V1 | cámara + evidencia | `...capsula/index-vertical.html?scene=SCENE_V01_VERTICAL` |
| V2 | 1 cámara sola | `...capsula/index-vertical.html?scene=SCENE_V02_SINGLE_VERTICAL` |
| V3 | 2 cámaras apiladas | `...capsula/index-vertical.html?scene=SCENE_V03_DUAL_VERTICAL` |
| V4 | 2 cámaras + evidencia | `...capsula/index-vertical.html?scene=SCENE_V04_DUAL_EVIDENCE_VERTICAL` |

(URL completa: `file:///R:/Leonardo%20obs%20IA/capsula/index-vertical.html?scene=...`)

**Regla de oro: una fuente de Navegador por escena, nunca compartida.** Si la misma fuente se usa en las 4, un cambio de escena en OBS termina cambiándoles el layout a las 4 a la vez — ya nos pasó. Por eso cada `?scene=` es fijo y cada escena tiene su propia fuente dedicada.

Debajo de esa fuente (en capas: cámara atrás, overlay adelante) van las cámaras reales (`Webcam`/`Webcam 2`, agregadas como fuente existente), posicionadas para calzar con el hueco que deja el overlay:

| Escena | Cámara 1 (x, y, ancho×alto) | Cámara 2 |
|---|---|---|
| V1 | 60, 180, 960×540 | — |
| V2 | 40, 560, 1000×562 | — |
| V3 | 80, 180, 920×518 | 80, 808, 920×518 |
| V4 | 60, 180, 960×540 | 300, 820, 720×405 |

> **Ya configurado en este equipo.** Si hay que rearmarlo desde cero: canvas propio → 4 escenas → fuente de Navegador dedicada con su `?scene=` → cámara(s) debajo con esas coordenadas.
