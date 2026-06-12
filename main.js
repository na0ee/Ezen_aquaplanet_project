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
  initMapMarkers();
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

  function onScroll() {
    gnb.classList.toggle('is-scrolled', window.scrollY > SCROLL_THRESHOLD);

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
  if (!indicator) return;

  window.addEventListener('scroll', () => {
    const progress = Math.min(window.scrollY / 150, 1);
    indicator.style.opacity   = String(1 - progress);
    indicator.style.transform = `translateX(-50%) translateY(${progress * 20}px)`;
  }, { passive: true });

  if (trigger) trigger.addEventListener('click', triggerDive);
}


/* =============================================================
   3-B. 로고 섹션 스크롤 게이트
        스크롤 3회 또는 Enter 버튼 클릭 → 물결 전환으로 sec-intro 이동
   ============================================================= */
function initLogoScrollGate() {
  const logo     = document.getElementById('sec-logo');
  const intro    = document.getElementById('sec-intro');
  const enterBtn = document.querySelector('.logo-scroll');
  if (!logo || !intro) return;

  let scrollCount   = 0;
  let lastScrollTime = 0;
  let gateOpen      = false;

  /* intro 상단이 뷰포트 하단 아래에 있으면 로고 섹션에 있는 것 */
  function isAtLogo() {
    return intro.getBoundingClientRect().top > window.innerHeight * 0.4;
  }

  function triggerLogoToIntro() {
    if (gateOpen) return;
    gateOpen = true;

    if (typeof gsap === 'undefined') {
      intro.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    useSectionTransition({
      from:   logo,
      to:     intro,
      onPeak: () => intro.scrollIntoView({ behavior: 'auto' }),
      onDone: () => { /* gateOpen 유지 — 재트리거 방지 */ },
    });
  }

  /* 마우스 휠: 아래 스크롤 3회 카운트 */
  window.addEventListener('wheel', (e) => {
    if (!isAtLogo() || gateOpen) return;
    if (e.deltaY > 0) {
      e.preventDefault();
      const now = Date.now();
      if (now - lastScrollTime > 420) {
        lastScrollTime = now;
        scrollCount++;
        if (scrollCount >= 3) triggerLogoToIntro();
      }
    }
  }, { passive: false });

  /* 터치 스와이프 */
  let touchStartY = 0;
  window.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0]?.clientY ?? 0;
  }, { passive: true });

  window.addEventListener('touchmove', (e) => {
    if (!isAtLogo() || gateOpen) return;
    const dy = touchStartY - (e.touches[0]?.clientY ?? touchStartY);
    if (dy > 50) {
      e.preventDefault();
      const now = Date.now();
      if (now - lastScrollTime > 420) {
        lastScrollTime = now;
        scrollCount++;
        touchStartY = e.touches[0]?.clientY ?? touchStartY;
        if (scrollCount >= 3) triggerLogoToIntro();
      }
    }
  }, { passive: false });

  /* 키보드 아래 방향키 */
  window.addEventListener('keydown', (e) => {
    const downKeys = ['ArrowDown', 'PageDown', ' ', 'End'];
    if (downKeys.includes(e.key) && isAtLogo() && !gateOpen) {
      e.preventDefault();
      const now = Date.now();
      if (now - lastScrollTime > 300) {
        lastScrollTime = now;
        scrollCount++;
        if (scrollCount >= 3) triggerLogoToIntro();
      }
    }
  });

  /* Enter 버튼 클릭 → 즉시 전환 */
  if (enterBtn) {
    enterBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      triggerLogoToIntro();
    });
  }

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
    if (e.deltaY > 0 && shouldBlockDown()) e.preventDefault();
  }, { passive: false });

  window.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0]?.clientY ?? 0;
  }, { passive: true });

  window.addEventListener('touchmove', (e) => {
    const y = e.touches[0]?.clientY ?? touchStartY;
    if (touchStartY - y > 0 && shouldBlockDown()) e.preventDefault();
  }, { passive: false });

  window.addEventListener('keydown', (e) => {
    const downKeys = ['ArrowDown', 'PageDown', ' ', 'End'];
    if (downKeys.includes(e.key) && shouldBlockDown()) e.preventDefault();
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
  const programGrid = document.querySelector('#sec-program .program-grid');

  if (!section || !panels.length) return;

  const programPreview = programGrid?.cloneNode(true);
  if (programPreview && sticky) {
    programPreview.className = 'program-grid crew-program-preview';
    sticky.appendChild(programPreview);
  }

  const creatures  = ['walrus', 'beluga', 'whaleshark', 'turtle'];
  const totalPanels = panels.length;
  let currentIndex  = -1;
  let tailHidden    = false;

  function playPreviewCardWave() {
    if (!programPreview) return;
    section.classList.add('is-program-cards-visible');

    const dispMap = document.getElementById('dive-disp-map');
    const turbEl  = document.getElementById('dive-turbulence');
    if (!dispMap || !turbEl || typeof gsap === 'undefined') return;

    programPreview.style.filter = 'url(#dive-warp)';

    let rafId;
    const t0 = performance.now();
    (function tickPreviewWave() {
      const t = (performance.now() - t0) / 1000;
      const bfx = (0.006 + Math.sin(t * 2.4) * 0.002).toFixed(5);
      const bfy = (0.010 + Math.cos(t * 1.9) * 0.003).toFixed(5);
      turbEl.setAttribute('baseFrequency', `${bfx} ${bfy}`);
      rafId = requestAnimationFrame(tickPreviewWave);
    })();

    gsap.fromTo(
      dispMap,
      { attr: { scale: 28 } },
      {
        attr: { scale: 0 },
        duration: 1.15,
        ease: 'expo.out',
        onComplete() {
          cancelAnimationFrame(rafId);
          turbEl.setAttribute('baseFrequency', '0.004 0.007');
          dispMap.setAttribute('scale', '0');
          programPreview.style.filter = '';
        },
      }
    );
  }

  function setProgramPreviewTitle(active) {
    section.classList.toggle('is-program-preview', active);
    if (!crewTitle || !crewSub) return;

    if (active) {
      crewTitle.innerHTML = "<span class=\"t-en\">Today's </span><em class=\"t-serif\">Program</em>";
      crewSub.textContent = 'Aqua Planet daily programs';
    } else {
      crewTitle.innerHTML = '<span class="t-en">Our </span><em class="t-serif">Crew</em>';
      crewSub.textContent = 'Aqua Planet ocean friends';
    }
  }

  function setProgramPreviewCards(active) {
    section.classList.toggle('is-program-cards-visible', active);
  }

  function setActive(idx) {
    if (idx === currentIndex) return;
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
  }

  function onScroll() {
    const rect    = section.getBoundingClientRect();
    const scrolled = -rect.top; /* 섹션 상단으로부터 스크롤된 px */

    if (scrolled < 0) {
      tailHidden = false;
      setProgramPreviewTitle(false);
      setProgramPreviewCards(false);
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
      return;
    }

    if (tailHidden) {
      tailHidden = false;
      setProgramPreviewTitle(false);
      setProgramPreviewCards(false);
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

  document.addEventListener('crew-tail-exit-complete', () => {
    if (!tailHidden) return;
    setProgramPreviewTitle(true);
    playPreviewCardWave();
  });
}


/* =============================================================
   6. PROGRAM SECTION SEQUENCE
   ============================================================= */
function initProgramSequence() {
  const section = document.getElementById('sec-program');
  if (!section) return;

  function playProgramCardWave() {
    const content = section.querySelector('.program-seq-content');
    const dispMap = document.getElementById('dive-disp-map');
    const turbEl  = document.getElementById('dive-turbulence');

    section.classList.add('is-content-visible');
    if (!content || !dispMap || !turbEl || typeof gsap === 'undefined') return;

    content.style.filter = 'url(#dive-warp)';

    let rafId;
    const t0 = performance.now();
    (function tickProgramWave() {
      const t = (performance.now() - t0) / 1000;
      const bfx = (0.006 + Math.sin(t * 2.4) * 0.002).toFixed(5);
      const bfy = (0.010 + Math.cos(t * 1.9) * 0.003).toFixed(5);
      turbEl.setAttribute('baseFrequency', `${bfx} ${bfy}`);
      rafId = requestAnimationFrame(tickProgramWave);
    })();

    gsap.fromTo(
      dispMap,
      { attr: { scale: 28 } },
      {
        attr: { scale: 0 },
        duration: 1.15,
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

  const observer = new IntersectionObserver(
    ([entry]) => {
      if (!entry.isIntersecting) return;
      section.classList.add('is-title-visible');

      window.setTimeout(() => {
        playProgramCardWave();
      }, 420);

      observer.unobserve(section);
    },
    { threshold: 0.22 }
  );

  observer.observe(section);
}


/* =============================================================
   7. 지도 마커
   ============================================================= */
function initMapMarkers() {
  const markers = document.querySelectorAll('.map-marker');
  if (!markers.length) return;

  const branchInfo = {
    '일산':  { name: '아쿠아플라넷 일산',  href: '#sec-booking' },
    '코엑스': { name: '아쿠아플라넷 코엑스', href: '#sec-booking' },
    '여수':  { name: '아쿠아플라넷 여수',  href: '#sec-booking' },
    '제주':  { name: '아쿠아플라넷 제주',  href: '#sec-booking' },
  };

  markers.forEach(marker => {
    marker.addEventListener('click', () => {
      const info = branchInfo[marker.dataset.branch];
      if (!info) return;
      markers.forEach(m => m.classList.remove('is-active'));
      marker.classList.add('is-active');
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
document.querySelectorAll('a[href^="#"]:not(.logo-scroll)').forEach(link => {
  link.addEventListener('click', e => {
    const target = document.getElementById(link.getAttribute('href').slice(1));
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});
