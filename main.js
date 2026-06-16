/* =============================================================
   AQUA PLANET — main.js
   ============================================================= */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
  initReveal();
  initGnb();
  initScrollIndicator();
  initLogoScrollGate();
  initIntroReveal();
  initIntroScrollGate();
  initSmoothScroll();
  initSectionScrollAnim();
  initCrewScroll();
  initBookingBgVideo();
  initGlassBubbles();
  initCrewFishMatte();
  initMapMarkers();
  initTopBtn();
  initCustomCursor();
  initCursorWave();
});


/* =============================================================
   0-A. SMOOTH SCROLL — 부드럽고 느린 휠 스크롤 (크루 섹션 이후 활성화)
   ============================================================= */
function initSmoothScroll() {
  let targetY = window.scrollY;
  let currentY = window.scrollY;
  let rafId = null;
  let isSelf = false;

  const ease = 0.08;        /* 낮을수록 느리고 부드러움 (0.08 ≈ 0.5초에 90% 도달) */
  const speedScale = 0.80;  /* 휠 delta 감속 비율 */

  function clamp(v) {
    return Math.max(0, Math.min(document.documentElement.scrollHeight - window.innerHeight, v));
  }

  function tick() {
    const diff = targetY - currentY;
    if (Math.abs(diff) < 0.4) {
      currentY = targetY;
      isSelf = true;
      window.scrollTo(0, currentY);
      isSelf = false;
      rafId = null;
      return;
    }
    currentY += diff * ease;
    isSelf = true;
    window.scrollTo(0, Math.round(currentY));
    isSelf = false;
    rafId = requestAnimationFrame(tick);
  }

  window.addEventListener('wheel', (e) => {
    if (!crewScrollUnlocked) return;
    if (diveActive) return;

    e.preventDefault();
    targetY = clamp(targetY + e.deltaY * speedScale);

    /* 외부(앵커 클릭 등)에 의해 위치가 크게 바뀐 경우 currentY 보정 */
    if (Math.abs(currentY - window.scrollY) > 80) {
      currentY = window.scrollY;
    }

    if (!rafId) rafId = requestAnimationFrame(tick);
  }, { passive: false });

  /* 앵커 링크 · scrollIntoView 등 외부 스크롤 발생 시 target 동기화 */
  window.addEventListener('scroll', () => {
    if (isSelf) return;
    if (rafId) return;
    targetY = window.scrollY;
    currentY = window.scrollY;
  }, { passive: true });
}


/* =============================================================
   0-A-2. SECTION SCROLL ANIMATION — 타이틀 고정 + 콘텐츠 페이드인 (스냅 없음)
   ============================================================= */
