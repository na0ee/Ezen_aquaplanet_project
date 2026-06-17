import { initLightRays } from './lightrays.js';

const container = document.getElementById('light-rays');

initLightRays(container, {
  raysOrigin: 'top-center',
  raysColor: '#ffffff',
  raysSpeed: 1.5,
  lightSpread: 0.7,
  rayLength: 1.2,
  followMouse: true,
  mouseInfluence: 0,
  noiseAmount: 0.1,
  distortion: 0.05,
  fadeDistance: 0.9,
  saturation: 1.2
});

// ============================================================
//  지점 선택 인터랙션
//  · 지점(버블) 클릭 → 버블이 터지며 아래로, 나머지는 위로 올라가며 축소
//  · 우측 가격 / 할인 패널 등장
// ============================================================
const ticketSection = document.querySelector('.ticket');
const spots = Array.from(document.querySelectorAll('.ticket-spot'));
const priceTarget = document.querySelector('[data-price-target]');

// 상단 축소 행은 항상 이 순서로 고정 배치된다.
const BRANCH_ORDER = ['ilsan', 'yeosu', 'jeju', 'gwanggyo'];
// 각 슬롯의 left(.wrap 기준 %) — CSS 의 .slot-0~3 값과 반드시 일치시킬 것
const SLOT_LEFT = [-4, 20, 44, 68];

// 안 터지고 살아남는 거품(큰 7개 중 가장 작은 것) — 빈 슬롯을 채운다.
let survivorBubble = null;

function branchIndexOf(spot) {
  return BRANCH_ORDER.findIndex((b) => spot.classList.contains('ticket-spot--' + b));
}

// 살아남은 거품을 '비어 있는 슬롯'(선택된 지점이 빠진 자리)으로 이동시킨다.
function placeSurvivor(emptySlotIdx) {
  if (!survivorBubble) return;
  const wrap = document.querySelector('.wrap');
  if (!wrap) return;

  const wrapRect = wrap.getBoundingClientRect();
  const sectionRect = ticketSection.getBoundingClientRect();
  const spotW = spots[0] ? spots[0].offsetWidth : 0;

  // 빈 슬롯에 있던 spot 의 화면상 중심 x (spot 박스는 가운데 기준 scale 되므로 중심 = left + 폭/2)
  const centerX = wrapRect.left + (SLOT_LEFT[emptySlotIdx] / 100) * wrapRect.width + spotW / 2;
  const bubbleW = survivorBubble.offsetWidth;
  const leftPct = ((centerX - sectionRect.left) - bubbleW / 2) / sectionRect.width * 100;
  survivorBubble.style.left = leftPct.toFixed(2) + '%';

  // 상단(축소 spot 높이)으로 떠오르게
  const y = parseFloat(getComputedStyle(survivorBubble).getPropertyValue('--y')) || 50;
  survivorBubble.style.setProperty('--rise', (9 - y).toFixed(1) + 'vh');
}

function selectSpot(selected) {
  const emptySlotIdx = branchIndexOf(selected);

  spots.forEach((spot) => {
    spot.classList.remove('is-selected', 'is-top', 'slot-0', 'slot-1', 'slot-2', 'slot-3');
    if (spot === selected) {
      spot.classList.add('is-selected');
    } else {
      // 각 지점은 자기 고정 슬롯(일산0·여수1·제주2·광교3)에 배치
      spot.classList.add('is-top', 'slot-' + branchIndexOf(spot));
    }
  });

  placeSurvivor(emptySlotIdx);
  ticketSection.classList.add('is-selected');

  const price = selected.getAttribute('data-price');
  if (price && priceTarget) priceTarget.textContent = price;
}

spots.forEach((spot) => {
  spot.addEventListener('click', (e) => {
    e.preventDefault();
    selectSpot(spot);
  });
});

// 장식 거품 연출 예약 (CSS 의 .ticket.is-selected 상태에서 재생)
//  · 큰 거품 6개   → 큰 순서대로 '펑' 터져 사라짐 (is-bursting)
//  · 큰 것 중 가장 작은 1개 → 안 터지고 빈 슬롯을 채움 (is-survivor)
//  · 작은 거품들   → 위로 떠올라 상단에서 둥둥 (is-floating)
(function prepareBubbleFx() {
  const bubbles = Array.from(document.querySelectorAll('.deco-bubble'));
  const sized = bubbles
    .map((el) => ({
      el,
      size: parseFloat(getComputedStyle(el).getPropertyValue('--s')) || 0,
      y: parseFloat(getComputedStyle(el).getPropertyValue('--y')) || 50,
    }))
    .sort((a, b) => b.size - a.size);

  // 살아남을(안 터지는) 거품: 지름이 SURVIVOR_SIZE 인 것. 없으면 큰 것 중 가장 작은 것.
  const SURVIVOR_SIZE = 120;
  let survivorIdx = sized.findIndex((b) => b.size === SURVIVOR_SIZE);
  if (survivorIdx === -1) survivorIdx = 6;

  let burstOrder = 0;
  sized.forEach((item, i) => {
    const { el, y } = item;

    if (i === survivorIdx) {
      // 살아남아 빈 슬롯을 채움
      survivorBubble = el;
      el.classList.add('is-floating', 'is-survivor');
      el.style.setProperty('--drift-dur', '6s');
    } else if (i < 7) {
      // 그 외 큰 거품: 큰 것부터 0.13초 간격으로 순차 터짐
      el.classList.add('is-bursting');
      el.style.animationDelay = (burstOrder * 0.13).toFixed(2) + 's';
      burstOrder += 1;
    } else {
      // 작은 거품: 상단 6~22% 부근으로 떠올라 그 자리에서 둥둥
      el.classList.add('is-floating');
      const targetY = 6 + Math.random() * 16;
      el.style.setProperty('--rise', (targetY - y).toFixed(1) + 'vh');
      el.style.setProperty('--drift-dur', (5 + Math.random() * 3).toFixed(1) + 's');
    }
  });
})();

