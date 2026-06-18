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

/* ── 역량 다이어그램(펜타곤): 노드 hover/클릭 → 캡션 표시 ── */
(function () {
  // 측면 캡션(box5) — hover 는 CSS, 클릭은 box5.is-active 토글
  document.querySelectorAll('.box5 .biz-node5').forEach(function (node) {
    node.addEventListener('click', function () {
      const box = node.closest('.box5');
      if (box) box.classList.toggle('is-active');
    });
  });
  // 특화기술 노드 — 하단 캡션과 떨어져 있어 JS 로 hover/클릭 연결
  const techNode = document.querySelector('.row5--b .biz-node5');
  const bottomCap = document.querySelector('.cap5-bottom');
  if (techNode && bottomCap) {
    techNode.addEventListener('mouseenter', function () { bottomCap.classList.add('is-hover'); });
    techNode.addEventListener('mouseleave', function () { bottomCap.classList.remove('is-hover'); });
    techNode.addEventListener('click', function () { bottomCap.classList.toggle('is-active'); });
  }
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

/* ── ① GNB: 업스크롤 시에만 표시 ───────────────────────────── */
(function () {
  const gnb = document.getElementById('gnb');
  if (!gnb) return;
  const THRESHOLD = 80;
  let lastY = window.scrollY;
  window.addEventListener('scroll', function () {
    const y = window.scrollY;
    gnb.classList.toggle('is-scrolled', y > THRESHOLD);
    if (y > THRESHOLD) {
      gnb.classList.toggle('is-hidden', y > lastY);
    } else {
      gnb.classList.remove('is-hidden');
    }
    lastY = y;
  }, { passive: true });
})();

/* ── 히어로 카테고리 탭: 한 번에 하나만 활성 ──────────────── */
(function () {
  const tabs = Array.from(document.querySelectorAll('.biz-branch-tabs__item'));
  if (!tabs.length) return;
  // 초기: 첫 번째만 활성
  tabs.forEach((t, i) => t.classList.toggle('is-active', i === 0));
  tabs.forEach((tab) => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      tabs.forEach((t) => t.classList.remove('is-active'));
      tab.classList.add('is-active');
    });
  });
})();

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
