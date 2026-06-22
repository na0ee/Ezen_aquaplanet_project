/* =============================================================
   AQUA PLANET — business.js
   Business Overview 페이지 인터랙션
     ① GNB: 업스크롤 시에만 표시 (다른 페이지와 동일)
     ② 스크롤 등장(.reveal → .is-visible)
     ③ 사업분야 검색 필터 (#biz-search → 해당 블록만 강조)
   ============================================================= */

/* ── 사업 예시 이미지 슬라이더: 2초마다 옆으로 전환 / 무한 루프 / 호버 시 멈춤 ──
   끝 슬라이드 다음에 '첫 슬라이드 클론'으로 계속 이동 → 도달하면 transition 없이
   진짜 첫 슬라이드로 순간 리셋(클론과 동일해 보여서 끊김 없음) */
(function () {
  const figure = document.querySelector('.biz-case__figure');
  const track = figure && figure.querySelector('.biz-case__track');
  if (!track) return;
  const realCount = track.children.length;
  if (realCount < 2) return;

  // 첫 슬라이드 클론을 끝에 추가
  const clone = track.children[0].cloneNode(true);
  clone.setAttribute('aria-hidden', 'true');
  track.appendChild(clone);

  let index = 0;
  let timer = null;
  let animating = false;

  function setX(withTransition) {
    track.style.transition = withTransition ? 'transform 0.5s ease' : 'none';
    track.style.transform = 'translateX(' + (-index * 100) + '%)';
  }
  function next() {
    if (animating) return;
    animating = true;
    index += 1;
    setX(true);
  }
  track.addEventListener('transitionend', function () {
    animating = false;
    if (index >= realCount) {   // 클론(=첫 이미지) 도달 → 순간 리셋
      index = 0;
      setX(false);
    }
  });

  function start() { stop(); timer = setInterval(next, 2000); }
  function stop() { if (timer) { clearInterval(timer); timer = null; } }

  figure.addEventListener('mouseenter', stop);   // 호버하면 멈춤
  figure.addEventListener('mouseleave', start);  // 벗어나면 재개

  setX(false);   // 초기 위치
  start();
})();

/* ── 비전 다이어그램: 노드 클릭 → 해당 라벨 표시 토글 (hover 는 CSS) ── */
(function () {
  document.querySelectorAll('.box .biz-node').forEach(function (node) {
    node.addEventListener('click', function () {
      const box = node.closest('.box');
      if (box) box.classList.toggle('is-active');
    });
  });
})();

/* ── 역량 다이어그램(펜타곤): 노드 클릭 → 왼쪽 상세패널 전환 ──
   노드와 패널은 data-cap 값으로 짝지어짐. 한 번에 하나만 .is-active */
(function () {
  const diagram = document.querySelector('.biz-diagram5');
  const nodes = document.querySelectorAll('.biz-node5[data-cap]');
  const panels = document.querySelectorAll('.caps-panel[data-cap]');
  if (!diagram || !nodes.length || !panels.length) return;

  const capOrder = ['기획', '설계', '시공', '생물수급', '운영'];
  const baseAngles = {
    '기획': -90,
    '설계': -18,
    '시공': 54,
    '생물수급': 126,
    '운영': 198,
  };
  const center = 50;
  const radius = 36;
  const activeAngle = 198;
  let currentOffset = 0;
  let orbitRaf = null;

  function normalizeOffset(targetOffset) {
    let next = targetOffset;
    while (next - currentOffset > 180) next -= 360;
    while (next - currentOffset < -180) next += 360;
    return next;
  }

  function placeNodes(offset) {
    nodes.forEach(function (node) {
      const baseAngle = baseAngles[node.dataset.cap] ?? -90;
      const angle = (baseAngle + offset) * Math.PI / 180;
      const left = center + Math.cos(angle) * radius;
      const top = center + Math.sin(angle) * radius;
      node.style.setProperty('--node-left', left.toFixed(3) + '%');
      node.style.setProperty('--node-top', top.toFixed(3) + '%');
    });
  }

  function animateOrbit(selectedCap) {
    const selectedBaseAngle = baseAngles[selectedCap] ?? -90;
    const targetOffset = normalizeOffset(activeAngle - selectedBaseAngle);
    const startOffset = currentOffset;
    const distance = targetOffset - startOffset;
    const duration = 650;
    const startTime = performance.now();

    if (orbitRaf) cancelAnimationFrame(orbitRaf);

    function tick(now) {
      const progress = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      currentOffset = startOffset + distance * eased;
      placeNodes(currentOffset);

      if (progress < 1) {
        orbitRaf = requestAnimationFrame(tick);
      } else {
        currentOffset = targetOffset;
        placeNodes(currentOffset);
        orbitRaf = null;
      }
    }

    orbitRaf = requestAnimationFrame(tick);
  }

  function activate(cap) {
    diagram.classList.add('is-detail-open');
    animateOrbit(cap);
    nodes.forEach(function (n) { n.classList.toggle('is-active', n.dataset.cap === cap); });
    panels.forEach(function (p) { p.classList.toggle('is-active', p.dataset.cap === cap); });
  }

  nodes.forEach(function (n) {
    n.setAttribute('aria-pressed', 'false');

    function onSelect(e) {
      const selectedNode = e.currentTarget;
      const selectedCap = selectedNode.dataset.cap;
      activate(selectedCap);
      nodes.forEach(function (node) {
        node.setAttribute('aria-pressed', String(node === selectedNode));
      });
    }

    n.addEventListener('click', onSelect);
  });

  placeNodes(0);
})();

