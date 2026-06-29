/* =============================================================
   AQUA PLANET — main.js
   ============================================================= */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
  disableMobileDecorativeMedia();
  initReveal();
  initGnb();
  initMobileMenu();
  initScrollIndicator();
  initLogoScrollGate();
  initIntroReveal();
  initHeroFadeIn();
  initIntroScrollGate();
  initSmoothScroll();
  initSectionScrollAnim();
  initCrewScroll();
  initBookingBgVideo();
  initGlassBubbles();
  initLocationFishBgMatte();
  initMapMarkers();
  initTopBtn();
  initCustomCursor();
  initCursorWave();
});

/* bfcache 복원 시 강제 새로고침 — WebGL 컨텍스트가 소멸한 채 복원되면
   3D 렌더러가 에러를 쏟아내므로 페이지를 즉시 리로드한다. */
window.addEventListener('pageshow', (e) => {
  if (e.persisted) window.location.reload();
});

function isMobileViewport() {
  return window.matchMedia('(max-width: 768px)').matches;
}

function disableMobileDecorativeMedia() {
  const mediaQuery = window.matchMedia('(max-width: 768px)');
  const videos = document.querySelectorAll('.location-fish-bg, .booking-bg-video');
  if (!videos.length) return;

  function disableVideo(video) {
    video.pause();
    if (video.hasAttribute('src')) {
      video.dataset.src = video.getAttribute('src') || '';
      video.removeAttribute('src');
    }
    video.querySelectorAll('source').forEach((source) => {
      if (source.hasAttribute('src')) {
        source.dataset.src = source.getAttribute('src') || '';
        source.removeAttribute('src');
      }
    });
    video.load();
  }

  function restoreVideo(video) {
    let restored = false;

    if (!video.hasAttribute('src') && video.dataset.src) {
      video.setAttribute('src', video.dataset.src);
      restored = true;
    }

    video.querySelectorAll('source').forEach((source) => {
      if (!source.hasAttribute('src') && source.dataset.src) {
        source.setAttribute('src', source.dataset.src);
        restored = true;
      }
    });

    if (restored) video.load();
    if (video.autoplay) video.play().catch(() => {});
  }

  function syncDecorativeMedia() {
    videos.forEach((video) => {
      if (mediaQuery.matches) {
        disableVideo(video);
      } else {
        restoreVideo(video);
      }
    });
  }

  syncDecorativeMedia();

  if (typeof mediaQuery.addEventListener === 'function') {
    mediaQuery.addEventListener('change', syncDecorativeMedia);
  } else if (typeof mediaQuery.addListener === 'function') {
    mediaQuery.addListener(syncDecorativeMedia);
  }
}

function getResponsiveSequenceTiming() {
  const isResponsive = window.matchMedia('(max-width: 1024px)').matches;

  if (!isResponsive) {
    return {
      titleEnter: [0.24, 0.56],
      contentEnter: [0.50, 0.72],
      contentExit: [0.98, 1.22],
      overlapExit: [0.10, 0.34],
      bottomExit: 0.18,
      holdProgress: 0.72,
      exitProgress: 1.02,
    };
  }

  return {
    titleEnter: [0.20, 0.50],
    contentEnter: [0.42, 0.66],
    contentExit: [1.08, 1.58],
    overlapExit: [-0.30, 0.58],
    bottomExit: 0.02,
    holdProgress: 0.82,
    exitProgress: 1.28,
  };
}


/* =============================================================
   0-A. SMOOTH SCROLL — 부드럽고 느린 휠 스크롤 (크루 섹션 이후 활성화)
   ============================================================= */
function initSmoothScroll() {
  let targetY = window.scrollY;
  let currentY = window.scrollY;
  let rafId = null;
  let isSelf = false;

  /* 크루 패널 스냅 상태 */
  let crewSnapTargetPanel = 0;
  let crewSnapLocked = false;
  let crewSnapLockTimer = null;

  /* 카드 opacity 전환 완료(transitionend)를 직접 감지해 즉시 잠금 해제.
     opacity >= 0.99 조건으로 카드가 나타나는 방향(0→1)일 때만 해제한다 (숨겨지는 방향 무시). */
  const crewInfoWrapEl = document.querySelector('.crew-info-wrap');
  if (crewInfoWrapEl) {
    crewInfoWrapEl.addEventListener('transitionend', (e) => {
      if (e.propertyName !== 'opacity' || !crewSnapLocked) return;
      if (parseFloat(getComputedStyle(crewInfoWrapEl).opacity) >= 0.99) {
        clearTimeout(crewSnapLockTimer);
        crewSnapLocked = false;
      }
    });
  }

  /* crew-card-reenter는 transitionend 폴백: 전환이 시작되면 600ms 타이머 설정 */
  document.addEventListener('crew-card-reenter', () => {
    clearTimeout(crewSnapLockTimer);
    crewSnapLockTimer = window.setTimeout(() => { crewSnapLocked = false; }, 600);
  });

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
    if (diveActive || isTransitioning) {
      e.preventDefault();
      return;
    }
    if (!crewScrollUnlocked) return;

    e.preventDefault();

    const crewScale = crewPanelActive ? 1.3 : speedScale;
    targetY = clamp(targetY + e.deltaY * crewScale);

    /* 크루 패널 구간: 패널당 스냅 — 카드가 나타난 뒤에만 다음 패널로 이동 */
    if (crewPanelActive) {
      const crewEl = document.getElementById('sec-crew');
      if (crewEl) {
        const crewTopAbs = crewEl.getBoundingClientRect().top + window.scrollY;
        const panelH     = window.innerHeight;
        const panelCount = crewEl.querySelectorAll('.crew-panel').length || 4;
        const dir        = e.deltaY > 0 ? 1 : -1;

        /* Sync from the real scroll position only when panel snapping is unlocked. */
        if (!crewSnapLocked) {
          crewSnapTargetPanel = Math.floor(
            Math.max(0, Math.min(panelCount - 1, (window.scrollY - crewTopAbs) / panelH))
          );
        }

        if (!crewSnapLocked && dir > 0 && crewSnapTargetPanel >= panelCount - 1) {
          /* 마지막 패널에서 아래 스크롤 → 섹션 탈출 */
          targetY = clamp(crewTopAbs + panelCount * panelH);
        } else if (crewSnapLocked) {
          /* While a card is re-entering, hold both scroll directions on the target panel. */
          targetY = clamp(crewTopAbs + crewSnapTargetPanel * panelH);
        } else {
          /* 패널 전환 허용 */
          const nextPanel = Math.max(0, Math.min(panelCount - 1, crewSnapTargetPanel + dir));
          const changedPanel = nextPanel !== crewSnapTargetPanel;
          crewSnapTargetPanel = nextPanel;
          targetY = clamp(crewTopAbs + crewSnapTargetPanel * panelH);
          if (changedPanel) {
            /* Panel move: lock until transitionend or the crew-card-reenter fallback releases it. */
            crewSnapLocked = true;
            clearTimeout(crewSnapLockTimer);
            crewSnapLockTimer = window.setTimeout(() => { crewSnapLocked = false; }, 2000);
          } else {
            /* 위로 이동: 즉시 잠금 해제 */
            clearTimeout(crewSnapLockTimer);
            crewSnapLocked = false;
          }
        }
      }
    }

    if (Math.abs(currentY - window.scrollY) > 80) currentY = window.scrollY;
    if (!rafId) rafId = requestAnimationFrame(tick);
  }, { passive: false });

  /* 앵커 링크 · scrollIntoView 등 외부 스크롤 발생 시 target 동기화 */
  window.addEventListener('scroll', () => {
    if (isSelf) return;
    if (rafId) return;
    targetY = window.scrollY;
    currentY = window.scrollY;
  }, { passive: true });

  window.__syncSmoothScroll = () => {
    targetY = window.scrollY;
    currentY = window.scrollY;
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  };

  window.__isCrewSnapLocked = () => crewSnapLocked;

  window.addEventListener('resize', () => {
    targetY = clamp(window.scrollY);
    currentY = targetY;
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }, { passive: true });
}


/* =============================================================
   0-A-2. SECTION SCROLL ANIMATION — 타이틀 고정 + 콘텐츠 페이드인 (스냅 없음)
   ============================================================= */
