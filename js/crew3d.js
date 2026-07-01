

import * as THREE from 'three';
import { GLTFLoader }    from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';



const CREATURES = [
  { key: 'walrus',  src: 'assets/models/walrus_animated.glb',     scale: 0.78, y: -0.3, rotY:  0.2 },
  { key: 'beluga',  src: 'assets/models/whiteWhale_animated.glb',  scale: 0.84, y:  0.0, rotY: -0.2 },
  { key: 'shark',   src: 'assets/models/Shark_animated.glb',       scale: 0.92, y:  0.0, rotY:  0.1 },
  { key: 'turtle',  src: 'assets/models/turtle_animated.glb',      scale: 0.78, y: -0.2, rotY:  0.3 },
];

const CREW_TABLET_QUERY = window.matchMedia('(min-width: 821px) and (max-width: 1180px)');
const CREW_MOBILE_QUERY = window.matchMedia('(max-width: 820px)');

function getViewportSize() {
  return {
    width: Math.max(window.innerWidth || document.documentElement.clientWidth || 1, 1),
    height: Math.max(window.innerHeight || document.documentElement.clientHeight || 1, 1),
  };
}

function isCrewGlbDisabled() {
  return CREW_MOBILE_QUERY.matches;
}

function getCrewViewportScale() {
  if (CREW_MOBILE_QUERY.matches) return 0.70; 
  return CREW_TABLET_QUERY.matches ? 0.70 : 1;
}

function getCrewCamX() {
  if (CREW_MOBILE_QUERY.matches) return -1.62; 
  return CREW_TABLET_QUERY.matches ? -0.4 : 0;
}


function getCrewCamY() {
  return CREW_MOBILE_QUERY.matches ? -0.5 : 0.3;
}

function applyCrewViewportScale() {
  const scale = getCrewViewportScale();
  models.forEach((model) => {
    if (model?.pivot) model.pivot.scale.setScalar(scale);
  });
}


const ENTRY_FWD = new THREE.CatmullRomCurve3([
  new THREE.Vector3( 18, -0.7,  0.9),
  new THREE.Vector3( 10,  0.45, -0.6),
  new THREE.Vector3(  3, -0.15,  0.35),
  new THREE.Vector3( -1.7, 0.1,  -0.1),
  new THREE.Vector3( -1.70, 0.20,  0),
]);
const ENTRY_BWD = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-18, -0.7,  0.9),
  new THREE.Vector3(-12,  0.45, -0.7),
  new THREE.Vector3( -7, -0.15,  0.35),
  new THREE.Vector3( -4.6,  0.1,  -0.1),
  new THREE.Vector3( -1.70, 0.20,  0),
]);
const EXIT_FWD = new THREE.Vector3(-18, -0.4, 0.3);
const EXIT_BWD = new THREE.Vector3( 18, -0.4, 0.3);

const ENTRY_DUR  = 1.8;
const EXIT_DUR   = 0.85;
const ENTRY_SIDE_ROT = Math.PI * 0.25;
const ENTRY_SWIM_Y = 0.18;
const ENTRY_SWIM_Z = 0.12;
const ENTRY_ROLL = 0.16;
const ENTRY_PITCH = 0.08;
const SETTLED_ROT_Y = Math.PI * 0.14; 
const SETTLED_ROT_X = 0.10; 

function easeInOutCubic(t) {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}


const crewSection      = document.getElementById('sec-crew');
const crewSticky       = crewSection?.querySelector('.crew-sticky');
const crewMain         = crewSection?.querySelector('.crew-main');

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
{
  const { width, height } = getViewportSize();
  renderer.setSize(width, height);
}
if (THREE.SRGBColorSpace !== undefined) {
  renderer.outputColorSpace = THREE.SRGBColorSpace;
} else {
  renderer.outputEncoding = THREE.sRGBEncoding;
}