function initSectionScrollAnim() {
  const configs = [
    { id: 'sec-program',  rippleSelector: '.program-seq-content',  ripple: true  },
    { id: 'sec-location', rippleSelector: '.location-seq-content', ripple: true  },
    { id: 'sec-booking',  rippleSelector: null,                    ripple: false },
  ];

  const items = configs.map(cfg => {
    const section = document.getElementById(cfg.id);
    return section ? { section, cfg, contentWasVisible: false } : null;
  }).filter(Boolean);

  if (!items.length) return;

  function clamp01(v) { return Math.min(Math.max(v, 0), 1); }
  function smoothstep(e0, e1, v) {
    const t = clamp01((v - e0) / (e1 - e0));
    return t * t * (3 - 2 * t);
  }

  function onScroll() {
    const vh = window.innerHeight;

    items.forEach(item => {
      const { section, cfg } = item;
      const rect = section.getBoundingClientRect();
      const scrollSpan = vh + Math.max(0, rect.height - vh);
      const progress = clamp01((vh - rect.top) / scrollSpan);

      const nextOverlapExit = 1 - smoothstep(vh * 0.58, vh * 0.82, rect.bottom);
      const bottomExit = clamp01((vh * 0.18 - rect.bottom) / (vh * 0.18));
      const exitProgress = Math.max(nextOverlapExit, bottomExit);

      const titleProgress = smoothstep(0.34, 0.44, progress);
      const contentEnterProgress = smoothstep(0.52, 0.68, progress);
      const contentExitLift = smoothstep(0.86, 1, progress);
      const contentLeaveProgress = Math.max(exitProgress, contentExitLift);
      const contentY = (1 - contentEnterProgress) * 52 - contentExitLift * 32;
      const isPast = rect.bottom <= 0;

      const titleOpacity = titleProgress * (1 - contentLeaveProgress);
      const contentOpacity = contentEnterProgress * (1 - contentLeaveProgress);

      section.style.setProperty('--seq-content-y', `${contentY.toFixed(2)}vh`);
      section.style.setProperty('--seq-title-opacity', titleOpacity.toFixed(3));
      section.style.setProperty('--seq-content-opacity', contentOpacity.toFixed(3));

      section.classList.toggle('is-title-visible',   titleOpacity   > 0.01 && !isPast);
      section.classList.toggle('is-content-visible', contentOpacity > 0.01 && !isPast);

      if (cfg.ripple && contentOpacity > 0.3 && !item.contentWasVisible) {
        const el = section.querySelector(cfg.rippleSelector);
        if (el) triggerContentRipple(el);
      }
      item.contentWasVisible = contentOpacity > 0.3;
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

function triggerContentRipple(el) {
  const dispMap = document.getElementById('dive-disp-map');
  const turbEl  = document.getElementById('dive-turbulence');
  if (!dispMap || !turbEl || typeof gsap === 'undefined') return;

  el.style.filter = 'url(#dive-warp)';

  let rafId;
  const t0 = performance.now();
  (function tickRipple() {
    const t   = (performance.now() - t0) / 1000;
    const bfx = (0.005 + Math.sin(t * 3.2) * 0.0018).toFixed(5);
    const bfy = (0.009 + Math.cos(t * 2.7) * 0.0022).toFixed(5);
    turbEl.setAttribute('baseFrequency', `${bfx} ${bfy}`);
    rafId = requestAnimationFrame(tickRipple);
  })();

  gsap.killTweensOf(dispMap);
  dispMap.setAttribute('scale', '0');

  gsap.timeline({
    onComplete() {
      cancelAnimationFrame(rafId);
      turbEl.setAttribute('baseFrequency', '0.004 0.007');
      dispMap.setAttribute('scale', '0');
      el.style.filter = '';
    },
  })
    .to(dispMap, { attr: { scale: 18 }, duration: 0.22, ease: 'sine.out'   })
    .to(dispMap, { attr: { scale:  6 }, duration: 0.26, ease: 'sine.inOut' })
    .to(dispMap, { attr: { scale: 12 }, duration: 0.22, ease: 'sine.inOut' })
    .to(dispMap, { attr: { scale:  0 }, duration: 0.55, ease: 'power2.out' });
}


/* =============================================================
   0-B. HERO / CREW ~ BOOKING GLASS BUBBLES
   ============================================================= */
function initGlassBubbles() {
  const roots = document.querySelectorAll('[data-bubble-root]');
  if (!roots.length) return;

  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let resizeTimer = null;

  function random(min, max) {
    return Math.random() * (max - min) + min;
  }

  function buildBubbles() {
    roots.forEach(root => root.querySelectorAll('[data-bubble-side]').forEach(side => side.replaceChildren()));

    if (motionQuery.matches) return;

    roots.forEach(root => {
      const sides = root.querySelectorAll('[data-bubble-side]');
      const rootHeight = Math.max(root.offsetHeight, window.innerHeight);
      const bubblesPerSide = Math.min(30, Math.max(16, Math.round(rootHeight / 260)));

      sides.forEach(side => {
        const sideWidth = Math.max(side.clientWidth, 72);

        for (let i = 0; i < bubblesPerSide; i += 1) {
          const bubble = document.createElement('span');
          const size = random(14, 54);
          const maxX = Math.max(4, sideWidth - size - 8);
          const y = random(0, rootHeight + window.innerHeight * 0.35);
          const duration = random(15, 30);
          const delay = random(-duration, 4);
          const drift = random(-34, 34);

          bubble.className = 'glass-bubble';
          bubble.style.setProperty('--bubble-size', `${size.toFixed(1)}px`);
          bubble.style.setProperty('--bubble-x', `${random(4, maxX).toFixed(1)}px`);
          bubble.style.setProperty('--bubble-y', `${y.toFixed(1)}px`);
          bubble.style.setProperty('--bubble-duration', `${duration.toFixed(2)}s`);
          bubble.style.setProperty('--bubble-delay', `${delay.toFixed(2)}s`);
          bubble.style.setProperty('--bubble-drift', `${drift.toFixed(1)}px`);
          bubble.style.setProperty('--bubble-sway', `${random(6, 22).toFixed(1)}px`);
          bubble.style.setProperty('--bubble-sway-duration', `${random(3.8, 7.8).toFixed(2)}s`);
          bubble.style.setProperty('--bubble-opacity', `${random(0.16, 0.42).toFixed(2)}`);

          side.appendChild(bubble);
        }
      });
    });
  }

  function scheduleBuild() {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(buildBubbles, 120);
  }

  buildBubbles();
  window.addEventListener('resize', scheduleBuild, { passive: true });

  if (typeof motionQuery.addEventListener === 'function') {
    motionQuery.addEventListener('change', buildBubbles);
  } else if (typeof motionQuery.addListener === 'function') {
    motionQuery.addListener(buildBubbles);
  }
}


/* =============================================================
   1. SCROLL REVEAL
   ============================================================= */
function initReveal() {
  const targets = document.querySelectorAll('.reveal');
  if (!targets.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  targets.forEach(el => observer.observe(el));
}


/* =============================================================
   2. GNB
   ============================================================= */
function initGnb() {
  const gnb      = document.getElementById('gnb');
  const logo     = document.getElementById('sec-logo');
  const navLinks = document.querySelectorAll('.gnb__link');
  const sections = document.querySelectorAll('section[id]');
  const SCROLL_THRESHOLD = 80;

  const sectionNavMap = {
    'sec-intro':    'about',
    'sec-crew':     'crew',
    'sec-program':  'program',
    'sec-location': 'about',
    'sec-booking':  'about',
  };

  let lastScrollY = window.scrollY;
  let gnbUnlocked = false;

  function unlockGnb() {
    if (gnbUnlocked) return;
    gnbUnlocked = true;
    gnb.classList.remove('gnb--logo-mode');
  }

  function onScroll() {
    const currentY = window.scrollY;

    // 로고 섹션이 뷰포트 밖으로 나가면 GNB 표시
    if (!gnbUnlocked && logo && logo.getBoundingClientRect().bottom <= 0) {
      unlockGnb();
    }

    // 로고 섹션 재진입 시 다시 숨김
    if (gnbUnlocked && logo && logo.getBoundingClientRect().bottom > 0) {
      gnbUnlocked = false;
      gnb.classList.add('gnb--logo-mode');
    }

    if (!gnbUnlocked) {
      lastScrollY = currentY;
      return;
    }

    gnb.classList.toggle('is-scrolled', currentY > SCROLL_THRESHOLD);

    lastScrollY = currentY;

    let activeNav = 'about';
    sections.forEach(sec => {
      const rect = sec.getBoundingClientRect();
      if (rect.top <= window.innerHeight / 2) {
        activeNav = sectionNavMap[sec.id] ?? activeNav;
      }
    });

    navLinks.forEach(link => {
      link.classList.toggle('gnb__link--active', link.dataset.nav === activeNav);
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}


/* =============================================================
   3. 스크롤 인디케이터 — 페이드 아웃 + 클릭 시 잠수 전환
   ============================================================= */
function initScrollIndicator() {
  const indicator = document.querySelector('.scroll-indicator');
  const trigger   = document.getElementById('dive-trigger');
  const intro     = document.getElementById('sec-intro');
  if (!indicator) return;

  window.addEventListener('scroll', () => {
    if (!crewScrollUnlocked && !diveActive) {
      indicator.style.opacity = '1';
      indicator.style.transform = 'translateX(-50%) translateY(0)';
      return;
    }

    const introTop     = intro ? window.scrollY + intro.getBoundingClientRect().top : 0;
    const scrolledIn   = Math.max(0, window.scrollY - introTop);
    const progress     = Math.min(scrolledIn / 150, 1);
    indicator.style.opacity   = String(1 - progress);
    indicator.style.transform = `translateX(-50%) translateY(${progress * 20}px)`;
  }, { passive: true });

  if (trigger) trigger.addEventListener('click', triggerDive);
}


/* =============================================================
   3-B. 로고 섹션 — Enter 버튼
        스크롤 트랜지션(logo3d.js)이 안무·축소를 담당하므로
        여기서는 Enter 클릭 시 트랜지션 끝(sec-intro)으로 부드럽게 이동만 처리.
   ============================================================= */
function initLogoScrollGate() {
  const intro    = document.getElementById('sec-intro');
  const enterBtn = document.querySelector('.logo-scroll');
  if (!intro || !enterBtn) return;

  enterBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopImmediatePropagation();
    intro.scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => {
      intro.querySelectorAll('.reveal').forEach(el => el.classList.add('is-visible'));
    }, 400);
  });

  /* 페이지 최상단으로 돌아오면 리셋 */
  window.addEventListener('scroll', () => {
    if (window.scrollY < 60) {
      scrollCount = 0;
      gateOpen    = false;
    }
  }, { passive: true });
}


/* =============================================================
   3-C. 인트로 섹션 아래서-등장 리빌
        로고가 헤더로 70% 진입했을 때 #sec-intro가 아래에서 슬라이드 인.
   ============================================================= */
function initIntroReveal() {
  const intro = document.getElementById('sec-intro');
  const logo  = document.getElementById('sec-logo');
  if (!intro) return;

  const introContent = intro.querySelector('.hero__text');
  if (!introContent) return;
  introContent.classList.add('is-visible');

  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined' || !logo) return;

  ScrollTrigger.create({
    trigger: '#sec-logo',
    start: '70% top',
    onEnter: () => introContent.classList.add('is-visible'),
    onLeaveBack: () => introContent.classList.add('is-visible'),
    once: false,
  });
}


/* =============================================================
   4. 잠수 전환 — 전화면 물결 왜곡 (unseen.co 스타일)
   ============================================================= */
let diveActive = false;
let crewScrollUnlocked = false;

function initIntroScrollGate() {
  const intro = document.getElementById('sec-intro');
  const crew  = document.getElementById('sec-crew');
  if (!intro || !crew) return;

  const indicator = document.querySelector('.scroll-indicator');
  let touchStartY = 0;
  let hintTimer = 0;

  function sectionTop(el) {
    return Math.round(window.scrollY + el.getBoundingClientRect().top);
  }

  function nudgeDiveHint() {
    if (!indicator) return;

    indicator.classList.remove('is-hinting');
    void indicator.offsetWidth;
    indicator.classList.add('is-hinting');

    window.clearTimeout(hintTimer);
    hintTimer = window.setTimeout(() => {
      indicator.classList.remove('is-hinting');
    }, 1400);
  }

  function isBeforeCrew() {
    const crewTop = sectionTop(crew);
    return window.scrollY < crewTop - 4;
  }

  function isAtOrAfterIntro() {
    const introTop = sectionTop(intro);
    return window.scrollY >= introTop - 4;
  }

  function shouldBlockDown() {
    return !crewScrollUnlocked && !diveActive && isAtOrAfterIntro() && isBeforeCrew();
  }

  function clampToIntro() {
    if (crewScrollUnlocked || diveActive) return;

    const introTop = sectionTop(intro);
    const crewTop = sectionTop(crew);
    const y = window.scrollY;

    if (y > introTop + 2 && y < crewTop) {
      const html = document.documentElement;
      const prevHtmlBehavior = html.style.scrollBehavior;
      const prevBodyBehavior = document.body.style.scrollBehavior;

      html.style.scrollBehavior = 'auto';
      document.body.style.scrollBehavior = 'auto';
      window.scrollTo(0, introTop);
      html.style.scrollBehavior = prevHtmlBehavior;
      document.body.style.scrollBehavior = prevBodyBehavior;
    }
  }

  window.addEventListener('wheel', (e) => {
    if (e.deltaY > 0 && shouldBlockDown()) {
      e.preventDefault();
      nudgeDiveHint();
    }
  }, { passive: false });

  window.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0]?.clientY ?? 0;
  }, { passive: true });

  window.addEventListener('touchmove', (e) => {
    const y = e.touches[0]?.clientY ?? touchStartY;
    if (touchStartY - y > 30 && shouldBlockDown()) {
      e.preventDefault();
      nudgeDiveHint();
    }
  }, { passive: false });

  window.addEventListener('keydown', (e) => {
    const downKeys = ['ArrowDown', 'PageDown', ' ', 'End'];
    if (downKeys.includes(e.key) && shouldBlockDown()) {
      e.preventDefault();
      nudgeDiveHint();
    }
  });

  window.addEventListener('scroll', () => {
    if (diveActive) return;

    const y = window.scrollY;
    const crewTop = sectionTop(crew);

    if (y < crewTop - 4) crewScrollUnlocked = false;
    clampToIntro();
  }, { passive: true });

  clampToIntro();
}


/* =============================================================
   0-C. CREW FISH VIDEO MATTE
   ============================================================= */
function initCrewFishMatte() {
  const video = document.getElementById('crew-fish-source');
  const canvas = document.getElementById('crew-fish-bg');
  if (!video || !canvas) return;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;

  const processWidth = 420;
  let processHeight = 236;
  let running = true;

  function clamp01(value) {
    return Math.max(0, Math.min(1, value));
  }

  function smoothstep(edge0, edge1, value) {
    const t = clamp01((value - edge0) / (edge1 - edge0));
    return t * t * (3 - 2 * t);
  }

  function resizeCanvas() {
    const vw = video.videoWidth || 1280;
    const vh = video.videoHeight || 720;
    processHeight = Math.max(1, Math.round(processWidth * (vh / vw)));
    canvas.width = processWidth;
    canvas.height = processHeight;
  }

  function sampleBackground(data, width, height) {
    const box = Math.max(6, Math.round(Math.min(width, height) * 0.055));
    const points = [
      [0, 0],
      [width - box, 0],
      [0, height - box],
      [width - box, height - box]
    ];
    let r = 0, g = 0, b = 0, count = 0;

    points.forEach(([sx, sy]) => {
      for (let y = sy; y < sy + box; y += 1) {
        for (let x = sx; x < sx + box; x += 1) {
          const i = (y * width + x) * 4;
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          count += 1;
        }
      }
    });

    return {
      r: r / count,
      g: g / count,
      b: b / count
    };
  }

  function matteFrame() {
    if (!running) return;
    requestAnimationFrame(matteFrame);

    if (video.readyState < 2 || !video.videoWidth) return;
    if (canvas.width !== processWidth) resizeCanvas();

    let frame;
    try {
      ctx.drawImage(video, 0, 0, processWidth, processHeight);
      frame = ctx.getImageData(0, 0, processWidth, processHeight);
    } catch (err) {
      running = false;
      console.warn('[crew fish] 영상 누끼 처리 중단:', err);
      return;
    }

    const data = frame.data;
    const bg = sampleBackground(data, processWidth, processHeight);

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const dist = Math.hypot(r - bg.r, g - bg.g, b - bg.b);
      const luma = r * 0.2126 + g * 0.7152 + b * 0.0722;
      const alpha = smoothstep(30, 112, dist) * smoothstep(10, 34, luma);

      data[i + 3] = Math.round(255 * alpha);
    }

    ctx.putImageData(frame, 0, 0);
  }

  video.addEventListener('loadedmetadata', resizeCanvas, { once: true });
  video.play().catch(() => {});

  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    if (running) matteFrame();
  });

  matteFrame();
}