function initSectionScrollAnim() {
  const configs = [
    { id: 'sec-program',  rippleSelector: null,                    ripple: false },
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

  let animRafId = null;

  function onScroll() {
    if (animRafId) return;
    animRafId = requestAnimationFrame(runAnim);
  }

  function runAnim() {
    animRafId = null;
    const vh = window.innerHeight;

    /* 읽기 일괄 선행 — write 사이에 getBoundingClientRect 재호출 시 발생하는 강제 리플로우 방지 */
    const rects = items.map(item => item.section.getBoundingClientRect());

    items.forEach((item, i) => {
      const { section, cfg } = item;
      const rect = rects[i];
      const scrollSpan = vh + Math.max(0, rect.height - vh);
      const rawProgress = (vh - rect.top) / scrollSpan;
      const progress = clamp01(rawProgress);
      const timing = getResponsiveSequenceTiming();

      const nextOverlapExit = 1 - smoothstep(vh * timing.overlapExit[0], vh * timing.overlapExit[1], rect.bottom);
      const bottomExit = clamp01((vh * timing.bottomExit - rect.bottom) / (vh * timing.bottomExit));
      const exitProgress = Math.max(nextOverlapExit, bottomExit);

      const titleProgress = smoothstep(timing.titleEnter[0], timing.titleEnter[1], progress);
      const contentEnterProgress = smoothstep(timing.contentEnter[0], timing.contentEnter[1], progress);
      const contentExitLift = smoothstep(timing.contentExit[0], timing.contentExit[1], rawProgress);
      const contentLeaveProgress = Math.max(exitProgress, contentExitLift);
      const contentY = (1 - contentEnterProgress) * 60 - contentExitLift * 56;
      const titleY = (1 - titleProgress) * 72 - contentExitLift * 34;
      const isPast = rect.bottom <= 0;

      const titleOpacity = titleProgress * (1 - contentLeaveProgress);
      const contentOpacity = contentEnterProgress * (1 - contentLeaveProgress);

      section.style.setProperty('--seq-content-y', `${contentY.toFixed(2)}px`);
      section.style.setProperty('--seq-title-y', `${titleY.toFixed(2)}px`);
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
  runAnim();
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
    const bfx = (0.0024 + Math.sin(t * 2.2) * 0.0010).toFixed(5);
    const bfy = (0.0042 + Math.cos(t * 1.9) * 0.0013).toFixed(5);
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
    .to(dispMap, { attr: { scale: 14 }, duration: 0.22, ease: 'sine.out'   })
    .to(dispMap, { attr: { scale:  5 }, duration: 0.26, ease: 'sine.inOut' })
    .to(dispMap, { attr: { scale:  9 }, duration: 0.22, ease: 'sine.inOut' })
    .to(dispMap, { attr: { scale:  0 }, duration: 0.55, ease: 'power2.out' });
}


/* =============================================================
   0-B. HERO / CREW ~ BOOKING GLASS BUBBLES
   ============================================================= */
function initGlassBubbles() {
  const roots = document.querySelectorAll('[data-bubble-root]');
  if (!roots.length) return;

  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const powerSaving = motionQuery.matches || window.devicePixelRatio > 2 || (navigator.deviceMemory && navigator.deviceMemory < 4);
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
      const bubblesPerSide = Math.min(powerSaving ? 14 : 30, Math.max(powerSaving ? 10 : 16, Math.round(rootHeight / (powerSaving ? 360 : 260))));

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

  let gnbResizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(gnbResizeTimer);
    gnbResizeTimer = setTimeout(onScroll, 200);
  }, { passive: true });

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
      indicator.style.transform = 'translateY(0)';
      return;
    }

    const introTop     = intro ? window.scrollY + intro.getBoundingClientRect().top : 0;
    const scrolledIn   = Math.max(0, window.scrollY - introTop);
    const progress     = Math.min(scrolledIn / 150, 1);
    indicator.style.opacity   = String(1 - progress);
    indicator.style.transform = `translateY(${progress * 20}px)`;
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

  let scrollCount = 0;
  let gateOpen    = false;

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
    onEnter: () => {
      introContent.classList.add('is-visible');
      window.__logoTransitionComplete = true;
    },
    onLeaveBack: () => {
      introContent.classList.add('is-visible');
      window.__logoTransitionComplete = false;
    },
    once: false,
  });
}


/* =============================================================
   3-D. HERO 텍스트 순차 페이드인
        #sec-intro가 화면에 들어올 때 hero-active 클래스를 붙여
        CSS animation-play-state: paused → running 전환.
   ============================================================= */
function initHeroFadeIn() {
  const section = document.getElementById('sec-intro');
  if (!section) return;

  const activate = () => {
    section.classList.add('hero-active');
    observer.disconnect();
  };
  const observer = new IntersectionObserver(
    ([entry]) => { if (entry.isIntersecting) activate(); },
    { threshold: 0.05 }
  );
  observer.observe(section);
}


/* =============================================================
   4. 잠수 전환 — 전화면 물결 왜곡 (unseen.co 스타일)
   ============================================================= */
let diveActive = false;
let isTransitioning = false;
let crewScrollUnlocked = false;
let crewPanelActive = false;
let diveResetTimer = 0;

function initIntroScrollGate() {
  const intro = document.getElementById('sec-intro');
  const crew  = document.getElementById('sec-crew');
  const logo  = document.getElementById('sec-logo');
  if (!intro || !crew) return;

  let touchStartY = 0;
  let introDivePending = false;
  let introDiveTimer = 0;
  const INTRO_DIVE_DELAY_MS = 100;
  const INTRO_DIVE_EDGE_OFFSET = 24;

  function sectionTop(el) {
    return Math.round(window.scrollY + el.getBoundingClientRect().top);
  }

  function isBeforeCrew() {
    const crewTop = sectionTop(crew);
    return window.scrollY < crewTop - 4;
  }

  function isAtOrAfterIntro() {
    const introTop = sectionTop(intro);
    return window.scrollY >= introTop - 4;
  }

  function isPastIntroHoldPoint() {
    const introTop = sectionTop(intro);
    const introScrollable = Math.max(0, intro.offsetHeight - window.innerHeight);
    return window.scrollY >= introTop + introScrollable - INTRO_DIVE_EDGE_OFFSET;
  }

  function isAfterLogoTransition() {
    if (!logo) return true;
    /* ScrollTrigger가 세팅한 플래그가 있으면 우선 사용 (pin spacer 삽입 전/후 측정 오차 방지) */
    if (window.__logoTransitionComplete === true) return true;
    if (window.__logoTransitionComplete === false) return false;
    /* 플래그가 없으면 (ScrollTrigger 아직 미초기화) 위치로 fallback */
    const logoEnd = sectionTop(logo) + logo.offsetHeight;
    return window.scrollY >= logoEnd - 4;
  }

  function getIntroTop() {
    return sectionTop(intro);
  }

  function getIntroEnd() {
    return getIntroTop() + intro.offsetHeight - window.innerHeight;
  }

  function updateIntroPinState() {
    /* wave 전환 중에는 갱신 건너뜀 — 아래 triggerDive()의 filter 버그 해설 참고 */
    if (diveActive || isTransitioning) return;
    const y = window.scrollY;
    const introTop = getIntroTop();
    const introEnd = getIntroEnd();
    const crewTop = sectionTop(crew);
    const isPinned = y >= introTop - 1 && y < introEnd - 1 && y < crewTop - 4;
    const isAfter = y >= introEnd - 1 && y < crewTop - 4;

    intro.classList.toggle('is-intro-pinned', isPinned);
    intro.classList.toggle('is-intro-after', isAfter);
  }

  function isInsideIntroHold() {
    const y = window.scrollY;
    return (
      isAfterLogoTransition() &&
      y >= getIntroTop() - 4 &&
      y < getIntroEnd() - INTRO_DIVE_EDGE_OFFSET
    );
  }

  function scrollIntroBy(deltaY) {
    const maxStep = 90;
    const step = Math.sign(deltaY) * Math.min(Math.abs(deltaY), maxStep);
    const nextY = Math.max(
      getIntroTop(),
      Math.min(getIntroEnd(), window.scrollY + step)
    );
    window.scrollTo(0, nextY);
    window.__syncSmoothScroll?.();
  }

  function isNearCrewStart() {
    const crewTop = sectionTop(crew);
    return window.scrollY >= crewTop - 4 && window.scrollY <= crewTop + window.innerHeight * 0.45;
  }

  function requestIntroDive() {
    if (introDivePending) return;
    introDivePending = true;
    window.__syncSmoothScroll?.();

    window.clearTimeout(introDiveTimer);
    introDiveTimer = window.setTimeout(() => {
      introDivePending = false;
      /* 100ms 지난 뒤 실제 위치를 재검증해 엉뚱한 타이밍에 전환 발동 방지 */
      if (!diveActive && !isTransitioning && !crewScrollUnlocked &&
          isAfterLogoTransition() && isAtOrAfterIntro() && isPastIntroHoldPoint() && isBeforeCrew()) {
        triggerDive();
      }
    }, INTRO_DIVE_DELAY_MS);
  }

  function shouldBlockDown() {
    return !crewScrollUnlocked && !diveActive && !isTransitioning && isAfterLogoTransition() && isAtOrAfterIntro() && isPastIntroHoldPoint() && isBeforeCrew();
  }

  function shouldBlockUp() {
    return crewScrollUnlocked && !window.__isCrewSnapLocked?.() && !diveActive && !isTransitioning && isNearCrewStart();
  }

  window.addEventListener('wheel', (e) => {
    if (diveActive || isTransitioning) {
      e.preventDefault();
      e.stopImmediatePropagation();
      return;
    }

    if (e.deltaY > 0 && isInsideIntroHold()) {
      e.preventDefault();
      e.stopImmediatePropagation();
      scrollIntroBy(e.deltaY);
      return;
    }

    if (e.deltaY > 0 && (introDivePending || shouldBlockDown())) {
      e.preventDefault();
      e.stopImmediatePropagation();
      requestIntroDive();
      return;
    }

    if (e.deltaY < 0 && introDivePending && isAtOrAfterIntro()) {
      e.preventDefault();
      e.stopImmediatePropagation();
      introDivePending = false;
      window.clearTimeout(introDiveTimer);
      scrollIntroBy(e.deltaY);
      return;
    }

    if (e.deltaY < 0 && shouldBlockUp()) {
      e.preventDefault();
      e.stopImmediatePropagation();
      introDivePending = false;
      window.clearTimeout(introDiveTimer);
      triggerDiveBack();
    }
  }, { passive: false, capture: true });

  window.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0]?.clientY ?? 0;
  }, { passive: true });

  window.addEventListener('touchmove', (e) => {
    const y = e.touches[0]?.clientY ?? touchStartY;
    const goingDown = touchStartY - y > 30;
    const goingUp   = y - touchStartY > 30;

    if (goingDown && (introDivePending || shouldBlockDown())) {
      e.preventDefault();
      e.stopImmediatePropagation();
      requestIntroDive();
    } else if (goingUp && introDivePending && isAtOrAfterIntro()) {
      e.preventDefault();
      e.stopImmediatePropagation();
      introDivePending = false;
      window.clearTimeout(introDiveTimer);
    } else if (goingUp && shouldBlockUp()) {
      e.preventDefault();
      e.stopImmediatePropagation();
      introDivePending = false;
      window.clearTimeout(introDiveTimer);
      triggerDiveBack();
    }
  }, { passive: false, capture: true });

  window.addEventListener('keydown', (e) => {
    const downKeys = ['ArrowDown', 'PageDown', ' ', 'End'];
    const upKeys = ['ArrowUp', 'PageUp', 'Home'];
    if (downKeys.includes(e.key) && (introDivePending || shouldBlockDown())) {
      e.preventDefault();
      requestIntroDive();
    } else if (upKeys.includes(e.key) && shouldBlockUp()) {
      e.preventDefault();
      introDivePending = false;
      window.clearTimeout(introDiveTimer);
      triggerDiveBack();
    }
  });

  window.addEventListener('scroll', () => {
    updateIntroPinState();
    if (diveActive) return;

    const y = window.scrollY;
    const crewTop = sectionTop(crew);
    /* 이전 위치가 이미 introTop 이상이었을 때만 clamp — 로고→인트로 진입 시 튕김 방지 */
    if (y < crewTop - 4) crewScrollUnlocked = false;
  }, { passive: true });

  window.addEventListener('resize', updateIntroPinState, { passive: true });
  updateIntroPinState();
  window.__syncSmoothScroll?.();
  window.ScrollTrigger?.refresh?.();
}


