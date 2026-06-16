/* =============================================================
   AQUA PLANET — logo3d.js
   스크롤 드리븐 심볼 로고 트랜지션 (순수 Three.js)

   하나의 ScrollTrigger progress(0~1)가 동시에 구동:
     ① 수동 AnimationMixer.setTime() 으로 심볼이 흩어졌다 모이는 안무 스크럽
     ② 심볼 캔버스(.logo3d-wrap)를 화면 중앙 → 헤더 로고 슬롯(.gnb__logo)으로 이동 + 축소
     ③ 'aqua planet' 글자(.logo3d-text)는 위치·크기 고정인 채 페이드아웃만

   모델 구성 (분리):
     - logoSymbol_ani.glb : 바다 생물 심볼 (애니메이션 25클립, net-zero) → 이동/축소
     - logoTxt_ani.glb    : 'aqua planet' 글자 (정적)             → 고정 + 페이드

   심볼/글자를 '별도 캔버스'로 분리해, 심볼만 헤더로 이동·축소하고 글자는 고정.
   심볼 착지 좌표/크기는 .gnb__logo 를 getBoundingClientRect 로 '측정' → 모든 기기 대응.
   net-zero 전제: progress 0 == 1 (심볼 둘 다 '조립된' 상태), 중간(0.5)에서 흩어짐.
   ============================================================= */
   
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
window.RoomEnvironment = RoomEnvironment;
/* 원래 logo3d.js 코드들이 이 아래로 이어집니다... */ 
import * as THREE from 'three';
import { GLTFLoader }     from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
// import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const { gsap, ScrollTrigger } = window;
if (gsap && ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

/* ---------------------------------------------------------------
   튜닝 상수 — 시각 확인하며 조정
--------------------------------------------------------------- */
const SYMBOL_SRC    = 'assets/models/new_logo_symbol.glb';
const TEXT_SRC      = 'assets/models/logoTxt_ani.glb';
const SCATTER_PAD   = 1.52;   // 코드 scatter/swim까지 보이도록 카메라 여백 확보
const TEXT_PADDING  = 1.12;   // 유리 두께/하이라이트가 잘리지 않도록 내부 카메라 여백 확보
const TEXT_FADE   = [0.4, 0.8];     // 이 progress 구간에서 글자 페이드아웃
const LOGO_TINT   = 0xbfe9ff;       // 유리 살짝 아쿠아 틴트
const ABBERATION  = 1.2;            // air.inc식 색수차 림 강도 (0=없음, 0.3~1.2 권장)
const IRIDESCENCE = 0.8;            // 박막 간섭 무지개 세기 (0~1)
const FLOAT_AMPLITUDE = 0.08;        // 생물별 위아래 둥둥 범위
const FLOAT_SPEED = 0.85;            // 기본 둥둥 속도
const FLOAT_OFFSET_STEP = 0.7;       // 생물별 파동 시간차
const FLOAT_ROTATION_Z = 0.04;       // 미세 회전 범위
const CODE_SCATTER_STRENGTH = 0.52;  // 스크롤 중간에서 바깥으로 퍼지는 정도
const CODE_SCATTER_Z = 0.16;         // 앞뒤 깊이감
const CODE_SCATTER_ROT = 0.22;       // 흩어질 때 추가 회전
const SWIM_SWAY_X = 0.14;             // 헤엄칠 때 좌우 물살 이동
const SWIM_SWAY_Y = 0.07;             // 헤엄칠 때 위아래 추진감
const SWIM_DEPTH = 0.08;              // 헤엄칠 때 앞뒤 깊이 변화
const SWIM_PITCH = 0.28;              // 헤엄칠 때 고개 드는 회전
const SWIM_YAW = 0.34;                // 헤엄칠 때 좌우 방향 전환
const SWIM_ROLL = 0.18;               // 헤엄칠 때 몸통 롤링

/* ---------------------------------------------------------------
   GPU 티어 감지 — detect-gpu 우선, 실패 시 휴리스틱 fallback
--------------------------------------------------------------- */
function heuristicTier() {
  const ua = navigator.userAgent;
  const isMobile = /Android|iPhone|iPad|iPod/i.test(ua) ||
                   (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.platform));
  const cores = navigator.hardwareConcurrency || 4;
  const mem   = navigator.deviceMemory || 4;
  let tier;
  if (isMobile)                    tier = (cores >= 6 && mem >= 4) ? 2 : 1;
  else if (cores >= 8 && mem >= 8) tier = 3;
  else if (cores >= 4)             tier = 2;
  else                             tier = 1;
  return { tier, isMobile };
}