/**
 * useSectionTransition
 * rAF로 feTurbulence baseFrequency를 흔들어 파동이 "흐르는" 느낌을 만들고,
 * feDisplacementMap scale을 0→30→0 으로 애니메이션해 전화면 물결 왜곡을 연출.
 *
 * @param {{ from, to, onPeak?, onDone? }} opts
 * @returns {gsap.core.Timeline|null}
 */
function useSectionTransition({ from, to, onPeak, onDone } = {}) {
  const dispMap  = document.getElementById('dive-disp-map');
  const turbEl   = document.getElementById('dive-turbulence');
  const vignette = document.getElementById('dive-vignette');
  const mainEl   = document.getElementById('main');

  if (!dispMap || !turbEl || !vignette || !mainEl || !from || !to) return null;

  /* 필터를 #main 전체에 적용 */
  gsap.set(mainEl, { filter: 'url(#dive-warp)' });
  gsap.set(to, { opacity: 0 });   /* Y 이동 없음 — 경계선 아티팩트 방지 */

  /* rAF — baseFrequency를 미세하게 흔들어 파동이 살아있게 함 */
  let rafId;
  const t0 = performance.now();
  (function tickTurbulence() {
    const t   = (performance.now() - t0) / 1000;
    const bfx = (0.004 + Math.sin(t * 2.1) * 0.0018).toFixed(5);
    const bfy = (0.007 + Math.cos(t * 1.7) * 0.0025).toFixed(5);
    turbEl.setAttribute('baseFrequency', `${bfx} ${bfy}`);
    rafId = requestAnimationFrame(tickTurbulence);
  })();

  const tl = gsap.timeline({
    defaults: { overwrite: 'auto' },
    onComplete() {
      cancelAnimationFrame(rafId);
      turbEl.setAttribute('baseFrequency', '0.004 0.007'); /* 원래 값 복원 */
      gsap.set([mainEl, from, to, vignette], { clearProps: 'all' });
      onDone?.();
    },
  });

  /* 변위 스케일  0 → 30 → 0 */
  /* 파동 상승 1.1s → 정점 유지 → 하강 2.0s  (총 ~3.1s) */
  tl.to(dispMap, { attr: { scale: 35 }, duration: 1.1,  ease: 'power2.in'  }, 0)
    .to(dispMap, { attr: { scale:  0 }, duration: 2.0,  ease: 'expo.out'   }, 1.1)

  /* 비네트 */
  tl.to(vignette, { opacity: 0.3, duration: 1.0, ease: 'power2.in'  }, 0)
    .to(vignette, { opacity: 0,   duration: 1.8, ease: 'power2.out' }, 1.1)

  /* 이전 섹션 페이드 아웃 — 스크롤 점프 직전에 완전히 가려짐 */
  tl.to(from, { opacity: 0, duration: 0.8, ease: 'power2.in' }, 0)

  /* t=0.8s 스크롤 점프 — displacement가 아직 올라가는 중이라 전환이 가려짐 */
  tl.call(() => onPeak?.(), null, 0.8)

  /* 다음 섹션 — 빠르게 나타나서 t=1.1s 파동 정점에서 충분히 보이도록 */
  tl.to(to, { opacity: 1, duration: 0.75, ease: 'expo.out' }, 0.8);

  return tl;
}