/* =============================================================
   0-D. LOCATION FISH BACKGROUND
   ============================================================= */
function initLocationFishBgMatte() {
  if (isMobileViewport()) return;

  const section = document.getElementById('sec-location');
  if (!section) return;

  const videos = section.querySelectorAll('video.location-fish-bg');
  if (!videos.length) return;

  function keepPlaying() {
    if (document.hidden) return;
    videos.forEach(video => {
      video.muted = true;
      video.playsInline = true;
      video.playbackRate = 0.85;
      if (video.paused || video.ended) video.play().catch(() => {});
    });
  }

  videos.forEach(video => {
    video.addEventListener('canplay', keepPlaying);
    video.addEventListener('stalled', keepPlaying);
    video.addEventListener('waiting', keepPlaying);
    video.addEventListener('pause', keepPlaying);
  });

  new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) {
      keepPlaying();
    } else {
      videos.forEach(video => video.pause());
    }
  }, { rootMargin: '100px' }).observe(section);

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) keepPlaying();
  });

  keepPlaying();
}


/**
 * useSectionTransition
 * rAF로 feTurbulence baseFrequency를 흔들어 파동이 "흐르는" 느낌을 만들고,
 * feDisplacementMap scale을 0→30→0 으로 애니메이션해 전화면 물결 왜곡을 연출.
 *
 * @param {{ from, to, onPeak?, onDone? }} opts
 * @returns {gsap.core.Timeline|null}
 */
function useSectionTransitionLegacy({ from, to, onPeak, onDone } = {}) {
  const dispMap    = document.getElementById('dive-disp-map');
  const turbEl     = document.getElementById('dive-turbulence');
  const mainEl     = document.getElementById('main');
  const crewCanvas = document.getElementById('crew-3d-canvas');

  if (!dispMap || !turbEl || !mainEl || !from || !to) return null;

  gsap.killTweensOf(dispMap);
  dispMap.setAttribute('scale', '0');
  turbEl.setAttribute('baseFrequency', '0.004 0.007');

  const filterTargets = [mainEl, crewCanvas].filter(Boolean);
  gsap.set(filterTargets, { filter: 'url(#dive-warp)' });

  let rafId;
  const t0 = performance.now();
  (function tickTurbulence() {
    const t   = (performance.now() - t0) / 1000;
    const bfx = (0.002 + Math.sin(t * 1.6) * 0.0012).toFixed(5);
    const bfy = (0.0035 + Math.cos(t * 1.3) * 0.0016).toFixed(5);
    turbEl.setAttribute('baseFrequency', `${bfx} ${bfy}`);
    rafId = requestAnimationFrame(tickTurbulence);
  })();

  const tl = gsap.timeline({
    defaults: { overwrite: 'auto' },
    onStart() {
      isTransitioning = true;
      document.body.classList.add('is-transitioning');
    },
    onComplete() {
      cancelAnimationFrame(rafId);
      turbEl.setAttribute('baseFrequency', '0.004 0.007');
      dispMap.setAttribute('scale', '0');
      gsap.set(filterTargets, { clearProps: 'filter' });
      isTransitioning = false;
      document.body.classList.remove('is-transitioning');
      onDone?.();
    },
  });

  /* 인트로→크루 전환 일렁임:
     0 → 0.90s : 왜곡 빌드업 (인트로가 일렁이며 사라짐)
     0.72s     : 크루 섹션으로 스크롤 — 파동이 절정일 때 크루가 화면에 등장
     0.90 → 1.80s : 왜곡 소멸 (크루 섹션 도달 후 ~1.1s 안에 완전히 정지) */
  tl.to(dispMap, { attr: { scale: 36 }, duration: 0.90, ease: 'power2.in'  }, 0)
    .call(() => onPeak?.(), null, 0.72)
    .to(dispMap, { attr: { scale:  0 }, duration: 0.90, ease: 'power2.out' }, 0.90);

  return tl;
}

