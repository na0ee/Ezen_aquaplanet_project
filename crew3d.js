/* =============================================================
   AQUA PLANET — crew3d.js
   Three.js GLB 로더 + 스크롤 드리븐 동물 전환
   ============================================================= */

import * as THREE from 'three';
import { GLTFLoader }    from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

initLogoSymbolScene();

function createCityEnvironment(renderer) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;

  const ctx = canvas.getContext('2d');
  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, '#e8f5ff');
  sky.addColorStop(0.4, '#cce8fa');
  sky.addColorStop(0.75, '#b8ddf5');
  sky.addColorStop(1, '#a0cfec');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  /* 부드러운 흰색 보케 글로우 */
  const glow = ctx.createRadialGradient(512, 180, 10, 512, 180, 480);
  glow.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
  glow.addColorStop(0.22, 'rgba(240, 252, 255, 0.65)');
  glow.addColorStop(1, 'rgba(200, 235, 255, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  /* 흰 구름 보케 점들 */
  for (let i = 0; i < 28; i++) {
    const cx2 = (i * 137) % canvas.width;
    const cy2 = 40 + (i * 73) % (canvas.height * 0.55);
    const r2  = 18 + (i * 17) % 55;
    const cg  = ctx.createRadialGradient(cx2, cy2, 0, cx2, cy2, r2);
    cg.addColorStop(0, `rgba(255,255,255,${0.5 + (i % 4) * 0.12})`);
    cg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.arc(cx2, cy2, r2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.46)';
  ctx.lineWidth = 5;
  for (let i = 0; i < 22; i++) {
    const y = 32 + i * 19;
    ctx.beginPath();
    ctx.moveTo(-80, y);
    for (let x = -80; x <= canvas.width + 80; x += 80) {
      ctx.quadraticCurveTo(x + 38, y - 16 + Math.sin(i + x * 0.01) * 12, x + 80, y);
    }
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(255, 255, 255, 0.32)';
  for (let i = 0; i < 180; i++) {
    const x = (i * 83) % canvas.width;
    const y = (i * 47) % canvas.height;
    const r = 1 + ((i * 11) % 4);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envMap = pmrem.fromEquirectangular(texture).texture;
  texture.dispose();
  pmrem.dispose();
  return envMap;
}

function initLogoSymbolScene() {
  const mount = document.getElementById('sec-logo');
  if (!mount) return;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 0, 7.4);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.45;

  const logoCanvas = renderer.domElement;
  logoCanvas.id = 'logo-symbol-3d-canvas';
  Object.assign(logoCanvas.style, {
    position: 'absolute',
    inset: '0',
    width: '100%',
    height: '100%',
    zIndex: '1',
    pointerEvents: 'auto',
    touchAction: 'none',
  });
  mount.appendChild(logoCanvas);

  const envMap = createCityEnvironment(renderer);
  scene.environment = envMap;

  const backgroundPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({
      color: '#c8e8f8',
      depthWrite: false,
    })
  );
  backgroundPlane.position.set(0, 0, -5);
  backgroundPlane.renderOrder = -10;
  scene.add(backgroundPlane);

  new THREE.TextureLoader().load('assets/images/figma-logo-bg.png', (texture) => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    backgroundPlane.material.map = texture;
    backgroundPlane.material.needsUpdate = true;
  });

  scene.add(new THREE.HemisphereLight(0xdff1ff, 0x9fd4f0, 3.2));

  const keyLight = new THREE.DirectionalLight(0xffffff, 2.8);
  keyLight.position.set(3, 6, 8);
  scene.add(keyLight);

  /* 뒤에서 오는 강한 림 라이트 — 엣지 하이라이트 */
  const rimLight = new THREE.DirectionalLight(0xffffff, 5.5);
  rimLight.position.set(-3, 1, -6);
  scene.add(rimLight);

  const rimLight2 = new THREE.DirectionalLight(0xd8f0ff, 4.0);
  rimLight2.position.set(4, -1, -5);
  scene.add(rimLight2);

  const sparkleLight = new THREE.PointLight(0xffffff, 6, 12);
  sparkleLight.position.set(0, 3.0, 4.2);
  scene.add(sparkleLight);

  const glintLight = new THREE.PointLight(0xffffff, 10, 10);
  glintLight.position.set(-2.2, 1.4, 2.8);
  scene.add(glintLight);

  const edgeGlintLight = new THREE.PointLight(0xd0eeff, 8, 9);
  edgeGlintLight.position.set(2.4, -1.1, 3.2);
  scene.add(edgeGlintLight);

  const controls = new OrbitControls(camera, logoCanvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.enablePan = false;
  controls.enableZoom = false;
  controls.minAzimuthAngle = -0.28;
  controls.maxAzimuthAngle = 0.28;
  controls.minPolarAngle = Math.PI / 2 - 0.18;
  controls.maxPolarAngle = Math.PI / 2 + 0.18;
  controls.minDistance = 7.4;
  controls.maxDistance = 7.4;
  controls.target.set(0, 0, 0);
  controls.update();

  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: '#ffffff',
    metalness: 0,
    roughness: 0.0,
    transmission: 1.0,
    thickness: 1.4,        /* 두껍게 하면 인접 메시가 굴절에 잡힘 — 얇게 유지 */
    ior: 1.65,
    transparent: true,
    opacity: 1.0,
    clearcoat: 1.0,
    clearcoatRoughness: 0.0,
    specularIntensity: 1.0,
    specularColor: '#ffffff',
    attenuationColor: '#ffffff',
    attenuationDistance: 50,
    envMapIntensity: 1.8,
    depthWrite: true,      /* depth 기록 → 메시 간 앞뒤 정렬 정상화 */
    side: THREE.FrontSide, /* 뒷면 제거 → 메시가 자기 자신을 비추는 현상 방지 */
  });

  const logoGroup = new THREE.Group();
  scene.add(logoGroup);

  new GLTFLoader().load(
    'assets/models/logo_symbol.glb',
    (gltf) => {
      const root = gltf.scene;
      const meshes = [];
      root.traverse((child) => {
        if (child.isMesh) meshes.push(child);
      });

      meshes.forEach((child) => {
        child.material = glassMaterial;
        child.renderOrder = 2;
        child.castShadow = false;
        child.receiveShadow = false;
      });

      const box = new THREE.Box3().setFromObject(root);
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      root.scale.setScalar(2.42 / maxDim);

      root.rotation.set(Math.PI / 2, 0, 0);

      box.setFromObject(root);
      const center = box.getCenter(new THREE.Vector3());
      root.position.sub(center);

      logoGroup.add(root);
    },
    undefined,
    (err) => console.warn('[logo3d] assets/models/logo_symbol.glb load failed:', err)
  );

  function resizeLogoScene() {
    const rect = mount.getBoundingClientRect();
    const width = Math.max(rect.width, 1);
    const height = Math.max(rect.height, 1);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);

    const distance = camera.position.z - backgroundPlane.position.z;
    const planeHeight = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5)) * distance;
    const planeWidth = planeHeight * camera.aspect;
    backgroundPlane.scale.set(planeWidth, planeHeight, 1);
  }

  resizeLogoScene();
  window.addEventListener('resize', resizeLogoScene);

  (function animateLogo() {
    requestAnimationFrame(animateLogo);
    const t = performance.now() * 0.001;

    /* 글린트 라이트 — 유리면을 가로지르는 반짝임 */
    glintLight.position.x = Math.sin(t * 0.85) * 2.6;
    glintLight.position.y = 1.2 + Math.cos(t * 1.1) * 0.6;
    glintLight.intensity  = 9.0 + Math.sin(t * 2.4) * 3.8;

    edgeGlintLight.position.x = Math.cos(t * 0.72) * 2.9;
    edgeGlintLight.position.y = -1.1 + Math.sin(t * 1.0) * 0.5;
    edgeGlintLight.intensity  = 6.5 + Math.cos(t * 1.9) * 2.2;

    /* 로고 — 물 위에 떠 있는 듯한 부드러운 부유 */
    logoGroup.position.y  = Math.sin(t * 0.6) * 0.08;
    logoGroup.rotation.z  = Math.sin(t * 0.42) * 0.015;

    controls.update();
    renderer.render(scene, camera);
  }());
}