function triggerDive() {
  if (diveActive) return;
  diveActive = true;
  crewScrollUnlocked = true;

  if (typeof gsap === 'undefined') {
    document.getElementById('sec-crew')?.scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => {
      document.dispatchEvent(new CustomEvent('crew-force-enter'));
    }, 450);
    diveActive = false;
    return;
  }

  const fromEl = document.getElementById('sec-intro');
  const toEl   = document.querySelector('.crew-sticky');

  if (!fromEl || !toEl) { diveActive = false; return; }

  useSectionTransition({
    from:   fromEl,
    to:     toEl,
    onPeak: () => {
      const crewEl = document.getElementById('sec-crew');
      if (crewEl) {
        const top = Math.round(crewEl.getBoundingClientRect().top + window.scrollY);
        /* CSS scroll-behavior:smooth를 우회해 즉시 이동 (behavior:'instant' 우선, 미지원 시 폴백) */
        const html = document.documentElement;
        html.style.scrollBehavior = 'auto';
        document.body.style.scrollBehavior = 'auto';
        try {
          window.scrollTo({ top, behavior: 'instant' });
        } catch (_) {
          window.scrollTo(0, top);
        }
        html.style.scrollBehavior = '';
        document.body.style.scrollBehavior = '';
      }
      document.dispatchEvent(new CustomEvent('crew-force-enter'));
    },
    onDone: () => { diveActive = false; },
  });
}


/* =============================================================
   5. Our Crew — 스크롤 드리븐 패널 전환
   ============================================================= */
