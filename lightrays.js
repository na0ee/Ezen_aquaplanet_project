// ============================================================================
//  LightRays — React Bits(https://reactbits.dev/backgrounds/light-rays)
//  의 WebGL god-ray 효과를 바닐라 JS로 포팅한 버전.
//
//  사용법:
//    import { initLightRays } from './lightrays.js';
//    const destroy = initLightRays(container, { raysColor: '#00ffff', ... });
//    // 페이지를 떠날 때 destroy() 를 호출하면 자원이 정리됩니다.
//
//  의존성(ogl)은 번들러 없이도 동작하도록 CDN ESM 에서 직접 불러옵니다.
// ============================================================================
import { Renderer, Program, Triangle, Mesh } from 'https://cdn.jsdelivr.net/npm/ogl@1.0.11/+esm';

const DEFAULT_COLOR = '#ffffff';

const hexToRgb = (hex) => {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m
    ? [parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255]
    : [1, 1, 1];
};

const getAnchorAndDir = (origin, w, h) => {
  const outside = 0.2;
  switch (origin) {
    case 'top-left':
      return { anchor: [0, -outside * h], dir: [0, 1] };
    case 'top-right':
      return { anchor: [w, -outside * h], dir: [0, 1] };
    case 'left':
      return { anchor: [-outside * w, 0.5 * h], dir: [1, 0] };
    case 'right':
      return { anchor: [(1 + outside) * w, 0.5 * h], dir: [-1, 0] };
    case 'bottom-left':
      return { anchor: [0, (1 + outside) * h], dir: [0, -1] };
    case 'bottom-center':
      return { anchor: [0.5 * w, (1 + outside) * h], dir: [0, -1] };
    case 'bottom-right':
      return { anchor: [w, (1 + outside) * h], dir: [0, -1] };
    default: // 'top-center'
      return { anchor: [0.5 * w, -outside * h], dir: [0, 1] };
  }
};

const vert = /* glsl */ `
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}`;

const frag = /* glsl */ `precision highp float;

uniform float iTime;
uniform vec2  iResolution;

uniform vec2  rayPos;
uniform vec2  rayDir;
uniform vec3  raysColor;
uniform float raysSpeed;
uniform float lightSpread;
uniform float rayLength;
uniform float pulsating;
uniform float fadeDistance;
uniform float saturation;
uniform vec2  mousePos;
uniform float mouseInfluence;
uniform float noiseAmount;
uniform float distortion;
uniform float uIntensity;   // 전체 광선 밝기 배율 (맥에서 너무 밝아 낮출 때 사용)

varying vec2 vUv;

float noise(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

float rayStrength(vec2 raySource, vec2 rayRefDirection, vec2 coord,
                  float seedA, float seedB, float speed) {
  vec2 sourceToCoord = coord - raySource;
  vec2 dirNorm = normalize(sourceToCoord);
  float cosAngle = dot(dirNorm, rayRefDirection);

  float distortedAngle = cosAngle + distortion * sin(iTime * 2.0 + length(sourceToCoord) * 0.01) * 0.2;

  float spreadFactor = pow(max(distortedAngle, 0.0), 1.0 / max(lightSpread, 0.001));

  float distance = length(sourceToCoord);
  float maxDistance = iResolution.x * rayLength;
  float lengthFalloff = clamp((maxDistance - distance) / maxDistance, 0.0, 1.0);

  float fadeFalloff = clamp((iResolution.x * fadeDistance - distance) / (iResolution.x * fadeDistance), 0.5, 1.0);
  float pulse = pulsating > 0.5 ? (0.8 + 0.2 * sin(iTime * speed * 3.0)) : 1.0;

  float baseStrength = clamp(
    (0.45 + 0.15 * sin(distortedAngle * seedA + iTime * speed)) +
    (0.3 + 0.2 * cos(-distortedAngle * seedB + iTime * speed)),
    0.0, 1.0
  );

  return baseStrength * lengthFalloff * fadeFalloff * spreadFactor * pulse;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 coord = vec2(fragCoord.x, iResolution.y - fragCoord.y);

  vec2 finalRayDir = rayDir;
  if (mouseInfluence > 0.0) {
    vec2 mouseScreenPos = mousePos * iResolution.xy;
    vec2 mouseDirection = normalize(mouseScreenPos - rayPos);
    finalRayDir = normalize(mix(rayDir, mouseDirection, mouseInfluence));
  }

  vec4 rays1 = vec4(1.0) *
               rayStrength(rayPos, finalRayDir, coord, 36.2214, 21.11349,
                           1.5 * raysSpeed);
  vec4 rays2 = vec4(1.0) *
               rayStrength(rayPos, finalRayDir, coord, 22.3991, 18.0234,
                           1.1 * raysSpeed);

  // 광선의 밝기(강도)만 스칼라로 계산 — 채널을 어둡게 만드는 틴트를 제거해
  // 어떤 부분도 검게 깔리지 않도록 한다.
  float intensity = rays1.x * 0.5 + rays2.x * 0.4;

  if (noiseAmount > 0.0) {
    float n = noise(coord * 0.01 + iTime * 0.1);
    intensity *= (1.0 - noiseAmount + noiseAmount * n);
  }

  intensity *= uIntensity;               // 전체 밝기 배율
  intensity = clamp(intensity, 0.0, 1.0);

  // rgb 는 항상 광선 색(흰색)으로 두고, 강도는 알파로만 표현한다.
  // 이렇게 하면 강도가 낮은 곳은 단순히 투명해질 뿐 배경을 어둡게 만들지 않는다.
  fragColor = vec4(raysColor, intensity);
}

void main() {
  vec4 color;
  mainImage(color, gl_FragCoord.xy);
  gl_FragColor = color;
}`;