function useSectionTransitionRippleLegacy({ from, to, onPeak, onDone } = {}) {
  const dispMap = document.getElementById('dive-disp-map');
  const turbEl = document.getElementById('dive-turbulence');
  const mainEl = document.getElementById('main');
  const overlay = document.getElementById('dive-overlay');
  const vignette = document.getElementById('dive-vignette');

  if (!dispMap || !turbEl || !vignette || !mainEl || !overlay || !from || !to) return null;

  const surface = overlay.querySelector('.dive-overlay__surface');
  const distortion = overlay.querySelector('.dive-overlay__distortion');
  const ripples = overlay.querySelectorAll('.dive-overlay__ripple');
  const fromContent = from.querySelectorAll('.hero, .scroll-indicator, .bubble-layer--hero');
  const rippleEls = [...ripples];
  const fromContentEls = [...fromContent];
  const transitionTargets = [
    mainEl,
    from,
    ...fromContentEls,
    to,
    overlay,
    surface,
    distortion,
    ...rippleEls,
  ].filter(Boolean);

  gsap.killTweensOf([...transitionTargets, dispMap]);
  dispMap.setAttribute('scale', '0');
  turbEl.setAttribute('baseFrequency', '0.004 0.007');

  gsap.set(mainEl, {
    filter: 'url(#dive-warp)',
    transformOrigin: '50% 50%',
    willChange: 'filter',
  });
  gsap.set(from, {
    transformOrigin: '50% 58%',
    willChange: 'transform, filter, opacity',
  });
  gsap.set(fromContentEls, {
    transformOrigin: '50% 58%',
    willChange: 'transform, filter, opacity',
  });
  gsap.set(to, {
    opacity: 0,
    y: 40,
    filter: 'blur(12px)',
    transformOrigin: '50% 46%',
    willChange: 'transform, filter, opacity',
  });
  gsap.set(overlay, {
    autoAlpha: 0,
    yPercent: -8,
    backdropFilter: 'blur(0px) saturate(1.15)',
    webkitBackdropFilter: 'blur(0px) saturate(1.15)',
  });
  gsap.set([surface, distortion, ...rippleEls, vignette].filter(Boolean), { opacity: 0 });
  overlay.classList.add('is-in');

  let rafId;
  const t0 = performance.now();
  (function tickTurbulence() {
    const t = (performance.now() - t0) / 1000;
    const bfx = (0.0035 + Math.sin(t * 2.4) * 0.0017).toFixed(5);
    const bfy = (0.0060 + Math.cos(t * 2.0) * 0.0021).toFixed(5);
    turbEl.setAttribute('baseFrequency', `${bfx} ${bfy}`);
    rafId = requestAnimationFrame(tickTurbulence);
  })();

  const tl = gsap.timeline({
    defaults: { overwrite: 'auto' },
    onComplete() {
      cancelAnimationFrame(rafId);
      turbEl.setAttribute('baseFrequency', '0.004 0.007');
      dispMap.setAttribute('scale', '0');
      overlay.classList.remove('is-in', 'is-out');
      gsap.set(transitionTargets, { clearProps: 'all' });
      onDone?.();
    },
  });

  tl.to(overlay, {
      autoAlpha: 1,
      yPercent: 0,
      backdropFilter: 'blur(7px) saturate(1.38)',
      webkitBackdropFilter: 'blur(7px) saturate(1.38)',
      duration: 0.42,
      ease: 'power2.out',
    }, 0)
    .to(surface, {
      opacity: 0.92,
      yPercent: 210,
      scaleX: 1.18,
      filter: 'blur(8px)',
      duration: 0.96,
      ease: 'power3.inOut',
    }, 0)
    .to(distortion, {
      opacity: 0.72,
      yPercent: 7,
      scale: 1.18,
      duration: 0.92,
      ease: 'sine.inOut',
    }, 0.08)
    .to(rippleEls, {
      opacity: 0.72,
      scale: 1.18,
      stagger: 0.1,
      duration: 0.56,
      ease: 'power2.out',
    }, 0.1)
    .to(rippleEls, {
      opacity: 0,
      scale: 2.85,
      stagger: 0.08,
      duration: 0.82,
      ease: 'power2.out',
    }, 0.44);

  tl.to(from, {
      scale: 1.055,
      y: 74,
      filter: 'blur(9px)',
      opacity: 0.72,
      duration: 0.95,
      ease: 'power3.inOut',
    }, 0.05)
    .to(fromContentEls, {
      y: 42,
      filter: 'blur(12px)',
      opacity: 0.18,
      duration: 0.82,
      ease: 'power2.in',
    }, 0.08)
    .to(dispMap, { attr: { scale: 42 }, duration: 0.74, ease: 'power2.inOut' }, 0.04)
    .to(vignette, { opacity: 0.32, duration: 0.54, ease: 'power2.in' }, 0.22);

  tl.call(() => {
      onPeak?.();
      overlay.classList.add('is-out');
    }, null, 0.82)
    .to(to, {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      duration: 1.12,
      ease: 'power3.out',
    }, 0.92)
    .to(dispMap, { attr: { scale: 9 }, duration: 0.38, ease: 'sine.inOut' }, 0.86)
    .to(dispMap, { attr: { scale: 0 }, duration: 1.12, ease: 'expo.out' }, 1.24)
    .to(distortion, {
      opacity: 0,
      yPercent: 16,
      scale: 1.04,
      duration: 0.86,
      ease: 'power2.out',
    }, 1.05)
    .to(surface, {
      opacity: 0,
      yPercent: 280,
      filter: 'blur(14px)',
      duration: 0.78,
      ease: 'power2.out',
    }, 1.02)
    .to(vignette, { opacity: 0, duration: 0.92, ease: 'power2.out' }, 0.9)
    .to(overlay, {
      autoAlpha: 0,
      backdropFilter: 'blur(0px) saturate(1.1)',
      webkitBackdropFilter: 'blur(0px) saturate(1.1)',
      duration: 0.92,
      ease: 'power2.out',
    }, 1.26);

  return tl;
}

function useSectionTransitionDepthLegacy({ from, to, onPeak, onDone } = {}) {
  const overlay = document.getElementById('dive-overlay');
  const mainEl = document.getElementById('main');
  const dispMap = document.getElementById('dive-disp-map');
  const turbEl = document.getElementById('dive-turbulence');
  const vignette = document.getElementById('dive-vignette');

  if (!overlay || !mainEl || !from || !to) return null;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fogNear = overlay.querySelector('.transition-overlay__fog--near');
  const fogFar = overlay.querySelector('.transition-overlay__fog--far');
  const depth = overlay.querySelector('.transition-overlay__depth');
  const currentContent = from.querySelectorAll('.hero, .scroll-indicator, .bubble-layer--hero');
  const nextChildren = to.querySelectorAll('.crew-header, .crew-canvas-wrap, .crew-info-wrap, .crew-dots');
  const resetTargets = [
    overlay,
    fogNear,
    fogFar,
    depth,
    mainEl,
    from,
    ...currentContent,
    to,
    ...nextChildren,
    vignette,
  ].filter(Boolean);

  gsap.killTweensOf(resetTargets);
  if (dispMap) gsap.killTweensOf(dispMap);
  if (dispMap) dispMap.setAttribute('scale', '0');
  if (turbEl) turbEl.setAttribute('baseFrequency', '0.004 0.007');

  overlay.classList.add('is-in');

  gsap.set(overlay, {
    autoAlpha: 0,
    yPercent: reduceMotion ? 0 : -4,
    backdropFilter: reduceMotion ? 'none' : 'blur(0px) saturate(1.08)',
    webkitBackdropFilter: reduceMotion ? 'none' : 'blur(0px) saturate(1.08)',
  });
  gsap.set([fogNear, fogFar, depth].filter(Boolean), { autoAlpha: 0 });
  gsap.set(mainEl, {
    filter: dispMap && !reduceMotion ? 'url(#dive-warp)' : 'none',
    transformOrigin: '50% 50%',
  });
  gsap.set(from, {
    transformOrigin: '50% 54%',
    willChange: reduceMotion ? 'opacity' : 'transform, filter, opacity',
  });
  gsap.set(currentContent, {
    transformOrigin: '50% 54%',
    willChange: reduceMotion ? 'opacity' : 'transform, filter, opacity',
  });
  gsap.set(to, {
    autoAlpha: reduceMotion ? 1 : 0,
    y: reduceMotion ? 0 : '86vh',
    scale: reduceMotion ? 1 : 0.96,
    filter: reduceMotion ? 'none' : 'blur(14px)',
    transformOrigin: '50% 38%',
    willChange: reduceMotion ? 'opacity' : 'transform, filter, opacity',
  });
  gsap.set(nextChildren, {
    x: reduceMotion ? 0 : '-100vw',
    y: reduceMotion ? 0 : 24,
    autoAlpha: 0,
    filter: reduceMotion ? 'none' : 'blur(10px)',
    willChange: reduceMotion ? 'opacity' : 'transform, filter, opacity',
  });

  let rafId = null;
  if (turbEl && !reduceMotion) {
    const t0 = performance.now();
    (function tickDepthFog() {
      const t = (performance.now() - t0) / 1000;
      const bfx = (0.0022 + Math.sin(t * 1.25) * 0.0007).toFixed(5);
      const bfy = (0.0048 + Math.cos(t * 1.08) * 0.0010).toFixed(5);
      turbEl.setAttribute('baseFrequency', `${bfx} ${bfy}`);
      rafId = requestAnimationFrame(tickDepthFog);
    })();
  }

  const tl = gsap.timeline({
    defaults: { ease: reduceMotion ? 'power1.out' : 'power4.inOut' },
    onStart() {
      isTransitioning = true;
      document.body.classList.add('is-transitioning');
    },
    onComplete() {
      if (rafId) cancelAnimationFrame(rafId);
      if (turbEl) turbEl.setAttribute('baseFrequency', '0.004 0.007');
      if (dispMap) dispMap.setAttribute('scale', '0');
      overlay.classList.remove('is-in', 'is-out');
      gsap.set(resetTargets, { clearProps: 'all' });
      isTransitioning = false;
      document.body.classList.remove('is-transitioning');
      onDone?.();
    },
  });

  if (reduceMotion) {
    tl.to(overlay, { autoAlpha: 1, duration: 0.18 }, 0)
      .to(from, { autoAlpha: 0, duration: 0.18 }, 0)
      .call(() => {
        onPeak?.();
        overlay.classList.add('is-out');
      }, null, 0.18)
      .to(to, { autoAlpha: 1, duration: 0.2 }, 0.2)
      .to(nextChildren, { autoAlpha: 1, duration: 0.24, stagger: 0.03 }, 0.22)
      .to(overlay, { autoAlpha: 0, duration: 0.2 }, 0.34);

    return tl;
  }

  tl.to(overlay, {
      autoAlpha: 1,
      yPercent: 0,
      backdropFilter: 'blur(8px) saturate(1.26)',
      webkitBackdropFilter: 'blur(8px) saturate(1.26)',
      duration: 0.42,
    }, 0)
    .to(fogNear, {
      autoAlpha: 0.86,
      yPercent: -10,
      scale: 1.05,
      duration: 1.15,
      ease: 'sine.inOut',
    }, 0)
    .to(fogFar, {
      autoAlpha: 0.62,
      xPercent: 8,
      scale: 1.08,
      duration: 1.55,
      ease: 'sine.inOut',
    }, 0.08)
    .to(depth, {
      autoAlpha: 0.72,
      scale: 1.16,
      duration: 1.05,
      ease: 'expo.inOut',
    }, 0.08)
    .to(from, {
      scale: 1.06,
      y: 86,
      autoAlpha: 0,
      filter: 'blur(8px)',
      duration: 1.05,
    }, 0.05)
    .to(currentContent, {
      scale: 1.035,
      y: 54,
      autoAlpha: 0,
      filter: 'blur(12px)',
      duration: 0.92,
    }, 0.08);

  if (dispMap) {
    tl.to(dispMap, { attr: { scale: 18 }, duration: 0.68, ease: 'power3.inOut' }, 0.14)
      .to(dispMap, { attr: { scale: 0 }, duration: 0.9, ease: 'expo.out' }, 0.92);
  }

  if (vignette) {
    tl.to(vignette, { autoAlpha: 0.18, duration: 0.52, ease: 'power2.inOut' }, 0.2)
      .to(vignette, { autoAlpha: 0, duration: 0.86, ease: 'power2.out' }, 0.98);
  }

  tl.call(() => {
      onPeak?.();
      overlay.classList.add('is-out');
    }, null, 0.72)
    .to(to, {
      autoAlpha: 1,
      y: 0,
      scale: 1,
      filter: 'blur(0px)',
      duration: 1.18,
      ease: 'expo.out',
    }, 0.72)
    .to(nextChildren, {
      x: 0,
      y: 0,
      autoAlpha: 1,
      filter: 'blur(0px)',
      duration: 1.02,
      stagger: 0.08,
      ease: 'power4.out',
    }, 0.86)
    .to([fogNear, fogFar, depth].filter(Boolean), {
      autoAlpha: 0,
      scale: 1.24,
      duration: 0.78,
      ease: 'power2.out',
    }, 1.18)
    .to(overlay, {
      autoAlpha: 0,
      backdropFilter: 'blur(0px) saturate(1.08)',
      webkitBackdropFilter: 'blur(0px) saturate(1.08)',
      duration: 0.62,
      ease: 'power2.out',
    }, 1.32);

  return tl;
}

