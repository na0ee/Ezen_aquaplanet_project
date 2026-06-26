/* ── .of-more 링크 기본 동작(#→상단이동) 방지 ── */
document.addEventListener('click', function (e) {
  const btn = e.target.closest('.of-more');
  if (btn) e.preventDefault();
});

/* ── 모바일 메뉴 ── */
(function () {
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

  mobileMenu.querySelectorAll('.gnb__mobile-link--toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.gnb__mobile-item');
      const isOpen = item.classList.contains('is-open');
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

  mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && mobileMenu.classList.contains('is-open')) closeMenu();
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 1024) closeMenu();
  });
})();

/* ── 섹션 타이틀/콘텐츠 순차 페이드인 ── */
(function () {
  const groups = [
    ['.of-detail', ['.of-section-head', '.of-filter', '.of-detail-card']]
  ];

  const revealItems = [];

  groups.forEach(function ([sectionSelector, itemSelectors]) {
    const section = document.querySelector(sectionSelector);
    if (!section) return;

    itemSelectors.forEach(function (selector, index) {
      section.querySelectorAll(selector).forEach(function (item, itemIndex) {
        const listCards = item.closest('.of-detail-list')?.querySelectorAll('.of-detail-card');
        const cardIndex = listCards ? Array.prototype.indexOf.call(listCards, item) : itemIndex;
        const delay = selector === '.of-detail-card' ? Math.min(cardIndex % 3, 2) * 100 : index * 170;
        item.classList.add('of-reveal');
        item.style.setProperty('--reveal-delay', delay + 'ms');
        revealItems.push(item);
      });
    });
  });

  if (!revealItems.length) return;

  if (!('IntersectionObserver' in window)) {
    revealItems.forEach(function (item) {
      item.classList.add('is-visible');
    });
    return;
  }

  const observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -7% 0px'
  });

  revealItems.forEach(function (item) {
    observer.observe(item);
  });
})();

/* ── Let's Explore: 부드러운 섹션 이동 ── */
(function () {
  const trigger = document.querySelector('.of-scroll[href="#signature"]');
  const target = document.getElementById('signature');
  if (!trigger || !target) return;

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function smoothScrollTo(to, duration) {
    const start = window.scrollY;
    const distance = to - start;
    const startTime = performance.now();

    function step(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      window.scrollTo(0, start + distance * easeInOutCubic(progress));
      if (progress < 1) requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
  }

  trigger.addEventListener('click', function (e) {
    e.preventDefault();
    const targetY = target.getBoundingClientRect().top + window.scrollY;
    smoothScrollTo(targetY, 1200);
  });
})();

/* ── 필터 칩 활성화 + 리스트 전환 + 검색 ── */
(function () {
  const chips = document.querySelectorAll('.cartegory-tabs-a .cartegory-tabs-a__item');
  const lists = document.querySelectorAll('.of-detail-list[data-list]');
  const searchInput = document.querySelector('.of-search input');

  function showList(key) {
    lists.forEach(function (list) {
      list.classList.toggle('is-visible', list.dataset.list === key);
    });
    if (searchInput) {
      searchInput.value = '';
      filterCards('');
    }
  }

  function filterCards(query) {
    const q = query.trim().toLowerCase();
    const visibleList = document.querySelector('.of-detail-list.is-visible');
    if (!visibleList) return;
    visibleList.querySelectorAll('.of-detail-card').forEach(function (card) {
      const name = (card.querySelector('h3') || {}).textContent || '';
      const sci = (card.querySelector('i') || {}).textContent || '';
      const badge = (card.querySelector('.of-badge.of-badge--fill') || {}).textContent || '';
      const match = !q || (name + sci + badge).toLowerCase().includes(q);
      card.style.display = match ? '' : 'none';
    });
  }

  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      chips.forEach(function (c) { c.classList.remove('cartegory-tabs-a__item--active'); });
      chip.classList.add('cartegory-tabs-a__item--active');
      showList(chip.textContent.trim().toLowerCase());
    });
  });

  if (searchInput) {
    searchInput.addEventListener('input', function () {
      filterCards(searchInput.value);
    });
  }

  /* 초기 상태: Jeju 표시 */
  showList('jeju');
})();

