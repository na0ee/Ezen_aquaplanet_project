/* =============================================================
   AQUA PLANET — crew3d.js
   Three.js GLB 로더 + 스크롤 드리븐 동물 전환
   ============================================================= */

import * as THREE from 'three';
import { GLTFLoader }    from 'three/addons/loaders/GLTFLoader.js';


/* ---------------------------------------------------------------
   동물 설정
   scale: 정규화 배율 (1.0 = 뷰포트 기준 2단위 크기)
   y:     수직 오프셋 (모델 중심 보정)
   rotY:  기본 회전각 (rad)
--------------------------------------------------------------- */
const CREATURES = [
  { key: 'walrus',  src: 'assets/models/walrus_animated.glb',     scale: 0.78, y: -0.3, rotY:  0.2 },
  { key: 'beluga',  src: 'assets/models/whiteWhale_animated.glb',  scale: 0.84, y:  0.0, rotY: -0.2 },
  { key: 'shark',   src: 'assets/models/Shark_animated.glb',       scale: 0.92, y:  0.0, rotY:  0.1 },
  { key: 'turtle',  src: 'assets/models/turtle_animated.glb',      scale: 0.78, y: -0.2, rotY:  0.3 },
];

/* 진입 곡선: 브라우저 창 밖에서 헤엄쳐 들어옴
   FWD = 오른쪽 밖 → 중앙,  BWD = 왼쪽 밖 → 중앙
   카메라 z=8, FOV 42 기준 화면 가장자리 ≈ ±5.5 → 시작점 ±18 */
const ENTRY_FWD = new THREE.CatmullRomCurve3([
  new THREE.Vector3( 18, -0.7,  0.9),
  new THREE.Vector3( 10,  0.45, -0.6),
  new THREE.Vector3(  3, -0.15,  0.35),
  new THREE.Vector3( -1.1, 0.1,  -0.1),
  new THREE.Vector3( -1.62, 0.42,  0),
]);
const ENTRY_BWD = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-18, -0.7,  0.9),
  new THREE.Vector3(-12,  0.45, -0.7),
  new THREE.Vector3( -7, -0.15,  0.35),
  new THREE.Vector3( -4,  0.1,  -0.1),
  new THREE.Vector3( -1.62, 0.42,  0),
]);
/* 퇴장: 반대 방향 창 밖으로 */
const EXIT_FWD = new THREE.Vector3(-18, -0.4, 0.3);
const EXIT_BWD = new THREE.Vector3( 18, -0.4, 0.3);

const ENTRY_DUR  = 2.15;  /* 진입 시간 (초) */
const EXIT_DUR   = 0.8;   /* 퇴장 시간 (초) */
const ENTRY_SIDE_ROT = Math.PI * 0.5;
const ENTRY_SWIM_Y = 0.18;
const ENTRY_SWIM_Z = 0.12;
const ENTRY_ROLL = 0.16;
const ENTRY_PITCH = 0.08;
/* 정착 각도 — 이미지처럼 3/4 측면에서 약간 위에서 내려다보는 앵글 */
const SETTLED_ROT_Y = -0.52;  /* ≈ -30° 옆 각도 (반대 방향) */
const SETTLED_ROT_X = 0.10;   /* ≈ 6°  위에서 내려다보는 각도 */