function useSectionTransition({ from, to, onPeak, onDone } = {}) {
  const overlay = document.getElementById('dive-overlay');
  const wave = document.getElementById('transition-wave');
  const waveFill = document.getElementById('transition-wave-fill');
  const waveEdge = document.getElementById('transition-wave-edge');
  const waveTurbulence = document.getElementById('wave-line-turbulence');
  const waveDisplacement = document.getElementById('wave-line-displacement');

  if (!overlay || !wave || !waveFill || !waveEdge || !from || !to) return null;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const currentContent = from.querySelectorAll('.hero, .scroll-indicator, .bubble-layer--hero');
  const resetTargets = [
    overlay,
    wave,
    waveFill,
    waveEdge,
    waveDisplacement,
    from,
    ...currentContent,
    to,
  ].filter(Boolean);

  const waveShapes = [
    {
      edge: 'M0,88 C170,112 300,62 470,86 C640,110 780,70 950,88 C1120,106 1260,70 1440,92',
      fill: 'M0,88 C170,112 300,62 470,86 C640,110 780,70 950,88 C1120,106 1260,70 1440,92 L1440,900 L0,900 Z',
    },
    {
      edge: 'M0,92 C180,66 332,114 500,88 C670,62 820,112 980,86 C1150,58 1294,112 1440,84',
      fill: 'M0,92 C180,66 332,114 500,88 C670,62 820,112 980,86 C1150,58 1294,112 1440,84 L1440,900 L0,900 Z',
    },
    {
      edge: 'M0,86 C154,106 320,74 486,92 C650,110 806,66 972,88 C1140,110 1286,64 1440,90',
      fill: 'M0,86 C154,106 320,74 486,92 C650,110 806,66 972,88 C1140,110 1286,64 1440,90 L1440,900 L0,900 Z',
    },
  ];

  gsap.killTweensOf(resetTargets);
  overlay.classList.add('is-in');
  if (waveTurbulence) waveTurbulence.setAttribute('baseFrequency', '0.006 0.018');
  if (waveDisplacement) waveDisplacement.setAttribute('scale', '0');

  gsap.set(overlay, { autoAlpha: 1 });
  gsap.set(wave, {
    y: reduceMotion ? 0 : '64vh',
    opacity: 0,
  });
  gsap.set(waveFill, { attr: { d: waveShapes[0].fill } });
  gsap.set(waveEdge, { attr: { d: waveShapes[0].edge } });
  gsap.set(from, {
    transformOrigin: '50% 54%',
    willChange: reduceMotion ? 'opacity' : 'transform, filter, opacity',
  });
  gsap.set(currentContent, {
    transformOrigin: '50% 54%',
    willChange: reduceMotion ? 'opacity' : 'transform, filter, opacity',
  });
  gsap.set(to, {
    autoAlpha: reduceMotion ? 1 : 0,
    y: reduceMotion ? 0 : 56,
    scale: reduceMotion ? 1 : 0.985,
    filter: reduceMotion ? 'none' : 'blur(8px)',
    transformOrigin: '50% 50%',
    willChange: reduceMotion ? 'opacity' : 'transform, filter, opacity',
  });
  const tl = gsap.timeline({
    defaults: { ease: reduceMotion ? 'power1.out' : 'power4.inOut' },
    onStart() {
      isTransitioning = true;
      document.body.classList.add('is-transitioning');
    },
    onComplete() {
      overlay.classList.remove('is-in', 'is-out');
      if (waveTurbulence) waveTurbulence.setAttribute('baseFrequency', '0.006 0.018');
      if (waveDisplacement) waveDisplacement.setAttribute('scale', '0');
      gsap.set(resetTargets, { clearProps: 'all' });
      gsap.set(wave, { y: '100vh' });
      isTransitioning = false;
      document.body.classList.remove('is-transitioning');
      onDone?.();
    },
  });

  if (reduceMotion) {
    tl.to(overlay, { autoAlpha: 1, duration: 0.12 }, 0)
      .to(from, { autoAlpha: 0, duration: 0.18 }, 0)
      .call(() => {
        onPeak?.();
        overlay.classList.add('is-out');
      }, null, 0.18)
      .to(to, { autoAlpha: 1, duration: 0.2 }, 0.2)
      .to(overlay, { autoAlpha: 0, duration: 0.18 }, 0.34);

    return tl;
  }

  const surface = { y: window.innerHeight * 0.72, p: 0 };

  tl.to(surface, {
      y: window.innerHeight * 0.48,
      p: 1,
      duration: 0.78,
      ease: 'power3.out',
      onUpdate() {
        window.__cursorWaveSubmerge?.({
          y: surface.y,
          strength: 0.26 + surface.p * 0.22,
          phase: performance.now() * 0.006,
          amp: 7 + surface.p * 5,
          step: 46,
        });
      },
    }, 0)
    .to(surface, {
      y: window.innerHeight * 0.54,
      p: 0.55,
      duration: 0.64,
      ease: 'sine.inOut',
      onUpdate() {
        window.__cursorWaveSubmerge?.({
          y: surface.y,
          strength: 0.22 + surface.p * 0.18,
          phase: performance.now() * 0.005,
          amp: 9,
          step: 50,
        });
      },
    }, 0.78)
    .to(waveFill, { attr: { d: waveShapes[1].fill }, duration: 0.34, ease: 'sine.inOut' }, 0.08)
    .to(waveEdge, { attr: { d: waveShapes[1].edge }, duration: 0.34, ease: 'sine.inOut' }, 0.08)
    .to(waveFill, { attr: { d: waveShapes[2].fill }, duration: 0.38, ease: 'sine.inOut' }, 0.43)
    .to(waveEdge, { attr: { d: waveShapes[2].edge }, duration: 0.38, ease: 'sine.inOut' }, 0.43)
    .to(waveFill, { attr: { d: waveShapes[0].fill }, duration: 0.44, ease: 'sine.inOut' }, 0.82)
    .to(waveEdge, { attr: { d: waveShapes[0].edge }, duration: 0.44, ease: 'sine.inOut' }, 0.82);

  if (waveTurbulence) {
    tl.to(waveTurbulence, { attr: { baseFrequency: '0.011 0.026' }, duration: 0.58, ease: 'sine.inOut' }, 0.06)
      .to(waveTurbulence, { attr: { baseFrequency: '0.005 0.014' }, duration: 0.64, ease: 'sine.inOut' }, 0.64);
  }
  if (waveDisplacement) {
    tl.to(waveDisplacement, { attr: { scale: 8 }, duration: 0.42, ease: 'sine.inOut' }, 0.08)
      .to(waveDisplacement, { attr: { scale: 2 }, duration: 0.5, ease: 'sine.inOut' }, 0.5)
      .to(waveDisplacement, { attr: { scale: 0 }, duration: 0.46, ease: 'sine.out' }, 0.95);
  }

  tl.to(from, {
      scale: 1.04,
      y: 136,
      autoAlpha: 0,
      filter: 'blur(6px)',
      duration: 1.16,
      ease: 'power3.inOut',
    }, 0.10)
    .to(currentContent, {
      scale: 1.025,
      y: 92,
      autoAlpha: 0,
      filter: 'blur(10px)',
      duration: 1.02,
      ease: 'power3.inOut',
    }, 0.12);

  tl.call(() => {
      onPeak?.();
      overlay.classList.add('is-out');
    }, null, 0.92)
    .to(to, {
      autoAlpha: 1,
      y: 0,
      scale: 1,
      filter: 'blur(0px)',
      duration: 0.74,
      ease: 'expo.out',
    }, 0.94)
    .to(overlay, { autoAlpha: 0, duration: 0.34, ease: 'power2.out' }, 1.38);

  return tl;
}


