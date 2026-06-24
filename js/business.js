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
  const media = pin.querySelector('.biz-vision-media');
  const mainImage = pin.querySelector('[data-vision-main-image]');
  const primaryPreview = pin.querySelector('[data-vision-preview="primary"]');
  const secondaryPreview = pin.querySelector('[data-vision-preview="secondary"]');
  const featureTitle = pin.querySelector('[data-vision-feature-title]');
  const featureText = pin.querySelector('[data-vision-feature-text]');
  const order = ['vision', 'mission', 'core', 'goal'];
  const mediaSlides = [
    {
      key: 'mission',
      title: 'MISSION',
      text: '해양생물의 소중함을 공유하고, 이를 지키고 보전하며<br>인간과 자연이 공생하며 느낄 수 있는 최고의 즐거움을 제공하는 기업',
      image: 'assets/images/sec.aboutus/business/figma-image-152.png',
    },
    {
      key: 'vision',
      title: 'VISION',
      text: '지속성장 기반을 갖춘 Global Aquarium 전문 기업을<br>목표로 오늘도 힘찬 도전',
      image: 'assets/images/sec.aboutus/business/figma-image-153-large.png',
    },
    {
      key: 'goal',
      title: 'GOAL',
      text: 'No.1 NETWORK POWER · ECO COMPANY<br>No.1 BRAND POWER · MARKET SHARE · TECHNICAL SKILLS',
      image: 'assets/images/sec.aboutus/business/figma-image-153-small.png',
    },
    {
      key: 'core',
      title: 'CORE VALUE',
      text: '고객중심 · 해양보존 · 창조의힘 · 사회책임<br>사람과 자연이 함께하는 미래를 만듭니다.',
      image: 'assets/images/sec.aboutus/business/figma-image-152.png',
    },
  ];
  let activeMediaIndex = -1;
  let lastMediaBase = -1;
  const orbit = {
    centerX: 1338,
    centerY: 540,
    radiusX: 262,
    radiusY: 420,
    hiddenPosition: 2,
  };

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function smooth(t) {
    return t * t * (3 - 2 * t);
  }

  function mix(from, to, t) {
    return from + (to - from) * t;
  }

  function wrapPosition(position) {
    return ((position % order.length) + order.length) % order.length;
  }

  function circularDistance(from, to) {
    const wrapped = Math.abs(wrapPosition(from) - wrapPosition(to));
    return Math.min(wrapped, order.length - wrapped);
  }

  function slotAt(position) {
    const angle = Math.PI + position * (Math.PI / 2);
    const centerFocus = smooth(clamp(1 - circularDistance(position, 0), 0, 1));

    return {
      x: orbit.centerX + Math.cos(angle) * orbit.radiusX,
      y: orbit.centerY + Math.sin(angle) * orbit.radiusY,
      scale: 1 + centerFocus * 0.333333,
      focus: centerFocus,
    };
  }

  function visibleAt(position) {
    const hiddenDistance = circularDistance(position, orbit.hiddenPosition);
    return smooth(clamp((hiddenDistance - 0.32) / 0.42, 0, 1));
  }

  function applyMediaContent(index) {
    if (!media || !mainImage || !primaryPreview || !secondaryPreview || !featureTitle || !featureText) return;
    if (index === activeMediaIndex) return;

    const length = mediaSlides.length;
    const active = mediaSlides[index];
    const next = mediaSlides[(index + 1) % length];
    const afterNext = mediaSlides[(index + 2) % length];

    activeMediaIndex = index;

    mainImage.src = active.image;
    primaryPreview.src = next.image;
    secondaryPreview.src = afterNext.image;
    featureTitle.innerHTML = active.title;
    featureText.innerHTML = active.text;
  }

  function renderMedia(progress) {
    if (!media || !mainImage || !primaryPreview || !secondaryPreview || !featureTitle || !featureText) return;

    const length = mediaSlides.length;
    const loopProgress = progress >= length ? 0 : progress;
    const base = Math.floor(loopProgress) % length;
    const phase = smooth(loopProgress - Math.floor(loopProgress));

    if (base !== lastMediaBase) {
      lastMediaBase = base;
      applyMediaContent(base);
    }

    mainImage.style.opacity = (1 - phase * 0.78).toFixed(3);
    mainImage.style.transform = 'translateX(' + (-36 * phase).toFixed(3) + '%) scale(' + (1 - phase * 0.08).toFixed(4) + ')';

    primaryPreview.style.opacity = '1';
    primaryPreview.style.top = mix(24.036, 0, phase).toFixed(3) + '%';
    primaryPreview.style.left = mix(75.835, 0, phase).toFixed(3) + '%';
    primaryPreview.style.width = mix(51.928, 100, phase).toFixed(3) + '%';
    primaryPreview.style.zIndex = '2';

    secondaryPreview.style.opacity = '1';
    secondaryPreview.style.top = mix(30.977, 24.036, phase).toFixed(3) + '%';
    secondaryPreview.style.left = mix(103.941, 75.835, phase).toFixed(3) + '%';
    secondaryPreview.style.width = mix(35.047, 51.928, phase).toFixed(3) + '%';
  }

  function render(progress) {
    const activeIndex = Math.round(progress) % order.length;

    renderMedia(progress);

    nodes.forEach(function (node) {
      const nodeKey = node.dataset.visionNode;
      const nodeIndex = Math.max(0, order.indexOf(node.dataset.visionNode));
      const relative = wrapPosition(nodeIndex - progress);
      const slot = slotAt(relative);
      const visible = visibleAt(relative);
      const fontSize = 42 + slot.focus * 18;
      const tracking = -0.84 + slot.focus * -0.36;

      node.style.left = (slot.x - 150).toFixed(2) + 'px';
      node.style.top = (slot.y - 150).toFixed(2) + 'px';
      node.style.opacity = visible.toFixed(3);
      node.style.setProperty('--vision-scale', slot.scale.toFixed(6));
      node.style.setProperty('--vision-font-size', fontSize.toFixed(2) + 'px');
      node.style.setProperty('--vision-letter-spacing', tracking.toFixed(3) + 'px');
      node.classList.toggle('is-active', nodeKey === order[activeIndex]);
      node.setAttribute('aria-hidden', visible < 0.05 ? 'true' : 'false');
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

    const progress = clamp((-rect.top / scrollable) * order.length, 0, order.length);
    render(progress);
  }

  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  render(0);
  update();
})();