function easeInOutCubic(t) {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/* ---------------------------------------------------------------
   씬 초기화 — 캔버스를 body에 position:fixed 전체화면으로 부착
   동물이 브라우저 창 밖에서 진짜 헤엄쳐 들어옴
--------------------------------------------------------------- */
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;

/* 캔버스를 전체화면 fixed overlay로 */
const crewCanvas = renderer.domElement;
crewCanvas.id = 'crew-3d-canvas';
Object.assign(crewCanvas.style, {
  position:      'fixed',
  top:           '0',
  left:          '0',
  width:         '100%',
  height:        '100%',
  pointerEvents: 'none',
  zIndex:        '5',
  opacity:       '0',
  transition:    'opacity 0.6s ease',
});
document.body.appendChild(crewCanvas);

/* 크루 섹션 뷰포트 진입 시 표시, 이탈 시 페이드 아웃 */
const crewSection      = document.getElementById('sec-crew');
const crewSticky       = crewSection?.querySelector('.crew-sticky');
const totalPanelCount  = crewSection?.querySelectorAll('.crew-panel').length || 4;
let crewInView = false;
let crewEntryTimer = null;
let crewContentTimer = null;
let crewInfoVisible = true;
let forceCrewEntryUntil = 0;

let exitZoneActive = false;
let prevExcess = 0;
let crewWaveExiting = false;

function getCrewScrollState() {
  if (!crewSection) {
    return { scrolled: 0, exitStart: 0, inPanelRange: false };
  }

  const secR = crewSection.getBoundingClientRect();
  const scrolled = -secR.top;
  const exitStart = totalPanelCount * window.innerHeight;

  return {
    scrolled,
    exitStart,
    inPanelRange: scrolled >= 0 && scrolled < exitStart,
  };
}

function hideCrewCanvas() {
  clearTimeout(crewEntryTimer);
  clearTimeout(crewContentTimer);
  crewWaveExiting = false;
  exitZoneActive = false;
  crewCanvas.style.opacity = '0';
  crewCanvas.style.transform = '';
  crewCanvas.style.filter = '';
  crewCanvas.style.clipPath = 'inset(0px 0px 100vh 0px)';
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

/* 캔버스를 crew-sticky 가시 영역으로 clip.
   퇴장 구간: 다운 스크롤 → translateY로 위로 올라가게, 업 스크롤 → 즉시 숨김 */
function clampCanvasToSticky() {
  if (!crewSticky || !crewSection) return;
  const sr   = crewSticky.getBoundingClientRect();
  const secR = crewSection.getBoundingClientRect();
  const vh   = window.innerHeight;

  const scrolled     = -secR.top;
  const excess       = Math.max(0, scrolled - totalPanelCount * vh);
  prevExcess = excess;
  const forceEntry = performance.now() < forceCrewEntryUntil;

  if (forceEntry && scrolled < 0) {
    crewCanvas.style.clipPath = 'none';
    return;
  }

  if (crewWaveExiting) {
    if (excess > 0) exitZoneActive = true;
    crewCanvas.style.clipPath = 'none';
    return;
  }

  if (excess > 0) {
    exitZoneActive = true;
    crewCanvas.style.transition = 'none';
    crewCanvas.style.opacity   = '0';
    crewCanvas.style.transform = '';
    crewCanvas.style.clipPath  = 'inset(0px 0px 100vh 0px)';
    return;
  }

  if (exitZoneActive) {
    exitZoneActive = false;
    prevExcess = 0;
    crewCanvas.style.transform = '';
    if (crewInView) {
      crewCanvas.style.transition = 'opacity 0.6s ease';
      crewCanvas.style.opacity    = crewWaveExiting ? '0' : '1';
    }
  }

  /* sticky 가시 영역 클립 */
  const visTop = Math.max(0, sr.top);
  const visBtm = Math.min(vh, sr.bottom);
  crewCanvas.style.clipPath = (visBtm > visTop)
    ? `inset(${visTop}px 0px ${vh - visBtm}px 0px)`
    : 'inset(0px 0px 100vh 0px)';
}

function setCrewInfoVisible(visible) {
  const wasVisible = crewInfoVisible;
  crewInfoVisible = visible;
  crewSection?.classList.toggle('is-creature-moving', !visible);
  if (visible && !wasVisible) {
    document.dispatchEvent(new CustomEvent('crew-card-reenter'));
  }
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
  }, 620);
}

