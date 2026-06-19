/* =============================================================
   AQUA PLANET — logo_glass.js
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
   
import * as THREE from 'three';
import { GLTFLoader }     from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

const { gsap, ScrollTrigger } = window;
if (gsap && ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

/* ---------------------------------------------------------------
   튜닝 상수 — 시각 확인하며 조정
--------------------------------------------------------------- */
const SYMBOL_SRC    = 'assets/models/new_logo_symbol.glb?v=20260617-02';
const TEXT_SRC      = 'assets/models/logoTxt_ani.glb';
const REFRACT_VIDEO_SRC = 'assets/images/sky_mov.mp4';
const SCATTER_PAD   = 1.52;   // 코드 scatter/swim까지 보이도록 카메라 여백 확보
const TEXT_PADDING  = 1.02;   // 유리 두께/하이라이트가 잘리지 않도록 내부 카메라 여백 확보
const TEXT_Y_OFFSET_RATIO = 0.2; // 텍스트 로고를 자기 높이 기준 아래로 내리는 비율
const TEXT_FADE   = [0.4, 0.8];     // 이 progress 구간에서 글자 페이드아웃
const HEADER_DOCK_PROGRESS = 0.985;  // 3D 심볼이 헤더 슬롯에 사실상 도착한 지점

/* ---------------------------------------------------------------
   유리 룩 프리셋 — 굴절 유리 (glass): 배경 비디오를 스크린스페이스로 굴절
--------------------------------------------------------------- */
const GLASS_STYLE = 'glass';
const GLASS_PRESETS = {
  // 굴절 유리 — 배경 비디오를 스크린스페이스로 굴절 (air.inc 정석에 가장 근접)
  glass: {
    envMode: 'sky',                                                          // 반사용 환경맵(흰 하늘)
    refract: true,                                                           // ★ 스크린스페이스 굴절 on
    refractAmt: 0.08,                                                        // 굴절 왜곡 강도 — 너무 높으면 모서리가 크리스탈처럼 쪼개짐
    refractMix: 0.9,                                                       // 배경 굴절 비중 (1.0=배경만, 낮을수록 유리색↑)
    waveAmt: 0.012,                                                         // 시간 기반 일렁임 — 메시 무관 부드러운 sine 출렁임 (움직임 강조)
    shadow: 0.7,                                                           // 내부 흡수 그림자 — 라인 위주로 얇게
    shadowColor: 0x009dff,                                                   // 채도 높은 아쿠아 블루 그림자
    coreDarken: 0.08,                                                        // 중앙/겹침부 면 어둠 최소화
    bandDarken: 0.24,                                                        // 화면 좌표 기반 곡면 그림자 밴드
    rimDarkColor: 0x009DFF,                                                   // 림 그라디언트 시작색
    rimWhitePoint: 0.76,                                                      // 높을수록 흰 림 영역이 얇아짐
    mapContrast: 1,                                                        // 매핑 비디오 대비
    mapSaturation: 1,                                                      // 매핑 비디오 채도
    mapBrightness: -0.3,                                                       // 매핑 비디오 밝기 오프셋
    // opacity 낮춰 더 투명하게 — 뒤 배경이 비치고 굴절 배경이 겹쳐 맑은 유리감.
    symbol: { color: 0xffffff, iridescence: 0.05, sheen: 0.0, envMapIntensity: 1.45, emissive: 0.02, opacity: 0.72},
    text:   { color: 0xffffff, iridescence: 0.05, emissive: 0.02, opacity: 0.39},
    rimGain: 0.18, edge: 0.6, lumAlpha: 0.06,                                 // lumAlpha 낮춰 내부 투과 유지
  },
};
const STYLE = GLASS_PRESETS[GLASS_STYLE];
const GLASS_BACKDROP_Z = -2.4;
const TEXT_BODY_TINT = 0x509AE4;
const TEXT_RIM_WHITE = 0x00CAFF;
const TEXT_INNER_LINE_BLUE = 0x0083B3;
const TEXT_BODY_TINT_MIX = 0.7;
const TEXT_RIM_STRENGTH = 0.0012;
const TEXT_INNER_LINE_STRENGTH = 0.48;
const TEXT_LINE_REPEAT = 5.5;
const TEXT_AURORA_STRENGTH = 0.75;
const TEXT_AURORA_SPEED = 0.035;
const PHYSICAL_SYMBOL_GLASS = {
  color: 0xf2fcff,
  roughness: 0.08,
  transmission: 1.1,
  thickness: 13,
  ior: 1.62,
  attenuationColor: 0xbfeeff,
  attenuationDistance: 2.4,
  envMapIntensity: 1.45,
  clearcoat: 1.0,
  clearcoatRoughness: 0.025,
  reflectivity: 0.7,
  opacity: 0.8,
};
const PHYSICAL_TEXT_GLASS = {
  color: 0x509AE4,
  roughness: 0.2,
  transmission: 1.1,
  thickness: 13,
  ior: 1.58,
  attenuationColor: 0xe4f9ff,
  attenuationDistance: 0.002,
  envMapIntensity: 2.2,
  clearcoat: 1.0,
  clearcoatRoughness: 0.025,
  reflectivity: 0.9,
  opacity: 0.35,
};
/* 굴절 모드용 공유 상태 — VideoTexture + 매 프레임 갱신할 셰이더 목록 */
const REFRACT = {
  tex: null,
  shaders: [],
  videoAspect: 16 / 9,
  refractAmt: STYLE.refractAmt ?? 0.07,
  refractMix: STYLE.refractMix ?? 0.9,
  waveAmt: STYLE.waveAmt ?? 0.0,
  shadow: STYLE.shadow ?? 0.0,
  shadowColor: new THREE.Color(STYLE.shadowColor ?? 0x1687d9),
  coreDarken: STYLE.coreDarken ?? 0.0,
  bandDarken: STYLE.bandDarken ?? 0.0,
  rimDarkColor: new THREE.Color(STYLE.rimDarkColor ?? 0x004f9e),
  rimWhitePoint: STYLE.rimWhitePoint ?? 0.9,
  mapContrast: STYLE.mapContrast ?? 1.0,
  mapSaturation: STYLE.mapSaturation ?? 1.0,
  mapBrightness: STYLE.mapBrightness ?? 0.0,
};