/* 캔버스는 항상 풀 뷰포트 해상도로 렌더링해 카메라/엔트리 곡선 튜닝값을
   그대로 유지하고, 화면에는 crew-3d-stage(overflow:hidden)로 위아래만
   살짝 잘라서 보여준다 — 그러면 카드가 있는 영역에만 생물이 보이고,
   .crew-sticky 안에 들어있으니 스크롤에도 카드와 함께 자연스럽게 움직인다. */
const CREW_STAGE_INSET_VH = 6;

const crewCanvas = renderer.domElement;
crewCanvas.id = 'crew-3d-canvas';
Object.assign(crewCanvas.style, {
  position:      'absolute',
  top:           `-${CREW_STAGE_INSET_VH}vh`,
  left:          '0',
  width:         '100%',
  height:        '100vh',
  pointerEvents: 'none',
  opacity:       '0',
  transition:    'opacity 0.6s ease',
});

const crewStage = document.createElement('div');
crewStage.id = 'crew-3d-stage';
Object.assign(crewStage.style, {
  position:      'absolute',
  top:           `${CREW_STAGE_INSET_VH}vh`,
  left:          '0',
  width:         '100%',
  height:        `${100 - CREW_STAGE_INSET_VH * 2}vh`,
  overflow:      'hidden',
  pointerEvents: 'none',
  zIndex:        '5',
});
crewStage.appendChild(crewCanvas);
(crewSticky ?? document.body).appendChild(crewStage);


let crewInView = false;
let crewEntryTimer = null;
let crewContentTimer = null;
let crewFishTopTimer = null;
let crewInfoVisible = true;
let forceCrewEntryUntil = 0;

let exitZoneActive = false;
let prevExcess = 0;
let crewWaveExiting = false;
let canvasHiddenByScroll = false;

function getCrewScrollState() {
  if (!crewSection) {
    return { scrolled: 0, exitStart: 0, inPanelRange: false };
  }

  const secR = crewSection.getBoundingClientRect();
  const scrolled = -secR.top;
  const exitStart = Math.max(0, crewSection.offsetHeight - window.innerHeight);

  return {
    scrolled,
    exitStart,
    inPanelRange: scrolled >= 0 && scrolled <= exitStart,
  };
}

function isCrewPanelRangeActive() {
  return getCrewScrollState().inPanelRange;
}

function hideCrewCanvas() {
  clearTimeout(crewEntryTimer);
  clearTimeout(crewContentTimer);
  crewWaveExiting = false;
  exitZoneActive = false;
  canvasHiddenByScroll = false;
  crewCanvas.style.opacity = '0';
  crewCanvas.style.transform = '';
  crewCanvas.style.filter = '';
  models.forEach((model) => {
    if (model?.pivot) model.pivot.visible = false;
  });
  entryActive = false;
  entryModel = null;
  exitActive = false;
  exitModel = null;
  hideCanvasAfterExit = false;
  currentIdx = -1;
  currentSettled = false;
  disableControls();
  setCrewInfoVisible(false);
}


function clampCanvasToSticky() {
  if (!crewSticky || !crewSection) return;
  const secR = crewSection.getBoundingClientRect();
  const vh   = window.innerHeight;

  const scrolled     = -secR.top;
  const excess       = Math.max(0, scrolled - vh);
  prevExcess = excess;
  const forceEntry = performance.now() < forceCrewEntryUntil;

  if (forceEntry && scrolled < 0) return;

  if (crewWaveExiting) {
    if (excess > 0) exitZoneActive = true;
    return;
  }

  exitZoneActive = excess > 0;

  /* 캔버스는 이제 .crew-sticky 안의 일반 콘텐츠라 스크롤에 따라 같이 움직이지만,
     카드(.crew-main)가 화면을 완전히 벗어나는 순간만큼은 바로 사라지게 해서
     빠른 스크롤 중 생물이 어색하게 잔류해 보이는 걸 막는다 */
  const mainRect = crewMain ? crewMain.getBoundingClientRect() : crewSticky.getBoundingClientRect();
  const cardGone = mainRect.bottom <= 0 || mainRect.top >= vh;

  if (cardGone) {
    if (!canvasHiddenByScroll) {
      canvasHiddenByScroll = true;
      crewCanvas.style.transition = 'none';
      crewCanvas.style.opacity = '0';
      crewCanvas.style.transform = '';
    }
    return;
  }

  if (canvasHiddenByScroll) {
    canvasHiddenByScroll = false;
    crewCanvas.style.transition = 'opacity 0.3s ease';
    crewCanvas.style.opacity = '1';
  }
}

