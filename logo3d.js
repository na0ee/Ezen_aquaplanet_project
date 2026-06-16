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
const LOGO_TINT   = 0xbfe9ff;       // 유리 살짝 아쿠아 틴트 (vivid 프리셋 글자색)
const ABBERATION  = 1.2;            // air.inc식 색수차 림 강도 (0=없음, 0.3~1.2 권장)

/* ---------------------------------------------------------------
   유리 룩 프리셋 — 한 줄(GLASS_STYLE)로 전환. 비교/되돌리기 쉽게.
     'vivid' : 처음 버전 — 무지개 화려 (비비드 오로라 환경맵 + 강한 iridescence/sheen)
     'clean' : 클린 버전 — 화이트-실버 (밝은 하늘 환경, air.inc 레퍼런스)
     'ice'   : 얼음 버전 — 아이스 블루 쿨 (차가운 블루 환경)
--------------------------------------------------------------- */
const GLASS_STYLE = 'glass';   // ← 'vivid' | 'clean' | 'ice' | 'glass'(굴절) 전환
const GLASS_PRESETS = {
  // ① 처음 버전 — 무지개 화려
  vivid: {
    envMode: 'aurora',                                                       // 비비드 무지개 환경맵
    symbol: { color: 0xeaf7ff, iridescence: 1.0,  sheen: 0.4,  envMapIntensity: 2.0, emissive: 0.24, opacity: 0.28 },
    text:   { color: LOGO_TINT, iridescence: 0.8, emissive: 0.10, opacity: 0.18 },
    rimGain: 1.3, edge: 1.2, lumAlpha: 0.04,
  },
  // ② 클린 버전 — 화이트-실버
  clean: {
    envMode: 'sky',                                                          // 흰색~연한 하늘 환경맵
    symbol: { color: 0xeaf7ff, iridescence: 0.45, sheen: 0.15, envMapIntensity: 1.6, emissive: 0.13, opacity: 0.28 },
    text:   { color: 0xeef8ff, iridescence: 0.4, emissive: 0.11, opacity: 0.18 },
    rimGain: 0.9, edge: 1.2, lumAlpha: 0.02,                                 // 클린은 밝은 흰 테두리 강조
  },
  // ③ 얼음 버전 — 아이스 블루 쿨
  ice: {
    envMode: 'ice',                                                          // 차가운 블루 환경맵
    symbol: { color: 0xcfe6ff, iridescence: 0.55, sheen: 0.2,  envMapIntensity: 1.9, emissive: 0.12, opacity: 0.28 },
    text:   { color: 0xd6ecff, iridescence: 0.5, emissive: 0.10, opacity: 0.18 },
    rimGain: 1.0, edge: 0.8, lumAlpha: 0.20,
  },
  // ④ 굴절 유리 — 배경 비디오를 스크린스페이스로 굴절 (air.inc 정석에 가장 근접)
  glass: {
    envMode: 'aurora',                                                          // 반사용 환경맵(흰 하늘)
    refract: true,                                                           // ★ 스크린스페이스 굴절 on
    refractAmt: 0.09,                                                        // 굴절 왜곡 강도 — 너무 높으면 모서리가 크리스탈처럼 쪼개짐
    refractMix: 0.92,                                                       // 배경 굴절 비중 (1.0=배경만, 낮을수록 유리색↑)
    waveAmt: 0.012,                                                         // 시간 기반 일렁임 — 메시 무관 부드러운 sine 출렁임 (움직임 강조)
    // opacity 낮춰 더 투명하게 — 뒤 배경이 비치고 굴절 배경이 겹쳐 맑은 유리감.
    symbol: { color: 0xffffff, iridescence: 0.3, sheen: 0.0, envMapIntensity: 1.2, emissive: 0.0, opacity: 0.6},
    text:   { color: 0xeef8ff, iridescence: 0.4, emissive: 0.12, opacity: 0.2 },   // 글자는 반사 모드
    rimGain: 0.5, edge: 0.6, lumAlpha: 0.06,                                 // lumAlpha 낮춰 내부 투과 유지
  },
};
const STYLE = GLASS_PRESETS[GLASS_STYLE];
/* 굴절 모드용 공유 상태 — VideoTexture + 매 프레임 갱신할 셰이더 목록 */
const REFRACT = { tex: null, shaders: [], videoAspect: 16 / 9, refractAmt: STYLE.refractAmt ?? 0.07, refractMix: STYLE.refractMix ?? 0.9, waveAmt: STYLE.waveAmt ?? 0.0 };
const FLOAT_AMPLITUDE = 0.03;        // 생물별 위아래 둥둥 범위
const FLOAT_SPEED = 0.85;            // 기본 둥둥 속도
const FLOAT_OFFSET_STEP = 0.7;       // 생물별 파동 시간차
const FLOAT_ROTATION_Z = 0.04;       // 미세 회전 범위
const CODE_SCATTER_STRENGTH = 0.52;  // 스크롤 중간에서 바깥으로 퍼지는 정도
const CODE_SCATTER_Z = 0.16;         // 앞뒤 깊이감
const CODE_SCATTER_ROT = 0.22;       // 흩어질 때 추가 회전
const SWIM_SWAY_X = 0.3;             // 헤엄칠 때 좌우 물살 이동
const SWIM_SWAY_Y = 0.07;             // 헤엄칠 때 위아래 추진감
const SWIM_DEPTH = 0.08;              // 헤엄칠 때 앞뒤 깊이 변화
const SWIM_PITCH = 0.28;              // 헤엄칠 때 고개 드는 회전
const SWIM_YAW = 0.34;                // 헤엄칠 때 좌우 방향 전환
const SWIM_ROLL = 0.18;               // 헤엄칠 때 몸통 롤링
const SYMBOL_COMPACT = 1.0;           // 생물 조밀도 (1=원본 배치, <1=무리 중심으로 모임)

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
function applyChromaticRim(mat, strength = ABBERATION, sheen = 0.0, rimGain = STYLE.rimGain, edge = STYLE.edge, lumAlpha = STYLE.lumAlpha, allowRefract = true) {
  // 굴절은 심볼 캔버스만 (글자는 별도 캔버스/위치라 화면 매핑이 달라 제외).
  const useRefract = !!STYLE.refract && allowRefract;
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uAbberation = { value: strength };
    shader.uniforms.uSheen = { value: sheen };
    shader.uniforms.uRimGain = { value: rimGain };
    shader.uniforms.uEdge = { value: edge };
    shader.uniforms.uLumAlpha = { value: lumAlpha };

    // 굴절 모드: 비디오 텍스처 + 화면 매핑 uniform. 매 프레임 tick 에서 갱신.
    if (useRefract) {
      shader.uniforms.uRefractTex = { value: REFRACT.tex };
      shader.uniforms.uRectMin    = { value: new THREE.Vector2(0, 0) };
      shader.uniforms.uRectSize   = { value: new THREE.Vector2(1, 1) };
      shader.uniforms.uViewport   = { value: new THREE.Vector2(1, 1) };
      shader.uniforms.uCanvasPx   = { value: new THREE.Vector2(1, 1) };
      shader.uniforms.uVideoAspect= { value: 16 / 9 };
      shader.uniforms.uRefractAmt = { value: REFRACT.refractAmt };
      shader.uniforms.uRefractMix = { value: REFRACT.refractMix };
      shader.uniforms.uTime       = { value: 0 };
      shader.uniforms.uWaveAmt    = { value: REFRACT.waveAmt };
      shader.uniforms.uFooterLift = { value: 0 };   // footer 트랜지션 시 어두운 배경 보정 밝기
      REFRACT.shaders.push(shader);
    }

    let header = `uniform float uAbberation;
         uniform float uSheen;
         uniform float uRimGain;
         uniform float uEdge;
         uniform float uLumAlpha;`;
    if (useRefract) header += `
         uniform sampler2D uRefractTex;
         uniform vec2 uRectMin;
         uniform vec2 uRectSize;
         uniform vec2 uViewport;
         uniform vec2 uCanvasPx;
         uniform float uVideoAspect;
         uniform float uRefractAmt;
         uniform float uRefractMix;
         uniform float uTime;
         uniform float uWaveAmt;
         uniform float uFooterLift;`;

    // 굴절 코드: 화면좌표 → 비디오 cover UV → 노멀 왜곡 → 배경 샘플로 베이스 교체.
    const refractCode = useRefract ? `
         vec2 _px = gl_FragCoord.xy / uCanvasPx;
         _px.y = 1.0 - _px.y;                                  // gl_FragCoord 는 y-up → 화면 y-down 보정
         // 화면 위(0)→비디오 텍스처 v=1 이므로 v 반전 (이게 빠지면 배경이 상하 뒤집혀 어긋난다).
         vec2 _screen = (uRectMin + _px * uRectSize) / uViewport;
         vec2 _uv = vec2(_screen.x, 1.0 - _screen.y);
         float _sa = uViewport.x / uViewport.y;                // cover: 비디오 비율을 화면에 맞춤
         if (_sa > uVideoAspect) { float s = uVideoAspect / _sa; _uv.y = (_uv.y - 0.5) * s + 0.5; }
         else                    { float s = _sa / uVideoAspect; _uv.x = (_uv.x - 0.5) * s + 0.5; }
         // 시간 기반 sine 일렁임 — 메시 모서리와 무관한 부드러운 출렁임(움직임 강조, 각짐 없음)
         vec2 _wave = vec2(sin(_uv.y * 14.0 + uTime * 1.4),
                           cos(_uv.x * 14.0 + uTime * 1.1)) * uWaveAmt;
         vec2 _refr = _uv + nrm.xy * uRefractAmt + _wave;      // 노멀 굴절 + 시간 일렁임
         vec3 _bg = texture2D(uRefractTex, _refr).rgb;
         outgoingLight = mix(outgoingLight, _bg, uRefractMix); // 배경 굴절을 유리 베이스로
         outgoingLight += vec3(1.0) * uFooterLift;             // footer 어두운 배경 보정 밝기
    ` : '';

    shader.fragmentShader = shader.fragmentShader
      .replace('void main() {', header + `
         void main() {`)
      .replace(
        '#include <opaque_fragment>',
        `// fresnel: 시선과 노멀의 각도차가 클수록(가장자리) 1에 가까움.
         vec3 nrm = normalize(normal);
         float dotNV = clamp(dot(nrm, normalize(vViewPosition)), 0.0, 1.0);
         ${refractCode}
         float fresnel = pow(1.0 - dotNV, 2.5);
         // fresnel 을 hue(색상환)에 매핑해 가장자리를 프리즘 무지개로 분광.
         float hue = fresnel * uAbberation;
         vec3 rainbow = 0.5 + 0.5 * cos(6.28318 * (hue + vec3(0.0, 0.33, 0.67)));
         outgoingLight += rainbow * fresnel * uAbberation * uRimGain;
         // ② 표면 무지개 시트 — 노멀 x/y 방향을 색상환에 매핑.
         if (uSheen > 0.001) {
           float band = nrm.x * 0.6 + nrm.y * 0.4;
           vec3 sheenCol = 0.5 + 0.5 * cos(6.28318 * (band * 1.5 + vec3(0.0, 0.33, 0.67)));
           outgoingLight += (sheenCol - 0.5) * uSheen * 2.0;
         }
         // ③ air.inc식 밝은 외곽 테두리 — 가장자리에서 흰색을 강하게 가산.
         float edgeF = pow(1.0 - dotNV, 3.5);
         outgoingLight += vec3(1.0) * edgeF * uEdge;
         #include <opaque_fragment>
         // 밝기-알파 연동: 밝은 곳=불투명, 어두운 내부=투명(배경 비침).
         float _lum = max(max(gl_FragColor.r, gl_FragColor.g), gl_FragColor.b);
         gl_FragColor.a = clamp(gl_FragColor.a + _lum * uLumAlpha + edgeF * uEdge * 0.9, 0.0, 1.0);`
      );
  };
  // 셰이더 캐시 충돌 방지 (조합별로 구분)
  mat.customProgramCacheKey = () => 'chromaticRim_' + strength + '_' + sheen + '_' + rimGain + '_' + edge + '_' + lumAlpha + '_' + useRefract;
}