setCrewInfoVisible(false);
setCrewTitleVisible(false);
if (crewSection) {
  new IntersectionObserver(([e]) => {
    /* force-enter 기간 중 지연된 leave 콜백은 crewInView도 건드리지 않음 */
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
const camera = new THREE.PerspectiveCamera(
  42,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 0.3, 8);

/* ---------------------------------------------------------------
   생물 영역(화면 왼쪽 44%)에만 올라가는 히트존 div.
   오른쪽 인포카드·스크롤은 그대로 작동.
   진입 애니메이션 중: 비활성화 + 카메라 출렁임
   착지 후: 모델 자체를 드래그 회전
--------------------------------------------------------------- */
const orbitHit = document.createElement('div');
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
  const interactive = controlsActive && crewInView;
  orbitHit.style.pointerEvents = interactive ? 'auto' : 'none';
  orbitHit.style.cursor        = interactive ? 'grab' : '';
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
  /* 카메라를 기본 위치로 복원해 bob 애니메이션이 올바르게 재개 */
  camera.position.set(0, 0.3, 8);
}

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
  if (activePointerId !== null && e?.pointerId === activePointerId) {
    orbitHit.releasePointerCapture(activePointerId);
  }
  isDraggingModel = false;
  activePointerId = null;
  if (controlsActive && currentSettled) orbitHit.style.cursor = 'grab';
}

orbitHit.addEventListener('pointerup', stopModelDrag);
orbitHit.addEventListener('pointercancel', stopModelDrag);

/* --- 조명 (수중 분위기) --- */
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
const models    = new Array(CREATURES.length).fill(null);
let   loadedN   = 0;
let   pendingIdx = -1;  /* 로드 완료 전 스크롤된 인덱스 보관 */

CREATURES.forEach((cfg, idx) => {
  loader.load(
    cfg.src,
    (gltf) => {
      const mesh = gltf.scene;

      /* 크기 자동 정규화 */
      const box    = new THREE.Box3().setFromObject(mesh);
      const size   = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const s      = (3.22 / maxDim) * cfg.scale;
      mesh.scale.setScalar(s);

      /* 중심 정렬 */
      box.setFromObject(mesh);
      const center = box.getCenter(new THREE.Vector3());
      mesh.position.sub(center);
      mesh.position.y += cfg.y;
      mesh.rotation.y  = cfg.rotY;

      /* pivot — 이동/페이드 제어 */
      const pivot = new THREE.Group();
      pivot.add(mesh);
      pivot.position.copy(ENTRY_FWD.getPoint(0));
      pivot.visible = false;
      scene.add(pivot);

      /* 내장 애니메이션 재생 */
      const mixer = new THREE.AnimationMixer(mesh);
      gltf.animations.forEach(clip => mixer.clipAction(clip).play());

      models[idx] = { pivot, mixer };
      loadedN++;
      if (loadedN === CREATURES.length) onAllLoaded();
    },
    undefined,
    (err) => {
      console.warn(`[crew3d] ${cfg.src} 로드 실패:`, err);
      loadedN++;  /* 실패한 모델도 카운트해서 나머지가 계속 동작하도록 */
      if (loadedN === CREATURES.length) onAllLoaded();
    }
  );
});

function onAllLoaded() {
  /* 로딩 폴백 placeholder 숨기기 */
  const ph = document.getElementById('crew-placeholder');
  if (ph) ph.classList.add('is-hidden');

  /* 로드 전 스크롤된 인덱스가 있으면 그 위치로, 없으면 0번 */
  if (crewInView) {
    scheduleCreatureEntry(true);
  }
}

/* ---------------------------------------------------------------
   전환 상태
--------------------------------------------------------------- */
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
  crewCanvas.style.transition = 'opacity 0.35s ease';
  crewCanvas.style.opacity    = '1';

  setCrewInfoVisible(true);
  setCrewTitleVisible(true);
  hideCanvasAfterExit = false;
  clearTimeout(crewContentTimer);
  crewSection?.classList.add('is-content-visible');
  scheduleCreatureEntry(true);
}

function leaveCrewSection() {
  clearTimeout(crewContentTimer);
  /* force-enter 기간 중 IO의 지연 leave 콜백 무시 */
  if (performance.now() < forceCrewEntryUntil) return;
  /* exit zone 다운 스크롤 중: translateY가 GLB를 위로 밀어내므로 수영 애니메이션 불필요 */
  if (exitZoneActive) return;
  clearTimeout(crewEntryTimer);
  crewSection?.classList.remove('is-content-visible');
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
  const { inPanelRange, scrolled } = getCrewScrollState();
  const forceEntry = performance.now() < forceCrewEntryUntil;
  if (!forceEntry && !inPanelRange && scrolled < -10) {
    pendingIdx = idx;
    hideCrewCanvas();
    return;
  }

  if (idx === currentIdx) {
    crewCanvas.style.opacity = '1';
    setCrewInfoVisible(true);
    if (models[idx]?.pivot) {
      models[idx].pivot.visible = true;
      if (immediate && !currentSettled) {
        const settled = ENTRY_FWD.getPoint(1);
        models[idx].pivot.position.copy(settled);
        models[idx].pivot.rotation.set(SETTLED_ROT_X, SETTLED_ROT_Y, 0);
        currentSettled = true;
        enableControls();
      }
    }
    return;
  }

  hideCanvasAfterExit = false;
  crewCanvas.style.opacity = '1';
  setCrewInfoVisible(false);
  currentSettled = false;
  disableControls();

  const forward = idx > currentIdx || currentIdx === -1;

  /* 진행 중인 진입 애니메이션 → 즉시 목표 위치로 스냅 */
  if (entryActive && entryModel) {
    entryModel.position.copy(entryCurve.getPoint(1));
    entryModel.rotation.set(SETTLED_ROT_X, SETTLED_ROT_Y, 0);
    entryActive = false;
    entryModel  = null;
  }

  /* 진행 중인 퇴장 애니메이션 → 즉시 숨김 */
  if (exitActive && exitModel) {
    exitModel.visible   = false;
    exitModel.rotation.set(0, 0, 0);
    exitActive = false;
    exitModel  = null;
  }

  /* 현재 모델 퇴장 시작 */
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
    setCrewInfoVisible(true);
    return;
  }

  const curve = forward ? ENTRY_FWD : ENTRY_BWD;
  const m = models[idx].pivot;
  m.rotation.set(0, 0, 0);
  if (immediate) {
    m.position.copy(curve.getPoint(1));
    m.rotation.y = SETTLED_ROT_Y;
    m.rotation.x = SETTLED_ROT_X;
    m.visible    = true;
    currentSettled = true;
    setCrewInfoVisible(true);
    enableControls();
  } else {
    m.position.copy(curve.getPoint(0));
    m.rotation.y = (forward ? -1 : 1) * ENTRY_SIDE_ROT;  /* 옆면으로 들어오기 */
    m.visible    = true;
    entryModel   = m;
    entryCurve   = curve;
    entryT       = 0;
    entryActive  = true;
  }
}