function setCrewInfoVisible(visible) {
  if (!visible) clearTimeout(crewContentTimer);
  const wasVisible = crewInfoVisible;
  crewInfoVisible = visible;
  crewSection?.classList.remove('is-creature-moving');
  crewSection?.classList.toggle('is-creature-settled', visible);
  crewSection?.classList.toggle('is-card-revealed', visible);
  if (visible && !wasVisible) {
    document.dispatchEvent(new CustomEvent('crew-card-reenter', {
      detail: { idx: currentIdx }
    }));
  }
}

function revealCrewInfo(delay = 0) {
  clearTimeout(crewContentTimer);
  if (delay > 0) {
    crewContentTimer = setTimeout(() => {
      if (crewInView && currentSettled) setCrewInfoVisible(true);
    }, delay);
    return;
  }
  if (crewInView && currentSettled) setCrewInfoVisible(true);
}

function setCrewTitleVisible(visible) {
  crewSection?.classList.toggle('is-title-visible', visible);
}

function scheduleCreatureEntry(immediate = false) {
  clearTimeout(crewEntryTimer);
  if (loadedN !== CREATURES.length || !crewInView) return;

  if (immediate) {
    showCreature(pendingIdx >= 0 ? pendingIdx : 0, true);
    return;
  }

  crewEntryTimer = setTimeout(() => {
    if (!crewInView) return;
    showCreature(pendingIdx >= 0 ? pendingIdx : 0);
  }, 300);
}

setCrewInfoVisible(false);
setCrewTitleVisible(false);
if (crewSection) {
  new IntersectionObserver(([e]) => {

    if (!e.isIntersecting && performance.now() < forceCrewEntryUntil) {
      syncControls();
      return;
    }
    crewInView = e.isIntersecting;
    if (crewInView) {
      enterCrewSection();
    } else {
      leaveCrewSection();
    }
    syncControls();
  }, { threshold: 0.05 }).observe(crewSection);
}

const scene  = new THREE.Scene();
const initialViewport = getViewportSize();
const camera = new THREE.PerspectiveCamera(
  42,
  initialViewport.width / initialViewport.height,
  0.1,
  100
);
camera.position.set(getCrewCamX(), getCrewCamY(), 8);


const orbitHit = document.createElement('div');
orbitHit.id = 'crew-orbit-hit-area';
orbitHit.setAttribute('aria-hidden', 'true');
Object.assign(orbitHit.style, {
  position:      'fixed',
  top:           '0',
  left:          '0',
  width:         '44%',
  height:        '100%',
  zIndex:        '6',
  pointerEvents: 'none',
});
document.body.appendChild(orbitHit);

let controlsActive = false;
let currentSettled = false;
let isDraggingModel = false;
let activePointerId = null;
const dragStart = { x: 0, y: 0, rotX: 0, rotY: 0 };

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getCurrentPivot() {
  return currentIdx >= 0 ? models[currentIdx]?.pivot : null;
}

function syncControls() {
  const interactive = !isCrewGlbDisabled() && controlsActive && crewInView;
  orbitHit.style.pointerEvents = interactive ? 'auto' : 'none';
  orbitHit.style.cursor        = interactive ? 'grab' : '';
  orbitHit.style.display       = isCrewGlbDisabled() ? 'none' : 'block';
}

