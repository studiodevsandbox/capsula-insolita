####################################################################################################
#                                                                                                  #
#                       LA CÁPSULA INSÓLITA — MASTER PROJECT INSTRUCTIONS                         #
#                                                                                                  #
#                 SISTEMA PROFESIONAL DE PRODUCCIÓN VISUAL PARA STREAMING                         #
#                                                                                                  #
####################################################################################################

IMPORTANTE:

Este archivo contiene las instrucciones maestras para evolucionar el proyecto actual de:

"LA CÁPSULA INSÓLITA"

desde un controlador/overlay funcional hacia un:

SISTEMA PROFESIONAL DE PRODUCCIÓN VISUAL PARA STREAMING EN VIVO.

Estas instrucciones deben aplicarse a TODO el proyecto.

NO asumir que el proyecto tiene una estructura determinada.

NO asumir que utiliza React, Vue, Vite, Next, vanilla JS, TypeScript, etc.

PRIMERO inspeccionar.

DESPUÉS entender.

DESPUÉS planificar.

DESPUÉS implementar.

####################################################################################################
# 01 — IDENTIDAD DEL PROYECTO
####################################################################################################

Nombre del programa:

LA CÁPSULA INSÓLITA

Subtítulo:

CASO ABIERTO · EN VIVO

Concepto creativo:

"CADA IMAGEN ES UNA EVIDENCIA.
CADA CÁMARA ES UN TESTIGO.
CADA TRANSMISIÓN ABRE EL CASO."

La aplicación no debe sentirse como:

"una página web".

Debe sentirse como:

"la central de producción de un programa de investigación en vivo".

####################################################################################################
# 02 — OBJETIVO GENERAL
####################################################################################################

Convertir el proyecto existente en una plataforma modular capaz de controlar:

- overlays
- cámaras
- estados de cámaras
- evidencias
- imágenes
- documentos
- fotografías
- alertas
- lower thirds
- cintas
- sellos
- pistas
- conexiones entre pistas
- transiciones
- efectos
- sonidos
- escenas
- modo limpio
- modo investigación
- intro
- outro
- OBS
- eventos
- logs
- presets
- futuros módulos

Debe poder crecer sin convertirse en un proyecto caótico.

####################################################################################################
# 03 — REGLA MÁS IMPORTANTE
####################################################################################################

NO destruir funcionalidades existentes.

NO reescribir todo simplemente porque una arquitectura nueva sería más elegante.

NO cambiar el framework si no es necesario.

NO instalar librerías innecesarias.

NO romper integración con OBS.

NO romper comunicación entre panel y overlay.

NO eliminar funciones existentes sin analizar primero su propósito.

Si algo funciona bien:

CONSERVARLO.

Si algo necesita mejorar:

EVOLUCIONARLO.

Si algo está mal diseñado:

REFACTORIZARLO SOLO CUANDO EL BENEFICIO SEA REAL.

####################################################################################################
# 04 — FASE 0: AUDITORÍA OBLIGATORIA
####################################################################################################

ANTES de modificar cualquier archivo:

inspecciona el proyecto completo.

Debes revisar:

- estructura de carpetas
- package.json o equivalente
- scripts
- entry points
- framework
- componentes
- páginas
- estilos
- assets
- imágenes
- configuración
- sockets
- eventos
- estado global
- almacenamiento
- sistema de cámaras
- sistema de evidencia
- alertas
- lower thirds
- transiciones
- efectos
- audio
- integración OBS
- Browser Source
- configuración de desarrollo
- configuración de producción

También revisa archivos:

- .env
- configuración
- documentación
- README
- scripts
- utilidades
- hooks
- stores
- servicios

NO supongas.

LEE EL CÓDIGO.

####################################################################################################
# 05 — MAPA DEL PROYECTO
####################################################################################################

Después de inspeccionar:

crea mentalmente un mapa de:

ENTRADA
↓
ESTADO
↓
CONTROL
↓
EVENTOS
↓
ESCENAS
↓
OVERLAY
↓
OBS

Determina cómo está funcionando actualmente.

####################################################################################################
# 06 — MODIFICACIÓN POR ARCHIVO
####################################################################################################

Cuando llegue el momento de implementar:

NO crees archivos arbitrariamente.

Para cada archivo debes preguntarte:

1. ¿Este archivo ya existe?
2. ¿Tiene una responsabilidad clara?
3. ¿Puede reutilizarse?
4. ¿Debe refactorizarse?
5. ¿Debe dividirse?
6. ¿Debe permanecer intacto?
7. ¿Existe duplicación?
8. ¿Dónde debería vivir esta responsabilidad?

Si creas un archivo nuevo:

debe tener una responsabilidad concreta.

Evitar:

components/NewThing2.jsx
utils/finalFinal.js
testNew.ts
newStyle.css

Nombres profesionales.

####################################################################################################
# 07 — ARQUITECTURA DESEADA
####################################################################################################

La arquitectura final debería aproximarse conceptualmente a:

/components
/scenes
/cameras
/evidence
/transitions
/animations
/audio
/alerts
/lowerThird
/stamps
/effects
/state
/events
/obs
/utils
/styles
/assets

PERO:

NO crees exactamente esta estructura si el framework actual recomienda otra.

ADAPTA la arquitectura al proyecto real.

####################################################################################################
# 08 — SISTEMA CENTRAL DE DISEÑO
####################################################################################################

Crear un Design System.

Todo debe compartir:

colores
tipografía
espaciado
bordes
sombras
animaciones
easing
glow
texturas
estados

Evitar valores repetidos por todo el código.

Crear tokens.

Ejemplo:

--color-background
--color-panel
--color-yellow
--color-red
--color-paper
--color-white
--color-muted

--spacing-xs
--spacing-sm
--spacing-md
--spacing-lg

--animation-fast
--animation-normal
--animation-slow

####################################################################################################
# 09 — PALETA
####################################################################################################

NEGRO:

#050505

DARK:

#0B0B0B

CHARCOAL:

#111111

YELLOW:

#FFD400

YELLOW DARK:

#C9A900

RED:

#B30018

LIVE RED:

#E00022

PAPER:

#E8E2D5

GRAY:

#777777

WHITE:

#F4F4F4

El negro domina.

El amarillo:

identidad / evidencia / advertencia / acciones.

El rojo:

alertas / REC / conexiones / tensión.

####################################################################################################
# 10 — ESTÉTICA
####################################################################################################

La estética es:

DOCUMENTAL
+
INVESTIGACIÓN
+
EXPEDIENTE
+
CCTV
+
TELEVISIÓN NOCTURNA
+
MISTERIO
+
BROADCAST

NO:

- gamer
- cyberpunk
- horror genérico
- gore
- sci-fi exagerado
- HUD futurista
- exceso de glitch

Debe ser elegante.

####################################################################################################
# 11 — UNIVERSO VISUAL
####################################################################################################

Elementos visuales posibles:

- fotografías
- documentos
- papeles
- recortes
- mapas
- post-its
- chinches
- líneas rojas
- cinta amarilla
- sellos
- etiquetas
- timestamps
- cámaras
- REC
- archivos
- huellas
- anotaciones

Todo debe parecer físico.

NO hacer tarjetas UI modernas para las evidencias.

####################################################################################################
# 12 — RESOLUCIÓN DEL OVERLAY
####################################################################################################

La composición principal debe estar optimizada para:

1920 × 1080

16:9

También funcionar en:

1600 × 900
1280 × 720

Crear safe zones.

Las caras y textos importantes no deben quedar pegados a los bordes.

####################################################################################################
# 13 — CUATRO ESCENAS OBLIGATORIAS
####################################################################################################

ESCENA 01:

UNA CÁMARA

ESCENA 02:

DOS CÁMARAS

ESCENA 03:

UNA CÁMARA + EVIDENCIA

ESCENA 04:

DOS CÁMARAS + EVIDENCIA

No crear cuatro sistemas independientes.

Crear un sistema modular.

####################################################################################################
# 14 — COMPONENTE DE CÁMARA
####################################################################################################

Cada cámara debe tener:

id
label
name
status
timecode
enabled

Estados:

REC
LIVE
WAITING
OFFLINE

Ejemplo:

CAM 01
● REC
TESTIGO A

Otro:

CAM 02
● LIVE
RAMÓN

Otro:

CAM 02
● WAITING
ESPERANDO CONEXIÓN

Otro:

CAM 01
● OFFLINE
SIN SEÑAL

####################################################################################################
# 15 — ESTADOS DE CÁMARA VISUALES
####################################################################################################

REC:

punto rojo pulsante.

LIVE:

indicador vivo.

WAITING:

indicador amarillo.

OFFLINE:

indicador gris.

Además:

el estado debe afectar visualmente el frame.

OFFLINE:

puede tener tratamiento visual diferente.

WAITING:

puede mostrar interferencia muy leve.

####################################################################################################
# 16 — EFECTOS DE CÁMARA
####################################################################################################

Crear toggles independientes:

CCTV
SCANLINES
NOISE
TIMECODE
INTERFERENCE
GLITCH
CHROMATIC ABERRATION
VIGNETTE
REC

No aplicar todos por defecto.

####################################################################################################
# 17 — EVIDENCE ENGINE
####################################################################################################

Este sistema es prioritario.

Crear un sistema de evidencias reutilizable.

Una evidencia puede tener:

id
type
title
description
image
timestamp
date
source
status