/* ---------------------------------------------------------------
   렌더 루프
--------------------------------------------------------------- */
const clock = new THREE.Clock();

(function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();

  /* 애니메이션 믹서 업데이트 */
  models.forEach(m => m?.mixer?.update(dt));

  /* 진입 (곡선 따라 이동 + 방향 회전, easeOutCubic) */
  if (entryActive && entryModel) {
    entryT = Math.min(entryT + dt / ENTRY_DUR, 1);
    const t = 1 - Math.pow(1 - entryT, 3);
    const rotSign = (entryCurve === ENTRY_FWD) ? -1 : 1;
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
    if (entryT >= 0.48) {
      setCrewInfoVisible(true);
    }
    if (entryT >= 1) {
      entryModel.rotation.set(SETTLED_ROT_X, SETTLED_ROT_Y, 0);
      entryActive = false;
      entryModel  = null;
      currentSettled = true;
      setCrewInfoVisible(true);
      enableControls();
    }
  }

  /* 퇴장 (반대쪽으로 헤엄쳐 나감 + 방향 회전, easeInQuad) */
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

  const crewState = getCrewScrollState();
  const forceEntryNow = performance.now() < forceCrewEntryUntil;
  if (!crewState.inPanelRange && !entryActive && !exitActive && !forceEntryNow) {
    if (crewCanvas.style.opacity !== '0' || currentIdx >= 0) {
      hideCrewCanvas();
    }
  }

  if (
    crewInView &&
    loadedN === CREATURES.length &&
    currentIdx < 0 &&
    !entryActive &&
    !exitActive &&
    crewState.inPanelRange
  ) {
    showCreature(pendingIdx >= 0 ? pendingIdx : 0, forceEntryNow);
  }

  if (controlsActive && currentSettled) {
    camera.position.y = 0.3;
    camera.position.z = 8;
  } else {
    const cameraBobFade = entryActive ? 1 - smoothstep(0.62, 1, entryT) : 1;
    /* 수중 카메라 출렁임 */
    camera.position.y = 0.3 + Math.sin(clock.elapsedTime * 0.38) * 0.08 * cameraBobFade;
    camera.position.z = 8.0 + Math.sin(clock.elapsedTime * 0.22) * 0.12 * cameraBobFade;
  }

  clampCanvasToSticky();
  renderer.render(scene, camera);
}());

/* ---------------------------------------------------------------
   리사이즈 대응 — 윈도우 기준 (full-screen fixed canvas)
--------------------------------------------------------------- */
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  clampCanvasToSticky();
});

/* ---------------------------------------------------------------
   main.js crew-switch 이벤트 수신
--------------------------------------------------------------- */
document.addEventListener('crew-switch', (e) => {
  pendingIdx = e.detail.idx;
  if (!crewInView) return;

  if (loadedN === CREATURES.length) {
    showCreature(e.detail.idx, Boolean(e.detail.immediate));
  }
});

document.addEventListener('crew-force-enter', () => {
  forceCrewEntryUntil = performance.now() + 1200;
  crewInView = true;
  enterCrewSection();
});

document.addEventListener('crew-tail-visibility', (e) => {
  /* force-enter 기간(1200ms) 중에는 어떤 숨김 동작도 차단 */
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
  crewCanvas.style.clipPath  = 'none';
});

document.addEventListener('crew-wave-exit-reset', () => {
  crewWaveExiting = false;
  crewCanvas.style.filter = '';
  crewCanvas.style.transform = '';
  const state = getCrewScrollState();
  if (crewInView && state.inPanelRange) {
    crewCanvas.style.transition = 'opacity 0.6s ease';
    crewCanvas.style.opacity = '1';
  } else {
    hideCrewCanvas();
  }
  clampCanvasToSticky();
});
