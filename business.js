/* =============================================================
   AQUA PLANET — business.js
   Business Overview 페이지 인터랙션
     ① GNB: 업스크롤 시에만 표시 (다른 페이지와 동일)
     ② 스크롤 등장(.reveal → .is-visible)
     ③ 사업분야 검색 필터 (#biz-search → 해당 블록만 강조)
   ============================================================= */

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