Tipos:

PHOTO
DOCUMENT
SCREENSHOT
MAP
NEWS
MESSAGE
SOCIAL
VIDEO
ARCHIVE

####################################################################################################
# 18 — BANCO DE EVIDENCIAS
####################################################################################################

El panel debe permitir:

- subir imágenes
- seleccionar archivos
- drag and drop
- múltiples imágenes
- miniaturas
- seleccionar
- mostrar
- ocultar
- ordenar
- eliminar
- marcar utilizadas
- filtrar utilizadas/no utilizadas

No romper el banco actual si ya existe.

####################################################################################################
# 19 — PRESENTACIÓN DE EVIDENCIA
####################################################################################################

Cuando una evidencia aparece:

NO debe simplemente mostrarse.

Debe sentirse como una pieza física.

Puede incluir:

- papel
- fotografía
- cinta
- sombra
- etiqueta
- número
- sello
- línea
- textura

Ejemplo:

EVIDENCIA
#015

[ FOTO ]

CASE CAPSULA-017
HORA 02:06 AM
TIPO DOCUMENTO

CONFIDENCIAL

####################################################################################################
# 20 — ANIMACIÓN DE EVIDENCIA
####################################################################################################

Crear varios tipos:

PAPER
FLASH
TAPE
STAMP
DOCUMENT
GLITCH
REVEAL

Ejemplo:

EVIDENCE FLASH:

flash
↓
sound
↓
photo reveal
↓
label
↓
stamp

####################################################################################################
# 21 — SISTEMA DE PISTAS
####################################################################################################

Crear soporte para:

PISTA #01
PISTA #02
PISTA #03

Una pista puede conectarse visualmente a:

- evidencia
- cámara
- documento

Utilizar líneas rojas.

Las líneas pueden dibujarse.

No hacer líneas perfectamente rígidas.

####################################################################################################
# 22 — SISTEMA DE SELLOS
####################################################################################################

Crear:

CASO ABIERTO
CASO CERRADO
CONFIDENCIAL
EVIDENCIA
VERIFICADO
PENDIENTE
ARCHIVADO
EN INVESTIGACIÓN
NUEVA INFORMACIÓN

Los sellos deben parecer físicos.

####################################################################################################
# 23 — LOWER THIRD
####################################################################################################

Debe permitir:

NOMBRE
ID
DESCRIPCIÓN

Ejemplo:

MANCO
#004

LOCO DEL BARRIO

La animación debe sentirse editorial.

NO usar una simple entrada genérica.

####################################################################################################
# 24 — ALERTAS
####################################################################################################

Mantener o implementar:

NUEVA EVIDENCIA
NUEVA PISTA
ATENCIÓN
CASO ABIERTO
ARCHIVO ENCONTRADO
TESTIMONIO
NUEVA INFORMACIÓN
ÚLTIMA HORA

Cada alerta debe ser un evento.

Visual + sonido.

####################################################################################################
# 25 — INVESTIGATION MODE
####################################################################################################

Crear un modo especial.

Cuando se activa:

baja ligeramente la luz
↓
aparece grain
↓
aparece línea
↓
REC
↓
CCTV si está habilitado
↓
evidencia
↓
micro flash
↓
estabilización

No activar todo instantáneamente.

Debe sentirse como:

"ENTRAMOS AL EXPEDIENTE".

####################################################################################################
# 26 — CLEAN MODE
####################################################################################################

Clean Mode debe eliminar/reducir:

grain
particles
VHS
glitch
decoración
líneas

Mantener:

cámaras
branding
información esencial
evidencia

####################################################################################################
# 27 — SISTEMA DE TRANSICIONES
####################################################################################################

Mantener y mejorar:

tape
flash
paper
file
cctv
stamp
redflash
document
glitch
evidence

Crear un Transition Manager.

Conceptualmente:

transitionManager.play("tape")

transitionManager.play("evidence")

transitionManager.play("cctv")

transitionManager.play("stamp")

No duplicar código.

####################################################################################################
# 28 — LENGUAJE DE MOVIMIENTO
####################################################################################################

Cada tipo de elemento tiene un lenguaje.

PAPER:

movimiento físico.

PHOTO:

flash + reveal.

STAMP:

impacto.

CAMERA:

digital/CCTV.

ALERT:

rápido.

LOWER THIRD:

editorial.

EVIDENCE:

reveal.

TAPE:

barrido.

No utilizar la misma animación para todo.

####################################################################################################
# 29 — AUDIO
####################################################################################################

Crear sistema de efectos de sonido.

Categorías:

camera
flash
paper
tape
stamp
glitch
cctv
alert
evidence
case-open
case-close
transition

Cada evento debe poder disparar sonido.

Debe poder:

mute
volume
enabled