async function detectTier() {
  try {
    const mod = await import('https://esm.sh/detect-gpu@5');
    const g = await mod.getGPUTier();
    return { tier: g.tier ?? 2, isMobile: !!g.isMobile };
  } catch {
    return heuristicTier();
  }
}

/* 티어별 렌더/재질 프로파일 */
function profileFor({ tier, isMobile }) {
  const high = tier >= 3 && !isMobile;
  const mid  = tier === 2 && !isMobile;
  // HTML 비디오 배경 위의 투명 WebGL 캔버스에서는 transmission 굴절이
  // 실제 DOM 배경을 샘플링하지 못해 검은 점/선 아티팩트를 만든다.
  // 그래서 모든 티어에서 반사형 유리 재질로 안정화한다.
  if (high) return { level: 'high', dprCap: 2,   useTransmission: false };
  if (mid)  return { level: 'mid',  dprCap: 1.5, useTransmission: false };
  return       { level: 'low',  dprCap: 1,   useTransmission: false };
}

/* air.inc식 색수차(chromatic aberration) 림 + 표면 무지개 시트.
   ① 가장자리(fresnel 강한 곳)에서 hue 분광 → 프리즘 림 글로우.
   ② sheen>0 이면 표면 노멀 방향으로 색조가 변하는 무지개 시트(비누방울막).
      평면적 메시(심볼 생물 컷아웃)는 가장자리 fresnel 이 1px 뿐이라 림이 거의
      안 보인다 → 표면 전체에 노멀 기반 무지개를 깔아 미세 곡률을 따라 색이 흐르게 한다. */
function applyChromaticRim(mat, strength = ABBERATION, sheen = 0.0) {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uAbberation = { value: strength };
    shader.uniforms.uSheen = { value: sheen };
    shader.fragmentShader = shader.fragmentShader
      .replace(
        'void main() {',
        `uniform float uAbberation;
         uniform float uSheen;
         void main() {`
      )
      .replace(
        '#include <opaque_fragment>',
        `// fresnel: 시선과 노멀의 각도차가 클수록(가장자리) 1에 가까움.
         // 지수 5.0 은 1px 림만 빛나 거의 안 보였다 → 2.5 로 낮춰 림을 넓힌다.
         vec3 nrm = normalize(normal);
         float dotNV = clamp(dot(nrm, normalize(vViewPosition)), 0.0, 1.0);
         float fresnel = pow(1.0 - dotNV, 2.5);
         // 단순 RGB 가산은 틴트색에 묻힌다 → fresnel 을 hue(색상환)에 매핑해
         // 가장자리를 빨강→초록→파랑 으로 분광시키는 진짜 프리즘 무지개 림.
         float hue = fresnel * uAbberation;
         vec3 rainbow = 0.5 + 0.5 * cos(6.28318 * (hue + vec3(0.0, 0.33, 0.67)));
         outgoingLight += rainbow * fresnel * uAbberation * 1.3;
         // ② 표면 무지개 시트 — 노멀 x/y 방향을 색상환에 매핑.
         //    (sheenCol-0.5) 로 밝기는 중립 유지, 색조만 시프트시켜 비누방울막처럼.
         if (uSheen > 0.001) {
           float band = nrm.x * 0.6 + nrm.y * 0.4;
           vec3 sheenCol = 0.5 + 0.5 * cos(6.28318 * (band * 1.5 + vec3(0.0, 0.33, 0.67)));
           outgoingLight += (sheenCol - 0.5) * uSheen * 2.0;
         }
         #include <opaque_fragment>`
      );
  };
  // 셰이더 캐시 충돌 방지 (strength + sheen 조합별로 구분)
  mat.customProgramCacheKey = () => 'chromaticRim_' + strength + '_' + sheen;
}