function initCrewScroll() {
  const section     = document.getElementById('sec-crew');
  if (!section) return;

  const panels      = document.querySelectorAll('.crew-panel');
  const dots        = document.querySelectorAll('.crew-dot');
  const placeholder = document.getElementById('crew-placeholder');
  const sticky      = section.querySelector('.crew-sticky');

  if (!panels.length || !sticky) return;

  const creatures  = ['walrus', 'beluga', 'whaleshark', 'turtle'];
  const totalPanels = panels.length;
  let currentIndex  = -1;
  let tailHidden    = false;
  let exitWavePlayed = false;
  let lastCrewCardWaveAt = 0;
  let crewCardWaveTl = null;

  function playCrewCardWave() {
    const wrap    = document.querySelector('.crew-info-wrap');
    const dispMap = document.getElementById('dive-disp-map');
    const turbEl  = document.getElementById('dive-turbulence');

    if (!wrap || !dispMap || !turbEl || typeof gsap === 'undefined') return;
    const now = performance.now();
    if (now - lastCrewCardWaveAt < 260) return;
    lastCrewCardWaveAt = now;

    wrap.style.filter = 'url(#dive-warp)';
    turbEl.setAttribute('baseFrequency', '0.0038 0.0068');
    dispMap.setAttribute('scale', '0');

    crewCardWaveTl?.kill();
    crewCardWaveTl = gsap.timeline({
      defaults: { overwrite: 'auto' },
      onComplete() {
        turbEl.setAttribute('baseFrequency', '0.004 0.007');
        dispMap.setAttribute('scale', '0');
        wrap.style.filter = '';
        crewCardWaveTl = null;
      },
    });

    crewCardWaveTl
      .to(dispMap, { attr: { scale: 34 }, duration: 0.18, ease: 'sine.out' })
      .to(dispMap, { attr: { scale: 0 }, duration: 0.86, ease: 'power3.out' });
  }

  function playCrewExitWave() {
    const dispMap = document.getElementById('dive-disp-map');
    const turbEl  = document.getElementById('dive-turbulence');

    if (!sticky || !dispMap || !turbEl || typeof gsap === 'undefined') return;

    sticky.style.filter = 'url(#dive-warp)';

    let rafId;
    const t0 = performance.now();
    (function tickCrewExitWave() {
      const t   = (performance.now() - t0) / 1000;
      const bfx = (0.007 + Math.sin(t * 2.9) * 0.0028).toFixed(5);
      const bfy = (0.012 + Math.cos(t * 2.1) * 0.0032).toFixed(5);
      turbEl.setAttribute('baseFrequency', `${bfx} ${bfy}`);
      rafId = requestAnimationFrame(tickCrewExitWave);
    })();

    gsap.fromTo(
      dispMap,
      { attr: { scale: 38 } },
      {
        attr: { scale: 0 },
        duration: 1.05,
        ease: 'expo.out',
        onComplete() {
          cancelAnimationFrame(rafId);
          turbEl.setAttribute('baseFrequency', '0.004 0.007');
          dispMap.setAttribute('scale', '0');
          sticky.style.filter = '';
        },
      }
    );
  }

  function setActive(idx, force = false) {
    if (idx === currentIndex && !force) return;
    const prevIndex = currentIndex;
    currentIndex = idx;

    panels.forEach((p, i) => {
      p.classList.remove('is-active', 'is-prev');
      if      (i === idx) p.classList.add('is-active');
      else if (i  <  idx) p.classList.add('is-prev');
    });

    dots.forEach((d, i) => d.classList.toggle('is-active', i === idx));

    if (placeholder) placeholder.dataset.creature = creatures[idx] ?? '';

    /* Three.js crew3d.js에 전달 */
    document.dispatchEvent(new CustomEvent('crew-switch', { detail: { idx, immediate: force } }));

    if (force || (prevIndex >= 0 && prevIndex !== idx)) playCrewCardWave();
  }

  function onScroll() {
    const rect    = section.getBoundingClientRect();
    const scrolled = -rect.top; /* 섹션 상단으로부터 스크롤된 px */
    const panelHeight = window.innerHeight;
    const exitStart = totalPanels * panelHeight;

    if (!crewScrollUnlocked && !diveActive) {
      if (exitWavePlayed) {
        document.dispatchEvent(new CustomEvent('crew-wave-exit-reset'));
      }
      section.classList.remove('is-title-visible', 'is-crew-exiting', 'is-content-visible', 'is-crew-wave-exiting');
      tailHidden = false;
      exitWavePlayed = false;
      document.dispatchEvent(new CustomEvent('crew-tail-visibility', { detail: { hidden: true } }));
      return;
    }

    if (scrolled < -10) {
      if (exitWavePlayed) {
        document.dispatchEvent(new CustomEvent('crew-wave-exit-reset'));
      }
      section.classList.remove('is-title-visible', 'is-crew-exiting', 'is-content-visible', 'is-crew-wave-exiting');
      tailHidden = false;
      exitWavePlayed = false;
      document.dispatchEvent(new CustomEvent('crew-tail-visibility', { detail: { hidden: false } }));
      setActive(0);
      return;
    }

    const pastLastPanel = scrolled >= exitStart;
    if (pastLastPanel) {
      if (!tailHidden) {
        tailHidden = true;
        document.dispatchEvent(new CustomEvent('crew-tail-visibility', { detail: { hidden: true } }));
      }
      section.classList.add('is-crew-exiting');
      if (!exitWavePlayed) {
        exitWavePlayed = true;
        section.classList.add('is-crew-wave-exiting');
        document.dispatchEvent(new CustomEvent('crew-wave-exit'));
        playCrewExitWave();
      }
      return;
    }

    if (exitWavePlayed) {
      document.dispatchEvent(new CustomEvent('crew-wave-exit-reset'));
    }
    section.classList.remove('is-crew-exiting', 'is-crew-wave-exiting');
    exitWavePlayed = false;

    if (tailHidden) {
      tailHidden = false;
      document.dispatchEvent(new CustomEvent('crew-tail-visibility', { detail: { hidden: false } }));
    }

    /* 각 패널은 100vh(= innerHeight)씩 차지 */
    const wasContentVisible = section.classList.contains('is-content-visible');
    section.classList.add('is-title-visible', 'is-content-visible');

    const idx = Math.min(
      Math.floor(scrolled / panelHeight),
      totalPanels - 1
    );
    setActive(Math.max(idx, 0), !wasContentVisible);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  document.addEventListener('crew-force-enter', () => {
    section.classList.remove('is-crew-exiting', 'is-crew-wave-exiting');
    section.classList.add('is-title-visible', 'is-content-visible');
    tailHidden = false;
    exitWavePlayed = false;
    setActive(0, true);
  });
  document.addEventListener('crew-card-reenter', playCrewCardWave);

  /* 점 클릭 → 해당 패널 위치로 스크롤 */
  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => {
      const sTop = window.scrollY + section.getBoundingClientRect().top;
      window.scrollTo({ top: sTop + i * window.innerHeight, behavior: 'smooth' });
    });
  });

}


/* =============================================================
   6. PROGRAM SECTION SEQUENCE
   ============================================================= */
function initProgramSequence() {
  initStickySequenceSection('sec-program');
}


/* =============================================================
   6-B. LOCATION SECTION SEQUENCE
   ============================================================= */
function initLocationSequence() {
  initStickySequenceSection('sec-location');
}


/* =============================================================
   6-C. BOOKING SECTION SEQUENCE
   ============================================================= */
function initBookingSequence() {
  initStickySequenceSection('sec-booking');
}

function initBookingBgVideo() {
  document.querySelectorAll('.booking-bg-video').forEach(video => {
    const rate = Number(video.dataset.playbackRate || 1);
    if (Number.isFinite(rate) && rate > 0) {
      video.playbackRate = rate;
      video.defaultPlaybackRate = rate;
    }
  });
}

const stickySequenceControllers = [];
let stickySequenceWheelBound = false;
let stickySequenceSnapRaf = 0;
let stickySequenceHtmlBehavior = '';
let stickySequenceBodyBehavior = '';
let stickySequenceWheelDelta = 0;
let stickySequenceWheelTimer = 0;