const FLOAT_AMPLITUDE = 0.03;        // 생물별 위아래 둥둥 범위
const FLOAT_SPEED = 0.85;            // 기본 둥둥 속도
const FLOAT_OFFSET_STEP = 0.7;       // 생물별 파동 시간차
const FLOAT_ROTATION_Z = 0.04;       // 미세 회전 범위
const CODE_SCATTER_STRENGTH = 0.52;  // 스크롤 중간에서 바깥으로 퍼지는 정도
const CODE_SCATTER_Z = 0.16;         // 앞뒤 깊이감
const CODE_SCATTER_ROT = 0.22;       // 흩어질 때 추가 회전
const SWIM_SWAY_X = 0.48;             // 스크롤 이동 중 좌우 물살 이동
const SWIM_SWAY_Y = 0.14;             // 스크롤 이동 중 위아래 추진감
const SWIM_DEPTH = 0.08;              // 헤엄칠 때 앞뒤 깊이 변화
const SWIM_PITCH = 0.28;              // 헤엄칠 때 고개 드는 회전
const SWIM_YAW = 0.34;                // 헤엄칠 때 좌우 방향 전환
const SWIM_ROLL = 0.18;               // 헤엄칠 때 몸통 롤링
const HOVER_WOBBLE_POS = 0.035;        // 로고 hover 시 mesh별 제자리 흔들림 위치 범위
const HOVER_WOBBLE_ROT = 0.055;        // 로고 hover 시 mesh별 제자리 흔들림 회전 범위
const HOVER_WOBBLE_YAW = 0.12;         // 로고 hover 시 좌우로 고개 돌리는 회전 범위
const HOVER_WOBBLE_SPEED = 2.6;        // 로고 hover 흔들림 속도
const SYMBOL_COMPACT = 1;           // 생물 조밀도 (1=원본 배치, <1=무리 중심으로 모임)

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

/* 실험용 통합 유리 재질.
   원래 로고의 크기/스크롤/도킹은 유지하고, 각 Three scene 안에 깔린
   비디오 backdrop을 transmission이 실제로 굴절/반사할 수 있게 한다. */
function makePhysicalGlass(settings, { doubleSide = false } = {}) {
  const mat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(settings.color),
    roughness: settings.roughness,
    metalness: 0,
    transparent: true,
    opacity: settings.opacity,
    transmission: settings.transmission,
    thickness: settings.thickness,
    ior: settings.ior,
    attenuationColor: new THREE.Color(settings.attenuationColor),
    attenuationDistance: settings.attenuationDistance,
    envMapIntensity: settings.envMapIntensity,
    clearcoat: settings.clearcoat,
    clearcoatRoughness: settings.clearcoatRoughness,
    reflectivity: settings.reflectivity,
    side: doubleSide ? THREE.DoubleSide : THREE.FrontSide,
    depthWrite: false,
  });
  if ('dispersion' in mat) mat.dispersion = 4.0;
  return mat;
}