/* 심볼 전용 유리 재질 — 굴절 대신 반사/클리어코트로 안정적인 유리감.
   글자보다 화려하게: iridescence 최대 + 넓은 박막두께 + 색수차 개별 상향. */
function makeSymbolGlass(profile) {
  const mat = new THREE.MeshPhysicalMaterial({
    // 회색기 제거: 짙은 하늘 틴트(LOGO_TINT) 대신 거의 흰 유리로 두고
    // 색은 iridescence/색수차가 만들게 → 채도 높은 무지개가 주도한다.
    color: new THREE.Color(0xeaf7ff),
    metalness: 0.02,
    roughness: profile.level === 'high' ? 0.04 : 0.08,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
    ior: 1.52,
    transparent: true,
    // air.inc 처럼 거의 물/공기 같은 투명 유리. 무지개색은 outgoingLight 가산이라
    // alpha 와 무관하게 유지되므로 투명도를 올려도 색은 안 사라진다.
    opacity: 0.42,
    // 톤매핑을 껐으므로 envMapIntensity 는 2.0 으로 (과밝 클리핑 방지하며 반사 유지).
    envMapIntensity: 2.0,
    side: THREE.FrontSide,
    depthWrite: false,
    // 박막 간섭 무지개 — 심볼은 최대 강도, 두께 범위를 넓혀 색조 변화를 풍부하게.
    iridescence: 1.0,
    iridescenceIOR: 1.4,
    iridescenceThicknessRange: [100, 800],
  });
  // 심볼: 색수차 1.5배 + 표면 무지개 시트(sheen 0.4) — 평면 메시도 색이 흐르게.
  applyChromaticRim(mat, ABBERATION * 1.5, 0.4);
  return mat;
}

/* 글자 유리 재질 (단독 캔버스: 굴절 없이 reflective 방식) */
function makeGlass(profile, { doubleSide = false } = {}) {
  const side = doubleSide ? THREE.DoubleSide : THREE.FrontSide;
  const mat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(LOGO_TINT),
    metalness: 0,
    roughness: profile.level === 'high' ? 0.06 : 0.10,
    clearcoat: 1,
    clearcoatRoughness: 0.06,
    ior: 1.4,
    transparent: true,
    // air.inc 처럼 배경이 비치는 투명 유리로 (0.4 → 0.28)
    opacity: 0.28,
    side,
    depthWrite: false,
    envMapIntensity: 1.3,
    // 박막 간섭 무지개 (transmission/envMap 없이 동작)
    iridescence: IRIDESCENCE,
    iridescenceIOR: 1.3,
    iridescenceThicknessRange: [120, 420],
  });
  applyChromaticRim(mat);
  return mat;
}

/* air.inc식 오로라 환경맵 — 유리 반사·iridescence·색수차가 '비출 색'을 만든다.
   중성 회색(RoomEnvironment) 대신 파스텔 무지개 띠 + 천장광 그라디언트를 캔버스로
   그려 equirectangular HDR 처럼 쓴다. 이게 박막 간섭에 무지개색을 입혀준다. */