function applyCrewGlbDisabledState() {
  if (isCrewGlbDisabled()) {
    crewCanvas.style.display = 'none';
    orbitHit.style.display = 'none';
    hideCrewCanvas();
    return true;
  }

  crewCanvas.style.display = 'block';
  syncControls();
  return false;
}

function enableControls() {
  controlsActive               = true;
  syncControls();
}

function disableControls() {
  controlsActive               = false;
  isDraggingModel              = false;
  activePointerId              = null;
  syncControls();
  camera.position.set(getCrewCamX(), getCrewCamY(), 8);
}

applyCrewGlbDisabledState();

orbitHit.addEventListener('pointerdown', (e) => {
  const pivot = getCurrentPivot();
  if (!controlsActive || !currentSettled || !pivot) return;

  isDraggingModel = true;
  activePointerId = e.pointerId;
  dragStart.x     = e.clientX;
  dragStart.y     = e.clientY;
  dragStart.rotX  = pivot.rotation.x;
  dragStart.rotY  = pivot.rotation.y;

  orbitHit.setPointerCapture(e.pointerId);
  orbitHit.style.cursor = 'grabbing';
  document.dispatchEvent(new CustomEvent('crew-drag-start'));
  e.preventDefault();
});

orbitHit.addEventListener('pointermove', (e) => {
  const pivot = getCurrentPivot();
  if (!isDraggingModel || e.pointerId !== activePointerId || !pivot) return;

  const dx = e.clientX - dragStart.x;
  const dy = e.clientY - dragStart.y;
  pivot.rotation.y = dragStart.rotY + dx * 0.01;
  pivot.rotation.x = clamp(dragStart.rotX + dy * 0.008, -0.65, 0.65);
  e.preventDefault();
});

function stopModelDrag(e) {
  if (!isDraggingModel) return;
  if (activePointerId !== null && e?.pointerId === activePointerId) {
    orbitHit.releasePointerCapture(activePointerId);
  }
  isDraggingModel = false;
  activePointerId = null;
  if (controlsActive && currentSettled) orbitHit.style.cursor = 'grab';
  document.dispatchEvent(new CustomEvent('crew-drag-end'));
}

orbitHit.addEventListener('pointerup', stopModelDrag);
orbitHit.addEventListener('pointercancel', stopModelDrag);

scene.add(new THREE.AmbientLight(0x6ab8d4, 1.4));

const sunLight = new THREE.DirectionalLight(0xffffff, 2.2);
sunLight.position.set(3, 6, 5);
scene.add(sunLight);

const rimLight = new THREE.DirectionalLight(0x22b2ea, 1.2);
rimLight.position.set(-4, 2, -3);
scene.add(rimLight);

const bottomLight = new THREE.PointLight(0x004488, 2.0, 14);
bottomLight.position.set(0, -4, 2);
scene.add(bottomLight);

/* ---------------------------------------------------------------
   GLB 로드
--------------------------------------------------------------- */
const loader    = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
const models    = new Array(CREATURES.length).fill(null);
let   loadedN   = 0;
let   pendingIdx = -1;

CREATURES.forEach((cfg, idx) => {
  loader.load(
    cfg.src,
    (gltf) => {
      const mesh = gltf.scene;


      const box    = new THREE.Box3().setFromObject(mesh);
      const size   = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const s      = (3.22 / maxDim) * cfg.scale;
      mesh.scale.setScalar(s);

      box.setFromObject(mesh);
      const center = box.getCenter(new THREE.Vector3());
      mesh.position.sub(center);
      mesh.position.y += cfg.y;
      mesh.rotation.y  = cfg.rotY;


      const pivot = new THREE.Group();
      pivot.add(mesh);
      pivot.scale.setScalar(getCrewViewportScale());
      pivot.position.copy(ENTRY_FWD.getPoint(0));
      pivot.visible = false;
      scene.add(pivot);

      const mixer = new THREE.AnimationMixer(mesh);
      gltf.animations.forEach(clip => mixer.clipAction(clip).play());

      models[idx] = { pivot, mixer };
      loadedN++;
      if (loadedN === CREATURES.length) onAllLoaded();
    },
    undefined,
    (err) => {
      console.warn(`[crew3d] ${cfg.src} 로드 ?�패:`, err);
      loadedN++; 
      if (loadedN === CREATURES.length) onAllLoaded();
    }
  );
});