function triggerDive() {
  if (diveActive || isTransitioning) return;
  diveActive = true;
  crewScrollUnlocked = true;
  window.__syncSmoothScroll?.();

  if (typeof gsap === 'undefined') {
    isTransitioning = true;
    document.getElementById('sec-crew')?.scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => {
      document.dispatchEvent(new CustomEvent('crew-force-enter'));
      isTransitioning = false;
    }, 450);
    diveActive = false;
    return;
  }

  const fromEl = document.getElementById('sec-intro');
  const toEl   = document.querySelector('.crew-sticky');

  if (!fromEl || !toEl) { diveActive = false; return; }

  /* useSectionTransitionLegacy()는 #main에 filter:url(#dive-warp)를 즉시 적용한다.
     CSS filter가 있는 조상은 position:fixed 자손의 containing block이 되어버리므로,
     is-intro-pinned(position:fixed;inset:0)가 살아있으면 hero가 문서 최상단(y=0)으로 튀어
     화면에서 사라진다("텍스트 사라짐·위에서 일렁임" 버그).
     filter 적용 전에 먼저 fixed를 sticky로 환원한다 — sticky는 조상 filter 영향을 받지 않는다. */
  fromEl.classList.remove('is-intro-pinned', 'is-intro-after');

  /* GSAP 타임라인이 kill되면 onComplete가 안 불려 diveActive가 영원히 true로 남을 수 있음 — 안전망 */
  window.clearTimeout(diveResetTimer);
  diveResetTimer = window.setTimeout(() => {
    if (diveActive) {
      diveActive = false;
      isTransitioning = false;
      document.body.classList.remove('is-transitioning');
    }
  }, 3500);

  const transition = useSectionTransitionLegacy({
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
        window.__syncSmoothScroll?.();
      }
      document.dispatchEvent(new CustomEvent('crew-force-enter'));
    },
    onDone: () => {
      window.clearTimeout(diveResetTimer);
      diveActive = false;
    },
  });

  if (!transition) {
    diveActive = false;
    isTransitioning = false;
    document.body.classList.remove('is-transitioning');
  }
}

function triggerDiveBack() {
  if (diveActive || isTransitioning) return;
  diveActive = true;
  window.__syncSmoothScroll?.();

  const introEl = document.getElementById('sec-intro');
  const crewSticky = document.querySelector('.crew-sticky');

  if (typeof gsap === 'undefined') {
    isTransitioning = true;
    introEl?.scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => {
      crewScrollUnlocked = false;
      window.__syncSmoothScroll?.();
      isTransitioning = false;
      diveActive = false;
    }, 450);
    return;
  }

  if (!introEl || !crewSticky) { diveActive = false; return; }

  const transition = useSectionTransitionLegacy({
    from: crewSticky,
    to: introEl,
    onPeak: () => {
      const top = Math.round(introEl.getBoundingClientRect().top + window.scrollY);
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
      crewScrollUnlocked = false;
      window.__syncSmoothScroll?.();
    },
    onDone: () => {
      diveActive = false;
    },
  });

  if (!transition) {
    diveActive = false;
    isTransitioning = false;
    document.body.classList.remove('is-transitioning');
  }
}


/* =============================================================
   4-B. 크루 섹션 스크롤 진입 시 왜곡 효과 + 페이드인
   ============================================================= */

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
  let displayedIndex = -1;
  let tailHidden    = false;
  let exitWavePlayed = false;
  let lastCrewCardWaveAt = 0;
  let crewCardWaveTl = null;
  let crewCardSwapTimer = 0;
  let crewEnterTimer = 0;
  let crewSequencedEnterUntil = 0;

  function resetCrewExitState() {
    if (
      !section.classList.contains('is-crew-exiting') &&
      !section.classList.contains('is-crew-wave-exiting')
    ) return;

    sticky.style.filter = '';
    section.classList.remove('is-crew-exiting', 'is-crew-wave-exiting');
    section.querySelectorAll('.crew-header, .crew-main, .crew-canvas-wrap, .crew-info-wrap, .crew-dots, .crew-rotate-hint').forEach((el) => {
      el.style.animation = 'none';
      void el.offsetWidth;
      el.style.animation = '';
    });
  }

  function playCrewCardWave() {
    const wrap    = document.querySelector('.crew-info-wrap');
    const dispMap = document.getElementById('dive-disp-map');
    const turbEl  = document.getElementById('dive-turbulence');

    if (!wrap || !dispMap || !turbEl || typeof gsap === 'undefined') return;
    const now = performance.now();
    if (now - lastCrewCardWaveAt < 260) return;
    lastCrewCardWaveAt = now;

    wrap.style.filter = 'url(#dive-warp)';
    turbEl.setAttribute('baseFrequency', '0.0014 0.0026');
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
      .to(dispMap, { attr: { scale: 5 }, duration: 0.38, ease: 'sine.inOut' })
      .to(dispMap, { attr: { scale: 0 }, duration: 1.10, ease: 'power2.out' });
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
      const bfx = (0.003 + Math.sin(t * 2.2) * 0.0018).toFixed(5);
      const bfy = (0.005 + Math.cos(t * 1.8) * 0.0022).toFixed(5);
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

  function showCard(idx, force = false) {
    window.clearTimeout(crewCardSwapTimer);
    if (idx === displayedIndex && !force) return;
    displayedIndex = idx;
    panels.forEach((p, i) => {
      p.classList.remove('is-active', 'is-prev');
      if      (i === idx) p.classList.add('is-active');
      else if (i  <  idx) p.classList.add('is-prev');
    });
  }

  function scheduleShowCard(idx, delay = 0, force = false) {
    window.clearTimeout(crewCardSwapTimer);
    if (delay <= 0) {
      showCard(idx, force);
      return;
    }

    crewCardSwapTimer = window.setTimeout(() => {
      if (currentIndex === idx) showCard(idx, force);
    }, delay);
  }

  function setActive(idx, force = false) {
    if (idx === currentIndex && !force) return;
    const prevIndex = currentIndex;
    currentIndex = idx;

    dots.forEach((d, i) => d.classList.toggle('is-active', i === idx));

    if (placeholder) placeholder.dataset.creature = creatures[idx] ?? '';

    const isPanelChange = prevIndex >= 0 && prevIndex !== idx;
    scheduleShowCard(idx, !force && isPanelChange ? 340 : 0, force || prevIndex < 0);

    if (!force && isPanelChange && !diveActive) {
      playCrewCardWave();
    }

    /* Three.js crew3d.js에 전달 */
    document.dispatchEvent(new CustomEvent('crew-switch', { detail: { idx, immediate: force } }));
  }

  function onScroll() {
    const rect    = section.getBoundingClientRect();
    const scrolled = -rect.top; /* 섹션 상단으로부터 스크롤된 px */
    const panelHeight = window.innerHeight;
    const exitStart = totalPanels * panelHeight;

    if (!crewScrollUnlocked && !diveActive && scrolled >= -10) {
      crewScrollUnlocked = true;
      window.__syncSmoothScroll?.();
    }

    if (!crewScrollUnlocked && !diveActive) {
      crewPanelActive = false;
      window.clearTimeout(crewEnterTimer);
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
      crewPanelActive = false;
      window.clearTimeout(crewEnterTimer);
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
      crewPanelActive = false;
      if (!tailHidden) {
        tailHidden = true;
        document.dispatchEvent(new CustomEvent('crew-tail-visibility', { detail: { hidden: true } }));
      }
      section.classList.add('is-crew-exiting');
      return;
    }

    crewPanelActive = true;

    if (exitWavePlayed) {
      document.dispatchEvent(new CustomEvent('crew-wave-exit-reset'));
    }
    resetCrewExitState();
    exitWavePlayed = false;

    if (tailHidden) {
      tailHidden = false;
      document.dispatchEvent(new CustomEvent('crew-tail-visibility', { detail: { hidden: false } }));
    }

    /* 각 패널은 100vh(= innerHeight)씩 차지 */
    const wasContentVisible = section.classList.contains('is-content-visible');
    section.classList.add('is-title-visible');
    if (performance.now() >= crewSequencedEnterUntil) {
      section.classList.add('is-content-visible');
    }

    const idx = Math.min(
      Math.floor(scrolled / panelHeight),
      totalPanels - 1
    );
    const canForceInitial = currentIndex < 0 || (!wasContentVisible && performance.now() >= crewSequencedEnterUntil);
    setActive(Math.max(idx, 0), canForceInitial);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  document.addEventListener('crew-force-enter', () => {
    window.clearTimeout(crewEnterTimer);
    resetCrewExitState();
    section.classList.add('is-title-visible', 'is-content-visible');
    crewSequencedEnterUntil = 0;
    tailHidden = false;
    exitWavePlayed = false;
    setActive(0, false);
  });
  // 3D 생물이 다시 보이는 타이밍에 카드 텍스트를 교체합니다.

  /* 점 클릭 → 해당 패널 위치로 스크롤 */
  document.addEventListener('crew-card-reenter', (e) => {
    const idx = Number(e.detail?.idx);
    const nextIndex = Number.isInteger(idx) && idx >= 0 ? idx : currentIndex;
    showCard(Math.min(Math.max(nextIndex, 0), totalPanels - 1), true);
    if (!diveActive) playCrewCardWave();
  });

  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => {
      const sTop = window.scrollY + section.getBoundingClientRect().top;
      window.scrollTo({ top: sTop + i * window.innerHeight, behavior: 'smooth' });
    });
  });

  onScroll();
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

  const section = document.getElementById('sec-booking');
  if (!section) return;

  const restartBookingVideos = () => {
    section.querySelectorAll('.booking-bg-video').forEach(video => {
      video.style.setProperty('--booking-video-loop-opacity', '1');
      video.style.animation = 'none';
      void video.offsetWidth;
      video.style.animation = '';
    });
  };

  const observer = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) restartBookingVideos();
  }, { threshold: 0.16 });

  observer.observe(section);
}