/* ── Capabilities: 비전 다이어그램을 좌우 반전한 스크롤 전환 ── */
(function () {
  const pin = document.querySelector('[data-caps-section]');
  const section = pin && pin.closest('.biz-caps');
  if (!section || !pin) return;

  const nodes = Array.from(pin.querySelectorAll('.biz-caps-node'));
  const copies = Array.from(pin.querySelectorAll('.biz-caps-copy'));
  const images = Array.from(pin.querySelectorAll('.biz-caps-visual__img'));
  const order = ['creativity', 'network', 'staffs', 'technology', 'management'];
  const slots = {
    center: { x: 844, y: 540, scale: 1.333333, focus: 1 },
    top: { x: 582, y: 150, scale: 1, focus: 0 },
    bottom: { x: 582, y: 960, scale: 1, focus: 0 },
  };

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function smooth(t) {
    return t * t * (3 - 2 * t);
  }

  function wrapPosition(position) {
    return ((position % order.length) + order.length) % order.length;
  }

  function activeKeyAt(progress) {
    return order[Math.round(progress) % order.length];
  }

  function mixSlot(from, to, t) {
    return {
      x: from.x + (to.x - from.x) * t,
      y: from.y + (to.y - from.y) * t,
      scale: from.scale + (to.scale - from.scale) * t,
      focus: from.focus + (to.focus - from.focus) * t,
    };
  }

  function slotFor(nodeIndex, progress) {
    const length = order.length;
    const base = Math.floor(progress) % length;
    const t = smooth(progress - Math.floor(progress));
    const current = base;
    const next = wrapPosition(base + 1);
    const nextNext = wrapPosition(base + 2);
    const prev = wrapPosition(base - 1);

    if (nodeIndex === current) {
      return { slot: mixSlot(slots.center, slots.bottom, t), visible: 1 };
    }
    if (nodeIndex === next) {
      return { slot: mixSlot(slots.top, slots.center, t), visible: 1 };
    }
    if (t < 0.5 && nodeIndex === prev) {
      return { slot: slots.bottom, visible: 1 };
    }
    if (t >= 0.5 && nodeIndex === nextNext) {
      return { slot: slots.top, visible: 1 };
    }
    return { slot: slots.center, visible: 0 };
  }

  function render(progress) {
    const loopProgress = progress >= order.length ? 0 : progress;
    const activeKey = activeKeyAt(loopProgress);

    nodes.forEach(function (node) {
      const nodeKey = node.dataset.capsNode;
      const nodeIndex = Math.max(0, order.indexOf(nodeKey));
      const state = slotFor(nodeIndex, loopProgress);
      const slot = state.slot;
      const visible = state.visible;
      const fontSize = 42 + slot.focus * 18;
      const tracking = -0.84 + slot.focus * -0.36;

      node.style.left = (slot.x - 150).toFixed(2) + 'px';
      node.style.top = (slot.y - 150).toFixed(2) + 'px';
      node.style.opacity = visible.toFixed(3);
      node.style.setProperty('--caps-scale', slot.scale.toFixed(6));
      node.style.setProperty('--caps-font-size', fontSize.toFixed(2) + 'px');
      node.style.setProperty('--caps-letter-spacing', tracking.toFixed(3) + 'px');
      node.classList.toggle('is-active', nodeKey === activeKey);
      node.setAttribute('aria-hidden', visible < 0.05 ? 'true' : 'false');
    });

    copies.forEach(function (copy) {
      copy.classList.toggle('is-active', copy.dataset.capsCopy === activeKey);
    });

    images.forEach(function (image) {
      image.classList.toggle('is-active', image.dataset.capsImage === activeKey);
    });
  }

  function update() {
    const rect = section.getBoundingClientRect();
    const scrollable = section.offsetHeight - window.innerHeight;

    if (rect.top > 0 || scrollable <= 0) {
      render(0);
      return;
    }

    const progress = clamp((-rect.top / scrollable) * order.length, 0, order.length);
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

/* ── Business page section entrance animations ─────────────── */
(function () {
  const sections = Array.from(document.querySelectorAll('.biz-areas, .biz-vision'));
  if (!sections.length) return;

  function show(section) {
    if (section.classList.contains('is-animated-in')) return;
    section.classList.add('is-animated-in');
  }

  function hide(section) {
    if (!section.classList.contains('is-animated-in')) return;
    section.classList.remove('is-animated-in');
  }

  function checkSkippedSections() {
    const playTopLine = window.innerHeight * 1.18;
    const playBottomLine = window.innerHeight * -0.08;
    const resetAboveLine = window.innerHeight * 1.28;
    const resetBelowLine = window.innerHeight * -0.2;
    sections.forEach((section) => {
      const rect = section.getBoundingClientRect();
      const isInReplayZone = rect.top <= playTopLine && rect.bottom >= playBottomLine;
      if (isInReplayZone) {
        show(section);
      } else if (rect.top > resetAboveLine || rect.bottom < resetBelowLine) {
        hide(section);
      }
    });
  }

  if (!('IntersectionObserver' in window)) {
    sections.forEach(show);
    return;
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        show(entry.target);
      } else {
        hide(entry.target);
      }
    });
  }, { threshold: 0, rootMargin: '18% 0px 8% 0px' });

  sections.forEach((section) => io.observe(section));
  window.addEventListener('scroll', checkSkippedSections, { passive: true });
  window.addEventListener('resize', checkSkippedSections);
  window.addEventListener('load', checkSkippedSections);
  checkSkippedSections();
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