function onAllLoaded() {

  const ph = document.getElementById('crew-placeholder');
  if (ph) ph.classList.add('is-hidden');


  if (crewInView) {
    scheduleCreatureEntry(true);
  }
}


let currentIdx   = -1;
let entryModel   = null;
let entryCurve   = ENTRY_FWD;
let entryT       = 0;
let entryActive  = false;
let exitModel    = null;
let exitStartPos = new THREE.Vector3();
let exitEndPos   = new THREE.Vector3();
let exitStartRotY = 0;
let exitStartRotX = 0;
let exitT        = 0;
let exitActive   = false;
let hideCanvasAfterExit = false;

function enterCrewSection() {
  if (applyCrewGlbDisabledState()) return;

  crewCanvas.style.transition = 'opacity 0.35s ease';
  crewCanvas.style.opacity    = '1';

  setCrewTitleVisible(true);
  setCrewInfoVisible(false);
  hideCanvasAfterExit = false;
  clearTimeout(crewContentTimer);
  clearTimeout(crewFishTopTimer);
  crewSection?.classList.remove('is-fish-top-visible');
  crewSection?.classList.add('is-content-visible');
  crewFishTopTimer = setTimeout(() => {
    if (crewSection?.classList.contains('is-content-visible')) {
      crewSection.classList.add('is-fish-top-visible');
    }
  }, 2000);
  scheduleCreatureEntry(true);
}

function leaveCrewSection() {
  clearTimeout(crewContentTimer);

  if (performance.now() < forceCrewEntryUntil) return;
  if (isCrewPanelRangeActive()) {
    enterCrewSection();
    return;
  }

  if (exitZoneActive) return;
  clearTimeout(crewEntryTimer);
  clearTimeout(crewFishTopTimer);
  crewSection?.classList.remove('is-content-visible');
  crewSection?.classList.remove('is-fish-top-visible');
  setCrewTitleVisible(false);
  if (loadedN !== CREATURES.length) {
    crewCanvas.style.opacity = '0';
    setCrewInfoVisible(false);
    return;
  }

  const rect = crewSection?.getBoundingClientRect();
  const leavingDown = !rect || rect.bottom <= 0;
  startSectionExit(leavingDown);
}

function startSectionExit(leavingDown = true) {
  clearTimeout(crewEntryTimer);
  const active = entryModel ?? (currentIdx >= 0 ? models[currentIdx]?.pivot : null);
  if (!active) {
    crewCanvas.style.opacity = '0';
    setCrewInfoVisible(false);
    return;
  }

  setCrewInfoVisible(false);
  currentSettled = false;
  disableControls();

  if (entryActive) {
    entryActive = false;
    entryModel  = null;
  }

  if (exitActive && exitModel) {
    exitModel.visible = false;
  }

  exitStartRotY       = active.rotation.y;
  exitStartRotX       = active.rotation.x;
  active.rotation.z   = 0;
  exitStartPos.copy(active.position);
  exitEndPos.copy(leavingDown ? EXIT_FWD : EXIT_BWD);
  exitModel           = active;
  exitModel.visible   = true;
  exitT               = 0;
  exitActive          = true;
  hideCanvasAfterExit = true;
  currentIdx          = -1;
}