function initBookingBgVideo() {
  if (isMobileViewport()) return;

  const videos = document.querySelectorAll('.booking-bg-video');
  if (!videos.length) return;

  videos.forEach(video => {
    const rate = Number(video.dataset.playbackRate || 1);
    if (Number.isFinite(rate) && rate > 0) {
      video.playbackRate = rate;
      video.defaultPlaybackRate = rate;
    }
  });

  const section = videos[0].closest('.section--booking');
  if (!section) return;

  new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return;
    videos.forEach(video => {
      video.style.animation = 'none';
      try { video.currentTime = 0; } catch (_) {}
      void video.offsetWidth;
      video.style.animation = '';
    });
  }, { threshold: 0.16 }).observe(section);
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
    const rawProgress = (vh - rect.top) / scrollSpan;
    const progress = clamp01(rawProgress);
    return { rect, vh, sectionTop, scrollSpan, progress, rawProgress };
  }

  function scrollTargetForProgress(progress) {
    const { vh, sectionTop, scrollSpan } = getSectionMetrics();
    const maxScroll = document.documentElement.scrollHeight - vh;
    return Math.min(Math.max(sectionTop - vh + progress * scrollSpan, 0), maxScroll);
  }

  let rafPending = false;
  function onScroll() {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(() => {
      rafPending = false;
      _onScrollImpl();
    });
  }
  function _onScrollImpl() {
    const { rect, vh, scrollSpan, progress, rawProgress } = getSectionMetrics();
    const timing = getResponsiveSequenceTiming();
    const nextOverlapExit = 1 - smoothstep(vh * timing.overlapExit[0], vh * timing.overlapExit[1], rect.bottom);
    const bottomExit = clamp01((vh * timing.bottomExit - rect.bottom) / (vh * timing.bottomExit));
    const exitProgress = Math.max(nextOverlapExit, bottomExit);
    const titleProgress = smoothstep(timing.titleEnter[0], timing.titleEnter[1], progress);
    const contentEnterProgress = smoothstep(timing.contentEnter[0], timing.contentEnter[1], progress);
    const contentExitLift = smoothstep(timing.contentExit[0], timing.contentExit[1], rawProgress);
    const contentLeaveProgress = Math.max(exitProgress, contentExitLift);
    const contentY = (1 - contentEnterProgress) * 52 - contentExitLift * 48;
    const titleY = (1 - titleProgress) * 72 - contentExitLift * 34;
    const isInRange = rect.top < vh && rect.bottom > 0;
    const isPast = rect.bottom <= 0;
    const titleOpacity = titleProgress * (1 - contentLeaveProgress);
    const contentOpacity = contentEnterProgress * (1 - contentLeaveProgress);
    const scrollingDown = progress >= lastProgress;

    section.style.setProperty('--seq-content-y', `${contentY.toFixed(2)}vh`);
    section.style.setProperty('--seq-title-y', `${titleY.toFixed(2)}px`);
    section.style.setProperty('--seq-title-opacity', titleOpacity.toFixed(3));
    section.style.setProperty('--seq-content-opacity', contentOpacity.toFixed(3));

    if (!isInRange && !isPast) {
      section.classList.remove('is-title-visible', 'is-content-visible', 'is-exiting', 'is-content-animating');
      contentWasVisible = false;
      holdWheelCount = 0;
      lastProgress = progress;
      return;
    }

    const titleVisible = titleOpacity > 0.01 && !isPast;
    const contentVisible = contentOpacity > 0.01 && !isPast;
    const exiting = exitProgress > 0 || isPast;
    const contentAnimating = titleOpacity > 0 || contentOpacity > 0;

    section.classList.toggle('is-title-visible', titleVisible);
    section.classList.toggle('is-content-visible', contentVisible);
    section.classList.toggle('is-exiting', exiting);
    section.classList.toggle('is-content-animating', contentAnimating);

    if (contentOpacity > 0.3 && !contentWasVisible && !exiting && scrollingDown && sectionId === 'sec-location') {
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
  if (controller.section.id === 'sec-program') {
    controller.setHoldWheelCount(0);
    stickySequenceWheelDelta = 0;
    return;
  }

  const { progress } = metrics;
  const timing = getResponsiveSequenceTiming();
  const holdProgress = timing.holdProgress;
  const exitProgress = timing.exitProgress;
  const lockedWheelLimit = 1;
  const wheelThreshold = 90;
  const rawGoingDown = e.deltaY > 0;
  const rawGoingUp = e.deltaY < 0;

  if (controller.section.id === 'sec-booking' && rawGoingUp && progress > holdProgress + 0.08) {
    controller.setHoldWheelCount(0);
    stickySequenceWheelDelta = 0;
    return;
  }
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
    const bfx = (0.0030 + Math.sin(t * 2.8) * 0.0010 * fade).toFixed(5);
    const bfy = (0.0055 + Math.cos(t * 2.4) * 0.0014 * fade).toFixed(5);
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
    .to(dispMap, { attr: { scale: 12 }, duration: 0.18, ease: 'sine.out' })
    .to(dispMap, { attr: { scale:  4 }, duration: 0.2,  ease: 'sine.inOut' })
    .to(dispMap, { attr: { scale:  8 }, duration: 0.18, ease: 'sine.inOut' })
    .to(dispMap, { attr: { scale:  0 }, duration: 0.42, ease: 'sine.out' });
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
      img: 'assets/images/index/Frame 19.avif',
      href: '#sec-booking',
      address: '경기도 고양시 일산서구 한류월드로 282',
      tel: 'TEL. 1833-7001',
      desc: '해양문화의 가치와 생태계 보존을 대중에게 널리 알리는 아쿠아플라넷 일산.',
    },
    '코엑스': {
      name: '아쿠아플라넷 광교',
      img: 'assets/images/index/Frame 20.avif',
      href: '#sec-booking',
      address: '경기도 수원시 영통구 광교호수공원로 300 포레나 광교 B1F',
      tel: 'TEL. 1833-7001',
      desc: '도심 속에서 바다를 보고, 만지고, 느낄 수 있는 경기 남부의 해양문화공간, 아쿠아플라넷 광교.',
    },
    '여수':  {
      name: '아쿠아플라넷 여수',
      img: 'assets/images/index/Frame 22.avif',
      href: '#sec-booking',
      address: '전라남도 여수시 오동도로 61-11',
      tel: 'TEL. 1833-7001',
      desc: '인간과 자연이 공생하는 해양문화의 가치를 전하는 남해의 대표 해양문화공간, 아쿠아플라넷 여수.',
    },
    '제주':  {
      name: '아쿠아플라넷 제주',
      img: 'assets/images/index/Frame 21.avif',
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

    const rawStartX = markerRect.left + markerRect.width / 2 - wrapRect.left;
    const startY = markerRect.top + markerRect.height / 2 - wrapRect.top;
    const endX = cardRect.left - wrapRect.left;
    const endY = cardRect.top + Math.min(168, cardRect.height * 0.43) - wrapRect.top;
    const logoRect = marker.querySelector('.map-marker__logo')?.getBoundingClientRect();
    const startClearance = (logoRect?.width || markerRect.width) / 2 + 14;
    const startX = rawStartX + (endX >= rawStartX ? startClearance : -startClearance);
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

    const crew = document.getElementById('sec-crew');
    if (crew && target !== document.getElementById('sec-logo')) {
      const crewTop = window.scrollY + crew.getBoundingClientRect().top;
      const targetTop = window.scrollY + target.getBoundingClientRect().top;
      if (targetTop >= crewTop - 4) {
        crewScrollUnlocked = true;
        window.__syncSmoothScroll?.();
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
  if (isMobileViewport()) return;

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
    if (!snapped || !Number.isFinite(cx) || !Number.isFinite(cy)) {
      snapped = true;
      cx = tx; cy = ty;
    }
  }, { passive: true });

  document.addEventListener('mouseleave', () => {
    snapped = false;
    el.style.opacity = '0';
  });
  document.addEventListener('mouseenter', () => {
    snapped = false;
    el.style.opacity = '1';
  });
  document.addEventListener('visibilitychange', () => {
    snapped = false;
    el.style.opacity = document.hidden ? '0' : '1';
  });
  document.addEventListener('mousedown',  () => el.classList.add('is-clicking'));
  document.addEventListener('mouseup',    () => el.classList.remove('is-clicking'));

  document.addEventListener('mouseover', e => {
    const over = e.target.closest('a, button, [role="button"], .map-marker, .program-card, .booking-card');
    el.classList.toggle('is-hovering', !!over);
  });

  (function loop() {
    cx += (tx - cx) * 0.38;
    cy += (ty - cy) * 0.38;
    if (!Number.isFinite(cx) || !Number.isFinite(cy)) {
      cx = tx;
      cy = ty;
    }
    el.style.transform = `translate(${(cx - HALF).toFixed(1)}px,${(cy - HALF).toFixed(1)}px)`;
    requestAnimationFrame(loop);
  })();
}


/* =============================================================
   11. CURSOR WAVE — 잔잔한 수면 수평 반사 흔들림
   ============================================================= */
function initCursorWave() {
  if (isMobileViewport()) return;

  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  Object.assign(canvas.style, {
    position:      'fixed',
    inset:         '0',
    width:         '100%',
    height:        '100%',
    pointerEvents: 'none',
    zIndex:        '10000',
    opacity:       '0.72',
  });
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');

  const SCALE         = 14;
  const DAMP          = 0.92;
  const DIST_INTERVAL = 16;
  const RX = 4, RY = 1;
  const FORCE = 60;

  let W, H, bW, bH, cur, prv, offscreen, offCtx, imgData;
  let running = true;
  let waveRafId = null;
  let pointerReady = false;
  let mx = 0, my = 0, pmx = 0, pmy = 0, distAccum = 0;

  function resize() {
    W  = Math.max(window.innerWidth || document.documentElement.clientWidth || 1, 1);
    H  = Math.max(window.innerHeight || document.documentElement.clientHeight || 1, 1);
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
    pointerReady = false;
    distAccum = 0;
  }

  let waveResizeTimer = null;
  resize();
  window.addEventListener('resize', () => {
    clearTimeout(waveResizeTimer);
    waveResizeTimer = setTimeout(resize, 200);
  }, { passive: true });

  window.addEventListener('mousemove', e => {
    mx = e.clientX;
    my = e.clientY;
    if (!pointerReady) {
      pointerReady = true;
      pmx = mx;
      pmy = my;
      distAccum = 0;
    }
  }, { passive: true });

  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    pointerReady = false;
    distAccum = 0;
    if (running) startTick();
  });

  function disturb(cx, cy, force = FORCE, rx = RX, ry = RY) {
    for (let dy = -ry; dy <= ry; dy++) {
      for (let dx = -rx; dx <= rx; dx++) {
        const d = Math.hypot(dx / rx, dy / ry);
        if (d > 1) continue;
        const nx = cx + dx, ny = cy + dy;
        if (nx < 1 || nx >= bW - 1 || ny < 1 || ny >= bH - 1) continue;
        cur[ny * bW + nx] += force * (1 - d);
      }
    }
  }

  window.__cursorWaveSubmerge = function submergeCursorWave(opts = {}) {
    const y = Number.isFinite(opts.y) ? opts.y : H * 0.58;
    const strength = Number.isFinite(opts.strength) ? opts.strength : 0.7;
    const phase = Number.isFinite(opts.phase) ? opts.phase : performance.now() * 0.003;
    const step = Math.max(32, Number.isFinite(opts.step) ? opts.step : 48);
    const amp = Number.isFinite(opts.amp) ? opts.amp : 9;

    for (let x = -step; x <= W + step; x += step) {
      const yy = y + Math.sin(x * 0.012 + phase) * amp + Math.sin(x * 0.027 - phase * 0.7) * amp * 0.32;
      disturb(Math.round(x / SCALE), Math.round(yy / SCALE), FORCE * strength, 3, 1);
    }
  };

  function tick() {
    waveRafId = null;
    if (!running) return;
    waveRafId = requestAnimationFrame(tick);

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
    ctx.filter = 'blur(5px)';
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(offscreen, 0, 0, W, H);
    ctx.restore();
  }

  function startTick() {
    if (waveRafId === null) {
      waveRafId = requestAnimationFrame(tick);
    }
  }

  startTick();
}