####################################################################################################
# 30 — AUDIO DUCKING
####################################################################################################

Si existe audio ambiente:

Durante un evento:

reducir volumen.

Después:

volver progresivamente.

No cortar.

####################################################################################################
# 31 — CONTROL ROOM
####################################################################################################

El panel debe evolucionar hacia una:

CENTRAL DE CONTROL.

Módulos:

SYSTEM STATUS

EVIDENCE

LOWER THIRD

ALERTS

CAMERAS

EFFECTS

SHOW

TRANSITIONS

AUDIO

OBS

DEBUG

No eliminar la funcionalidad actual.

Mejorar organización.

####################################################################################################
# 32 — PANEL DE EVIDENCIAS
####################################################################################################

Debe ser rápido para operar.

El operador debe poder:

seleccionar evidencia
↓
mostrar evidencia

en muy pocas acciones.

Mostrar claramente:

EVIDENCIA ACTIVA

EVIDENCIAS UTILIZADAS

EVIDENCIAS DISPONIBLES

####################################################################################################
# 33 — HOTKEYS
####################################################################################################

Crear soporte para:

1
2
3
4

I = Investigation

C = Clean

E = Evidence

L = Lower Third

A = Alert

T = Transition

O = Outro

ENTER = acción

ESC = cancelar

No romper hotkeys existentes.

####################################################################################################
# 34 — STATE MANAGER
####################################################################################################

Centralizar estado.

Conceptualmente:

scene
cameras
evidence
lowerThird
alerts
mode
effects
audio
obs
case

No tener el estado repartido sin control.

####################################################################################################
# 35 — EVENT SYSTEM
####################################################################################################

Crear o adaptar un sistema de eventos.

Eventos posibles:

CASE_OPENED
CASE_CLOSED
EVIDENCE_ADDED
EVIDENCE_SHOWN
EVIDENCE_HIDDEN
CAMERA_STATUS_CHANGED
LOWER_THIRD_SHOWN
LOWER_THIRD_HIDDEN
ALERT_TRIGGERED
TRANSITION_STARTED
TRANSITION_FINISHED
MODE_CHANGED
AUDIO_TRIGGERED
OBS_CONNECTED
OBS_DISCONNECTED

####################################################################################################
# 36 — LOGGING
####################################################################################################

Crear logs útiles.

Ejemplo:

[02:16:43] OBS CONNECTED
[02:16:45] CAM 01 → REC
[02:17:01] EVIDENCE #015 LOADED
[02:17:03] TRANSITION → EVIDENCE
[02:17:05] LOWER THIRD → SHOW
[02:17:12] INVESTIGATION MODE → ON

No generar logs absurdamente numerosos.

####################################################################################################
# 37 — OBS
####################################################################################################

Mantener integración con OBS.

Si ya existe OBS WebSocket:

no romperlo.

Debe manejar:

CONNECTED
DISCONNECTED
RECONNECTING
ERROR

Mostrar estado claramente.

####################################################################################################
# 38 — ERROR HANDLING
####################################################################################################

Nunca romper toda la interfaz por:

- imagen inválida
- archivo faltante
- OBS desconectado
- cámara inexistente
- transición inexistente
- sonido no encontrado

Mostrar:

SIN SEÑAL
EVIDENCIA NO DISPONIBLE
OBS OFFLINE
ARCHIVO NO COMPATIBLE

####################################################################################################
# 39 — PERFORMANCE
####################################################################################################

Esto funciona durante streaming real.

Priorizar:

FPS
estabilidad
bajo consumo
fluidez

Preferir:

transform
opacity
GPU compositing
CSS animation

Evitar:

animaciones constantes con JS
renders innecesarios
blur excesivo
DOM gigantes
imagenes sin optimizar
memory leaks

####################################################################################################
# 40 — ASSETS
####################################################################################################

Organizar si el proyecto lo requiere:

branding
textures
papers
photos
evidence
icons
sounds
transitions

No duplicar assets.

No cargar recursos que no se usan.

####################################################################################################
# 41 — Z-INDEX
####################################################################################################

Mantener jerarquía.

Ejemplo conceptual:

BACKGROUND
TEXTURE
DECORATION
PAPERS
LINES
CAMERAS
EVIDENCE
LOWER_THIRD
ALERTS
TRANSITIONS
SYSTEM

No usar:

999999
999998
etc.

####################################################################################################
# 42 — SAFE ZONE
####################################################################################################

Las cámaras, nombres y textos importantes deben permanecer en zonas seguras.

Las decoraciones sí pueden invadir parcialmente los bordes.

####################################################################################################
# 43 — FOCUS SYSTEM
####################################################################################################

Debe ser posible enfocar temporalmente:

una evidencia
una cámara
un documento