/* ── 사업분야 배너: 스크롤로 가운데 도달 시 하나씩 활성화 ──
   (타이틀 파란 강조 + 아래 text·list 등장). 클릭으로도 토글 가능 */
(function () {
  const banners = document.querySelectorAll('.biz-banner');
  if (!banners.length) return;

  // 클릭 토글(수동)
  banners.forEach(function (b) {
    const title = b.querySelector('.biz-banner__title');
    if (title) title.addEventListener('click', function () { b.classList.toggle('is-active'); });
  });

  // 스크롤: 뷰포트 가운데 띠에 들어온 배너만 활성 → 스크롤할수록 하나씩 바뀜
  if (!('IntersectionObserver' in window)) {
    banners.forEach(function (b) { b.classList.add('is-active'); });
    return;
  }
  const io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      entry.target.classList.toggle('is-active', entry.isIntersecting);
    });
  }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });
  banners.forEach(function (b) { io.observe(b); });
})();

/* ── Business Area 카드: 흰 배경 섹션처럼 한 위치에서 01 → 05 전환 ── */
(function () {
  const section = document.querySelector('.biz-areas');
  if (!section) return;

  const pin = section.querySelector('.biz-blue-stack');
  const slides = Array.from(section.querySelectorAll('.biz-blue-card'))
    .sort(function (a, b) {
      return Number(a.dataset.slide || 0) - Number(b.dataset.slide || 0);
    });
  if (!pin || !slides.length) return;

  let current = -1;

  function activate(index) {
    if (index === current) return;
    const prev = current;
    current = index;

    slides.forEach(function (slide, i) {
      slide.classList.remove('is-active', 'is-prev');
      if (i === index) {
        slide.classList.add('is-active');
      } else if (i === prev) {
        slide.classList.add('is-prev');
      }
    });
  }

  function update() {
    const rect = section.getBoundingClientRect();
    const startDelay = Math.min(1480, window.innerHeight * 1.35);
    const slideStep = Math.max(520, window.innerHeight * 0.5);

    if (rect.top > 0 || -rect.top < startDelay) {
      activate(0);
      return;
    }

    const index = Math.min(slides.length - 1, Math.floor((-rect.top - startDelay) / slideStep));
    activate(index);
  }

  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  activate(0);
  update();
})();

/* ── Vision: 스크롤에 맞춰 원형 다이어그램 회전 + 내용 전환 ── */
(function () {
  const pin = document.querySelector('[data-vision-section]');
  const section = pin && pin.closest('.biz-vision');
  if (!section || !pin) return;

  const nodes = Array.from(pin.querySelectorAll('.biz-vision-node'));
  const copies = Array.from(pin.querySelectorAll('.biz-vision-copy'));
  const order = ['mission', 'vision', 'goal', 'core'];
  const slots = [
    { x: 1076, y: 540, scale: 1.333333 },
    { x: 1338, y: 150, scale: 1 },
    { x: 1770, y: -14, scale: 1 },
    { x: 1342, y: 960, scale: 1 },
  ];

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function smooth(t) {
    return t * t * (3 - 2 * t);
  }

  function activeDistance(relative) {
    const wrapped = ((relative % order.length) + order.length) % order.length;
    return Math.min(wrapped, order.length - wrapped);
  }

  function wrapIndex(index) {
    return (index + slots.length) % slots.length;
  }

  function slotAt(position) {
    const base = Math.floor(position);
    const t = smooth(position - base);
    const from = slots[wrapIndex(base)];
    const to = slots[wrapIndex(base + 1)];
    return {
      x: from.x + (to.x - from.x) * t,
      y: from.y + (to.y - from.y) * t,
      scale: from.scale + (to.scale - from.scale) * t,
    };
  }

  function render(progress) {
    const activeIndex = Math.min(order.length - 1, Math.round(progress));

    nodes.forEach(function (node) {
      const nodeIndex = Math.max(0, order.indexOf(node.dataset.visionNode));
      const relative = (nodeIndex - progress + order.length) % order.length;
      const slot = slotAt(relative);
      const focus = smooth(clamp(1 - activeDistance(relative), 0, 1));
      const scale = Math.max(slot.scale, 1 + focus * 0.333333);
      const fontSize = 42 + focus * 18;
      const tracking = -0.84 + focus * -0.36;

      node.style.left = (slot.x - 150).toFixed(2) + 'px';
      node.style.top = (slot.y - 150).toFixed(2) + 'px';
      node.style.setProperty('--vision-scale', scale.toFixed(6));
      node.style.setProperty('--vision-font-size', fontSize.toFixed(2) + 'px');
      node.style.setProperty('--vision-letter-spacing', tracking.toFixed(3) + 'px');
      node.classList.toggle('is-active', node.dataset.visionNode === order[activeIndex]);
    });

    copies.forEach(function (copy) {
      copy.classList.toggle('is-active', copy.dataset.visionCopy === order[activeIndex]);
    });
  }

  function update() {
    const rect = section.getBoundingClientRect();
    const scrollable = section.offsetHeight - window.innerHeight;

    if (rect.top > 0 || scrollable <= 0) {
      render(0);
      return;
    }

    const progress = clamp((-rect.top / scrollable) * (order.length - 1), 0, order.length - 1);
    render(progress);
  }

  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  render(0);
  update();
})();