function showCreature(idx, immediate = false) {
  if (applyCrewGlbDisabledState()) {
    pendingIdx = idx;
    return;
  }

  const { inPanelRange, scrolled } = getCrewScrollState();
  const forceEntry = performance.now() < forceCrewEntryUntil;
  if (!forceEntry && !inPanelRange && scrolled < -10) {
    pendingIdx = idx;
    hideCrewCanvas();
    return;
  }

  if (idx === currentIdx) {
    crewCanvas.style.opacity = '1';
    if (models[idx]?.pivot) {
      if (exitActive && exitModel === models[idx].pivot) {
        exitActive = false;
        exitModel = null;
        hideCanvasAfterExit = false;
      }
      models[idx].pivot.visible = true;
      if ((immediate || !currentSettled) && !entryActive) {
        const settled = ENTRY_FWD.getPoint(1);
        models[idx].pivot.position.copy(settled);
        models[idx].pivot.rotation.set(SETTLED_ROT_X, SETTLED_ROT_Y, 0);
        currentSettled = true;
        enableControls();
        revealCrewInfo();
      } else if (currentSettled) {
        revealCrewInfo();
      }
    }
    return;
  }

  hideCanvasAfterExit = false;
  const isInitialCreature = currentIdx === -1;
  if (isInitialCreature) {
    crewCanvas.style.transition = 'none';
    crewCanvas.style.opacity = '0';
  } else {
    crewCanvas.style.transition = 'opacity 0.35s ease';
    crewCanvas.style.opacity = '1';
  }
  currentSettled = false;
  setCrewInfoVisible(false);
  disableControls();

  const forward = idx > currentIdx || currentIdx === -1;


  if (entryActive && entryModel) {
    entryModel.position.copy(entryCurve.getPoint(1));
    entryModel.rotation.set(SETTLED_ROT_X, SETTLED_ROT_Y, 0);
    entryActive = false;
    entryModel  = null;
  }


  if (exitActive && exitModel) {
    exitModel.visible   = false;
    exitModel.rotation.set(0, 0, 0);
    exitActive = false;
    exitModel  = null;
  }


  if (currentIdx >= 0 && models[currentIdx]) {
    const prev = models[currentIdx].pivot;
    if (immediate) {
      prev.visible = false;
      prev.rotation.set(0, 0, 0);
    } else {
      exitStartRotY = prev.rotation.y;
      exitStartRotX = prev.rotation.x;
      prev.rotation.z = 0;
      exitStartPos.copy(prev.position);
      exitEndPos.copy(forward ? EXIT_FWD : EXIT_BWD);
      exitModel  = prev;
      exitT      = 0;
      exitActive = true;
    }
  }

  currentIdx = idx;
  if (!models[idx]) {
    currentSettled = true;
    revealCrewInfo();
    return;
  }

  const curve = forward ? ENTRY_FWD : ENTRY_BWD;
  const m = models[idx].pivot;
  m.rotation.set(0, 0, 0);
  if (immediate || isInitialCreature) {
    m.position.copy(curve.getPoint(1));
    m.rotation.y = SETTLED_ROT_Y;
    m.rotation.x = SETTLED_ROT_X;
    m.visible    = true;
    currentSettled = true;
    enableControls();
    if (isInitialCreature) {
      requestAnimationFrame(() => {
        crewCanvas.style.transition = 'opacity 0.7s ease';
        crewCanvas.style.opacity = '1';
      });
      revealCrewInfo(immediate ? 80 : 360);
    } else {
      revealCrewInfo();
    }
  } else {
    m.position.copy(curve.getPoint(0));
    m.rotation.y = (forward ? -1 : 1) * ENTRY_SIDE_ROT;  /* ?�면?�로 ?�어?�기 */
    m.visible    = true;
    m.rotation.y = -ENTRY_SIDE_ROT;
    entryModel   = m;
    entryCurve   = curve;
    entryT       = 0;
    entryActive  = true;
  }
}