/* ── Signature Species 갤러리 — 드래그 가능한 무한 캐러셀 + 데스크탑 스크롤 핀 ── */
(function () {
  const section = document.getElementById('signature');
  const viewport = document.querySelector('#signature .signature-gallery-viewport');
  const track = document.querySelector('#signature .signature-gallery-track');
  const pager = document.querySelector('#signature .of-pager');
  if (!section || !viewport || !track) return;

  /* more 버튼 */
  if (pager) {
    pager.replaceChildren();
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.innerHTML = '<span class="of-pager__more">more</span><span class="of-pager__arrow" aria-hidden="true">↓</span>';
    btn.setAttribute('aria-label', '생물 상세 소개 더 보기');
    btn.addEventListener('click', () => {
      document.querySelector('.of-detail')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    pager.appendChild(btn);
  }

  const originals = Array.from(track.querySelectorAll('.species-card'));
  const originalCount = originals.length;
  if (!originalCount) return;

  const detailTargets = {
    beluga: { list: 'yeosu', name: '흰고래(벨루가)' },
    walrus: { list: 'ilsan', name: '바다코끼리' },
    penguin: { list: 'jeju', name: '아프리칸펭귄' },
    shark: { list: 'jeju', name: '샌드타이거샤크' },
    ray: { list: 'jeju', name: '흑가오리' },
    otter: { list: 'jeju', name: '작은발톱수달' },
    'sea-turtle': { list: 'yeosu', name: '바다거북' },
    'harbor-seal': { list: 'jeju', name: '참물범' },
    jellyfish: { list: 'jeju', name: '보름달물해파리' },
    clownfish: { list: 'jeju', name: '퍼큘라클라운피쉬' }
  };

  for (let setIndex = 1; setIndex < 3; setIndex += 1) {
    originals.forEach(card => {
      const clone = card.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      clone.dataset.cloneSet = String(setIndex);
      track.appendChild(clone);
    });
  }

  let cards = Array.from(track.querySelectorAll('.species-card'));
  cards.forEach(card => {
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
  });
  let singleSetWidth = 0;
  let centerOffset = 0;
  let current = 0;
  let target = 0;
  let momentum = 0;
  let isDragging = false;
  let lastX = 0;
  let lastMoveTime = 0;
  let dragDistance = 0;
  let pressedCard = null;
  let rafId = 0;
  let baseCardWidth = 0;
  let baseGap = 8;
  let curveStrength = 0;
  let baseCurrent = 0;
  let revealProgress = 0;

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function smoothstep(t) {
    const c = clamp(t, 0, 1);
    return c * c * (3 - 2 * c);
  }

  /* 카드별 등장 진행도 — 인덱스가 클수록(오른쪽일수록) 아주 살짝 늦게 시작 */
  function cardRevealEase(index, total) {
    const span = Math.max(total - 1, 1);
    const start = 0.45 + (index / span) * 0.2;
    const end = Math.min(start + 0.35, 1);
    return smoothstep((revealProgress - start) / Math.max(end - start, 0.0001));
  }

  function measure() {
    cards = Array.from(track.querySelectorAll('.species-card'));
    const first = cards[0];
    if (!first) return;

    const styles = window.getComputedStyle(track);
    baseGap = parseFloat(styles.columnGap || styles.gap || '8') || 8;
    const firstStyles = window.getComputedStyle(first);
    baseCardWidth = parseFloat(firstStyles.flexBasis) || first.getBoundingClientRect().width;
    singleSetWidth = originalCount * baseCardWidth + originalCount * baseGap;
    centerOffset = (viewport.clientWidth - baseCardWidth) / 2;
    current = -singleSetWidth + centerOffset;
    target = current;
    baseCurrent = current;
    momentum = 0;
    render();
  }

  function wrapPosition() {
    if (!singleSetWidth) return;
    const min = -singleSetWidth * 2 + centerOffset;
    const max = centerOffset;

    if (current < min) {
      current += singleSetWidth;
      target += singleSetWidth;
    } else if (current > max) {
      current -= singleSetWidth;
      target -= singleSetWidth;
    }
  }

  function render() {
    const velocity = target - current;
    const viewportRect = viewport.getBoundingClientRect();
    const viewportCenter = viewportRect.left + viewportRect.width / 2;
    const halfViewport = Math.max(viewportRect.width / 2, 1);
    const velocityRotate = clamp(velocity * 0.018, -3.5, 3.5) * curveStrength;

    track.style.transform = 'translate3d(' + current.toFixed(3) + 'px,0,0)';

    const total = cards.length;
    cards.forEach((card, index) => {
      const cardCenter = viewportRect.left + current + card.offsetLeft + card.offsetWidth / 2;
      const distance = cardCenter - viewportCenter;
      const signed = clamp(distance / halfViewport, -1, 1);
      const normalized = Math.abs(signed);
      const curve = Math.pow(normalized, 1.25);
      const isHovering = card.matches(':hover');

      const rotateY = -signed * 72 * curveStrength;
      const translateX = -signed * curve * 96 * curveStrength;
      const translateZ = -curve * 340 * curveStrength;
      const scale = 1 - curve * 0.24 * curveStrength;
      const opacity = 1 - curve * 0.55 * curveStrength;
      const cardRotateZ = velocityRotate * (0.25 + curve * 0.75);

      /* 등장 애니메이션: 아래에서 위로, 옅은 블러와 함께, 카드별로 살짝 순차적으로 */
      const reveal = cardRevealEase(index, total);
      const revealY = (1 - reveal) * 26;
      const revealBlur = (1 - reveal) * 5;

      card.style.transform =
        'translate3d(' + translateX.toFixed(2) + 'px,' + revealY.toFixed(2) + 'px,' + translateZ.toFixed(2) + 'px) ' +
        'rotateY(' + rotateY.toFixed(3) + 'deg) ' +
        'scale(' + scale.toFixed(4) + ') ' +
        'rotateZ(' + cardRotateZ.toFixed(3) + 'deg)';
      card.style.opacity = (opacity * reveal).toFixed(3);
      card.style.filter = revealBlur > 0.02 ? 'blur(' + revealBlur.toFixed(2) + 'px)' : '';
      card.style.zIndex = isHovering ? '5' : String(Math.round((1 - curve) * 3));
    });
  }

  function animate() {
    const isMobile = window.innerWidth < 769;
    target += momentum;
    momentum *= isDragging ? (isMobile ? 0.72 : 0.82) : (isMobile ? 0.86 : 0.935);
    if (Math.abs(momentum) < 0.015) momentum = 0;

    current = lerp(current, target, isMobile ? 0.035 : 0.085);
    const motion = Math.abs(target - current) + Math.abs(momentum) * 8;
    const targetCurveStrength = clamp(motion / 140, 0, 1);
    curveStrength = lerp(
      curveStrength,
      targetCurveStrength,
      targetCurveStrength > curveStrength ? 0.22 : 0.075
    );
    if (curveStrength < 0.002 && targetCurveStrength === 0) curveStrength = 0;
    wrapPosition();
    render();
    rafId = requestAnimationFrame(animate);
  }

  function normalizeText(text) {
    return (text || '').replace(/\s+/g, '').toLowerCase();
  }

  function showDetailList(key) {
    const lists = document.querySelectorAll('.of-detail-list[data-list]');
    const chips = document.querySelectorAll('.cartegory-tabs-a .cartegory-tabs-a__item');
    const searchInput = document.querySelector('.of-search input');

    lists.forEach(list => {
      list.classList.toggle('is-visible', list.dataset.list === key);
      list.querySelectorAll('.of-detail-card').forEach(card => {
        card.style.display = '';
      });
    });

    chips.forEach(chip => {
      chip.classList.toggle('cartegory-tabs-a__item--active', chip.textContent.trim().toLowerCase() === key);
    });

    if (searchInput) searchInput.value = '';
  }

  function findDetailCard(targetInfo) {
    const list = document.querySelector('.of-detail-list[data-list="' + targetInfo.list + '"]');
    if (!list) return null;
    const targetName = normalizeText(targetInfo.name);

    return Array.from(list.querySelectorAll('.of-detail-card')).find(card => {
      const title = card.querySelector('h3');
      return title && normalizeText(title.textContent) === targetName;
    }) || null;
  }

  function scrollToDetailTarget(target) {
    const offset = Math.min(Math.max(window.innerHeight * 0.18, 140), 220);
    const top = target.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({
      top: Math.max(top, 0),
      behavior: 'smooth'
    });
  }

  function goToDetail(species) {
    const targetInfo = detailTargets[species];
    if (!targetInfo) {
      document.querySelector('.of-detail')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    showDetailList(targetInfo.list);
    const targetCard = findDetailCard(targetInfo);
    const scrollTarget = targetCard || document.querySelector('.of-detail');
    if (!scrollTarget) return;

    document.querySelectorAll('.of-detail-card.is-jump-target').forEach(card => {
      card.classList.remove('is-jump-target');
    });

    window.requestAnimationFrame(() => {
      scrollToDetailTarget(scrollTarget);
      if (targetCard) {
        targetCard.classList.add('is-jump-target');
        window.setTimeout(() => targetCard.classList.remove('is-jump-target'), 1600);
      }
    });
  }

  viewport.addEventListener('pointerdown', e => {
    if (e.button !== undefined && e.button !== 0) return;
    isDragging = true;
    pressedCard = e.target.closest('.species-card');
    lastX = e.clientX;
    lastMoveTime = performance.now();
    dragDistance = 0;
    momentum = 0;
    viewport.classList.add('is-dragging');
    viewport.setPointerCapture?.(e.pointerId);
  });

  viewport.addEventListener('pointermove', e => {
    if (!isDragging) return;
    const now = performance.now();
    const dx = e.clientX - lastX;
    const dt = Math.max(now - lastMoveTime, 16);
    dragDistance += Math.abs(dx);
    target += dx;
    momentum = dx * clamp(18 / dt, 0.65, 1.8);
    lastX = e.clientX;
    lastMoveTime = now;
  });

  function endDrag(e) {
    if (!isDragging) return;
    const hit = e && document.elementFromPoint ? document.elementFromPoint(e.clientX, e.clientY) : null;
    const releasedCard = hit ? hit.closest('.species-card') : (e && e.target ? e.target.closest('.species-card') : null);
    const shouldOpen = e && e.type === 'pointerup' && dragDistance <= 8 && pressedCard && pressedCard === releasedCard;
    isDragging = false;
    viewport.classList.remove('is-dragging');
    if (e && e.pointerId !== undefined) viewport.releasePointerCapture?.(e.pointerId);
    if (shouldOpen) {
      goToDetail(pressedCard.dataset.species);
    }
    pressedCard = null;
  }

  viewport.addEventListener('pointerup', endDrag);
  viewport.addEventListener('pointercancel', endDrag);
  viewport.addEventListener('lostpointercapture', endDrag);

  viewport.addEventListener('touchmove', e => {
    if (isDragging) e.preventDefault();
  }, { passive: false });

  viewport.addEventListener('wheel', e => {
    if (window.innerWidth >= 769) return;
    e.preventDefault();
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    target -= delta * 1.5;
    momentum = -delta * 0.3;
  }, { passive: false });

  track.addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const card = e.target.closest('.species-card');
    if (!card) return;
    e.preventDefault();
    goToDetail(card.dataset.species);
  });

  /* 데스크탑: 카드 캐러셀을 섹션 스크롤에 고정(pin)해 한 바퀴 돌린 뒤에만
     다음 섹션으로 내려가도록 한다. 모바일은 기존처럼 자유 드래그만 사용. */
  function setupScrollTrigger() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
    gsap.registerPlugin(ScrollTrigger);

    let pinTrigger = null;

    ScrollTrigger.matchMedia({
      '(min-width: 769px)': function () {
        pinTrigger = ScrollTrigger.create({
          trigger: section,
          start: 'top top',
          end: () => '+=' + Math.max(singleSetWidth, window.innerHeight),
          pin: true,
          scrub: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: self => {
            target = baseCurrent - self.progress * singleSetWidth;
          }
        });

        return () => { pinTrigger.kill(); pinTrigger = null; };
      }
    });

    const overlay = section.querySelector('.of-signature__overlay');
    const head = section.querySelector('.of-section-head');
    const bg = document.querySelector('.friends-bg');
    const approachPx = 380;
    const maxOpacity = 1;

    /* 배경 parallax — hero 전체를 스크롤하는 동안 배경 이미지가 아주 살짝(-60px)
       위로 떠오르듯 움직인다. 섹션을 나누지 않고 같은 배경 이미지 한 장을 그대로 사용. */
    if (bg) {
      ScrollTrigger.create({
        trigger: section,
        start: 'top bottom',
        end: 'top top',
        scrub: true,
        onUpdate: self => {
          bg.style.backgroundPosition = 'center ' + (-60 * self.progress).toFixed(1) + 'px';
        }
      });
    }

    /* 등장(entrance) 구간 — hero에서 다가오는 동안에만 재생되고 pin이 시작되는
       순간(top top) 정확히 끝난다: 어두운 오버레이 → 제목 → 카드 순서로 나타나며,
       이 reveal이 끝난 뒤에야 카드 회전(핀)이 시작된다. */
    ScrollTrigger.create({
      trigger: section,
      start: () => 'top bottom-=' + Math.max(window.innerHeight - approachPx, 0),
      end: 'top top',
      scrub: true,
      onUpdate: self => {
        revealProgress = self.progress;

        const dimT = smoothstep(revealProgress / 0.4);
        if (overlay) overlay.style.opacity = (dimT * maxOpacity).toFixed(3);

        if (head) {
          const titleT = smoothstep((revealProgress - 0.15) / 0.45);
          head.style.opacity = titleT.toFixed(3);
          head.style.transform = 'translateY(' + ((1 - titleT) * 24).toFixed(2) + 'px)';
          const titleBlur = (1 - titleT) * 5;
          head.style.filter = titleBlur > 0.02 ? 'blur(' + titleBlur.toFixed(2) + 'px)' : '';
        }

        render();
      }
    });

    /* 카드가 보이는(고정된) 동안에는 어두운 오버레이를 유지하고, 다음 섹션으로
       빠져나가는 짧은 구간에서만 다시 사라진다. */
    if (overlay) {
      ScrollTrigger.create({
        trigger: section,
        start: 'top top',
        end: () => {
          const base = pinTrigger ? pinTrigger.end : (section.getBoundingClientRect().bottom + window.scrollY);
          return base + approachPx;
        },
        scrub: true,
        onUpdate: self => {
          const span = Math.max(self.end - self.start, 1);
          const fadeFraction = clamp(approachPx / span, 0.001, 0.5);
          const t = self.progress;
          const o = t > 1 - fadeFraction ? (1 - t) / fadeFraction : 1;
          overlay.style.opacity = (clamp(o, 0, 1) * maxOpacity).toFixed(3);
        }
      });
    }
  }

  window.addEventListener('resize', () => {
    window.cancelAnimationFrame(rafId);
    measure();
    rafId = requestAnimationFrame(animate);
    if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
  }, { passive: true });

  measure();
  rafId = requestAnimationFrame(animate);
  setupScrollTrigger();
})();