/* ---------------------------------------------------------------
   동물 설정
   scale: 정규화 배율 (1.0 = 뷰포트 기준 2단위 크기)
   y:     수직 오프셋 (모델 중심 보정)
   rotY:  기본 회전각 (rad)
--------------------------------------------------------------- */
const CREATURES = [
  { key: 'walrus',  src: 'assets/models/walrus_animated.glb',     scale: 0.9, y: -0.3, rotY:  0.2 },
  { key: 'beluga',  src: 'assets/models/whiteWhale_animated.glb',  scale: 1.0, y:  0.0, rotY: -0.2 },
  { key: 'shark',   src: 'assets/models/Shark_animated.glb',       scale: 1.1, y:  0.0, rotY:  0.1 },
  { key: 'turtle',  src: 'assets/models/turtle_animated.glb',      scale: 0.9, y: -0.2, rotY:  0.3 },
];

/* 진입 곡선: 브라우저 창 밖에서 헤엄쳐 들어옴
   FWD = 오른쪽 밖 → 중앙,  BWD = 왼쪽 밖 → 중앙
   카메라 z=8, FOV 42 기준 화면 가장자리 ≈ ±5.5 → 시작점 ±18 */
const ENTRY_FWD = new THREE.CatmullRomCurve3([
  new THREE.Vector3( 18, -0.7,  0.9),
  new THREE.Vector3( 10,  0.45, -0.6),
  new THREE.Vector3(  3, -0.15,  0.35),
  new THREE.Vector3( -1.1, 0.1,  -0.1),
  new THREE.Vector3( -2.5, 0.0,  0),
]);
const ENTRY_BWD = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-18, -0.7,  0.9),
  new THREE.Vector3(-12,  0.45, -0.7),
  new THREE.Vector3( -7, -0.15,  0.35),
  new THREE.Vector3( -4,  0.1,  -0.1),
  new THREE.Vector3( -2.5, 0.0,  0),
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
const crewSection = document.getElementById('sec-crew');
let crewInView = false;
let crewEntryTimer = null;