function applyTextGlassLook(mat) {
  mat.onBeforeCompile = (shader) => {
    mat.userData.shader = shader;
    shader.uniforms.uTextBodyTint = { value: new THREE.Color(TEXT_BODY_TINT) };
    shader.uniforms.uTextRimWhite = { value: new THREE.Color(TEXT_RIM_WHITE) };
    shader.uniforms.uTextLineBlue = { value: new THREE.Color(TEXT_INNER_LINE_BLUE) };
    shader.uniforms.uTextBodyTintMix = { value: TEXT_BODY_TINT_MIX };
    shader.uniforms.uTextRimStrength = { value: TEXT_RIM_STRENGTH };
    shader.uniforms.uTextLineStrength = { value: TEXT_INNER_LINE_STRENGTH };
    shader.uniforms.uTextLineRepeat = { value: TEXT_LINE_REPEAT };
    shader.uniforms.uTextTime = { value: 0 };
    shader.uniforms.uTextAuroraStrength = { value: TEXT_AURORA_STRENGTH };
    shader.uniforms.uTextAuroraSpeed = { value: TEXT_AURORA_SPEED };

    shader.fragmentShader = shader.fragmentShader
      .replace('void main() {', `
        uniform vec3 uTextBodyTint;
        uniform vec3 uTextRimWhite;
        uniform vec3 uTextLineBlue;
        uniform float uTextBodyTintMix;
        uniform float uTextRimStrength;
        uniform float uTextLineStrength;
        uniform float uTextLineRepeat;
        uniform float uTextTime;
        uniform float uTextAuroraStrength;
        uniform float uTextAuroraSpeed;
        void main() {`)
      .replace(
        '#include <opaque_fragment>',
        `
        vec3 _textNormal = normalize(normal);
        float _textDotNV = clamp(dot(_textNormal, normalize(vViewPosition)), 0.0, 1.0);
        float _textRim = pow(1.0 - _textDotNV, 1.28);
        float _textWhiteRim = smoothstep(0.20, 0.92, _textRim);
        float _textBevel = smoothstep(0.06, 0.62, 1.0 - abs(_textNormal.z));
        vec2 _textFlowDir = normalize(vec2(_textNormal.y * 0.72 + 0.28, -_textNormal.x * 0.58 + 0.82));
        float _textFlow = dot(_textNormal.xy, _textFlowDir) + _textRim * 0.38 + uTextTime * 0.018;
        float _textLineA = 1.0 - smoothstep(0.012, 0.040, abs(fract(_textFlow * uTextLineRepeat) - 0.5));
        float _textLineB = 1.0 - smoothstep(0.010, 0.032, abs(fract((_textFlow + _textNormal.y * 0.21) * (uTextLineRepeat * 0.72)) - 0.5));
        float _textInnerLine = clamp((_textLineA * 0.72 + _textLineB * 0.38) * _textBevel * (1.0 - _textWhiteRim * 0.48), 0.0, 1.0);
        float _auroraPhase = _textFlow * 1.75 + _textNormal.x * 0.42 - _textNormal.y * 0.28 + uTextTime * uTextAuroraSpeed;
        vec3 _auroraA = vec3(0.28, 0.92, 1.00);
        vec3 _auroraB = vec3(0.72, 0.46, 1.00);
        vec3 _auroraC = vec3(0.38, 1.00, 0.78);
        vec3 _auroraColor = mix(_auroraA, _auroraB, smoothstep(0.10, 0.88, sin(_auroraPhase * 6.28318) * 0.5 + 0.5));
        _auroraColor = mix(_auroraColor, _auroraC, smoothstep(0.18, 0.92, cos((_auroraPhase + _textRim * 0.38) * 6.28318) * 0.5 + 0.5));
        float _auroraMask = clamp((_textWhiteRim * 0.72 + _textBevel * 0.46 + _textInnerLine * 0.38) * uTextAuroraStrength, 0.0, 1.0);
        outgoingLight = mix(outgoingLight, uTextBodyTint, uTextBodyTintMix);
        outgoingLight = mix(outgoingLight, _auroraColor, _auroraMask);
        outgoingLight = mix(outgoingLight, uTextLineBlue, _textInnerLine * uTextLineStrength);
        outgoingLight += mix(uTextRimWhite, _auroraColor, 0.42) * _textWhiteRim * uTextRimStrength;
        outgoingLight += uTextRimWhite * _textBevel * 0.16;
        #include <opaque_fragment>
        gl_FragColor.a = clamp(gl_FragColor.a + _textWhiteRim * 0.42 + _textInnerLine * 0.20 + _auroraMask * 0.08, 0.0, 1.0);
        `
      );
  };
  mat.customProgramCacheKey = () => 'textGlassLook_aurora_v1';
  return mat;
}