/* 심볼 전용 유리 재질 — 굴절 대신 반사/클리어코트로 안정적인 유리감.
   글자보다 화려하게: iridescence 최대 + 넓은 박막두께 + 색수차 개별 상향. */
function makeSymbolGlass(profile) {
  const mat = new THREE.MeshPhysicalMaterial({
    // 회색기 제거: 짙은 하늘 틴트(LOGO_TINT) 대신 거의 흰 유리로 두고
    // 색은 iridescence/색수차가 만들게 → 채도 높은 무지개가 주도한다.
    // 프리셋별 심볼 유리 틴트 (clean/vivid=거의 흰색, ice=아이스 블루)
    color: new THREE.Color(STYLE.symbol.color),
    // 밝은 배경 위에서 평면 메시 반사가 약해 유리가 어두운 청회색으로 가라앉는다.
    // 약한 자가발광으로 베이스 밝기를 끌어올려 유리가 배경 위로 떠 보이게 한다.
    emissive: new THREE.Color(STYLE.symbol.color),
    emissiveIntensity: STYLE.symbol.emissive,
    metalness: 0.02,
    roughness: profile.level === 'high' ? 0.04 : 0.08,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
    ior: 1.52,
    transparent: true,
    // base opacity (프리셋별). 반사 모드는 낮게(배경 비침), 굴절 모드는 높게(굴절 배경 그림).
    opacity: STYLE.symbol.opacity,
    // 톤매핑을 껐으므로 envMapIntensity 로 반사 강도 제어 (프리셋별).
    envMapIntensity: STYLE.symbol.envMapIntensity,
    side: THREE.FrontSide,
    depthWrite: false,
    // 박막 간섭 무지개 — 프리셋별 강도 (clean=절제, vivid=최대).
    iridescence: STYLE.symbol.iridescence,
    iridescenceIOR: 1.4,
    iridescenceThicknessRange: [100, 800],
  });
  // 심볼: 색수차 1.5배 + 표면 무지개 시트(프리셋별 sheen) — 평면 메시도 색이 흐르게.
  applyChromaticRim(mat, ABBERATION * 1.5, STYLE.symbol.sheen);
  return mat;
}

