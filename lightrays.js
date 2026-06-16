/* =============================================================
   AQUA PLANET — lightrays.js
   React Bits <LightRays /> 컴포넌트를 바닐라 JS로 포팅 (ogl + WebGL)
   셰이더는 원본 그대로. 컨테이너 요소 + 옵션으로 초기화.

   사용: HTML에 <div class="light-rays-container" data-light-rays
         data-rays-origin="top-center" data-rays-color="#ffffff" ...></div>
   를 두면 DOMContentLoaded 시 자동 초기화됩니다.
   ============================================================= */

import { Renderer, Program, Triangle, Mesh } from 'ogl';

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
    default: // "top-center"
      return { anchor: [0.5 * w, -outside * h], dir: [0, 1] };
  }
};

const VERT = `
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}`;

const FRAG = `precision highp float;

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

  fragColor = rays1 * 0.5 + rays2 * 0.4;

  if (noiseAmount > 0.0) {
    float n = noise(coord * 0.01 + iTime * 0.1);
    fragColor.rgb *= (1.0 - noiseAmount + noiseAmount * n);
  }

  float brightness = 1.0 - (coord.y / iResolution.y);
  fragColor.x *= 0.1 + brightness * 0.8;
  fragColor.y *= 0.3 + brightness * 0.6;
  fragColor.z *= 0.5 + brightness * 0.5;

  if (saturation != 1.0) {
    float gray = dot(fragColor.rgb, vec3(0.299, 0.587, 0.114));
    fragColor.rgb = mix(vec3(gray), fragColor.rgb, saturation);
  }

  fragColor.rgb *= raysColor;
}

void main() {
  vec4 color;
  mainImage(color, gl_FragCoord.xy);
  gl_FragColor  = color;
}`;

/**
 * 컨테이너 요소에 LightRays 효과를 마운트한다.
 * @returns {() => void} cleanup 함수
 */
export function initLightRays(container, options = {}) {
  const opts = {
    raysOrigin: 'top-center',
    raysColor: DEFAULT_COLOR,
    raysSpeed: 1,
    lightSpread: 1,
    rayLength: 2,
    pulsating: false,
    fadeDistance: 1.0,
    saturation: 1.0,
    followMouse: true,
    mouseInfluence: 0.1,
    noiseAmount: 0.0,
    distortion: 0.0,
    ...options
  };

  let renderer = null;
  let uniforms = null;
  let mesh = null;
  let animationId = null;
  let webglCleanup = null;
  const mouse = { x: 0.5, y: 0.5 };
  const smoothMouse = { x: 0.5, y: 0.5 };

  const initializeWebGL = async () => {
    if (!container) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
    if (!container) return;

    renderer = new Renderer({ dpr: Math.min(window.devicePixelRatio, 2), alpha: true });
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
      raysColor: { value: hexToRgb(opts.raysColor) },
      raysSpeed: { value: opts.raysSpeed },
      lightSpread: { value: opts.lightSpread },
      rayLength: { value: opts.rayLength },
      pulsating: { value: opts.pulsating ? 1.0 : 0.0 },
      fadeDistance: { value: opts.fadeDistance },
      saturation: { value: opts.saturation },
      mousePos: { value: [0.5, 0.5] },
      mouseInfluence: { value: opts.mouseInfluence },
      noiseAmount: { value: opts.noiseAmount },
      distortion: { value: opts.distortion }
    };

    const geometry = new Triangle(gl);
    const program = new Program(gl, { vertex: VERT, fragment: FRAG, uniforms });
    mesh = new Mesh(gl, { geometry, program });

    const updatePlacement = () => {
      if (!container || !renderer) return;
      renderer.dpr = Math.min(window.devicePixelRatio, 2);

      const { clientWidth: wCSS, clientHeight: hCSS } = container;
      renderer.setSize(wCSS, hCSS);

      const dpr = renderer.dpr;
      const w = wCSS * dpr;
      const h = hCSS * dpr;
      uniforms.iResolution.value = [w, h];

      const { anchor, dir } = getAnchorAndDir(opts.raysOrigin, w, h);
      uniforms.rayPos.value = anchor;
      uniforms.rayDir.value = dir;
    };

    const loop = (t) => {
      if (!renderer || !uniforms || !mesh) return;
      uniforms.iTime.value = t * 0.001;

      if (opts.followMouse && opts.mouseInfluence > 0.0) {
        const smoothing = 0.92;
        smoothMouse.x = smoothMouse.x * smoothing + mouse.x * (1 - smoothing);
        smoothMouse.y = smoothMouse.y * smoothing + mouse.y * (1 - smoothing);
        uniforms.mousePos.value = [smoothMouse.x, smoothMouse.y];
      }

      // 컨테이너가 보이지 않을 때(예: 오버레이 닫힘 → visibility:hidden 상속)는
      // 그리기를 건너뛰어 GPU 자원 절약. 루프는 유지해 다시 보이면 재개.
      const visible = getComputedStyle(container).visibility !== 'hidden';
      if (visible) {
        try {
          renderer.render({ scene: mesh });
        } catch (error) {
          console.warn('WebGL rendering error:', error);
          return;
        }
      }
      animationId = requestAnimationFrame(loop);
    };

    window.addEventListener('resize', updatePlacement);
    updatePlacement();
    animationId = requestAnimationFrame(loop);

    webglCleanup = () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
      window.removeEventListener('resize', updatePlacement);
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
      uniforms = null;
      mesh = null;
    };
  };

  // 화면에 들어올 때만 초기화 (IntersectionObserver)
  let started = false;
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && !started) {
        started = true;
        initializeWebGL();
      }
    },
    { threshold: 0.1 }
  );
  observer.observe(container);

  // 마우스 추적
  const handleMouseMove = (e) => {
    const rect = container.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    mouse.x = (e.clientX - rect.left) / rect.width;
    mouse.y = (e.clientY - rect.top) / rect.height;
  };
  if (opts.followMouse) window.addEventListener('mousemove', handleMouseMove);

  return () => {
    observer.disconnect();
    if (opts.followMouse) window.removeEventListener('mousemove', handleMouseMove);
    if (webglCleanup) webglCleanup();
  };
}

/* --- data-light-rays 요소 자동 초기화 --- */
const num = (v, d) => (v == null || v === '' ? d : parseFloat(v));
const bool = (v, d) => (v == null ? d : v === 'true' || v === '');

function autoInit() {
  document.querySelectorAll('[data-light-rays]').forEach((el) => {
    const d = el.dataset;
    initLightRays(el, {
      raysOrigin: d.raysOrigin || 'top-center',
      raysColor: d.raysColor || DEFAULT_COLOR,
      raysSpeed: num(d.raysSpeed, 1),
      lightSpread: num(d.lightSpread, 1),
      rayLength: num(d.rayLength, 2),
      pulsating: bool(d.pulsating, false),
      fadeDistance: num(d.fadeDistance, 1.0),
      saturation: num(d.saturation, 1.0),
      followMouse: bool(d.followMouse, true),
      mouseInfluence: num(d.mouseInfluence, 0.1),
      noiseAmount: num(d.noiseAmount, 0.0),
      distortion: num(d.distortion, 0.0)
    });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', autoInit);
} else {
  autoInit();
}
