/* La Cápsula Insólita — configuración central del broadcast package.
   Todo lo editable vive aquí: marca, cámaras, evidencia, efectos, escenas y conexión con OBS. */
window.LCI_CONFIG = {
  brand: {
    title: "LA CÁPSULA INSÓLITA",
    subtitle: "CASO ABIERTO · EN VIVO",
    caseNumber: "0017",
    caseId: "CAPSULA-017"
  },

  // Escena inicial si OBS no informa otra: SCENE_01_CAMERA | SCENE_02_DUAL_CAMERA | SCENE_03_CAMERA_EVIDENCE | SCENE_04_DUAL_CAMERA_EVIDENCE
  scene: "SCENE_01_CAMERA",

  // "clean" | "investigation"
  mode: "investigation",

  // status: LIVE | REC | OFFLINE | WAITING
  camera1: { enabled: true, label: "CAM 01", status: "REC", subject: "TESTIGO A" },
  camera2: { enabled: true, label: "CAM 02", status: "LIVE", subject: "TESTIGO B" },

  // type: photo | image | profile | video | document | news | map | clipping | archive | capture | social | message
  evidence: {
    enabled: true,
    type: "photo",
    number: 4,
    caption: "ARCHIVO RECUPERADO",
    timestamp: "auto",
    description: "",
    image: null
  },

  lowerThird: {
    label: "EXPEDIENTE",
    number: 4,
    name: "NOMBRE DEL INVITADO",
    role: "Rol o descripción del invitado"
  },

  effects: {
    enabled: true,
    grain: true,
    particles: true,
    scanlines: false,
    vignette: true,
    redGlow: true,
    filmDust: true,
    vhs: false,
    chromaticAberration: false,
    glitch: true,
    cameraNoise: false,
    papers: true,
    markers: true,
    shadows: true
  },

  // Cada modo sobrescribe "effects".
  modes: {
    clean: {
      grain: false, particles: false, scanlines: false, filmDust: false, vhs: false,
      chromaticAberration: false, glitch: false, cameraNoise: false, papers: false, markers: false
    },
    investigation: {
      grain: true, particles: true, scanlines: true, filmDust: true, vhs: false,
      chromaticAberration: true, glitch: true, cameraNoise: true, papers: true, markers: true
    }
  },

  transitions: {
    sceneChange: "tape",        // al cambiar de escena desde el panel
    manualSceneChange: "glitch", // si cambias de escena directamente en OBS
    cameraSwitch: "cctv"
  },

  // mid = momento (ms) en que la pantalla queda 100% cubierta. El panel cambia la escena de OBS justo ahí.
  transitionTimings: {
    tape:     { mid: 380, total: 920 },
    flash:    { mid: 80,  total: 620 },
    paper:    { mid: 400, total: 860 },
    file:     { mid: 380, total: 920 },
    cctv:     { mid: 120, total: 520 },
    stamp:    { mid: 160, total: 980 },
    redflash: { mid: 100, total: 560 },
    document: { mid: 420, total: 880 },
    glitch:   { mid: 170, total: 440 },
    evidence: { mid: 220, total: 940 }
  },

  // Sonidos opcionales: deja los archivos en assets/sounds y pon enabled: true.
  sound: {
    enabled: false,
    volume: 0.6,
    synth: true,          // efectos sintetizados en vivo cuando falta el .mp3 (false = solo archivos)
    ambient: false,       // ambiente de sala muy sutil; baja solo mientras suena un efecto
    ambientVolume: 0.18,  // volumen del ambiente (0..1), multiplicado por "volume"
    // Ducking: baja el audio de OBS que indiques mientras suena un efecto, y lo sube solo
    // después. No requiere tener archivos .mp3 todavía — es volumen de fuentes reales de OBS.
    duck: {
      enabled: false,
      inputs: ["Audio del escritorio"], // nombres EXACTOS de fuentes de OBS a bajar
      amountDb: -14,  // cuánto bajar mientras suena el efecto
      holdMs: 700,    // cuánto dura el agachado
      fadeMs: 350     // cuánto tarda en volver a subir (gradual, nunca de golpe)
    },
    files: {
      tape: "assets/sounds/tape.mp3",
      whoosh: "assets/sounds/whoosh.mp3",
      shutter: "assets/sounds/shutter.mp3",
      stamp: "assets/sounds/stamp.mp3",
      alert: "assets/sounds/alert.mp3",
      impact: "assets/sounds/impact.mp3",
      paper: "assets/sounds/paper.mp3",
      beep: "assets/sounds/beep.mp3",
      static: "assets/sounds/static.mp3"
    }
  },

  obs: {
    host: "localhost",
    port: 4455,
    password: "ghx6eU6ECQfnVIc5",
    followScenes: true,
    bridgePort: 8787, // puerto del puente para Stream Deck (bridge.js); solo responde en esta PC

    sceneMap: {
      "LCI 01 · Cámara": "SCENE_01_CAMERA",
      "LCI 02 · Dos Cámaras": "SCENE_02_DUAL_CAMERA",
      "LCI 03 · Cámara + Evidencia": "SCENE_03_CAMERA_EVIDENCE",
      "LCI 04 · Dos Cámaras + Evidencia": "SCENE_04_DUAL_CAMERA_EVIDENCE",
      "LCI V1 · Vertical": "SCENE_V01_VERTICAL",
      "LCI V2 · Vertical (Una cámara)": "SCENE_V02_SINGLE_VERTICAL",
      "LCI V3 · Vertical (Dos cámaras)": "SCENE_V03_DUAL_VERTICAL",
      "LCI V4 · Vertical (Dos cám. + evidencia)": "SCENE_V04_DUAL_EVIDENCE_VERTICAL"
    }
  },

  // Layouts en coordenadas de un lienzo 1920×1080. Los rectángulos "cams" son los huecos reales:
  // en OBS la cámara se coloca exactamente en x, y con ese ancho y alto.
  scenes: {
    SCENE_01_CAMERA: {
      label: "01 · Una cámara",
      cams: [{ id: 1, x: 288, y: 196, w: 1344, h: 756 }],
      evidence: null,
      lowerThird: { x: 212, y: 830 },
      alert: { x: 1600, y: 116 },
      tapes: [
        { text: "PRECAUCIÓN · NO CRUZAR", x: -60, y: 992, w: 820, rot: -2.2 },
        { text: "EVIDENCIA · CASO ABIERTO", x: 1540, y: 1040, w: 560, rot: -14 }
      ],
      decor: "single"
    },
    SCENE_02_DUAL_CAMERA: {
      label: "02 · Dos cámaras",
      cams: [
        { id: 1, x: 112, y: 236, w: 832, h: 468 },
        { id: 2, x: 976, y: 316, w: 832, h: 468 }
      ],
      evidence: null,
      lowerThird: { x: 112, y: 812 },
      alert: { x: 1600, y: 150 },
      tapes: [
        { text: "PRECAUCIÓN · NO CRUZAR · LA CÁPSULA INSÓLITA", x: -60, y: 1000, w: 2100, rot: -1.2 }
      ],
      decor: "dual"
    },
    SCENE_03_CAMERA_EVIDENCE: {
      label: "03 · Cámara + evidencia",
      cams: [{ id: 1, x: 112, y: 204, w: 1152, h: 648 }],
      evidence: { x: 1316, y: 232, w: 500, h: 600, tilt: 2.2 },
      lowerThird: { x: 150, y: 740 },
      alert: { x: 1600, y: 116 },
      tapes: [
        { text: "PRECAUCIÓN · NO CRUZAR", x: -60, y: 972, w: 1180, rot: -1.4 }
      ],
      decor: "evidence"
    },
    SCENE_04_DUAL_CAMERA_EVIDENCE: {
      label: "04 · Dos cámaras + evidencia",
      cams: [
        { id: 1, x: 96, y: 204, w: 960, h: 540 },
        { id: 2, x: 1120, y: 204, w: 704, h: 396 }
      ],
      evidence: { x: 1110, y: 648, w: 660, h: 340, tilt: -1.8, compact: true },
      lowerThird: { x: 112, y: 806 },
      alert: { x: 1600, y: 116 },
      tapes: [
        { text: "PRECAUCIÓN · NO CRUZAR", x: -60, y: 984, w: 1150, rot: -1.6 }
      ],
      decor: "dualEvidence"
    },
    // Escena vertical (TikTok/Reels): coordenadas de un lienzo 1080×1920 (window.LCI_STAGE).
    // Una cámara centrada arriba + evidencia debajo. Se activa desde index-vertical.html.
    SCENE_V01_VERTICAL: {
      label: "V1 · Vertical",
      cams: [{ id: 1, x: 60, y: 180, w: 960, h: 540 }],
      evidence: { x: 140, y: 790, w: 800, h: 800, tilt: 1.6, compact: true },
      lowerThird: { x: 60, y: 1700 },
      alert: { x: 760, y: 80 },
      tapes: [
        { text: "PRECAUCIÓN · NO CRUZAR", x: -60, y: 1850, w: 1200, rot: -1.6 }
      ],
      decor: "vertical"
    },
    // Vertical de SCENE_01_CAMERA: una cámara grande centrada, sin evidencia.
    SCENE_V02_SINGLE_VERTICAL: {
      label: "V2 · Vertical (Una cámara)",
      cams: [{ id: 1, x: 40, y: 560, w: 1000, h: 562 }],
      evidence: null,
      lowerThird: { x: 40, y: 1180 },
      alert: { x: 760, y: 80 },
      tapes: [
        { text: "PRECAUCIÓN · NO CRUZAR", x: -60, y: 1850, w: 1200, rot: -1.6 }
      ],
      decor: "verticalSingle"
    },
    // Vertical de SCENE_02_DUAL_CAMERA: dos cámaras apiladas, sin evidencia.
    SCENE_V03_DUAL_VERTICAL: {
      label: "V3 · Vertical (Dos cámaras)",
      // Gap de 110px entre cámaras: la etiqueta de cada cámara sobresale ~48px arriba y
      // ~40px abajo de su marco (.cam__tag / .cam__foot en components.css); con menos
      // espacio las etiquetas de ambas cámaras se pisaban.
      cams: [
        { id: 1, x: 80, y: 180, w: 920, h: 518 },
        { id: 2, x: 80, y: 808, w: 920, h: 518 }
      ],
      evidence: null,
      lowerThird: { x: 80, y: 1400 },
      alert: { x: 760, y: 80 },
      tapes: [
        { text: "PRECAUCIÓN · NO CRUZAR · LA CÁPSULA INSÓLITA", x: -60, y: 1850, w: 1200, rot: -1.6 }
      ],
      decor: "verticalDual"
    },
    // Vertical de SCENE_04_DUAL_CAMERA_EVIDENCE: cam1 protagonista, cam2 más chica a la derecha, evidencia compacta abajo.
    SCENE_V04_DUAL_EVIDENCE_VERTICAL: {
      label: "V4 · Vertical (Dos cám. + evidencia)",
      // Mismo ajuste de espaciado que V03 (ver nota ahí): cam2 baja a y:820 para que su
      // etiqueta no pise la de cam1, y la evidencia baja/achica para no pisar a cam2.
      cams: [
        { id: 1, x: 60, y: 180, w: 960, h: 540 },
        { id: 2, x: 300, y: 820, w: 720, h: 405 }
      ],
      evidence: { x: 140, y: 1270, w: 800, h: 400, tilt: -1.6, compact: true },
      lowerThird: { x: 60, y: 1700 },
      alert: { x: 760, y: 80 },
      tapes: [
        { text: "PRECAUCIÓN · NO CRUZAR", x: -60, y: 1850, w: 1200, rot: -1.6 }
      ],
      decor: "verticalDualEvidence"
    }
  }
};