/* ── ① GNB: gnb-scroll.js에서 처리 ─────────────────────────── */

/* ── 커스텀 커서 (location 페이지와 동일) ───────────────────── */
(function () {
  if (window.matchMedia('(hover: none)').matches) return;
  const el = document.getElementById('custom-cursor');
  if (!el) return;
  const HALF = 17;
  // 이 페이지는 전체가 밝은 배경 → 본문/푸터/GNB 위에서 파란 링으로
  const LIGHT_SELS = 'main, .biz-footer, .gnb';
  let tx = -200, ty = -200, cx = -200, cy = -200, firstMove = false;
  window.addEventListener('mousemove', function (e) {
    tx = e.clientX; ty = e.clientY;
    if (!firstMove) { firstMove = true; cx = tx; cy = ty; el.style.opacity = '1'; }
    const hit = document.elementFromPoint(e.clientX, e.clientY);
    el.classList.toggle('is-over-light', !!(hit && hit.closest(LIGHT_SELS)));
  }, { passive: true });
  document.addEventListener('mouseleave', function () { el.style.opacity = '0'; });
  document.addEventListener('mouseenter', function () { if (firstMove) el.style.opacity = '1'; });
  document.addEventListener('mousedown',  function () { el.classList.add('is-clicking'); });
  document.addEventListener('mouseup',    function () { el.classList.remove('is-clicking'); });
  document.addEventListener('mouseover', function (e) {
    const over = e.target.closest('a, button, [role="button"], .biz-tag, input');
    el.classList.toggle('is-hovering', !!over);
  });
  (function loop() {
    cx += (tx - cx) * 0.2;
    cy += (ty - cy) * 0.2;
    el.style.transform = 'translate(' + (cx - HALF).toFixed(1) + 'px,' + (cy - HALF).toFixed(1) + 'px)';
    requestAnimationFrame(loop);
  })();
})();

/* ── ② 스크롤 등장 ────────────────────────────────────────── */
(function () {
  const items = document.querySelectorAll('.reveal');
  if (!items.length) return;

  if (!('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('is-visible'));
    return;
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });

  items.forEach((el) => io.observe(el));
})();

/* ── ③ 사업분야 검색 필터 ─────────────────────────────────── */
(function () {
  const input = document.getElementById('biz-search');
  if (!input) return;

  // 검색 대상: 배너(Planning) + 사업분야 블록
  const blocks = Array.from(document.querySelectorAll('.biz-area[data-name], .biz-banner[data-name]'));

  // data-name(영문) + 보이는 텍스트(국문 포함)로 매칭
  const haystack = (el) => (
    (el.dataset.name || '') + ' ' + (el.textContent || '')
  ).toLowerCase();

  function applyFilter() {
    const q = input.value.trim().toLowerCase();
    if (!q) {                       // 비었으면 전체 표시
      blocks.forEach((el) => el.classList.remove('is-dimmed'));
      return;
    }
    blocks.forEach((el) => {
      const match = haystack(el).includes(q);
      el.classList.toggle('is-dimmed', !match);
    });
  }

  input.addEventListener('input', applyFilter);
  // Enter 시 첫 매칭 블록으로 스크롤
  input.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const q = input.value.trim().toLowerCase();
    if (!q) return;
    const hit = blocks.find((el) => haystack(el).includes(q));
    if (hit) hit.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
})();

/* ── 배경 그라데이션 */
function apply(whiteStartRatio = 0.3, whiteEndRatio = 0.7) {
  const h = document.body.scrollHeight;

  const whiteStart = h * whiteStartRatio;
  const whiteEnd = h * whiteEndRatio;

  document.body.style.backgroundImage =
    'linear-gradient(to bottom,' +

      '#22B2EA 0px,' +
      '#22B2EA ' + whiteStart + 'px,' +

      '#ffffff ' + whiteStart + 'px,' +
      '#ffffff ' + whiteEnd + 'px,' +

      '#22B2EA ' + h + 'px' +

    ')';
}