Cuando se enfoca:

resto baja ligeramente de intensidad.

Elemento principal:

sube ligeramente.

Después vuelve al estado normal.

####################################################################################################
# 44 — PRESETS
####################################################################################################

Preparar arquitectura para presets.

Ejemplos:

ENTREVISTA

CAM 01
CAM 02
CLEAN

INVESTIGACIÓN

CAM 01
EVIDENCIA
INVESTIGATION

ÚLTIMA HORA

CAM 02
ALERT
RED

No es obligatorio hacer un sistema enorme si el proyecto actual no lo requiere.

####################################################################################################
# 45 — SISTEMA DE CASOS
####################################################################################################

Preparar arquitectura para:

CASE #0017
CASE #0018
CASE #0019

Cada caso podría tener:

id
name
date
status
evidence
notes
clues
testimonies

No implementar base de datos si no hace falta.

Pero NO cerrar la arquitectura a futuro.

####################################################################################################
# 46 — INTRO
####################################################################################################

Crear o preparar:

NEGRO
↓
INTERFERENCIA
↓
CASE FILE
↓
LUZ ROJA
↓
CINTA
↓
FOTOGRAFÍA
↓
FLASH
↓
LA CÁPSULA INSÓLITA
↓
CASO ABIERTO · EN VIVO

Duración:

aprox. 5–10 segundos.

####################################################################################################
# 47 — OUTRO
####################################################################################################

Crear o preparar:

CAMERAS
↓
REC OFF
↓
EXPEDIENTE
↓
SELLO
↓
CASO CERRADO

o:

CONTINUARÁ...

####################################################################################################
# 48 — CONTROL DE EFECTOS
####################################################################################################

Crear configuración central:

grain
particles
vhs
scanlines
noise
glitch
redGlow
vignette
filmDust
chromaticAberration

Todos deben poder desactivarse.

####################################################################################################
# 49 — RANDOMIZACIÓN
####################################################################################################

La decoración puede tener:

rotation
scale
position

Pero NO debe cambiar aleatoriamente en cada render.

Debe permanecer estable mientras la escena está activa.

####################################################################################################
# 50 — MICROINTERACCIONES
####################################################################################################

Hover:

pequeño feedback.

Click:

feedback.

Activo:

amarillo.

Error:

rojo.

Conectado:

estado estable.

No exagerar.

####################################################################################################
# 51 — CONTROL ROOM: EXPERIENCIA DEL OPERADOR
####################################################################################################

El operador debe poder ejecutar:

mostrar evidencia
cambiar cámara
activar alerta
activar investigación
mostrar lower third
cambiar escena
lanzar transición

con pocas acciones.

Diseñar pensando:

STREAM EN VIVO.

No diseñar como dashboard administrativo.

####################################################################################################
# 52 — EXPERIENCIA DEL ESPECTADOR
####################################################################################################

El espectador debe percibir:

programa
investigación
misterio
evidencia
televisión
producción

Nunca debería pensar:

"esto es una interfaz web".

####################################################################################################
# 53 — PRINCIPIO DE JERARQUÍA
####################################################################################################

ORDEN:

1. PERSONA
2. CÁMARA
3. EVIDENCIA
4. INFORMACIÓN
5. EFECTOS
6. DECORACIÓN

Nunca invertir ese orden.

####################################################################################################
# 54 — REGLA DE EFECTOS
####################################################################################################

Los efectos NO son decoración.

LOS EFECTOS SON LENGUAJE.

Ejemplo:

EVIDENCIA
=
flash + photo + tape + stamp

ALERTA
=
red flash + sonido

CAMERA SWITCH
=
CCTV glitch breve

CASO CERRADO
=
stamp + impact

INVESTIGATION MODE
=
secuencia completa

####################################################################################################
# 55 — PRINCIPIO DE MODULARIDAD
####################################################################################################

No crear:

Camera1
Camera2
Camera3

si solamente cambia configuración.

Preferir:

CameraFrame

y pasar:

props/config.

Igualmente:

EvidenceFrame
AlertPanel
LowerThird
Transition

deben ser reutilizables.

####################################################################################################
# 56 — NO SOBREINGENIERÍA
####################################################################################################

No instalar librerías porque sí.

No crear sistemas complejos innecesarios.

No convertir una función de 20 líneas en 10 archivos.

La arquitectura debe ser:

MODULAR
CLARA
RÁPIDA
MANTENIBLE

####################################################################################################
# 57 — DOCUMENTACIÓN
####################################################################################################

Actualizar README.

Explicar:

cómo ejecutar

cómo iniciar

cómo conectar OBS

cómo agregar cámara

cómo agregar evidencia

cómo agregar sonidos

cómo utilizar hotkeys

cómo agregar transición

cómo crear nueva escena

