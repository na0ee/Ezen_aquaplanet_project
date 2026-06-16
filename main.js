/* =============================================================
   AQUA PLANET — main.js
   ============================================================= */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
  initReveal();
  initGnb();
  initScrollIndicator();
  initLogoScrollGate();
  initIntroScrollGate();
  initCrewScroll();
  initProgramSequence();
  initLocationSequence();
  initBookingSequence();
  initMapMarkers();
  initTopBtn();
  initCustomCursor();
  initCursorWave();
});


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

  function onScroll() {
    const currentY = window.scrollY;
    const scrolledDown = currentY > lastScrollY;

    gnb.classList.toggle('is-scrolled', currentY > SCROLL_THRESHOLD);

    // 로고 트랜지션 중에는 헤더 슬롯이 안정적이도록 GNB를 숨기지 않음
    const inLogoTransition = document.body.classList.contains('is-logo-transition');
    if (currentY > SCROLL_THRESHOLD && !inLogoTransition) {
      gnb.classList.toggle('is-hidden', scrolledDown);
    } else {
      gnb.classList.remove('is-hidden');
    }

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
   4. 잠수 전환 — 전화면 물결 왜곡 (unseen.co 스타일)
   ============================================================= */
let diveActive = false;
let crewScrollUnlocked = false;

function initIntroScrollGate() {
  const intro = document.getElementById('sec-intro');
  const crew  = document.getElementById('sec-crew');
  if (!intro || !crew) return;

  let touchStartY = 0;

  function isBeforeCrew() {
    const crewTop = window.scrollY + crew.getBoundingClientRect().top;
    return window.scrollY < crewTop - 4;
  }

  function isAtOrAfterIntro() {
    const introTop = window.scrollY + intro.getBoundingClientRect().top;
    return window.scrollY >= introTop - 4;
  }

  function shouldBlockDown() {
    return !crewScrollUnlocked && !diveActive && isAtOrAfterIntro() && isBeforeCrew();
  }

  window.addEventListener('wheel', (e) => {
    if (e.deltaY > 0 && shouldBlockDown()) {
      e.preventDefault();
    }
  }, { passive: false });

  window.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0]?.clientY ?? 0;
  }, { passive: true });

  window.addEventListener('touchmove', (e) => {
    const y = e.touches[0]?.clientY ?? touchStartY;
    if (touchStartY - y > 30 && shouldBlockDown()) {
      e.preventDefault();
    }
  }, { passive: false });

  window.addEventListener('keydown', (e) => {
    const downKeys = ['ArrowDown', 'PageDown', ' ', 'End'];
    if (downKeys.includes(e.key) && shouldBlockDown()) {
      e.preventDefault();
    }
  });

  window.addEventListener('scroll', () => {
    if (window.scrollY < 20 && !diveActive) crewScrollUnlocked = false;
  }, { passive: true });
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
    diveActive = false;
    return;
  }

  const fromEl = document.getElementById('sec-intro');
  const toEl   = document.querySelector('.crew-sticky');

  if (!fromEl || !toEl) { diveActive = false; return; }

  useSectionTransition({
    from:   fromEl,
    to:     toEl,
    onPeak: () => document.getElementById('sec-crew')?.scrollIntoView({ behavior: 'auto' }),
    onDone: () => { diveActive = false; },
  });
}


/* =============================================================
   5. Our Crew — 스크롤 드리븐 패널 전환
   ============================================================= */