/* =============================================================
   MOBILE MENU — 햄버거 토글 (820px 이하 전용)
   ============================================================= */
function initMobileMenu() {
  const hamburger  = document.querySelector('.gnb__hamburger');
  const mobileMenu = document.querySelector('.gnb__mobile-menu');
  if (!hamburger || !mobileMenu) return;

  function openMenu() {
    hamburger.classList.add('is-active');
    hamburger.setAttribute('aria-expanded', 'true');
    mobileMenu.classList.add('is-open');
    mobileMenu.setAttribute('aria-hidden', 'false');
    document.body.classList.add('mobile-menu-open');
  }

  function closeMenu() {
    hamburger.classList.remove('is-active');
    hamburger.setAttribute('aria-expanded', 'false');
    mobileMenu.classList.remove('is-open');
    mobileMenu.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('mobile-menu-open');
  }

  hamburger.addEventListener('click', () => {
    hamburger.getAttribute('aria-expanded') === 'true' ? closeMenu() : openMenu();
  });

  /* 서브메뉴 아코디언 */
  mobileMenu.querySelectorAll('.gnb__mobile-link--toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.gnb__mobile-item');
      const isOpen = item.classList.contains('is-open');
      /* 다른 열린 항목 닫기 */
      mobileMenu.querySelectorAll('.gnb__mobile-item.is-open').forEach(el => {
        el.classList.remove('is-open');
        el.querySelector('.gnb__mobile-link--toggle').setAttribute('aria-expanded', 'false');
      });
      if (!isOpen) {
        item.classList.add('is-open');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });

  /* 내부 링크 클릭 시 메뉴 닫기 */
  mobileMenu.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', closeMenu);
  });

  /* ESC 키로 닫기 */
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && mobileMenu.classList.contains('is-open')) closeMenu();
  });

  /* 820px 초과로 리사이즈되면 강제 닫기 */
  window.addEventListener('resize', () => {
    if (!isMobileViewport()) closeMenu();
  });
}