cómo cambiar branding

####################################################################################################
# 58 — TESTING
####################################################################################################

Después de cada bloque importante probar:

- cámara
- evidencia
- lower third
- alert
- transición
- Clean
- Investigation
- OBS
- hotkeys
- assets

Nunca asumir que funciona.

####################################################################################################
# 59 — VERIFICACIÓN DE BUILD
####################################################################################################

Ejecutar los comandos reales del proyecto para comprobar:

- build
- lint
- typecheck
- tests

No inventar comandos.

Leer package.json o configuración primero.

####################################################################################################
# 60 — PROTECCIÓN CONTRA REGRESIONES
####################################################################################################

Antes de modificar una funcionalidad importante:

identifica qué comportamiento actual debe conservarse.

Después de modificarla:

comprueba que siga funcionando.

####################################################################################################
# 61 — FORMATO DE CAMBIOS
####################################################################################################

Cuando realices cambios importantes:

informar:

ARCHIVO
↓
QUÉ CAMBIÓ
↓
POR QUÉ
↓
IMPACTO

Ejemplo:

src/components/CameraFrame.tsx

Se agregó sistema de estados visuales.

Motivo:

unificar REC/LIVE/WAITING/OFFLINE.

####################################################################################################
# 62 — ORDEN DE IMPLEMENTACIÓN
####################################################################################################

Implementar aproximadamente en este orden:

FASE 01
Auditoría

FASE 02
Arquitectura

FASE 03
Design System

FASE 04
State Manager

FASE 05
Scene Manager

FASE 06
Camera System

FASE 07
Evidence System

FASE 08
Alert System

FASE 09
Lower Third

FASE 10
Transition System

FASE 11
Audio

FASE 12
Investigation Mode

FASE 13
Clean Mode

FASE 14
Control Room

FASE 15
OBS

FASE 16
Hotkeys

FASE 17
Logging

FASE 18
Performance

FASE 19
Testing

FASE 20
Polish

####################################################################################################
# 63 — NO HACER CAMBIOS GIGANTES SIN NECESIDAD
####################################################################################################

Si una parte puede evolucionarse de forma incremental:

HACERLO INCREMENTALMENTE.

Evitar reemplazar 30 archivos solamente para cambiar un componente.

####################################################################################################
# 64 — DISEÑO DEL OVERLAY
####################################################################################################

El overlay debe tener sensación de:

"muro de investigación vivo".

Pero no debe estar saturado.

Puede incluir:

papeles
cintas
fotos
mapas
líneas
post-it
sellos

pero siempre manteniendo:

cámara
persona
evidencia

como protagonistas.

####################################################################################################
# 65 — FONDO
####################################################################################################

El fondo debe tener profundidad.

Capas:

black
red ambient light
wall texture
grain
shadow
subtle documents
particles
vignette

Movimiento mínimo.

####################################################################################################
# 66 — ILUMINACIÓN
####################################################################################################

Utilizar:

rojo oscuro

de forma ambiental.

No iluminar todo de rojo.

El rojo debe sentirse como una luz de estudio.

####################################################################################################
# 67 — CINTA
####################################################################################################

La cinta amarilla es una firma visual.

Mensajes posibles:

PRECAUCIÓN
NO CRUZAR
EVIDENCIA
CASO ABIERTO
ARCHIVO
CONFIDENCIAL

Debe poder:

entrar
salir
cruzar pantalla
aparecer durante transiciones
formar parte de evidencia

####################################################################################################
# 68 — CINTA NO DEBE SER UNA DECORACIÓN PERMANENTE
####################################################################################################

Utilizarla narrativamente.

Ejemplo:

transición
alerta
evidencia
cierre de caso

No llenar toda la pantalla constantemente con cinta.

####################################################################################################
# 69 — SISTEMA DE EVENTOS VISUALES
####################################################################################################

Cuando ocurre:

NEW_EVIDENCE

debe poder suceder:

event
↓
state
↓
transition
↓
visual
↓
sound
↓
log

Este patrón debe repetirse en:

alertas
cambios de cámara
lower thirds
modo investigación
caso abierto
caso cerrado

####################################################################################################
# 70 — ESCALABILIDAD
####################################################################################################

Preparar el sistema para futuras capacidades:

- múltiples escenas
- múltiples cámaras
- múltiples evidencias
- múltiples casos
- presets
- macros
- timeline
- soundboard
- capítulos
- testimonios
- mapas
- conexiones
- historial

Pero no sobreconstruirlo ahora.

####################################################################################################
# 71 — DECISIONES VISUALES
####################################################################################################

Si hay dos opciones:

MÁS EFECTOS
vs
MÁS CLARIDAD

elegir:

MÁS CLARIDAD.