function initStickySequenceSection(sectionId) {
  const section = document.getElementById(sectionId);
  if (!section) return;
  let contentWasVisible = false;
  let lastProgress = 0;
  let holdWheelCount = 0;

  function clamp01(value) {
    return Math.min(Math.max(value, 0), 1);
  }

  function smoothstep(edge0, edge1, value) {
    const t = clamp01((value - edge0) / (edge1 - edge0));
    return t * t * (3 - 2 * t);
  }

  function getSectionMetrics() {
    const rect = section.getBoundingClientRect();
    const vh = window.innerHeight;
    const sectionTop = window.scrollY + rect.top;
    const scrollSpan = vh + Math.max(0, rect.height - vh);
    const progress = clamp01((vh - rect.top) / scrollSpan);
    return { rect, vh, sectionTop, scrollSpan, progress };
  }

  function scrollTargetForProgress(progress) {
    const { vh, sectionTop, scrollSpan } = getSectionMetrics();
    const maxScroll = document.documentElement.scrollHeight - vh;
    return Math.min(Math.max(sectionTop - vh + progress * scrollSpan, 0), maxScroll);
  }

  function onScroll() {
    const { rect, vh, scrollSpan, progress } = getSectionMetrics();
    const nextOverlapExit = 1 - smoothstep(vh * 0.58, vh * 0.82, rect.bottom);
    const bottomExit = clamp01((vh * 0.18 - rect.bottom) / (vh * 0.18));
    const exitProgress = Math.max(nextOverlapExit, bottomExit);
    const titleProgress = smoothstep(0.34, 0.44, progress);
    const contentEnterProgress = smoothstep(0.52, 0.68, progress);
    const contentExitLift = smoothstep(0.86, 1, progress);
    const contentLeaveProgress = Math.max(exitProgress, contentExitLift);
    const contentY = (1 - contentEnterProgress) * 52 - contentExitLift * 32;
    const isInRange = rect.top < vh && rect.bottom > 0;
    const isPast = rect.bottom <= 0;
    const titleOpacity = titleProgress * (1 - contentLeaveProgress);
    const contentOpacity = contentEnterProgress * (1 - contentLeaveProgress);
    const scrollingDown = progress >= lastProgress;

    section.style.setProperty('--seq-content-y', `${contentY.toFixed(2)}vh`);
    section.style.setProperty('--seq-title-opacity', titleOpacity.toFixed(3));
    section.style.setProperty('--seq-content-opacity', contentOpacity.toFixed(3));

    if (!isInRange && !isPast) {
      section.classList.remove('is-title-visible', 'is-content-visible', 'is-exiting');
      contentWasVisible = false;
      holdWheelCount = 0;
      lastProgress = progress;
      return;
    }

    const titleVisible = titleOpacity > 0.01 && !isPast;
    const contentVisible = contentOpacity > 0.01 && !isPast;
    const exiting = exitProgress > 0 || isPast;

    section.classList.toggle('is-title-visible', titleVisible);
    section.classList.toggle('is-content-visible', contentVisible);
    section.classList.toggle('is-exiting', exiting);

    if (contentOpacity > 0.3 && !contentWasVisible && !exiting && scrollingDown && sectionId !== 'sec-booking') {
      playSequenceWave(section);
    }
    contentWasVisible = contentOpacity > 0.3 && !exiting;
    lastProgress = progress;
  }

  const controller = {
    section,
    onScroll,
    getSectionMetrics,
    scrollTargetForProgress,
    getHoldWheelCount: () => holdWheelCount,
    setHoldWheelCount: (value) => { holdWheelCount = value; },
  };

  stickySequenceControllers.push(controller);
  window.addEventListener('scroll', onScroll, { passive: true });
  bindStickySequenceWheel();
  onScroll();
}

function bindStickySequenceWheel() {
  if (stickySequenceWheelBound) return;
  stickySequenceWheelBound = true;

  window.addEventListener('wheel', handleStickySequenceWheel, { passive: false });
}

function smoothStickySequenceScroll(controller, targetY, duration = 760) {
  if (stickySequenceSnapRaf) window.cancelAnimationFrame(stickySequenceSnapRaf);

  window.__sequenceSnapActive = true;

  const startY = window.scrollY;
  const deltaY = targetY - startY;
  const startedAt = performance.now();
  const html = document.documentElement;
  const body = document.body;
  stickySequenceHtmlBehavior = html.style.scrollBehavior;
  stickySequenceBodyBehavior = body.style.scrollBehavior;
  html.style.scrollBehavior = 'auto';
  body.style.scrollBehavior = 'auto';

  function tick(now) {
    const t = Math.min(Math.max((now - startedAt) / duration, 0), 1);
    const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    window.scrollTo(0, startY + deltaY * eased);

    if (t < 1) {
      stickySequenceSnapRaf = window.requestAnimationFrame(tick);
      return;
    }

    stickySequenceSnapRaf = 0;
    window.__sequenceSnapActive = false;
    html.style.scrollBehavior = stickySequenceHtmlBehavior;
    body.style.scrollBehavior = stickySequenceBodyBehavior;
    controller.onScroll();
  }

  stickySequenceSnapRaf = window.requestAnimationFrame(tick);
}

function getActiveStickySequenceController() {
  const candidates = stickySequenceControllers
    .map(controller => ({ controller, metrics: controller.getSectionMetrics() }))
    .filter(({ metrics }) => (
      metrics.rect.top < metrics.vh * 0.95 &&
      metrics.rect.bottom > metrics.vh * 0.42
    ));

  if (!candidates.length) return null;

  candidates.sort((a, b) => {
    const aDistance = Math.abs(a.metrics.progress - 0.72);
    const bDistance = Math.abs(b.metrics.progress - 0.72);
    return aDistance - bDistance;
  });

  return candidates[0];
}