/* 글자 유리 재질 (단독 캔버스: 굴절 없이 reflective 방식) */
function makeGlass(profile, { doubleSide = false } = {}) {
  const side = doubleSide ? THREE.DoubleSide : THREE.FrontSide;
  const mat = new THREE.MeshPhysicalMaterial({
    // 프리셋별 글자색 (clean=화이트, vivid=아쿠아 틴트)
    color: new THREE.Color(STYLE.text.color),
    // 밝은 배경 위에서 어두워지지 않게 약한 자가발광으로 베이스 밝기 보강
    emissive: new THREE.Color(STYLE.text.color),
    emissiveIntensity: STYLE.text.emissive,
    metalness: 0,
    roughness: profile.level === 'high' ? 0.06 : 0.10,
    clearcoat: 1,
    clearcoatRoughness: 0.06,
    ior: 1.4,
    transparent: true,
    // base opacity (프리셋별)
    opacity: STYLE.text.opacity,
    side,
    depthWrite: false,
    envMapIntensity: 1.3,
    // 박막 간섭 무지개 (transmission/envMap 없이 동작) — 프리셋별 강도
    iridescence: STYLE.text.iridescence,
    iridescenceIOR: 1.3,
    iridescenceThicknessRange: [120, 420],
  });
  // 글자는 굴절 제외(allowRefract=false) — 별도 캔버스라 화면 매핑이 심볼과 다름.
  applyChromaticRim(mat, ABBERATION, 0.0, STYLE.rimGain, STYLE.edge, STYLE.lumAlpha, false);
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
    // 흰색 비중을 높여 반사가 밝고 화이트하게(회색기 제거). 하단 어둠도 옅게.
    const v = ctx.createLinearGradient(0, 0, 0, c.height);
    v.addColorStop(0.00, 'rgba(255,255,255,0.62)');
    v.addColorStop(0.45, 'rgba(255,255,255,0.12)');
    v.addColorStop(1.00, 'rgba(40,70,110,0.32)');
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

/* 얼음 환경맵 — 차가운 아이스 블루. 흰색 천장광 → 시안/얼음 블루 → 진한 쿨 블루.
   clean 보다 블루를 강하게 둬서 반사가 푸른 얼음처럼 보인다. */
function makeIceEnv(renderer) {
    const c = document.createElement('canvas');
    c.width = 1024; c.height = 512;
    const ctx = c.getContext('2d');

    // 수직 그라디언트: 차가운 블루 위주
    const v = ctx.createLinearGradient(0, 0, 0, c.height);
    v.addColorStop(0.00, '#ffffff');   // 천장광 (밝은 빙면)
    v.addColorStop(0.38, '#d4f0ff');   // 연한 아이스
    v.addColorStop(0.68, '#9fd4f5');   // 아이스 블루
    v.addColorStop(1.00, '#5d9fd6');   // 깊은 쿨 블루
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, c.width, c.height);

    // 가로로 차가운 시안 하이라이트 띠 (얼음 반짝임)
    const h = ctx.createLinearGradient(0, 0, c.width, 0);
    h.addColorStop(0.00, 'rgba(180,225,255,0.0)');
    h.addColorStop(0.30, 'rgba(225,248,255,0.30)');
    h.addColorStop(0.55, 'rgba(160,215,250,0.10)');
    h.addColorStop(0.80, 'rgba(225,248,255,0.30)');
    h.addColorStop(1.00, 'rgba(180,225,255,0.0)');
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
    // 프리셋별 환경맵 선택 (sky=흰 하늘, aurora=비비드 무지개, ice=아이스 블루)
    scene.environment =
        STYLE.envMode === 'aurora' ? makeAuroraEnv(renderer)
      : STYLE.envMode === 'ice'    ? makeIceEnv(renderer)
      : makeCleanSkyEnv(renderer);

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

  // 굴절 모드: 배경 비디오를 VideoTexture 로 받아 셰이더 굴절에 사용 (GLB 로드 전에 준비).
  if (STYLE.refract) {
    const videoEl = hero.querySelector('video');
    if (videoEl) {
      REFRACT.tex = new THREE.VideoTexture(videoEl);
      REFRACT.tex.colorSpace = THREE.SRGBColorSpace;
      const setVA = () => { if (videoEl.videoWidth) REFRACT.videoAspect = videoEl.videoWidth / videoEl.videoHeight; };
      setVA();
      videoEl.addEventListener('loadedmetadata', setVA);
    }
  }

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
  let footerProg = 0;            // footer 역방향 트랜지션 진행도 (0=헤더, 1=footer중앙 조립)
  let footerActive = false;      // footer ScrollTrigger 활성 여부
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
    symbol.traverse((o) => {
      if (!o.isMesh) return;
      o.material = makeSymbolGlass(profile);
      // 저폴리(simplify된) 메시의 각진 면 노멀을 평균내 매끄럽게 → 굴절이 크리스탈처럼
      // 쪼개지지 않고 부드럽게 흐른다.
      o.geometry.computeVertexNormals();
    });
    centerModel(symbol, symGroup, { flipY: false });
    floatAnim = createFloatAnimation(symbol, SYMBOL_COMPACT);

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

  // 굴절 모드: 매 프레임 캔버스의 화면상 위치(GSAP transform 포함)를 셰이더에 전달.
  const _tmpRect = () => wrap.getBoundingClientRect();
  function updateRefractUniforms() {
    if (!STYLE.refract || !REFRACT.tex || !REFRACT.shaders.length) return;
    const r = _tmpRect();
    const vw = window.innerWidth, vh = window.innerHeight;
    const cpx = renderer.domElement.width, cpy = renderer.domElement.height;
    for (const sh of REFRACT.shaders) {
      sh.uniforms.uRefractTex.value = REFRACT.tex;
      sh.uniforms.uRectMin.value.set(r.left, r.top);
      sh.uniforms.uRectSize.value.set(r.width, r.height);
      sh.uniforms.uViewport.value.set(vw, vh);
      sh.uniforms.uCanvasPx.value.set(cpx, cpy);
      sh.uniforms.uVideoAspect.value = REFRACT.videoAspect;
      sh.uniforms.uTime.value = performance.now() * 0.001;
      // footer 트랜지션이 진행될수록 밝기 보강 (어두운 footer 배경/심해 굴절 보정)
      sh.uniforms.uFooterLift.value = footerActive ? footerProg * 0.28 : 0.1;
    }
  }

  function tick() {
    requestAnimationFrame(tick);
    // footer 활성이면 그 progress, 아니면 첫 화면 progress 로 안무 구동
    const animP = footerActive ? footerProg : progress.v;
    const shouldFloat = !reduceMotion && animP < 0.98 && floatAnim;
    // 굴절 모드는 비디오 프레임이 계속 바뀌므로 idle 최적화를 건너뛰고 항상 렌더.
    if (!active && !footerActive && !needsRender && !shouldFloat && !STYLE.refract) return;

    const elapsed = performance.now() * 0.001;
    if (mixer && duration > 0) mixer.setTime(animP * duration);
    if (shouldFloat) applyFloatAnimation(floatAnim, elapsed, animP);
    updateRefractUniforms();
    renderer.render(scene, camera);
    if (!active && !footerActive && !shouldFloat && !STYLE.refract) needsRender = false;
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
    textEl.style.setProperty('--logo3d-text-w', `${Math.ceil(rect.width * 1.42)}px`);
    textEl.style.setProperty('--logo3d-text-h', `${Math.ceil(rect.height * 1.36)}px`);
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
    // 낮은 fov(망원) — 와이드한 글자의 양 끝 원근 왜곡(옆면 보임·휘어짐)을 줄여 평평하게.
    textCamera = new THREE.PerspectiveCamera(18, 1, 0.1, 100);
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
      const isTicketPage = document.querySelector('.ticket-page') !== null;
      const scrollerEl = isTicketPage ? '.ticket-page' : window;

      gsap.timeline({
        scrollTrigger: {
          trigger: '#sec-logo',
          scroller: scrollerEl,
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

      /* --- footer 역방향 트랜지션: 헤더(작은 조립) → 흩어졌다 → footer 중앙(큰 조립) --- */
      const footerEl = document.querySelector('.ticket-scroll-below__logo-placeholder') || document.getElementById('footer');
      if (footerEl) {
        // transform 없는 wrap 의 화면상 중앙 (fixed 라 스크롤 무관, resize 시 갱신)
        let wrapCx0 = 0, wrapCy0 = 0;
        function measureWrapCenter() {
          const prev = wrap.style.transform;
          wrap.style.transform = 'none';
          const l = wrap.getBoundingClientRect();
          wrap.style.transform = prev;
          wrapCx0 = l.left + l.width / 2;
          wrapCy0 = l.top + l.height / 2;
        }
        measureWrapCenter();
        ScrollTrigger.create({
          trigger: footerEl,
          scroller: scrollerEl,
          start: 'top center',     // footer 상단이 뷰 중앙에 올 때 시작 (그 전엔 헤더 유지)
          end: 'bottom bottom',    // footer 하단이 뷰 하단에 닿을 때 끝
          scrub: 0.5,
          invalidateOnRefresh: true,
          onRefreshInit: measureWrapCenter,
          onUpdate: (self) => {
            footerProg = self.progress;
            footerActive = self.progress > 0;
            // footer 의 실시간 화면 중앙으로 향하는 이동량
            const f = footerEl.getBoundingClientRect();
            const fdx = (f.left + f.width / 2) - wrapCx0;
            const fdy = (f.top + f.height / 2) - wrapCy0;
            // 헤더(end) → footer중앙 으로 보간. scale 은 헤더(작은) → 1(원본 크게).
            const p = footerProg;
            const tx = end.dx + (fdx - end.dx) * p;
            const ty = end.dy + (fdy - end.dy) * p;
            const ts = end.scale + (1 - end.scale) * p;
            gsap.set(wrap, { x: tx, y: ty, scale: ts });
            requestRender();
          },
          onToggle: (self) => {
            document.body.classList.toggle('is-logo-transition', self.isActive);
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