MÁS COMPLEJIDAD
vs
MÁS ESTABILIDAD

elegir:

MÁS ESTABILIDAD.

MÁS DECORACIÓN
vs
MEJOR COMPOSICIÓN

elegir:

MEJOR COMPOSICIÓN.

####################################################################################################
# 72 — REGLA SOBRE CÓDIGO EXISTENTE
####################################################################################################

NO reemplazar código existente sin inspeccionarlo.

NO asumir que una parte está mal solamente porque puede hacerse de otra manera.

NO eliminar una integración por preferencia personal.

####################################################################################################
# 73 — REGLA SOBRE DEPENDENCIAS
####################################################################################################

Antes de instalar una dependencia:

preguntarse:

¿realmente hace falta?

¿ya existe algo en el proyecto?

¿puede hacerse con CSS/JS nativo?

¿afecta el tamaño?

¿afecta performance?

Si no hace falta:

NO instalar.

####################################################################################################
# 74 — SEGURIDAD Y ESTABILIDAD
####################################################################################################

Evitar:

- memory leaks
- eventos duplicados
- múltiples conexiones simultáneas
- timers que nunca se limpian
- object URLs no revocados
- loops innecesarios
- listeners acumulativos

####################################################################################################
# 75 — CONTROL DE IMÁGENES
####################################################################################################

Para archivos cargados por el usuario:

validar tipo.

validar tamaño si es necesario.

manejar errores.

limpiar recursos.

No romper el panel.

####################################################################################################
# 76 — ESTADO DE OBS
####################################################################################################

Debe diferenciar:

CONNECTED
CONNECTING
DISCONNECTED
ERROR

Mostrar claramente.

####################################################################################################
# 77 — ESTADO DE CÁMARAS
####################################################################################################

Cada cámara debe diferenciar:

REC
LIVE
WAITING
OFFLINE

Esto debe verse inmediatamente.

####################################################################################################
# 78 — MODO DEBUG
####################################################################################################

Si el proyecto lo permite:

crear:

DEV MODE

Mostrar:

FPS
scene
camera states
evidence
OBS
active effects
events

Debe poder ocultarse.

####################################################################################################
# 79 — PRESERVE CURRENT FUNCTIONALITY
####################################################################################################

La versión actual ya tiene conceptos funcionales como:

EVIDENCIA
LOWER THIRD
ALERTAS
CÁMARAS
MODO Y EFECTOS
SHOW
TRANSICIONES
OBS

NO eliminar ninguno.

Estos conceptos deben evolucionar.

####################################################################################################
# 80 — RESULTADO FINAL
####################################################################################################

El proyecto final debe sentirse como:

LA CENTRAL DE PRODUCCIÓN DE LA CÁPSULA INSÓLITA.

El operador debe sentir:

"Estoy controlando un programa."

El espectador debe sentir:

"Estoy viendo un programa de investigación."

No debe parecer:

"una web con overlays".

####################################################################################################
# 81 — PROTOCOLO DE EJECUCIÓN
####################################################################################################

AHORA sigue este protocolo:

PASO 1:

Inspecciona TODO el proyecto.

PASO 2:

Identifica stack.

PASO 3:

Identifica arquitectura.

PASO 4:

Identifica funciones existentes.

PASO 5:

Identifica riesgos.

PASO 6:

Identifica archivos que deberían modificarse.

PASO 7:

Identifica archivos nuevos necesarios.

PASO 8:

Crea un PLAN.

PASO 9:

Implementa incrementalmente.

PASO 10:

Prueba.

PASO 11:

Corrige.

PASO 12:

Optimiza.

PASO 13:

Documenta.

####################################################################################################
# 82 — FORMATO DE PLANIFICACIÓN
####################################################################################################

Antes de modificaciones estructurales importantes, presentar internamente:

CURRENT STATE

TARGET STATE

FILES TO MODIFY

FILES TO CREATE

FILES TO PRESERVE

RISKS

IMPLEMENTATION ORDER

TEST PLAN

No inventar archivos.

No asumir nombres.

Utilizar los nombres reales del repositorio.

####################################################################################################
# 83 — PROTOCOLO PARA NUEVOS ARCHIVOS
####################################################################################################

Si necesitas crear un archivo:

indica mentalmente:

PATH:
nombre

PURPOSE:
responsabilidad

DEPENDENCIES:
dependencias reales

CONSUMERS:
qué lo utiliza

No crear archivos redundantes.

####################################################################################################
# 84 — PROTOCOLO PARA ARCHIVOS EXISTENTES
####################################################################################################

Antes de editar:

leer.

Entender.

Determinar qué código puede conservarse.

Editar solamente la parte necesaria.

####################################################################################################
# 85 — PROTOCOLO PARA REFACTORIZACIÓN
####################################################################################################