function handleStickySequenceWheel(e) {
  if (e.defaultPrevented) return;

  if (window.__sequenceSnapActive) {
    e.preventDefault();
    return;
  }

  const active = getActiveStickySequenceController();
  if (!active) {
    stickySequenceControllers.forEach(controller => controller.setHoldWheelCount(0));
    stickySequenceWheelDelta = 0;
    return;
  }

  const { controller, metrics } = active;
  const { progress } = metrics;
  const holdProgress = 0.72;
  const exitProgress = 1.02;
  const lockedWheelLimit = 1;
  const wheelThreshold = 90;
  const rawGoingDown = e.deltaY > 0;
  const rawGoingUp = e.deltaY < 0;
  /* 섹션 초기 진입 구간(progress < 0.64)은 자연 스크롤 허용 — 진입 스냅 튕김 방지 */
  const shouldControl =
    (rawGoingDown && progress >= holdProgress - 0.08 && progress < 0.98) ||
    (rawGoingUp && progress > holdProgress + 0.08 && progress < 1);

  if (!shouldControl) {
    stickySequenceWheelDelta = 0;
    return;
  }

  e.preventDefault();
  window.clearTimeout(stickySequenceWheelTimer);
  stickySequenceWheelDelta += e.deltaY;
  stickySequenceWheelTimer = window.setTimeout(() => {
    stickySequenceWheelDelta = 0;
  }, 180);

  if (Math.abs(stickySequenceWheelDelta) < wheelThreshold) return;

  const goingDown = stickySequenceWheelDelta > 0;
  const goingUp = stickySequenceWheelDelta < 0;
  stickySequenceWheelDelta = 0;

  stickySequenceControllers.forEach(other => {
    if (other !== controller) other.setHoldWheelCount(0);
  });

  if (progress < holdProgress - 0.08 || progress >= 0.98) {
    controller.setHoldWheelCount(0);
  }

  if (goingDown && progress < holdProgress - 0.04) {
    controller.setHoldWheelCount(0);
    /* 이미 0.64+ 이상에서만 진입하므로 작은 보정 스냅 (380ms) */
    smoothStickySequenceScroll(controller, controller.scrollTargetForProgress(holdProgress), 380);
    return;
  }

  if (goingDown && progress >= holdProgress - 0.04 && progress < 0.98) {
    if (controller.getHoldWheelCount() < lockedWheelLimit) {
      controller.setHoldWheelCount(controller.getHoldWheelCount() + 1);
      smoothStickySequenceScroll(controller, controller.scrollTargetForProgress(holdProgress), 180);
      return;
    }

    controller.setHoldWheelCount(0);
    smoothStickySequenceScroll(controller, controller.scrollTargetForProgress(exitProgress), 680);
    return;
  }

  if (goingUp && progress > holdProgress + 0.08 && progress < 1) {
    controller.setHoldWheelCount(0);
    smoothStickySequenceScroll(controller, controller.scrollTargetForProgress(holdProgress), 520);
  }
}

function playSequenceWave(section) {
  const content = section.querySelector('.program-seq-content, .location-seq-content, .booking-seq-content');
  const dispMap = document.getElementById('dive-disp-map');
  const turbEl  = document.getElementById('dive-turbulence');
  if (!content) return;

  content.classList.remove('is-wave-entering');
  void content.offsetWidth;
  content.classList.add('is-wave-entering');
  window.setTimeout(() => content.classList.remove('is-wave-entering'), 1050);

  if (!dispMap || !turbEl || typeof gsap === 'undefined') return;

  gsap.killTweensOf(dispMap);
  content.style.filter = 'url(#dive-warp)';

  let rafId;
  const t0 = performance.now();
  (function tickSequenceWave() {
    const t   = (performance.now() - t0) / 1000;
    const fade = Math.max(0, 1 - t / 1.05);
    const bfx = (0.0068 + Math.sin(t * 4.1) * 0.0016 * fade).toFixed(5);
    const bfy = (0.0115 + Math.cos(t * 3.6) * 0.0022 * fade).toFixed(5);
    turbEl.setAttribute('baseFrequency', `${bfx} ${bfy}`);
    rafId = requestAnimationFrame(tickSequenceWave);
  })();

  dispMap.setAttribute('scale', '0');

  gsap.timeline({
    onComplete() {
      cancelAnimationFrame(rafId);
      turbEl.setAttribute('baseFrequency', '0.004 0.007');
      dispMap.setAttribute('scale', '0');
      content.style.filter = '';
    }
  })
    .to(dispMap, { attr: { scale: 16 }, duration: 0.18, ease: 'sine.out' })
    .to(dispMap, { attr: { scale: 6 }, duration: 0.2, ease: 'sine.inOut' })
    .to(dispMap, { attr: { scale: 11 }, duration: 0.18, ease: 'sine.inOut' })
    .to(dispMap, { attr: { scale: 0 }, duration: 0.42, ease: 'sine.out' });
}

/* =============================================================
   7. 지도 마커
   ============================================================= */