function restoreCurrentCreatureAfterWaveExit() {
  clearTimeout(crewEntryTimer);
  clearTimeout(crewContentTimer);

  if (entryActive && entryModel) {
    entryActive = false;
    entryModel = null;
  }

  if (exitActive) {
    exitActive = false;
    exitModel = null;
    exitT = 0;
  }

  hideCanvasAfterExit = false;

  const idx = currentIdx >= 0 ? currentIdx : (pendingIdx >= 0 ? pendingIdx : 0);
  const active = models[idx]?.pivot;

  models.forEach((model, modelIdx) => {
    if (model?.pivot) model.pivot.visible = Boolean(active) && modelIdx === idx;
  });

  currentIdx = idx;
  if (!active) {
    currentSettled = false;
    setCrewInfoVisible(false);
    return;
  }

  const settled = ENTRY_FWD.getPoint(1);
  active.position.copy(settled);
  active.rotation.set(SETTLED_ROT_X, SETTLED_ROT_Y, 0);
  active.visible = true;
  currentSettled = true;
  enableControls();
  revealCrewInfo(95);
}

const clock = new THREE.Clock();

(function animate() {
  requestAnimationFrame(animate);
  try {
    const dt = clock.getDelta();

    const crewState = getCrewScrollState();
    const forceEntryNow = performance.now() < forceCrewEntryUntil;


    if (!crewInView && !entryActive && !exitActive && !forceEntryNow) {
      if (crewCanvas.style.opacity !== '0' || currentIdx >= 0) hideCrewCanvas();
      return;
    }


    models.forEach(m => m?.mixer?.update(dt));


    if (entryActive && entryModel) {
      entryT = Math.min(entryT + dt / ENTRY_DUR, 1);
      const t = 1 - Math.pow(1 - entryT, 3);
      const rotSign = -1;
      const rotT = easeInOutCubic(entryT);
      const settle = smoothstep(0.48, 0.96, entryT);
      const swimFade = 1 - settle;
      const swim = Math.sin(entryT * Math.PI * 3.2);
      const glide = entryCurve.getPoint(t);

      entryModel.position.copy(glide);
      entryModel.position.y += swim * ENTRY_SWIM_Y * swimFade;
      entryModel.position.z += Math.cos(entryT * Math.PI * 2.4) * ENTRY_SWIM_Z * swimFade;

      entryModel.rotation.y = (1 - rotT) * ENTRY_SIDE_ROT * rotSign + rotT * SETTLED_ROT_Y + swim * 0.1 * swimFade * rotSign;
      entryModel.rotation.x = Math.sin(entryT * Math.PI * 2.2) * ENTRY_PITCH * swimFade + settle * SETTLED_ROT_X;
      entryModel.rotation.z = -swim * ENTRY_ROLL * rotSign * swimFade;
      if (entryT >= 0.46 && !crewInfoVisible) {
        setCrewInfoVisible(true);
      }
      if (entryT >= 1) {
        entryModel.rotation.set(SETTLED_ROT_X, SETTLED_ROT_Y, 0);
        entryActive = false;
        entryModel  = null;
        currentSettled = true;
        enableControls();
        revealCrewInfo(60);
      }
    }


    if (exitActive && exitModel) {
      exitT = Math.min(exitT + dt / EXIT_DUR, 1);
      const t       = exitT * exitT;
      const rotSign = (exitEndPos.x < 0) ? -1 : 1;
      exitModel.position.lerpVectors(exitStartPos, exitEndPos, t);
      exitModel.rotation.y = exitStartRotY * (1 - t) + t * 0.8 * rotSign;
      exitModel.rotation.x = exitStartRotX * (1 - t);
      if (exitT >= 1) {
        exitModel.visible    = false;
        exitModel.rotation.set(0, 0, 0);
        exitActive = false;
        exitModel  = null;
        if (hideCanvasAfterExit) {
          hideCanvasAfterExit = false;
          crewCanvas.style.opacity = '0';
          setCrewInfoVisible(false);
          document.dispatchEvent(new CustomEvent('crew-tail-exit-complete'));
        } else if (crewWaveExiting) {
          hideCrewCanvas();
        }
      }
    }

    if (!crewState.inPanelRange && !entryActive && !exitActive && !forceEntryNow) {
      hideCrewCanvas();
      return;
    }


    clampCanvasToSticky();

    if (controlsActive && currentSettled) {
      camera.position.x = getCrewCamX();
      camera.position.y = getCrewCamY();
      camera.position.z = 8;
    } else {
      const cameraBobFade = entryActive ? 1 - smoothstep(0.62, 1, entryT) : 1;

      camera.position.x = getCrewCamX();
      camera.position.y = getCrewCamY() + Math.sin(clock.elapsedTime * 0.38) * 0.08 * cameraBobFade;
      camera.position.z = 8.0 + Math.sin(clock.elapsedTime * 0.22) * 0.12 * cameraBobFade;
    }

    renderer.render(scene, camera);
  } catch (e) {
    console.error('[crew3d] 렌더 오류:', e);
  }
}());