// ============================================================
//  커스텀 커서 + 수면 물결 효과 (index.html / main.js 와 동일)
//  · style.css 의 `html,body,* { cursor:none }` 때문에 기본 커서가 숨겨지므로
//    이 페이지에도 동일한 대체 커서를 띄운다.
// ============================================================
function initCustomCursor() {
  const el = document.getElementById('custom-cursor');
  if (!el) return;

  const HALF = 17;
  let tx = -200, ty = -200;
  let cx = tx, cy = ty;
  let snapped = false;

  // 즉시 보이게 (마우스 이동 전엔 화면 밖 위치에 있으므로 안 보임)
  el.style.opacity = '1';

  window.addEventListener('mousemove', e => {
    tx = e.clientX;
    ty = e.clientY;
    if (!snapped) {
      snapped = true;
      cx = tx; cy = ty;
    }
  }, { passive: true });

  document.addEventListener('mouseleave', () => { el.style.opacity = '0'; });
  document.addEventListener('mouseenter', () => { el.style.opacity = '1'; });
  document.addEventListener('mousedown',  () => el.classList.add('is-clicking'));
  document.addEventListener('mouseup',    () => el.classList.remove('is-clicking'));

  document.addEventListener('mouseover', e => {
    const over = e.target.closest('a, button, [role="button"], .map-marker, .program-card, .booking-card');
    el.classList.toggle('is-hovering', !!over);
  });

  (function loop() {
    cx += (tx - cx) * 0.2;
    cy += (ty - cy) * 0.2;
    el.style.transform = `translate(${(cx - HALF).toFixed(1)}px,${(cy - HALF).toFixed(1)}px)`;
    requestAnimationFrame(loop);
  })();
}

function initCursorWave() {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  Object.assign(canvas.style, {
    position:      'fixed',
    inset:         '0',
    width:         '100%',
    height:        '100%',
    pointerEvents: 'none',
    zIndex:        '9996',
  });
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');

  const SCALE         = 9;
  const DAMP          = 0.92;
  const DIST_INTERVAL = 16;
  const RX = 4, RY = 1;
  const FORCE = 60;

  let W, H, bW, bH, cur, prv, offscreen, offCtx, imgData;
  let running = true;

  function resize() {
    W  = window.innerWidth;
    H  = window.innerHeight;
    bW = Math.ceil(W / SCALE) + 2;
    bH = Math.ceil(H / SCALE) + 2;
    canvas.width  = W;
    canvas.height = H;
    cur      = new Float32Array(bW * bH);
    prv      = new Float32Array(bW * bH);
    offscreen        = document.createElement('canvas');
    offscreen.width  = bW;
    offscreen.height = bH;
    offCtx   = offscreen.getContext('2d');
    imgData  = offCtx.createImageData(bW, bH);
  }

  resize();
  window.addEventListener('resize', resize, { passive: true });

  let mx = 0, my = 0, pmx = 0, pmy = 0, distAccum = 0;
  window.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; }, { passive: true });

  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    if (running) tick();
  });

  function disturb(cx, cy) {
    for (let dy = -RY; dy <= RY; dy++) {
      for (let dx = -RX; dx <= RX; dx++) {
        const d = Math.hypot(dx / RX, dy / RY);
        if (d > 1) continue;
        const nx = cx + dx, ny = cy + dy;
        if (nx < 1 || nx >= bW - 1 || ny < 1 || ny >= bH - 1) continue;
        cur[ny * bW + nx] += FORCE * (1 - d);
      }
    }
  }

  function tick() {
    if (!running) return;
    requestAnimationFrame(tick);

    const spd = Math.hypot(mx - pmx, my - pmy);
    if (spd > 0.5) {
      distAccum += spd;
      pmx = mx; pmy = my;
      if (distAccum >= DIST_INTERVAL) {
        disturb(Math.round(mx / SCALE), Math.round(my / SCALE));
        distAccum = 0;
      }
    }

    const nxt = prv;
    for (let y = 1; y < bH - 1; y++) {
      for (let x = 1; x < bW - 1; x++) {
        const i = y * bW + x;
        nxt[i] = ((cur[i-1] + cur[i+1] + cur[i-bW] + cur[i+bW]) / 2 - nxt[i]) * DAMP;
      }
    }
    prv = cur;
    cur = nxt;

    const px = imgData.data;
    px.fill(0);

    for (let y = 1; y < bH - 1; y++) {
      for (let x = 1; x < bW - 1; x++) {
        const i = y * bW + x;
        const v = cur[i];
        if (Math.abs(v) < 1.5) continue;

        const lx    = cur[i - 1] - cur[i + 1];
        const ly    = cur[i - bW] - cur[i + bW];
        const shine = lx * 0.85 + ly * 0.15;
        if (shine <= 0) continue;

        const amp   = Math.min(Math.abs(v) / 48, 1);
        const alpha = Math.min(shine * amp * 1.0, 1) * 160;
        if (alpha < 2) continue;

        const t    = Math.min(shine * amp * 0.5, 1);
        const pidx = (y * bW + x) * 4;
        px[pidx]     = Math.round(190 + t * 65);
        px[pidx + 1] = Math.round(220 + t * 35);
        px[pidx + 2] = Math.round(245 + t * 10);
        px[pidx + 3] = alpha;
      }
    }

    offCtx.putImageData(imgData, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.filter = 'blur(7px)';
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(offscreen, 0, 0, W, H);
    ctx.restore();
  }

  tick();
}

initCustomCursor();
initCursorWave();