function initMapMarkers() {
  const markers = document.querySelectorAll('.map-marker');
  if (!markers.length) return;
  const mapWrap = document.querySelector('.location-map-wrap');
  const hoverCard = document.querySelector('.location-hover-card');
  const indicator = document.querySelector('.location-indicator');
  const indicatorLine = document.querySelector('.location-indicator__line');
  const indicatorEnd = document.querySelector('.location-indicator__end');
  let activeMarker = null;
  let indicatorTimer = null;
  let indicatorRaf = null;
  let cardSwapTimer = null;
  let activeBranchKey = '';

  const branchInfo = {
    '일산':  {
      name: '아쿠아플라넷 일산',
      img: 'assets/images/Frame 19.png',
      href: '#sec-booking',
      address: '경기도 고양시 일산서구 한류월드로 282',
      tel: 'TEL. 1833-7001',
      desc: '해양문화의 가치와 생태계 보존을 대중에게 널리 알리는 아쿠아플라넷 일산.',
    },
    '코엑스': {
      name: '아쿠아플라넷 광교',
      img: 'assets/images/Frame 20.png',
      href: '#sec-booking',
      address: '경기도 수원시 영통구 광교호수공원로 300 포레나 광교 B1F',
      tel: 'TEL. 1833-7001',
      desc: '도심 속에서 바다를 보고, 만지고, 느낄 수 있는 경기 남부의 해양문화공간, 아쿠아플라넷 광교.',
    },
    '여수':  {
      name: '아쿠아플라넷 여수',
      img: 'assets/images/Frame 22.png',
      href: '#sec-booking',
      address: '전라남도 여수시 오동도로 61-11',
      tel: 'TEL. 1833-7001',
      desc: '인간과 자연이 공생하는 해양문화의 가치를 전하는 남해의 대표 해양문화공간, 아쿠아플라넷 여수.',
    },
    '제주':  {
      name: '아쿠아플라넷 제주',
      img: 'assets/images/Frame 21.png',
      href: '#sec-booking',
      address: '제주특별자치도 서귀포시 성산읍 섭지코지로 95',
      tel: 'TEL. 1833-7001',
      desc: '제주의 바다와 해양 생태를 가까이에서 만나는 국내 최대 규모의 아쿠아리움, 아쿠아플라넷 제주.',
    },
  };

  const cardImg = hoverCard?.querySelector('.location-hover-card__img');
  const branchEl = hoverCard?.querySelector('.location-hover-card__branch');
  const metaPs   = hoverCard?.querySelectorAll('.location-hover-card__meta p');
  const descEl   = hoverCard?.querySelector('.location-hover-card__desc');

  function setHoverCardContent(info) {
    if (!info) return;

    if (cardImg) {
      cardImg.src = info.img;
      cardImg.alt = info.name;
    }
    if (branchEl) branchEl.textContent = info.name;
    if (metaPs?.[0]) metaPs[0].textContent = info.address;
    if (metaPs?.[1]) metaPs[1].textContent = info.tel;
    if (descEl) descEl.textContent = info.desc;
  }

  function swapHoverCardContent(info, branchKey) {
    if (!hoverCard || !info) return;

    window.clearTimeout(cardSwapTimer);

    if (!activeBranchKey) {
      setHoverCardContent(info);
      activeBranchKey = branchKey;
      return;
    }

    if (activeBranchKey === branchKey) return;

    hoverCard.classList.add('is-switching');
    cardSwapTimer = window.setTimeout(() => {
      setHoverCardContent(info);
      activeBranchKey = branchKey;

      requestAnimationFrame(() => {
        hoverCard.classList.remove('is-switching');
        hoverCard.classList.add('is-switched');
        window.setTimeout(() => hoverCard.classList.remove('is-switched'), 360);
      });
    }, 150);
  }

  function updateIndicator(marker) {
    if (!mapWrap || !hoverCard || !indicator || !indicatorLine || !indicatorEnd || !marker) return;

    const wrapRect = mapWrap.getBoundingClientRect();
    const markerRect = marker.getBoundingClientRect();
    const cardRect = hoverCard.getBoundingClientRect();

    const startX = markerRect.left + markerRect.width / 2 - wrapRect.left;
    const startY = markerRect.top + markerRect.height / 2 - wrapRect.top;
    const endX = cardRect.left - wrapRect.left;
    const endY = cardRect.top + Math.min(168, cardRect.height * 0.43) - wrapRect.top;
    const bendX = startX + Math.max(72, (endX - startX) * 0.48);

    indicator.setAttribute('viewBox', `0 0 ${wrapRect.width} ${wrapRect.height}`);
    indicatorLine.setAttribute(
      'points',
      `${startX.toFixed(1)},${startY.toFixed(1)} ${bendX.toFixed(1)},${startY.toFixed(1)} ${bendX.toFixed(1)},${endY.toFixed(1)} ${endX.toFixed(1)},${endY.toFixed(1)}`
    );
    indicatorEnd.setAttribute('cx', endX.toFixed(1));
    indicatorEnd.setAttribute('cy', endY.toFixed(1));
  }

  function activate(marker) {
    activeMarker = marker;
    markers.forEach(m => m.classList.toggle('is-active', m === marker));
    mapWrap?.classList.add('is-hovering');

    const info = branchInfo[marker.dataset.branch];
    swapHoverCardContent(info, marker.dataset.branch);
    window.clearTimeout(indicatorTimer);
    window.cancelAnimationFrame(indicatorRaf);

    const startedAt = performance.now();
    function trackIndicator(now) {
      updateIndicator(marker);
      if (activeMarker === marker && now - startedAt < 460) {
        indicatorRaf = window.requestAnimationFrame(trackIndicator);
      }
    }
    indicatorRaf = window.requestAnimationFrame(trackIndicator);
    indicatorTimer = window.setTimeout(() => updateIndicator(marker), 480);
  }

  function deactivate() {
    activeMarker = null;
    window.clearTimeout(indicatorTimer);
    window.clearTimeout(cardSwapTimer);
    window.cancelAnimationFrame(indicatorRaf);
    markers.forEach(m => m.classList.remove('is-active'));
    mapWrap?.classList.remove('is-hovering');
    hoverCard?.classList.remove('is-switching', 'is-switched');
    activeBranchKey = '';
  }

  mapWrap?.addEventListener('pointerleave', deactivate);
  window.addEventListener('resize', () => {
    if (activeMarker) updateIndicator(activeMarker);
  });

  markers.forEach(marker => {
    marker.addEventListener('pointerenter', () => activate(marker));
    marker.addEventListener('focus', () => activate(marker));
    marker.addEventListener('blur', () => {
      if (!mapWrap?.matches(':focus-within')) deactivate();
    });

    marker.addEventListener('click', () => {
      const info = branchInfo[marker.dataset.branch];
      if (!info) return;
      activate(marker);
      console.log(`[지도] ${info.name} 선택`);
    });
  });
}




/* =============================================================
   7. 예매 / 프로그램 카드 클릭
   ============================================================= */
document.addEventListener('click', e => {
  const bookingBtn = e.target.closest('.booking-card .btn-cta');
  if (!bookingBtn) return;
  const branch = bookingBtn.closest('.booking-card')?.dataset.branch ?? '';
  console.log(`[예매] ${branch} 예매하기 클릭`);
});

document.addEventListener('click', e => {
  const card = e.target.closest('.program-card');
  if (!card) return;
  console.log(`[프로그램] ${card.dataset.program ?? ''} 카드 클릭`);
});


/* =============================================================
   8. GNB 네비 — 부드러운 스크롤
   ============================================================= */
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', e => {
    const target = document.getElementById(link.getAttribute('href').slice(1));
    if (!target) return;

    const intro = document.getElementById('sec-intro');
    if (intro && !crewScrollUnlocked && !diveActive) {
      const introTop = window.scrollY + intro.getBoundingClientRect().top;
      const targetTop = window.scrollY + target.getBoundingClientRect().top;
      const isBelowIntro = targetTop > introTop + 4;
      const isInIntroGate = window.scrollY >= introTop - 4;

      if (isInIntroGate && isBelowIntro) {
        e.preventDefault();
        intro.scrollIntoView({ behavior: 'auto', block: 'start' });
        return;
      }
    }

    e.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});


/* =============================================================
   10. TOP BUTTON — 맨 위로 이동 버튼
   ============================================================= */
function initTopBtn() {
  const btn = document.getElementById('top-btn');
  if (!btn) return;

  const THRESHOLD = 400;

  function update() {
    btn.classList.toggle('is-visible', window.scrollY > THRESHOLD);
  }

  window.addEventListener('scroll', update, { passive: true });
  update();

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}


/* =============================================================
   11. CUSTOM CURSOR — 흰색 원형 커서
   ============================================================= */
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


/* =============================================================
   11. CURSOR WAVE — 잔잔한 수면 수평 반사 흔들림
   ============================================================= */
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