window.addEventListener('resize', () => {
  const glbDisabled = applyCrewGlbDisabledState();
  const { width, height } = getViewportSize();
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
  camera.position.x = getCrewCamX();
  camera.position.y = getCrewCamY();
  applyCrewViewportScale();
  if (glbDisabled) return;
  clampCanvasToSticky();
});


document.addEventListener('crew-switch', (e) => {
  pendingIdx = e.detail.idx;
  if (!crewInView) return;

  if (loadedN === CREATURES.length) {

    if (currentIdx === -1 && !e.detail.immediate) return;
    showCreature(e.detail.idx, Boolean(e.detail.immediate));
  }
});

document.addEventListener('crew-force-enter', () => {
  forceCrewEntryUntil = performance.now() + 1200;
  crewInView = true;
  enterCrewSection();
});

document.addEventListener('crew-tail-visibility', (e) => {

  if (performance.now() < forceCrewEntryUntil) return;

  const state = getCrewScrollState();

  if (e.detail.hidden) {
    startSectionExit(true);
    return;
  }

  if (crewInView && state.inPanelRange) {
    crewCanvas.style.opacity = '1';
    scheduleCreatureEntry();
  } else {
    hideCrewCanvas();
  }
});

document.addEventListener('crew-wave-exit', () => {
  crewWaveExiting = true;
  clearTimeout(crewEntryTimer);
  clearTimeout(crewContentTimer);
  disableControls();

  const active = entryModel ?? exitModel ?? (currentIdx >= 0 ? models[currentIdx]?.pivot : null);
  if (active) {
    active.visible = true;
    exitStartPos.copy(active.position);
    exitEndPos.copy(active.position).add(new THREE.Vector3(0, 1.35, 0));
    exitStartRotY = active.rotation.y;
    exitStartRotX = active.rotation.x;
    exitModel = active;
    exitT = 0;
    exitActive = true;
    hideCanvasAfterExit = false;
  }

  crewCanvas.style.transition = 'opacity 0.3s ease';
  crewCanvas.style.opacity   = '0';
  crewCanvas.style.transform = '';
  crewCanvas.style.filter    = '';
});

document.addEventListener('crew-wave-exit-reset', () => {
  crewWaveExiting = false;
  crewCanvas.style.filter = '';
  crewCanvas.style.transform = '';
  const state = getCrewScrollState();
  if (crewInView && state.inPanelRange) {
    restoreCurrentCreatureAfterWaveExit();
    crewCanvas.style.transition = 'opacity 0.6s ease';
    crewCanvas.style.opacity = '1';
  } else {
    hideCrewCanvas();
  }
  clampCanvasToSticky();
});