Si una refactorización es útil:

hacerla gradualmente.

Después de cada bloque:

verificar build.

####################################################################################################
# 86 — PROTOCOLO VISUAL
####################################################################################################

Después de implementar una parte visual:

comprobar:

¿se lee?

¿hay suficiente contraste?

¿tapa una cara?

¿compite con la cámara?

¿compite con la evidencia?

¿hay demasiados efectos?

¿el amarillo está dominando?

¿el rojo está saturando?

¿parece televisión?

####################################################################################################
# 87 — PROTOCOLO DE ANIMACIÓN
####################################################################################################

Preguntarse:

¿la animación tiene propósito?

¿es demasiado larga?

¿distrae?

¿puede ejecutarse varias veces?

¿consume demasiado?

¿interfiere con otra animación?

####################################################################################################
# 88 — PROTOCOLO DE PERFORMANCE
####################################################################################################

Especial atención a:

- filtros
- blur
- backdrop-filter
- canvas
- partículas
- audio
- imágenes
- loops
- listeners
- timers
- WebSockets

####################################################################################################
# 89 — NO SATURAR
####################################################################################################

Regla visual:

80% contenido + atmósfera

15% información

5% efectos/decoración

Es una guía, no una fórmula matemática.

####################################################################################################
# 90 — PRINCIPIO DE PRODUCCIÓN
####################################################################################################

Este software se usará mientras una persona está hablando en vivo.

Eso significa:

LA VELOCIDAD OPERATIVA IMPORTA.

Una función importante debe ejecutarse con:

1–2 acciones.

No crear procesos de 8 pasos para tareas normales.

####################################################################################################
# 91 — PRINCIPIO FINAL DE DISEÑO
####################################################################################################

NO diseñar como un diseñador de páginas.

NO programar como una persona que solamente escribe componentes.

Pensar simultáneamente como:

DIRECTOR DE ARTE
+
MOTION DESIGNER
+
BROADCAST DESIGNER
+
DESARROLLADOR
+
OPERADOR DE STREAMING

####################################################################################################
# 92 — PRINCIPIO FINAL DE ARQUITECTURA
####################################################################################################

Todo debe conectar:

PANEL
↓
STATE
↓
EVENT
↓
SCENE
↓
OVERLAY
↓
OBS

La finalidad es eliminar comportamientos aislados.

####################################################################################################
# 93 — PRINCIPIO FINAL DEL PROYECTO
####################################################################################################

NO QUIERO CUATRO OVERLAYS.

QUIERO UN SISTEMA.

NO QUIERO MUCHOS EFECTOS.

QUIERO UN LENGUAJE VISUAL.

NO QUIERO UNA PÁGINA WEB.

QUIERO UNA CENTRAL DE PRODUCCIÓN.

NO QUIERO UN DISEÑO GENÉRICO.

QUIERO:

LA CÁPSULA INSÓLITA.

####################################################################################################
# 94 — INSTRUCCIÓN FINAL
####################################################################################################

Empieza ahora.

Primero inspecciona el repositorio completo.

No supongas nada.

No borres nada.

No hagas una reescritura masiva.

Comprende lo que existe.

Después desarrolla la evolución.

Siempre prioriza:

FUNCIONALIDAD
+
ESTABILIDAD
+
CLARIDAD
+
IDENTIDAD
+
PERFORMANCE.

El objetivo final es que:

LA CÁPSULA INSÓLITA

parezca una producción profesional de investigación en vivo,
con una plataforma de control propia,
modular,
rápida,
cinematográfica,
interactiva
y escalable.

####################################################################################################
# NOTA DEL ESTADO REAL DEL PROYECTO (agregada tras la primera auditoría)
####################################################################################################

Stack real: HTML + CSS + JS plano, SIN build/bundler/framework (no React/Vue/Vite),
porque el overlay se carga en OBS como "Fuente de Navegador" (Chromium embebido) directo
desde archivo local. No hay package.json, no hay lint/typecheck/test — no inventar esos
comandos. "Verificar que compile" en este proyecto significa: abrir en Chrome headless
y/o recargar la fuente en OBS y mirar consola de errores.

Ya existen e implementan gran parte de este documento (ver README.md del proyecto):
las 4 escenas, estados de cámara REC/LIVE/WAITING/OFFLINE, Evidence Engine con tipos,
banco de evidencia (subida múltiple, miniaturas, orden manual por arrastre, filtro
usadas/sin usar), cinta, sellos, alertas, lower third, 10 transiciones con Transition
Manager, intro/outro, Clean/Investigation mode, config.js como estado central,
integración OBS (obs-websocket v5) con reconexión, y un puente HTTP para Stream Deck
(bridge.js). Antes de crear algo de esta lista, confirmar primero si ya existe.