function makeAuroraEnv(renderer) {
    const c = document.createElement('canvas');
    c.width = 1024; c.height = 512;
    const ctx = c.getContext('2d');

    // 수평 무지개 색띠 (비비드 — 회색기 제거, 반사색을 선명하게)
    const h = ctx.createLinearGradient(0, 0, c.width, 0);
    h.addColorStop(0.00, '#5fd8ff');  // 비비드 시안
    h.addColorStop(0.18, '#ff7ec8');  // 핫핑크
    h.addColorStop(0.38, '#5effb0');  // 비비드 민트
    h.addColorStop(0.58, '#ffdb52');  // 골드
    h.addColorStop(0.78, '#a87cff');  // 바이올렛
    h.addColorStop(1.00, '#5fd8ff');
    ctx.fillStyle = h;
    ctx.fillRect(0, 0, c.width, c.height);

    // 수직 광량 그라디언트 (위=천장광, 아래=바닥) → 입체 반사.
    // 흰색 오버레이가 색을 씻어내므로 알파를 줄여 채도를 보존한다.
    const v = ctx.createLinearGradient(0, 0, 0, c.height);
    v.addColorStop(0.00, 'rgba(255,255,255,0.40)');
    v.addColorStop(0.45, 'rgba(255,255,255,0.0)');
    v.addColorStop(1.00, 'rgba(20,40,70,0.50)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, c.width, c.height);

    const tex = new THREE.CanvasTexture(c);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    tex.colorSpace = THREE.SRGBColorSpace;

    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = pmrem.fromEquirectangular(tex).texture;
    tex.dispose();
    pmrem.dispose();
    return env;
}

/* 공통 조명 + 환경맵 세팅 */
function setupSceneEnv(scene, renderer) {
    scene.environment = makeAuroraEnv(renderer);

    // envMap 이 ambient 역할을 하므로 AmbientLight 는 낮춰 효과가 묻히지 않게 한다.
    scene.add(new THREE.AmbientLight(0xffffff, 0.25));

    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(3, 5, 4);
    scene.add(key);

    const rim = new THREE.DirectionalLight(0x66ccff, 0.8);
    rim.position.set(-4, 1, -3);
    scene.add(rim);
}

/* 모델을 그룹 중앙에 정렬. size 를 반환해 카메라 fit 에 재사용 */
function centerModel(model, group, { flipY = true } = {}) {
  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  model.position.sub(center);
  group.rotation.y = flipY ? Math.PI : 0;
  return size;
}

/* 카메라 거리: 가로/세로 둘 다 화면에 들어오게 (aspect 고려) */
function fitCamera(camera, size, padding) {
  const halfV = Math.tan((camera.fov * Math.PI / 180) / 2);
  const distH = (size.y * padding / 2) / halfV;
  const distW = (size.x * padding / 2) / (halfV * camera.aspect);
  camera.position.set(0, 0, Math.max(distH, distW));
  camera.lookAt(0, 0, 0);
}

function seededRandom(index, salt = 0) {
  const x = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453123;
  return x - Math.floor(x);
}

/* GLB 안 mesh 전부를 코드 기반으로 둥둥 움직이게 하는 데이터 구성 */
function createFloatAnimation(root) {
  const meshes = [];
  const baseX = [];
  const baseY = [];
  const baseZ = [];
  const baseRotX = [];
  const baseRotY = [];
  const baseRotZ = [];
  const amplitudes = [];
  const speeds = [];
  const offsets = [];
  const scatterX = [];
  const scatterY = [];
  const scatterZ = [];
  const scatterRotX = [];
  const scatterRotY = [];
  const scatterRotZ = [];
  const swimPhase = [];
  const swimX = [];
  const swimY = [];
  const swimZ = [];
  const swimPitch = [];
  const swimYaw = [];
  const swimRoll = [];

  root.traverse((object) => {
    if (!object.isMesh) return;

    const index = meshes.length;
    const offset = index * FLOAT_OFFSET_STEP;
    const ampVariation = 0.75 + (index % 5) * 0.1;
    const speedVariation = 0.88 + (index % 7) * 0.04;
    const angle = seededRandom(index, 1) * Math.PI * 2;
    const radius = CODE_SCATTER_STRENGTH * (0.45 + seededRandom(index, 2) * 0.75);
    const yBias = (seededRandom(index, 3) - 0.5) * CODE_SCATTER_STRENGTH * 0.45;
    const zDir = seededRandom(index, 4) > 0.5 ? 1 : -1;
    const sideDir = seededRandom(index, 9) > 0.5 ? 1 : -1;
    const swimStrength = 0.65 + seededRandom(index, 10) * 0.7;

    meshes.push(object);
    baseX.push(object.position.x);
    baseY.push(object.position.y);
    baseZ.push(object.position.z);
    baseRotX.push(object.rotation.x);
    baseRotY.push(object.rotation.y);
    baseRotZ.push(object.rotation.z);
    amplitudes.push(FLOAT_AMPLITUDE * ampVariation);
    speeds.push(FLOAT_SPEED * speedVariation);
    offsets.push(offset);
    scatterX.push(Math.cos(angle) * radius);
    scatterY.push(Math.sin(angle) * radius + yBias);
    scatterZ.push(zDir * CODE_SCATTER_Z * (0.35 + seededRandom(index, 5) * 0.85));
    scatterRotX.push((seededRandom(index, 6) - 0.5) * CODE_SCATTER_ROT);
    scatterRotY.push((seededRandom(index, 7) - 0.5) * CODE_SCATTER_ROT);
    scatterRotZ.push((seededRandom(index, 8) - 0.5) * CODE_SCATTER_ROT * 1.5);
    swimPhase.push(seededRandom(index, 11) * Math.PI * 2);
    swimX.push(sideDir * SWIM_SWAY_X * swimStrength);
    swimY.push((0.45 + seededRandom(index, 12) * 0.65) * SWIM_SWAY_Y);
    swimZ.push(zDir * SWIM_DEPTH * (0.5 + seededRandom(index, 13) * 0.8));
    swimPitch.push((0.6 + seededRandom(index, 14) * 0.8) * SWIM_PITCH);
    swimYaw.push(sideDir * (0.6 + seededRandom(index, 15) * 0.8) * SWIM_YAW);
    swimRoll.push(sideDir * (0.55 + seededRandom(index, 16) * 0.9) * SWIM_ROLL);
  });

  return {
    meshes,
    baseX,
    baseY,
    baseZ,
    baseRotX,
    baseRotY,
    baseRotZ,
    amplitudes,
    speeds,
    offsets,
    scatterX,
    scatterY,
    scatterZ,
    scatterRotX,
    scatterRotY,
    scatterRotZ,
    swimPhase,
    swimX,
    swimY,
    swimZ,
    swimPitch,
    swimYaw,
    swimRoll,
  };
}

function applyFloatAnimation(floatAnim, elapsed, transitionProgress) {
  if (!floatAnim) return;

  const {
    meshes,
    baseX,
    baseY,
    baseZ,
    baseRotX,
    baseRotY,
    baseRotZ,
    amplitudes,
    speeds,
    offsets,
    scatterX,
    scatterY,
    scatterZ,
    scatterRotX,
    scatterRotY,
    scatterRotZ,
    swimPhase,
    swimX,
    swimY,
    swimZ,
    swimPitch,
    swimYaw,
    swimRoll,
  } = floatAnim;
  const p = Math.min(Math.max(transitionProgress, 0), 1);
  const scatter = Math.sin(p * Math.PI);
  const easedScatter = scatter * scatter * (3 - 2 * scatter);
  const swimPower = easedScatter;
  const scrollStroke = p * Math.PI * 4;

  for (let i = 0; i < meshes.length; i += 1) {
    const mesh = meshes[i];
    const wave = elapsed * speeds[i] + offsets[i];
    const bob = Math.sin(wave) * amplitudes[i];
    const phase = scrollStroke + swimPhase[i] + elapsed * speeds[i] * 0.35;
    const stroke = Math.sin(phase);
    const stroke2 = Math.cos(phase * 0.74 + offsets[i]);
    const kick = Math.sin(phase * 1.8 + offsets[i]) * 0.5 + 0.5;

    mesh.position.x = baseX[i] + scatterX[i] * easedScatter + swimX[i] * stroke * swimPower;
    mesh.position.y = baseY[i] + bob + scatterY[i] * easedScatter + swimY[i] * stroke2 * swimPower;
    mesh.position.z = baseZ[i] + scatterZ[i] * easedScatter + swimZ[i] * stroke * swimPower;
    mesh.rotation.x = baseRotX[i] + scatterRotX[i] * easedScatter + swimPitch[i] * stroke2 * swimPower;
    mesh.rotation.y = baseRotY[i] + scatterRotY[i] * easedScatter + swimYaw[i] * stroke * swimPower;
    mesh.rotation.z =
      baseRotZ[i] +
      Math.sin(elapsed * speeds[i] * 0.5 + offsets[i]) * FLOAT_ROTATION_Z +
      scatterRotZ[i] * easedScatter +
      swimRoll[i] * kick * swimPower;
  }
}

/* ---------------------------------------------------------------
   메인 초기화
--------------------------------------------------------------- */
async function initLogo3D() {
  const wrap = document.querySelector('.logo3d-wrap');
  const slot = document.querySelector('.gnb__logo');
  const hero = document.getElementById('sec-logo');
  if (!wrap || !slot || !hero) return;
  const textEl = document.querySelector('.logo3d-text');

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const profile = profileFor(await detectTier());

  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);

  const progress = { v: reduceMotion ? 1 : 0 };  // 스크롤 단일 소스

  /* =============================================================
     ① 심볼 캔버스 (.logo3d-wrap) — 헤더로 이동/축소
  ============================================================= */
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, premultipliedAlpha: false });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // ACES 는 채도를 강하게 눌러 무지개를 회색으로 만든다 → 색 보존 위해 톤매핑 끔.
  // (envMapIntensity 를 낮춰 하이라이트 클리핑은 따로 제어)
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, profile.dprCap));
  renderer.domElement.style.cssText = 'width:100%;height:100%;display:block;';
  wrap.appendChild(renderer.domElement);

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  setupSceneEnv(scene, renderer);

  const symGroup = new THREE.Group();
  scene.add(symGroup);
  let mixer = null;
  let duration = 0;
  let floatAnim = null;
  let active = false;            // ScrollTrigger 활성(스크럽 구간)
  let needsRender = true;
  const requestRender = () => { needsRender = true; };

  let symSize = null;
  let symPad  = 1.6;   // 로드 전 임시값, 로드 후 SCATTER_PAD 로 교체
  function sizeRenderer() {
    const w = wrap.clientWidth || 1, h = wrap.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (symSize) fitCamera(camera, symSize, symPad);
  }

  loader.loadAsync(SYMBOL_SRC).then((gltf) => {
    const symbol = gltf.scene;
    symGroup.add(symbol);
    symbol.traverse((o) => { if (o.isMesh) o.material = makeSymbolGlass(profile); });
    centerModel(symbol, symGroup, { flipY: false });
    floatAnim = createFloatAnimation(symbol);

    // 먼저 mixer 세팅
    mixer = new THREE.AnimationMixer(symbol);
    gltf.animations.forEach((clip) => { mixer.clipAction(clip).play(); duration = Math.max(duration, clip.duration); });

    // 애니메이션 전 구간을 샘플링해 실제 scatter 최대 bbox 산출
    const scatterBox = new THREE.Box3();
    for (let i = 0; i <= 40; i++) {
      mixer.setTime((i / 40) * duration);
      scatterBox.union(new THREE.Box3().setFromObject(symbol));
    }
    mixer.setTime(0);
    symSize = scatterBox.getSize(new THREE.Vector3());
    symPad  = SCATTER_PAD;   // 실제 범위 기반이므로 작은 마진으로 충분

    sizeRenderer();
    requestRender();
  }).catch((e) => console.warn('[logo3d] 심볼 로드 실패:', e));

  function tick() {
    requestAnimationFrame(tick);
    const shouldFloat = !reduceMotion && progress.v < 0.98 && floatAnim;
    if (!active && !needsRender && !shouldFloat) return;   // idle → GL 작업 없음

    const elapsed = performance.now() * 0.001;
    if (mixer && duration > 0) mixer.setTime(progress.v * duration);
    if (shouldFloat) applyFloatAnimation(floatAnim, elapsed, progress.v);
    renderer.render(scene, camera);
    if (!active && !shouldFloat) needsRender = false;      // 비활성: 마지막 프레임 한 번만
  }
  tick();

  /* =============================================================
     ② 글자 캔버스 (.logo3d-text) — 위치/크기 고정, 정적 1회 렌더 + 페이드
  ============================================================= */
  let textRenderer = null, textScene = null, textCamera = null, textSize = null;
  function syncTextBoxToHeroTitle() {
    const title = document.querySelector('.hero__title');
    if (!textEl || !title) return;
    const rect = title.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    textEl.style.setProperty('--logo3d-text-w', `${Math.ceil(rect.width * 1.14)}px`);
    textEl.style.setProperty('--logo3d-text-h', `${Math.ceil(rect.height * 1.08)}px`);
  }
  function renderTextOnce() { if (textRenderer) textRenderer.render(textScene, textCamera); }
  function sizeTextRenderer() {
    if (!textRenderer || !textEl) return;
    syncTextBoxToHeroTitle();
    const w = textEl.clientWidth || 1, h = textEl.clientHeight || 1;
    textRenderer.setSize(w, h, false);
    textCamera.aspect = w / h;
    textCamera.updateProjectionMatrix();
    if (textSize) fitCamera(textCamera, textSize, TEXT_PADDING);
    renderTextOnce();
  }
  if (textEl) {
    syncTextBoxToHeroTitle();
    if (document.fonts?.ready) {
      document.fonts.ready.then(() => {
        sizeTextRenderer();
        requestRender();
      });
    }
    textRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, premultipliedAlpha: false });
    textRenderer.outputColorSpace = THREE.SRGBColorSpace;
    // 심볼 캔버스와 동일하게 톤매핑 끔 (무지개 채도 보존)
    textRenderer.toneMapping = THREE.NoToneMapping;
    textRenderer.setPixelRatio(Math.min(window.devicePixelRatio, profile.dprCap));
    textRenderer.domElement.style.cssText = 'width:100%;height:100%;display:block;';
    textEl.appendChild(textRenderer.domElement);

    textScene = new THREE.Scene();
    textCamera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    setupSceneEnv(textScene, textRenderer);
    const txtGroup = new THREE.Group();
    textScene.add(txtGroup);

    loader.loadAsync(TEXT_SRC).then((gltf) => {
      const text = gltf.scene;
      txtGroup.add(text);
      // 심볼과 동일한 유리 재질 (평면이라 양면 렌더만 추가)
      text.traverse((o) => { if (o.isMesh) o.material = makeGlass(profile, { doubleSide: true }); });
      textSize = centerModel(text, txtGroup);
      sizeTextRenderer();
    }).catch((e) => console.warn('[logo3d] 글자 로드 실패:', e));
  }

  /* progress → 글자 불투명도 (위치/크기는 CSS 고정, 페이드만) */
  function applyTextFade() {
    if (!textEl) return;
    const [a, b] = TEXT_FADE;
    const t = Math.min(Math.max((progress.v - a) / (b - a), 0), 1);
    textEl.style.opacity = String(1 - t);
  }
  applyTextFade();

  /* =============================================================
     ③ 헤더 슬롯 측정 + ScrollTrigger
  ============================================================= */
  let end = { dx: 0, dy: 0, scale: 1 };
  function measure() {
    const prev = wrap.style.transform;
    wrap.style.transform = 'none';
    const l = wrap.getBoundingClientRect();
    const s = slot.getBoundingClientRect();
    wrap.style.transform = prev;
    end = {
      dx: (s.left + s.width / 2) - (l.left + l.width / 2),
      dy: (s.top + s.height / 2) - (l.top + l.height / 2),
      scale: s.width / l.width,
    };
  }

  if (reduceMotion || !gsap || !ScrollTrigger) {
    // 모션 줄이기/플러그인 부재 — 트랜지션 생략, 즉시 헤더 상태
    measure();
    if (gsap) gsap.set(wrap, { x: end.dx, y: end.dy, scale: end.scale });
    progress.v = 1;
    applyTextFade();
    requestRender();
  } else {
    gsap.context(() => {
      measure();
      gsap.timeline({
        scrollTrigger: {
          trigger: '#sec-logo',
          start: 'top top',
          end: 'bottom top',
          scrub: 0.5,
          invalidateOnRefresh: true,
          onRefreshInit: measure,
          onUpdate: (self) => { progress.v = self.progress; applyTextFade(); requestRender(); },
          onToggle: (self) => {
            active = self.isActive;
            document.body.classList.toggle('is-logo-transition', self.isActive);
            requestRender();
          },
        },
      }).to(wrap, { x: () => end.dx, y: () => end.dy, scale: () => end.scale, ease: 'none', duration: 1 }, 0);
    });
  }

  /* --- 리사이즈 (iOS 주소창 변동 포함) --- */
  let resizeRAF = null;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(resizeRAF);
    resizeRAF = requestAnimationFrame(() => {
      sizeRenderer();
      sizeTextRenderer();
      if (ScrollTrigger) ScrollTrigger.refresh();
      requestRender();
    });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLogo3D);
} else {
  initLogo3D();
}