/**
 * 컨테이너 엘리먼트 안에 LightRays 캔버스를 생성하고 애니메이션을 시작합니다.
 * @param {HTMLElement} container - 광선을 렌더링할 컨테이너(position: relative/absolute 권장)
 * @param {Object} [options] - React 컴포넌트와 동일한 옵션들
 * @returns {() => void} 자원을 정리하는 destroy 함수
 */
export function initLightRays(container, options = {}) {
  if (!container) {
    console.warn('initLightRays: container 엘리먼트를 찾을 수 없습니다.');
    return () => {};
  }

  const {
    raysOrigin = 'top-center',
    raysColor = DEFAULT_COLOR,
    raysSpeed = 1,
    lightSpread = 1,
    rayLength = 2,
    pulsating = false,
    fadeDistance = 1.0,
    saturation = 1.0,
    followMouse = true,
    mouseInfluence = 0.1,
    noiseAmount = 0.0,
    distortion = 0.0,
    intensity = 1.0,
  } = options;

  const mouse = { x: 0.5, y: 0.5 };
  const smoothMouse = { x: 0.5, y: 0.5 };

  let renderer = null;
  let mesh = null;
  let uniforms = null;
  let animationId = null;
  let isVisible = false;
  let started = false;

  const renderer_dpr = () => Math.min(window.devicePixelRatio || 1, 2);

  const updatePlacement = () => {
    if (!renderer) return;
    renderer.dpr = renderer_dpr();

    const wCSS = container.clientWidth;
    const hCSS = container.clientHeight;
    renderer.setSize(wCSS, hCSS);

    const dpr = renderer.dpr;
    const w = wCSS * dpr;
    const h = hCSS * dpr;

    uniforms.iResolution.value = [w, h];

    const { anchor, dir } = getAnchorAndDir(raysOrigin, w, h);
    uniforms.rayPos.value = anchor;
    uniforms.rayDir.value = dir;
  };

  const loop = (t) => {
    if (!renderer || !uniforms || !mesh) return;

    uniforms.iTime.value = t * 0.001;

    if (followMouse && mouseInfluence > 0.0) {
      const smoothing = 0.92;
      smoothMouse.x = smoothMouse.x * smoothing + mouse.x * (1 - smoothing);
      smoothMouse.y = smoothMouse.y * smoothing + mouse.y * (1 - smoothing);
      uniforms.mousePos.value = [smoothMouse.x, smoothMouse.y];
    }

    try {
      renderer.render({ scene: mesh });
      animationId = requestAnimationFrame(loop);
    } catch (error) {
      console.warn('WebGL rendering error:', error);
    }
  };

  const handleMouseMove = (e) => {
    if (!renderer) return;
    const rect = container.getBoundingClientRect();
    mouse.x = (e.clientX - rect.left) / rect.width;
    mouse.y = (e.clientY - rect.top) / rect.height;
  };

  const start = () => {
    if (started) return;
    started = true;

    renderer = new Renderer({ dpr: renderer_dpr(), alpha: true, premultipliedAlpha: false });
    const gl = renderer.gl;
    gl.canvas.style.width = '100%';
    gl.canvas.style.height = '100%';

    while (container.firstChild) container.removeChild(container.firstChild);
    container.appendChild(gl.canvas);

    uniforms = {
      iTime: { value: 0 },
      iResolution: { value: [1, 1] },
      rayPos: { value: [0, 0] },
      rayDir: { value: [0, 1] },
      raysColor: { value: hexToRgb(raysColor) },
      raysSpeed: { value: raysSpeed },
      lightSpread: { value: lightSpread },
      rayLength: { value: rayLength },
      pulsating: { value: pulsating ? 1.0 : 0.0 },
      fadeDistance: { value: fadeDistance },
      saturation: { value: saturation },
      mousePos: { value: [0.5, 0.5] },
      mouseInfluence: { value: mouseInfluence },
      noiseAmount: { value: noiseAmount },
      distortion: { value: distortion },
      uIntensity: { value: intensity },
    };

    const geometry = new Triangle(gl);
    const program = new Program(gl, { vertex: vert, fragment: frag, uniforms });
    mesh = new Mesh(gl, { geometry, program });

    window.addEventListener('resize', updatePlacement);
    if (followMouse) window.addEventListener('mousemove', handleMouseMove);

    updatePlacement();
    animationId = requestAnimationFrame(loop);
  };

  const stop = () => {
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
    window.removeEventListener('resize', updatePlacement);
    window.removeEventListener('mousemove', handleMouseMove);

    if (renderer) {
      try {
        const canvas = renderer.gl.canvas;
        const loseContextExt = renderer.gl.getExtension('WEBGL_lose_context');
        if (loseContextExt) loseContextExt.loseContext();
        if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
      } catch (error) {
        console.warn('Error during WebGL cleanup:', error);
      }
    }
    renderer = null;
    mesh = null;
    uniforms = null;
    started = false;
  };

  // 화면에 보일 때만 렌더링하여 자원을 아낍니다(React 버전의 IntersectionObserver 동작 포팅).
  const observer = new IntersectionObserver(
    (entries) => {
      isVisible = entries[0].isIntersecting;
      if (isVisible) start();
      else stop();
    },
    { threshold: 0.1 }
  );
  observer.observe(container);

  // destroy 함수
  return () => {
    observer.disconnect();
    stop();
  };
}