function initCrewScroll() {
  const section     = document.getElementById('sec-crew');
  const panels      = document.querySelectorAll('.crew-panel');
  const dots        = document.querySelectorAll('.crew-dot');
  const placeholder = document.getElementById('crew-placeholder');
  const crewTitle   = section.querySelector('.crew-header__title');
  const crewSub     = section.querySelector('.crew-header__sub');
  const sticky      = section.querySelector('.crew-sticky');

  if (!section || !panels.length) return;

  const creatures  = ['walrus', 'beluga', 'whaleshark', 'turtle'];
  const totalPanels = panels.length;
  let currentIndex  = -1;
  let tailHidden    = false;
  let exitWavePlayed = false;

  function playCrewCardWave() {
    const wrap    = document.querySelector('.crew-info-wrap');
    const dispMap = document.getElementById('dive-disp-map');
    const turbEl  = document.getElementById('dive-turbulence');

    if (!wrap || !dispMap || !turbEl || typeof gsap === 'undefined') return;

    wrap.style.filter = 'url(#dive-warp)';

    let rafId;
    const t0 = performance.now();
    (function tickCrewWave() {
      const t   = (performance.now() - t0) / 1000;
      const bfx = (0.005 + Math.sin(t * 2.2) * 0.0015).toFixed(5);
      const bfy = (0.009 + Math.cos(t * 1.8) * 0.0022).toFixed(5);
      turbEl.setAttribute('baseFrequency', `${bfx} ${bfy}`);
      rafId = requestAnimationFrame(tickCrewWave);
    })();

    gsap.fromTo(
      dispMap,
      { attr: { scale: 22 } },
      {
        attr: { scale: 0 },
        duration: 0.85,
        ease: 'expo.out',
        onComplete() {
          cancelAnimationFrame(rafId);
          turbEl.setAttribute('baseFrequency', '0.004 0.007');
          dispMap.setAttribute('scale', '0');
          wrap.style.filter = '';
        },
      }
    );
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

  function setActive(idx) {
    if (idx === currentIndex) return;
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
    document.dispatchEvent(new CustomEvent('crew-switch', { detail: { idx } }));

    /* 카드 전환 파동 효과 (첫 번째 진입 제외) */
    if (prevIndex >= 0) playCrewCardWave();
  }

  function onScroll() {
    const rect    = section.getBoundingClientRect();
    const scrolled = -rect.top; /* 섹션 상단으로부터 스크롤된 px */

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

    const pastLastPanel = scrolled >= totalPanels * window.innerHeight;
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
    const idx = Math.min(
      Math.floor(scrolled / window.innerHeight),
      totalPanels - 1
    );
    setActive(Math.max(idx, 0));
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  setActive(0);

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

function initStickySequenceSection(sectionId) {
  const section = document.getElementById(sectionId);
  if (!section) return;
  let contentWasVisible = false;

  function clamp01(value) {
    return Math.min(Math.max(value, 0), 1);
  }

  function onScroll() {
    const rect = section.getBoundingClientRect();
    const vh   = window.innerHeight;
    const progress = clamp01(-rect.top / vh);
    const titleY = (1 - progress) * 46;
    const contentY = (1 - progress) * 52;
    const isInRange = rect.top < vh && rect.bottom > 0;
    const isPast = rect.bottom <= 0;

    section.style.setProperty('--seq-title-y', `${titleY.toFixed(2)}vh`);
    section.style.setProperty('--seq-content-y', `${contentY.toFixed(2)}vh`);

    if (!isInRange && !isPast) {
      section.classList.remove('is-title-visible', 'is-content-visible', 'is-exiting');
      contentWasVisible = false;
      return;
    }

    const titleVisible = progress > 0.02 && !isPast;
    const contentVisible = progress > 0.18 && !isPast;
    const exiting = progress >= 0.98 || isPast;

    section.classList.toggle('is-title-visible', titleVisible);
    section.classList.toggle('is-content-visible', contentVisible);
    section.classList.toggle('is-exiting', progress >= 0.98 || isPast);

    if (contentVisible && !contentWasVisible && !exiting) {
      playSequenceWave(section);
    }
    contentWasVisible = contentVisible && !exiting;
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

function playSequenceWave(section) {
  const content = section.querySelector('.program-seq-content, .location-seq-content, .booking-seq-content');
  const dispMap = document.getElementById('dive-disp-map');
  const turbEl  = document.getElementById('dive-turbulence');
  if (!content) return;

  content.classList.remove('is-wave-entering');
  void content.offsetWidth;
  content.classList.add('is-wave-entering');
  window.setTimeout(() => content.classList.remove('is-wave-entering'), 1100);

  if (!dispMap || !turbEl || typeof gsap === 'undefined') return;

  content.style.filter = 'url(#dive-warp)';

  let rafId;
  const t0 = performance.now();
  (function tickSequenceWave() {
    const t   = (performance.now() - t0) / 1000;
    const bfx = (0.006 + Math.sin(t * 2.35) * 0.0022).toFixed(5);
    const bfy = (0.010 + Math.cos(t * 1.85) * 0.0028).toFixed(5);
    turbEl.setAttribute('baseFrequency', `${bfx} ${bfy}`);
    rafId = requestAnimationFrame(tickSequenceWave);
  })();

  gsap.fromTo(
    dispMap,
    { attr: { scale: 30 } },
    {
      attr: { scale: 0 },
      duration: 1.05,
      ease: 'expo.out',
      onComplete() {
        cancelAnimationFrame(rafId);
        turbEl.setAttribute('baseFrequency', '0.004 0.007');
        dispMap.setAttribute('scale', '0');
        content.style.filter = '';
      },
    }
  );
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

  const branchInfo = {
    '일산':  { name: '아쿠아플라넷 일산',  img: 'assets/images/Frame 19.png', href: '#sec-booking' },
    '코엑스': { name: '아쿠아플라넷 코엑스', img: 'assets/images/Frame 20.png', href: '#sec-booking' },
    '여수':  { name: '아쿠아플라넷 여수',  img: 'assets/images/Frame 22.png', href: '#sec-booking' },
    '제주':  { name: '아쿠아플라넷 제주',  img: 'assets/images/Frame 21.png', href: '#sec-booking' },
  };

  const cardImg = hoverCard?.querySelector('.location-hover-card__img');

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
    if (cardImg && info) {
      cardImg.src = info.img;
      cardImg.alt = info.name;
    }
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
    window.cancelAnimationFrame(indicatorRaf);
    markers.forEach(m => m.classList.remove('is-active'));
    mapWrap?.classList.remove('is-hovering');
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
   9. TOP BUTTON
   ============================================================= */
function initTopBtn() {
  const btn         = document.getElementById('top-btn');
  const contentWrap = document.querySelector('.content-bg-wrap');
  if (!btn) return;

  function update() {
    const winH = window.innerHeight;

    // 뷰포트 절반 이상 스크롤하면 버튼 표시
    btn.classList.toggle('top-btn--visible', window.scrollY > winH * 0.5);

    // 버튼 위치(우하단)가 콘텐츠 섹션 구간에 있으면 글래스, 아니면 흰색
    if (contentWrap) {
      const rect      = contentWrap.getBoundingClientRect();
      const btnY      = winH - 60; // 버튼 중심의 뷰포트 Y
      const inContent = rect.top <= btnY && rect.bottom >= btnY;
      btn.classList.toggle('top-btn--glass', inContent);
    }
  }

  window.addEventListener('scroll', update, { passive: true });
  update();

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    e.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});


/* =============================================================
   10. CUSTOM CURSOR — 흰색 원형 커서
   ============================================================= */
function initCustomCursor() {
  if (window.matchMedia('(hover: none)').matches) return;

  const el = document.getElementById('custom-cursor');
  if (!el) return;

  const HALF = 17;
  let tx = -200, ty = -200;
  let cx = tx,   cy = ty;
  let firstMove = false;

  window.addEventListener('mousemove', e => {
    tx = e.clientX;
    ty = e.clientY;
    if (!firstMove) {
      firstMove = true;
      cx = tx; cy = ty;        // 첫 이동 시 즉시 스냅
      el.style.opacity = '1';
    }
  }, { passive: true });

  document.addEventListener('mouseleave', () => { el.style.opacity = '0'; });
  document.addEventListener('mouseenter', () => { if (firstMove) el.style.opacity = '1'; });
  document.addEventListener('mousedown',  () => el.classList.add('is-clicking'));
  document.addEventListener('mouseup',    () => el.classList.remove('is-clicking'));

  document.addEventListener('mouseover', e => {
    const over = e.target.closest('a, button, [role="button"], .map-marker, .program-card, .booking-card');
    el.classList.toggle('is-hovering', !!over);
  });

  (function loop() {
    cx += (tx - cx) * 0.13;
    cy += (ty - cy) * 0.13;
    el.style.transform = `translate(${(cx - HALF).toFixed(1)}px,${(cy - HALF).toFixed(1)}px)`;
    requestAnimationFrame(loop);
  })();
}


/* =============================================================
   11. CURSOR WAVE — 잔잔한 수면 수평 반사 흔들림
   ============================================================= */
function initCursorWave() {
  if (window.matchMedia('(hover: none)').matches) return;

  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  Object.assign(canvas.style, {
    position:      'fixed',
    inset:         '0',
    width:         '100%',
    height:        '100%',
    pointerEvents: 'none',
    zIndex:        '9996',
    mixBlendMode:  'screen',
  });
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');

  // 작은 셀 = 커서 주변 좁은 영역에 집중
  const SCALE         = 9;
  // 높은 감쇠 = 파동이 빠르게 사라져 멀리 퍼지지 않음
  const DAMP          = 0.92;
  // 짧은 간격 = 커서 따라 자연스럽게 이어지는 물결
  const DIST_INTERVAL = 16;
  // 좁은 타원: 커서 주변만 수평으로 일렁이게
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
    // 수평으로 긴 타원형 교란 — 반사 이미지가 옆으로 흔들리는 모양
    for (let dy = -RY; dy <= RY; dy++) {
      for (let dx = -RX; dx <= RX; dx++) {
        const d = Math.hypot(dx / RX, dy / RY); // 타원 거리
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

    // 파동 방정식
    const nxt = prv;
    for (let y = 1; y < bH - 1; y++) {
      for (let x = 1; x < bW - 1; x++) {
        const i = y * bW + x;
        nxt[i] = ((cur[i-1] + cur[i+1] + cur[i-bW] + cur[i+bW]) / 2 - nxt[i]) * DAMP;
      }
    }
    prv = cur;
    cur = nxt;

    // 렌더링 — X방향 기울기(수평 반사)에 가중치 집중, 은빛 수면 색상
    const px = imgData.data;
    px.fill(0);

    for (let y = 1; y < bH - 1; y++) {
      for (let x = 1; x < bW - 1; x++) {
        const i = y * bW + x;
        const v = cur[i];
        if (Math.abs(v) < 1.5) continue;

        // 수평 방향 기울기에 85% 집중 → 옆으로 흔들리는 반사 느낌
        const lx    = cur[i - 1] - cur[i + 1];
        const ly    = cur[i - bW] - cur[i + bW];
        const shine = lx * 0.85 + ly * 0.15;
        if (shine <= 0) continue;

        const amp   = Math.min(Math.abs(v) / 48, 1);
        const alpha = Math.min(shine * amp * 1.0, 1) * 90; // 은은한 밝기
        if (alpha < 2) continue;

        const t    = Math.min(shine * amp * 0.5, 1);
        const pidx = (y * bW + x) * 4;
        // 수면 반사광: 연한 하늘빛 흰색
        px[pidx]     = Math.round(190 + t * 65);
        px[pidx + 1] = Math.round(220 + t * 35);
        px[pidx + 2] = Math.round(245 + t * 10);
        px[pidx + 3] = alpha;
      }
    }

    offCtx.putImageData(imgData, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.filter = 'blur(7px)'; // 수면 반사처럼 부드럽게
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(offscreen, 0, 0, W, H);
    ctx.restore();
  }

  tick();
}