function makeVideoBackdrop(texture = REFRACT.tex, getVideoAspect = () => REFRACT.videoAspect) {
  if (!texture) return null;
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: texture },
      uRectMin: { value: new THREE.Vector2() },
      uRectSize: { value: new THREE.Vector2(1, 1) },
      uViewport: { value: new THREE.Vector2(1, 1) },
      uVideoAspect: { value: REFRACT.videoAspect },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D uMap;
      uniform vec2 uRectMin;
      uniform vec2 uRectSize;
      uniform vec2 uViewport;
      uniform float uVideoAspect;
      varying vec2 vUv;

      void main() {
        vec2 screen = (uRectMin + vUv * uRectSize) / uViewport;
        vec2 uv = vec2(screen.x, screen.y);
        float screenAspect = uViewport.x / uViewport.y;
        if (screenAspect > uVideoAspect) {
          float s = uVideoAspect / screenAspect;
          uv.y = (uv.y - 0.5) * s + 0.5;
        } else {
          float s = screenAspect / uVideoAspect;
          uv.x = (uv.x - 0.5) * s + 0.5;
        }
        gl_FragColor = vec4(texture2D(uMap, uv).rgb, 1.0);
      }
    `,
    depthTest: false,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
  mesh.renderOrder = -100;
  mesh.position.z = GLASS_BACKDROP_Z;
  mesh.userData.getVideoAspect = getVideoAspect;
  return mesh;
}

function updateBackdropUniforms(plane, el) {
  if (!plane || !el || !plane.material?.uniforms) return;
  const rect = el.getBoundingClientRect();
  plane.material.uniforms.uRectMin.value.set(rect.left, rect.top);
  plane.material.uniforms.uRectSize.value.set(rect.width, rect.height);
  plane.material.uniforms.uViewport.value.set(window.innerWidth, window.innerHeight);
  plane.material.uniforms.uVideoAspect.value = plane.userData.getVideoAspect?.() ?? REFRACT.videoAspect;
}

function fitBackdrop(plane, camera, z = GLASS_BACKDROP_Z) {
  if (!plane || !camera) return;
  const dist = Math.max(0.01, camera.position.z - z);
  const height = 2 * Math.tan((camera.fov * Math.PI / 180) / 2) * dist;
  plane.position.z = z;
  plane.scale.set(height * camera.aspect, height, 1);
}

/* 클린 스카이 환경맵 — 밝은 수면/하늘 배경용. 무지개 색띠 없이 흰색~연한 쿨톤만
   둬서 반사가 화이트-실버로 채워진다(회색이 아니라 맑은 흰 유리). air.inc 레퍼런스. */
function makeCleanSkyEnv(renderer) {
    const c = document.createElement('canvas');
    c.width = 1024; c.height = 512;
    const ctx = c.getContext('2d');

    // 수직 그라디언트: 상단 밝은 흰 천장광 → 하단 연한 쿨 블루. (수평 색띠 없음)
    const v = ctx.createLinearGradient(0, 0, 0, c.height);
    v.addColorStop(0.00, '#ffffff');   // 천장광 (밝은 하늘)
    v.addColorStop(0.45, '#eaf4ff');   // 연한 하늘
    v.addColorStop(0.75, '#dcecff');   // 수면 쿨톤
    v.addColorStop(1.00, '#c2d8ee');   // 바닥 약간 짙은 쿨
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, c.width, c.height);

    // 가로로 아주 미세한 쿨 변화만(실버 반사 느낌) — 채도는 거의 0
    const h = ctx.createLinearGradient(0, 0, c.width, 0);
    h.addColorStop(0.00, 'rgba(210,230,255,0.0)');
    h.addColorStop(0.50, 'rgba(255,255,255,0.18)');
    h.addColorStop(1.00, 'rgba(210,230,255,0.0)');
    ctx.fillStyle = h;
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
    scene.environment = makeCleanSkyEnv(renderer);

    // AmbientLight 가 낮으면 그늘이 어두운 회색이 된다 → 밝은 흰색으로 올려 회색기 제거.
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));

    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(3, 5, 4);
    scene.add(key);

    // rim 을 시안(0x66ccff)으로 두면 유리에 푸른 회색기가 낀다 → 흰색 fill 로 그늘을 채운다.
    const rim = new THREE.DirectionalLight(0xffffff, 1.0);
    rim.position.set(-4, 1, -3);
    scene.add(rim);
}

/* 모델을 그룹 중앙에 정렬. size 를 반환해 카메라 fit 에 재사용 */
function centerModel(model, group, { flipY = true, rotationX = 0, rotationY = null, rotationZ = 0 } = {}) {
  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  model.position.sub(center);
  group.rotation.set(rotationX, rotationY ?? (flipY ? Math.PI : 0), rotationZ);
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

/* GLB 안 mesh 전부를 코드 기반으로 둥둥 움직이게 하는 데이터 구성.
   compact<1 이면 각 생물의 base 위치를 무리 중심(centroid)으로 당겨 조밀하게 모은다. */
function createFloatAnimation(root, compact = 1) {
  // 생물 무리 중심 — base 위치를 이 기준으로 압축
  const centroid = new THREE.Vector3();
  let count = 0;
  root.traverse((o) => { if (o.isMesh) { centroid.add(o.position); count += 1; } });
  if (count) centroid.divideScalar(count);

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
    // 무리 중심 기준으로 compact 만큼 당겨 조밀화 (compact=1 이면 원본 그대로)
    baseX.push(centroid.x + (object.position.x - centroid.x) * compact);
    baseY.push(centroid.y + (object.position.y - centroid.y) * compact);
    baseZ.push(centroid.z + (object.position.z - centroid.z) * compact);
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

function applyFloatAnimation(floatAnim, elapsed, transitionProgress, hoverPower = 0) {
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
    const hoverWave = elapsed * HOVER_WOBBLE_SPEED + offsets[i] * 1.7;
    const hoverX = Math.sin(hoverWave) * HOVER_WOBBLE_POS * hoverPower;
    const hoverY = Math.cos(hoverWave * 1.23) * HOVER_WOBBLE_POS * 0.75 * hoverPower;
    const hoverZ = Math.sin(hoverWave * 0.83 + swimPhase[i]) * HOVER_WOBBLE_POS * 0.45 * hoverPower;
    const hoverRot = Math.sin(hoverWave * 1.15 + swimPhase[i]) * HOVER_WOBBLE_ROT * hoverPower;
    const hoverYaw = Math.sin(hoverWave * 0.92 + offsets[i] * 0.5) * HOVER_WOBBLE_YAW * hoverPower;

    mesh.position.x = baseX[i] + scatterX[i] * easedScatter + swimX[i] * stroke * swimPower + hoverX;
    mesh.position.y = baseY[i] + bob + scatterY[i] * easedScatter + swimY[i] * stroke2 * swimPower + hoverY;
    mesh.position.z = baseZ[i] + scatterZ[i] * easedScatter + swimZ[i] * stroke * swimPower + hoverZ;
    mesh.rotation.x = baseRotX[i] + scatterRotX[i] * easedScatter + swimPitch[i] * stroke2 * swimPower + hoverRot * 0.55;
    mesh.rotation.y = baseRotY[i] + scatterRotY[i] * easedScatter + swimYaw[i] * stroke * swimPower + hoverYaw;
    mesh.rotation.z =
      baseRotZ[i] +
      Math.sin(elapsed * speeds[i] * 0.5 + offsets[i]) * FLOAT_ROTATION_Z +
      scatterRotZ[i] * easedScatter +
      swimRoll[i] * kick * swimPower +
      hoverRot;
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

  // 굴절 모드: 전용 매핑 비디오를 VideoTexture 로 받아 셰이더 굴절에 사용 (GLB 로드 전에 준비).
  if (STYLE.refract) {
    const videoEl = document.createElement('video');
    videoEl.src = REFRACT_VIDEO_SRC;
    videoEl.muted = true;
    videoEl.loop = true;
    videoEl.playsInline = true;
    videoEl.preload = 'auto';
    videoEl.autoplay = true;
    videoEl.setAttribute('aria-hidden', 'true');
    if (videoEl) {
      REFRACT.tex = new THREE.VideoTexture(videoEl);
      REFRACT.tex.colorSpace = THREE.SRGBColorSpace;
      const setVA = () => { if (videoEl.videoWidth) REFRACT.videoAspect = videoEl.videoWidth / videoEl.videoHeight; };
      setVA();
      videoEl.addEventListener('loadedmetadata', setVA);
      videoEl.play().catch((e) => console.warn('[logo3d] 매핑 비디오 재생 실패:', e));
    }
  }

  const footerVideo = document.querySelector('.footer__video-bg');
  let footerTexture = null;
  let footerVideoAspect = REFRACT.videoAspect;
  if (STYLE.refract && footerVideo) {
    footerTexture = new THREE.VideoTexture(footerVideo);
    footerTexture.colorSpace = THREE.SRGBColorSpace;
    const setFooterVA = () => {
      if (footerVideo.videoWidth) footerVideoAspect = footerVideo.videoWidth / footerVideo.videoHeight;
    };
    setFooterVA();
    footerVideo.addEventListener('loadedmetadata', setFooterVA);
    footerVideo.play().catch((e) => console.warn('[logo3d] footer 매핑 비디오 재생 실패:', e));
  }

  function syncTextBoxToHeroTitle() {
    const title = document.querySelector('.hero__title');
    if (!textEl || !title) return;
    const rect = title.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    textEl.style.setProperty('--logo3d-text-w', `${Math.ceil(rect.width * 1.34)}px`);
    textEl.style.setProperty('--logo3d-text-h', `${Math.ceil(rect.height * 1.29)}px`);
  }

  function measureOriginalSymbolRect() {
    const probe = document.createElement('div');
    probe.className = 'logo3d-wrap';
    probe.setAttribute('aria-hidden', 'true');
    probe.style.visibility = 'hidden';
    probe.style.pointerEvents = 'none';
    probe.style.zIndex = '-1';
    document.body.appendChild(probe);
    const rect = probe.getBoundingClientRect();
    probe.remove();
    return rect;
  }

  syncTextBoxToHeroTitle();
  const initialSymbolRect = wrap.getBoundingClientRect();

  Object.assign(wrap.style, {
    position: 'fixed',
    inset: '0',
    top: '0',
    left: '0',
    width: '100vw',
    height: '100vh',
    margin: '0',
    transform: 'none',
    transformOrigin: 'center center',
    zIndex: '900',
    pointerEvents: 'none',
    opacity: '1',
    filter: 'none',
  });
  if (textEl) {
    textEl.style.pointerEvents = 'none';
    textEl.style.opacity = '0';
  }

  /* =============================================================
     풀스크린 단일 캔버스 — 심볼/텍스트/배경 plane 모두 같은 Three scene
  ============================================================= */
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, premultipliedAlpha: false });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.25;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, profile.dprCap));
  renderer.domElement.style.cssText = 'width:100%;height:100%;display:block;';
  wrap.appendChild(renderer.domElement);

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0, 10);
  camera.lookAt(0, 0, 0);
  setupSceneEnv(scene, renderer);
  const symbolBackdrop = makeVideoBackdrop(REFRACT.tex, () => REFRACT.videoAspect);
  if (symbolBackdrop) scene.add(symbolBackdrop);
  const footerBackdrop = makeVideoBackdrop(footerTexture, () => footerVideoAspect);
  if (footerBackdrop) {
    footerBackdrop.visible = false;
    scene.add(footerBackdrop);
  }

  const logoGroup = new THREE.Group();
  const symGroup = new THREE.Group();
  const txtGroup = new THREE.Group();
  logoGroup.add(symGroup);
  logoGroup.add(txtGroup);
  scene.add(logoGroup);

  let mixer = null;
  let duration = 0;
  let floatAnim = null;
  let active = false;            // ScrollTrigger 활성(스크럽 구간)
  let footerProg = 0;            // footer 역방향 트랜지션 진행도 (0=헤더, 1=footer중앙 조립)
  let footerActive = false;      // footer ScrollTrigger 활성 여부
  let footerHold = false;        // footer 애니메이션 종료 후에도 로고 유지
  let needsRender = true;
  const requestRender = () => { needsRender = true; };
  let symbolSize = null;
  let textSize = null;
  let footerEl = null;
  let logoDocked = false;
  let hoverTarget = 0;
  let hoverPower = 0;
  const layout = {
    startSymbolRect: initialSymbolRect,
    textRect: null,
    slotRect: null,
  };

  function isFooterMode() {
    return footerActive || footerHold;
  }

  function viewportHeightAtZ(z = 0) {
    return 2 * Math.tan((camera.fov * Math.PI / 180) / 2) * Math.abs(camera.position.z - z);
  }

  function unitsPerPixel() {
    return viewportHeightAtZ(0) / Math.max(window.innerHeight, 1);
  }

  function screenToWorld(clientX, clientY, z = 0) {
    const upp = unitsPerPixel();
    return new THREE.Vector3(
      (clientX - window.innerWidth / 2) * upp,
      (window.innerHeight / 2 - clientY) * upp,
      z
    );
  }

  function centerOf(rect) {
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function fitGroupToRect(group, size, rect, padding = 1) {
    if (!group || !size || !rect || rect.width <= 0 || rect.height <= 0) return;
    const center = centerOf(rect);
    const world = screenToWorld(center.x, center.y);
    const upp = unitsPerPixel();
    const sx = (rect.width * upp) / Math.max(size.x, 0.0001);
    const sy = (rect.height * upp) / Math.max(size.y, 0.0001);
    const scale = Math.min(sx, sy) / padding;
    group.position.copy(world);
    group.scale.setScalar(scale);
  }

  function setGroupOpacity(group, opacity) {
    group.visible = opacity > 0.001;
    group.traverse((object) => {
      if (!object.isMesh || !object.material) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((mat) => {
        if (mat.userData.baseOpacity === undefined) mat.userData.baseOpacity = mat.opacity ?? 1;
        mat.opacity = mat.userData.baseOpacity * opacity;
        mat.transparent = true;
        mat.needsUpdate = true;
      });
    });
  }

  function applyTextFade() {
    const [a, b] = TEXT_FADE;
    const t = Math.min(Math.max((progress.v - a) / (b - a), 0), 1);
    setGroupOpacity(txtGroup, 1 - t);
  }

  function measureLayout() {
    syncTextBoxToHeroTitle();
    layout.startSymbolRect = measureOriginalSymbolRect();
    if (!layout.startSymbolRect.width) layout.startSymbolRect = initialSymbolRect;
    layout.textRect = textEl ? textEl.getBoundingClientRect() : null;
    layout.slotRect = slot.getBoundingClientRect();
  }

  function symbolRectForCurrentState() {
    if (!layout.startSymbolRect || !layout.slotRect) return null;
    const start = layout.startSymbolRect;
    const slotRect = layout.slotRect;
    const startCenter = centerOf(start);
    const slotCenter = centerOf(slotRect);
    let centerX = lerp(startCenter.x, slotCenter.x, progress.v);
    let centerY = lerp(startCenter.y, slotCenter.y, progress.v);
    let size = lerp(start.width, slotRect.width, progress.v);

    if (isFooterMode() && footerEl) {
      const footerRect = footerEl.getBoundingClientRect();
      const footerCenter = centerOf(footerRect);
      centerX = lerp(slotCenter.x, footerCenter.x, footerProg);
      centerY = lerp(slotCenter.y, footerCenter.y, footerProg);
      size = lerp(slotRect.width, start.width, footerProg);
 } 

    return {
      left: centerX - size / 2,
      top: centerY - size / 2,
      width: size,
      height: size,
    };
  }

  function updateObjectLayout() {
    if (symbolBackdrop) symbolBackdrop.visible = !isFooterMode();
    if (footerBackdrop) footerBackdrop.visible = isFooterMode();
    fitBackdrop(symbolBackdrop, camera, GLASS_BACKDROP_Z);
    fitBackdrop(footerBackdrop, camera, GLASS_BACKDROP_Z);
    updateBackdropUniforms(symbolBackdrop, wrap);
    updateBackdropUniforms(footerBackdrop, wrap);
    const symbolRect = symbolRectForCurrentState();
    if (symbolRect) fitGroupToRect(symGroup, symbolSize, symbolRect, SCATTER_PAD);
    if (layout.textRect) {
      const textRect = {
        left:   layout.textRect.left,
        top:    layout.textRect.top + layout.textRect.height * TEXT_Y_OFFSET_RATIO,
        width:  layout.textRect.width,
        height: layout.textRect.height,
      };
      fitGroupToRect(txtGroup, textSize, textRect, TEXT_PADDING);
    }
    applyTextFade();
  }

  function updateGlassEffectTime(elapsed) {
    txtGroup.traverse((object) => {
      if (!object.isMesh || !object.material) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((mat) => {
        if (mat.userData?.shader?.uniforms?.uTextTime) {
          mat.userData.shader.uniforms.uTextTime.value = elapsed;
        }
      });
    });
  }

  function updateHoverTarget(event) {
    if (logoDocked || isFooterMode() || !floatAnim) {
      hoverTarget = 0;
      return;
    }
    const r = symbolRectForCurrentState() || layout.startSymbolRect;
    hoverTarget =
      event.clientX >= r.left && event.clientX <= r.right &&
      event.clientY >= r.top && event.clientY <= r.bottom ? 1 : 0;
  }
  window.addEventListener('pointermove', updateHoverTarget, { passive: true });
  window.addEventListener('pointerleave', () => { hoverTarget = 0; }, { passive: true });

  function setLogoDocked(docked) {
    if (logoDocked === docked) return;
    logoDocked = docked;
    if (docked) hoverTarget = 0;
    document.body.classList.toggle('is-logo-at-header', docked);
    wrap.style.opacity = docked && !isFooterMode() ? '0' : '1';
    requestRender();
  }

  function syncLogoDockState() {
    setLogoDocked(!isFooterMode() && progress.v >= HEADER_DOCK_PROGRESS);
    if (isFooterMode()) wrap.style.opacity = '1';
  }

  function sizeRenderer() {
    const w = window.innerWidth || 1, h = window.innerHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    measureLayout();
    updateObjectLayout();
  }

  Promise.all([
    loader.loadAsync(SYMBOL_SRC),
    loader.loadAsync(TEXT_SRC),
  ]).then(([symbolGltf, textGltf]) => {
    const symbol = symbolGltf.scene;
    const text = textGltf.scene;

    symGroup.add(symbol);
    txtGroup.add(text);

    symbol.traverse((o) => {
      if (!o.isMesh) return;
      o.material = makePhysicalGlass(PHYSICAL_SYMBOL_GLASS);
      o.geometry.computeVertexNormals();
    });
    text.traverse((o) => {
      if (!o.isMesh) return;
      o.material = applyTextGlassLook(makePhysicalGlass(PHYSICAL_TEXT_GLASS, { doubleSide: true }));
      o.geometry.computeVertexNormals();
    });

    symbolSize = centerModel(symbol, symGroup, { flipY: false });
    textSize = centerModel(text, txtGroup);

    mixer = new THREE.AnimationMixer(symbol);
    symbolGltf.animations.forEach((clip) => {
      mixer.clipAction(clip).play();
      duration = Math.max(duration, clip.duration);
    });

    if (duration > 0) {
      const scatterBox = new THREE.Box3();
      for (let i = 0; i <= 40; i++) {
        mixer.setTime((i / 40) * duration);
        scatterBox.union(new THREE.Box3().setFromObject(symbol));
      }
      mixer.setTime(0);
      symbolSize = scatterBox.getSize(new THREE.Vector3());
    }

    floatAnim = createFloatAnimation(symbol, SYMBOL_COMPACT);
    sizeRenderer();
    requestRender();
  }).catch((e) => console.warn('[logo3d] 로고 로드 실패:', e));

  function tick() {
    requestAnimationFrame(tick);
    // footer 활성이면 그 progress, 아니면 첫 화면 progress 로 안무 구동
    const animP = isFooterMode() ? footerProg : progress.v;
    hoverPower += (hoverTarget - hoverPower) * 0.12;
    if (hoverPower < 0.001) hoverPower = 0;
    const shouldHover = !reduceMotion && hoverPower > 0 && floatAnim;
    const shouldFloat = !reduceMotion && animP < 0.98 && floatAnim;
    // 굴절 모드는 비디오 프레임이 계속 바뀌므로 idle 최적화를 건너뛰고 항상 렌더.
    if (!active && !isFooterMode() && !needsRender && !shouldFloat && !shouldHover && !STYLE.refract) return;

    const elapsed = performance.now() * 0.001;
    if (mixer && duration > 0) mixer.setTime(animP * duration);
    if (shouldFloat || shouldHover) applyFloatAnimation(floatAnim, elapsed, animP, hoverPower);
    updateGlassEffectTime(elapsed);
    updateObjectLayout();
    updateBackdropUniforms(symbolBackdrop, wrap);
    updateBackdropUniforms(footerBackdrop, wrap);
    renderer.render(scene, camera);
    if (!active && !isFooterMode() && !shouldFloat && !shouldHover && !STYLE.refract) needsRender = false;
  }
  tick();

  /* =============================================================
     ② 글자 캔버스 (.logo3d-text) — 위치/크기 고정, 정적 1회 렌더 + 페이드
  ============================================================= */
  if (textEl) {
    syncTextBoxToHeroTitle();
    if (document.fonts?.ready) {
      document.fonts.ready.then(() => {
        measureLayout();
        updateObjectLayout();
        requestRender();
      });
    }
  }

  /* progress → 글자 불투명도 (위치/크기는 CSS 고정, 페이드만) */
  applyTextFade();

  /* =============================================================
     ③ 헤더 슬롯 측정 + ScrollTrigger
  ============================================================= */
  let end = { dx: 0, dy: 0, scale: 1 };
  function measure() {
    measureLayout();
    const start = centerOf(layout.startSymbolRect);
    const s = centerOf(layout.slotRect);
    end = { dx: s.x - start.x, dy: s.y - start.y, scale: layout.slotRect.width / layout.startSymbolRect.width };
    updateObjectLayout();
  }

  if (reduceMotion || !gsap || !ScrollTrigger) {
    // 모션 줄이기/플러그인 부재 — 트랜지션 생략, 즉시 헤더 상태
    measure();
    progress.v = 1;
    applyTextFade();
    syncLogoDockState();
    updateObjectLayout();
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
          onUpdate: (self) => {
            progress.v = self.progress;
            applyTextFade();
            syncLogoDockState();
            requestRender();
          },
          onToggle: (self) => {
            active = self.isActive;
            document.body.classList.toggle('is-logo-transition', self.isActive);
            syncLogoDockState();
            requestRender();
          },
        },
      }).to(progress, { v: 1, ease: 'none', duration: 1 }, 0);

      /* --- footer 역방향 트랜지션: 헤더(작은 조립) → 흩어졌다 → footer 중앙(큰 조립) --- */
      footerEl = document.getElementById('footer');
      if (footerEl) {
        ScrollTrigger.create({
          trigger: '#footer',
          start: 'top center',     // footer 상단이 뷰 중앙에 올 때 시작 (그 전엔 헤더 유지)
          end: 'bottom bottom',    // footer 하단이 뷰 하단에 닿을 때 끝
          scrub: 0.5,
          invalidateOnRefresh: true,
          onRefreshInit: measure,
          onEnter: () => {
            footerHold = false;
          },
          onLeave: () => {
            footerProg = 1;
            footerHold = true;
            syncLogoDockState();
            updateObjectLayout();
            requestRender();
          },
          onEnterBack: () => {
            footerHold = true;
          },
          onLeaveBack: () => {
            footerProg = 0;
            footerHold = false;
            syncLogoDockState();
            updateObjectLayout();
            requestRender();
          },
          onUpdate: (self) => {
            footerProg = self.progress;
            syncLogoDockState();
            updateObjectLayout();
            requestRender();
          },
          onToggle: (self) => {
            footerActive = self.isActive;
            document.body.classList.toggle('is-logo-transition', self.isActive);
            syncLogoDockState();
            requestRender();
          },
        });
      }
    });
  }

  /* --- 리사이즈 (iOS 주소창 변동 포함) --- */
  let resizeRAF = null;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(resizeRAF);
    resizeRAF = requestAnimationFrame(() => {
      sizeRenderer();
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