function setCrewInfoVisible(visible) {
  crewSection?.classList.toggle('is-creature-moving', !visible);
}

function setCrewTitleVisible(visible) {
  crewSection?.classList.toggle('is-title-visible', visible);
}

function scheduleCreatureEntry() {
  clearTimeout(crewEntryTimer);
  if (loadedN !== CREATURES.length || !crewInView) return;
  crewEntryTimer = setTimeout(() => {
    if (!crewInView) return;
    showCreature(pendingIdx >= 0 ? pendingIdx : 0);
  }, 620);
}

setCrewInfoVisible(false);
setCrewTitleVisible(false);
if (crewSection) {
  new IntersectionObserver(([e]) => {
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
      const s      = (4.0 / maxDim) * cfg.scale;  /* 현재 대비 1.5× */
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
    scheduleCreatureEntry();
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
  setCrewInfoVisible(false);
  setCrewTitleVisible(true);
  crewCanvas.style.opacity = '1';
  hideCanvasAfterExit = false;
  scheduleCreatureEntry();
}

function leaveCrewSection() {
  clearTimeout(crewEntryTimer);
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
  if (idx === currentIdx) return;

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
  if (!models[idx]) return;

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
      }
    }
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

  renderer.render(scene, camera);
}());

/* ---------------------------------------------------------------
   리사이즈 대응 — 윈도우 기준 (full-screen fixed canvas)
--------------------------------------------------------------- */
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/* ---------------------------------------------------------------
   main.js crew-switch 이벤트 수신
--------------------------------------------------------------- */
document.addEventListener('crew-switch', (e) => {
  pendingIdx = e.detail.idx;
  if (!crewInView) return;

  if (loadedN === CREATURES.length) {
    showCreature(e.detail.idx);
  }
});

document.addEventListener('crew-tail-visibility', (e) => {
  if (e.detail.hidden) {
    startSectionExit(true);
    return;
  }

  if (crewInView) {
    crewCanvas.style.opacity = '1';
    scheduleCreatureEntry();
  }
});
