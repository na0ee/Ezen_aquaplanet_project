/* ================================================================
   커스텀 커서 (business.js와 동일 패턴)
   style.css: cursor: none !important 전역 적용돼 있음
   ================================================================ */
(function () {
  if (window.matchMedia('(hover: none)').matches) return;
  var el = document.getElementById('custom-cursor');
  if (!el) return;
  var HALF = 17;
  var tx = -200, ty = -200, cx = -200, cy = -200, firstMove = false;

  window.addEventListener('mousemove', function (e) {
    tx = e.clientX; ty = e.clientY;
    if (!firstMove) { firstMove = true; cx = tx; cy = ty; el.style.opacity = '1'; }
  }, { passive: true });

  document.addEventListener('mouseleave', function () { el.style.opacity = '0'; });
  document.addEventListener('mouseenter', function () { if (firstMove) el.style.opacity = '1'; });
  document.addEventListener('mousedown',  function () { el.classList.add('is-clicking'); });
  document.addEventListener('mouseup',    function () { el.classList.remove('is-clicking'); });

  document.addEventListener('mouseover', function (e) {
    var over = e.target.closest('a, button, [role="button"]');
    el.classList.toggle('is-hovering', !!over);
  });

  (function loop() {
    cx += (tx - cx) * 0.2;
    cy += (ty - cy) * 0.2;
    el.style.transform = 'translate(' + (cx - HALF).toFixed(1) + 'px,' + (cy - HALF).toFixed(1) + 'px)';
    requestAnimationFrame(loop);
  })();
}());


(function () {
  'use strict';

  /* ================================================================
     사이드 내비게이션 스크롤 연동
     ================================================================ */
  const sideNav  = document.querySelector('.loc-side-nav');
  const navItems = Array.from(document.querySelectorAll('.loc-side-nav__item'));

  if (sideNav && navItems.length) {
    /* 표시 기준점: hero(1200) + con1(1080) = 2280px */
    const SHOW_OFFSET = (function () {
      var el = document.querySelector('.loc-programs');
      return el ? el.offsetTop : 2280;
    }());

    /* 클릭 → 섹션 스무스 스크롤 */
    navItems.forEach(function (item) {
      item.addEventListener('click', function () {
        var target = document.getElementById(item.dataset.target);
        if (target) target.scrollIntoView({ behavior: 'smooth' });
      });
    });

    /* IntersectionObserver — 현재 섹션 active 갱신 */
    var currentActive = null;
    var sectionIds = navItems.map(function (item) { return item.dataset.target; });
    var sections   = sectionIds
      .map(function (id) { return document.getElementById(id); })
      .filter(Boolean);

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var id = entry.target.id;
        if (id === currentActive) return;
        currentActive = id;
        navItems.forEach(function (item) {
          item.classList.toggle('is-active', item.dataset.target === id);
        });
      });
    }, { rootMargin: '-40% 0px -40% 0px', threshold: 0 });

    sections.forEach(function (sec) { observer.observe(sec); });

    /* scroll — 사이드 내비 표시/숨김 */
    function onScroll() {
      sideNav.classList.toggle('is-visible', window.scrollY >= SHOW_OFFSET);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ================================================================
     Guide Map — 제주 층 전환 / 공통 버블 인터랙션
     모든 층은 아래 데이터와 BUBBLE_LAYOUT 한 곳에서 생성·배치됩니다.
     ================================================================ */
  var mapSection = document.querySelector('.loc-map');
  var mapWrap     = document.querySelector('.loc-map-wrap');
  var mapImg      = document.getElementById('loc-map-img');
  var markerWrap  = document.querySelector('.loc-map__markers');
  var bubbleWrap  = document.querySelector('.loc-map__bubbles');
  var floorTabs   = Array.from(document.querySelectorAll('.loc-map__floor-tab'));
  var detailEl    = document.getElementById('loc-map-detail');
  var closeBtn    = document.getElementById('loc-map-close');
  var mapBubbles  = [];
  var currentFloor = '2F';
  var currentDataByKey = {};
  var currentExhibits = [];
  var activeZone = '';
  var zoneCursor = 0;
  var isOrbiting = false;
  var renderVersion = 0;
  var bindBubbleEvents = function () {};

  var JEJU_MAPS = {
    '2F':  'assets/images/locationJeju_map_2f.png',
    '1F':  'assets/images/locationJeju_map_1f.png',
    'B1F': 'assets/images/locationJeju_map_b1f.png'
  };

  var JEJU_EXHIBITS = {
    '2F': [
      { key: 'haenyeo', zone: 'A', name: '해녀전시', floor: '2F', thumb: 'assets/images/jeju_guide_thum47 1.png', image: 'assets/images/jeju_guide_map47.jpg', desc: '"물 그리고 숨 : 제주 해녀의 바다"\n해녀의 삶을 다양한 작품을 통해 만나보세요.' },
      { key: 'special-artshop', zone: 'A', name: '특별전시관 아트샵', floor: '2F', thumb: 'assets/images/jeju_guide_thum34.jpg', image: 'assets/images/jeju_guide_map34.jpg', desc: '특별전시와 연계된 아트 상품을 만나볼 수 있습니다.' },
      { key: 'gs25', zone: 'B', name: 'GS25', floor: '2F', thumb: 'assets/images/jeju_guide_thum18 1.png', image: 'assets/images/jeju_guide_thum18 1.png', desc: '관람 중 필요한 물품을 편리하게 구매할 수 있습니다.' },
      { key: 'weeny-beeny', zone: 'B', name: '위니비니', floor: '2F', thumb: 'assets/images/jeju_guide_thum48 1.png', image: 'assets/images/jeju_guide_map48.jpg', desc: '달콤한 사탕과 다양한 과자를 만나볼 수 있는 캔디샵입니다.' },
      { key: 'munseom', zone: 'C', name: '문섬', floor: '2F', thumb: 'assets/images/jeju_guide_thum01 1.png', image: 'assets/images/jeju_guide_map01.jpg', desc: '제주 앞 바다의 문섬이 화려한 산호초와\n열대어로 여러분을 맞이합니다.' },
      { key: 'world-island', zone: 'C', name: '세계의 섬', floor: '2F', thumb: 'assets/images/jeju_guide_thum02 1.png', image: 'assets/images/jeju_guide_map02.jpg', desc: '세계의 섬 곳곳에 있는 물고기들의 총집합' },
      { key: 'harbor', zone: 'C', name: '물범(상부) · 하버플라넷', floor: '2F', thumb: 'assets/images/jeju_guide_thum03 1.png', image: 'assets/images/jeju_guide_map03.jpg', desc: '동글동글한 생김새가 귀여운 잔점박이 물범을 만나보세요.' },
      { key: 'penguin-vr', zone: 'C', name: '펭귄(상부) · 펭귄플라넷', floor: '2F', thumb: 'assets/images/jeju_guide_thum04 1.png', image: 'assets/images/jeju_guide_map04.jpg', desc: '아프리카 펭귄 친구들의 생생한 모습을 VR로 만나보세요.' },
      { key: 'tunnel', zone: 'C', name: '주상절리 터널', floor: '2F', thumb: 'assets/images/jeju_guide_thum05 1.png', image: 'assets/images/jeju_guide_map05.jpg', desc: '제주의 주상절리를 닮은 신비로운 터널을 체험해보세요.' }
    ],
    '1F': [
      { key: 'dunkin', zone: 'D', name: '던킨', floor: '1F', thumb: 'assets/images/jeju_guide_thum29.jpg', image: 'assets/images/jeju_guide_map29.jpg', desc: '관람 중 간단한 음료와 간식을 즐길 수 있습니다.' },
      { key: 'dancing-seal-vr', zone: 'E', name: '물범(하부) / 댄싱 물범', floor: '1F', thumb: 'assets/images/jeju_guide_thum20.jpg', image: 'assets/images/jeju_guide_map20.jpg', desc: '실린더 관을 누비는 물범의 모습을 VR로 만나보세요.' },
      { key: 'flying-penguin-vr', zone: 'E', name: '펭귄(하부) / 플라잉 펭귄', floor: '1F', thumb: 'assets/images/jeju_guide_thum21.jpg', image: 'assets/images/jeju_guide_map21.jpg', desc: '물속을 나는 듯 헤엄치는 펭귄을 VR로 만나보세요.' },
      { key: 'aqua-safari-vr', zone: 'E', name: '아쿠아 사파리', floor: '1F', thumb: 'assets/images/jeju_guide_thum22.jpg', image: 'assets/images/jeju_guide_map22.jpg', desc: '다양한 해양생물의 세계를 VR로 체험해보세요.' },
      { key: 'living-ocean', zone: 'E', name: '리빙오션', floor: '1F', thumb: 'assets/images/jeju_guide_thum23.jpg', image: 'assets/images/jeju_guide_map23.jpg', desc: '독특하고 신기한 바다생물들을 만나보세요.' },
      { key: 'large-shark', zone: 'E', name: '대형 상어', floor: '1F', thumb: 'assets/images/jeju_guide_thum24.jpg', image: 'assets/images/jeju_guide_map24.jpg', desc: '다양한 종류의 상어를 유리 너머 가까이서 관찰하세요.' },
      { key: 'undersea-tunnel-vr', zone: 'E', name: '해저터널', floor: '1F', thumb: 'assets/images/jeju_guide_thum25.jpg', image: 'assets/images/jeju_guide_map25.jpg', desc: '해저터널의 생생한 풍경을 VR로 경험해보세요.' },
      { key: 'touch-pool', zone: 'E', name: '바다 놀이터(터치풀)', floor: '1F', thumb: 'assets/images/jeju_guide_thum26.jpg', image: 'assets/images/jeju_guide_map26.jpg', desc: '바다생물을 가까이에서 관찰하고 교감해보세요.' },
      { key: 'baikal-seal', zone: 'E', name: '바이칼물범', floor: '1F', thumb: 'assets/images/jeju_guide_thum27.jpg', image: 'assets/images/jeju_guide_map27.jpg', desc: '귀여운 바이칼물범의 일상을 만나보세요.' }
    ],
    'B1F': [
      { key: 'aquaterrace', zone: 'F', name: '아쿠아테라스', floor: 'B1F', thumb: 'assets/images/jeju_guide_thum36.jpg', image: 'assets/images/jeju_guide_map36.jpg', desc: '제주의 풍경과 함께 다양한 식사를 즐길 수 있습니다.' },
      { key: 'giftshop', zone: 'F', name: '기프트샵', floor: 'B1F', thumb: 'assets/images/jeju_guide_thum34.jpg', image: 'assets/images/jeju_guide_map34.jpg', desc: '아쿠아플라넷 공식 굿즈와 기념품을 구매할 수 있습니다.' },
      { key: 'aquacafe', zone: 'F', name: '아쿠아카페', floor: 'B1F', thumb: 'assets/images/jeju_guide_map33.jpg', image: 'assets/images/jeju_guide_map33.jpg', desc: '관람 중 편안하게 쉬며 음료와 간식을 즐겨보세요.' },
      { key: 'jeju-sea-vr', zone: 'G', name: '메인수조 : 제주의 바다', floor: 'B1F', thumb: 'assets/images/jeju_guide_thum30.jpg', image: 'assets/images/jeju_guide_map30.jpg', desc: '국내 최대 규모의 메인수조를 VR로 생생하게 체험해보세요.' },
      { key: 'under-ocean-arena', zone: 'G', name: '언더 오션 아레나', floor: 'B1F', thumb: 'assets/images/jeju_guide_thum31.jpg', image: 'assets/images/jeju_guide_map31.jpg', desc: '오션 아레나 아래에서 펼쳐지는 특별한 해양 공간입니다.' },
      { key: 'therapy-dome', zone: 'G', name: '테라피 돔', floor: 'B1F', thumb: 'assets/images/jeju_guide_thum32.jpg', image: 'assets/images/jeju_guide_map32.jpg', desc: '바다의 빛과 움직임을 편안하게 감상하는 공간입니다.' },
      { key: 'ocean-arena', zone: 'H', name: '오션아레나', floor: 'B1F', thumb: 'assets/images/jeju_guide_thum28.jpg', image: 'assets/images/jeju_guide_thum28.jpg', desc: '대형 공연장에서 펼쳐지는 화려한 퍼포먼스를 즐겨보세요.' }
    ]
  };

  /* 제공된 지도 이미지의 A–H 표기를 1320×790 좌표로 환산 */
  var JEJU_MARKERS = {
    '2F': [
      { zone: 'A', left: 125, top: 180 },
      { zone: 'A', left: 193, top: 416 },
      { zone: 'B', left: 315, top: 315 },
      { zone: 'C', left: 761, top: 445 }
    ],
    '1F': [
      { zone: 'D', left: 395, top: 304 },
      { zone: 'E', left: 657, top: 550 }
    ],
    'B1F': [
      { zone: 'F', left: 365, top: 209 },
      { zone: 'F', left: 509, top: 327 },
      { zone: 'F', left: 773, top: 312 },
      { zone: 'G', left: 754, top: 523 },
      { zone: 'H', left: 1125, top: 442 }
    ]
  };

  var DEFAULT_ZONE = { '2F': 'C', '1F': 'E', 'B1F': 'G' };
  var ZONE_LABELS = {
    A: '특별전시관', B: '부대시설', C: '아쿠아리움',
    D: '부대시설', E: '아쿠아리움', F: '부대시설',
    G: '아쿠아리움', H: '오션아레나'
  };

  /* 모든 층의 버블 위치·크기는 이 설정만 공유합니다. */
  var BUBBLE_LAYOUT = {
    five: [
      { left: 1276, top: 566,  size: 100 },
      { left: 1124, top: 704,  size: 130 },
      { left: 1058, top: 914,  size: 160 },
      { left: 1124, top: 1144, size: 130 },
      { left: 1276, top: 1342, size: 100 }
    ]
  };

  function getBubbleLayout(index) {
    return BUBBLE_LAYOUT.five[index];
  }

  function createBubble(exhibit, index) {
    var layout = getBubbleLayout(index);
    var bubble = document.createElement('div');
    bubble.className = 'loc-map__bubble';
    bubble.dataset.key = exhibit.key;
    bubble.setAttribute('role', 'button');
    bubble.setAttribute('tabindex', '0');
    bubble.setAttribute('aria-label', exhibit.name + ' 상세 보기');
    bubble.style.left = layout.left + 'px';
    bubble.style.top = layout.top + 'px';
    bubble.style.width = layout.size + 'px';
    bubble.style.setProperty('--bubble-index', index);

    var circle = document.createElement('div');
    circle.className = 'loc-map__bubble-circle';
    var image = document.createElement('img');
    image.src = exhibit.thumb;
    image.alt = exhibit.name;
    circle.appendChild(image);

    var label = document.createElement('div');
    label.className = 'loc-map__bubble-label';
    var badge = document.createElement('span');
    badge.className = 'loc-map__bubble-badge';
    badge.textContent = exhibit.zone;
    var name = document.createElement('p');
    name.className = 'loc-map__bubble-name';
    name.textContent = exhibit.name;
    label.appendChild(badge);
    label.appendChild(name);

    bubble.appendChild(circle);
    bubble.appendChild(label);
    return bubble;
  }

  /* 중앙 → 위쪽 인접 → 아래쪽 인접 → 양 끝 순서로 우선 배치 */
  var BUBBLE_SLOT_PRIORITY = [2, 1, 3, 0, 4];

  function getPriorityBubbles(zone, advance) {
    var zoneItems = currentExhibits.filter(function (exhibit) { return exhibit.zone === zone; });
    var otherItems = currentExhibits.filter(function (exhibit) { return exhibit.zone !== zone; });

    if (advance && activeZone === zone && zoneItems.length > 5) {
      zoneCursor = (zoneCursor + 1) % zoneItems.length;
    } else if (activeZone !== zone) {
      zoneCursor = 0;
    }

    var prioritized = [];
    var priorityCount = Math.min(zoneItems.length, 5);
    for (var i = 0; i < priorityCount; i += 1) {
      prioritized.push(zoneItems[(zoneCursor + i) % zoneItems.length]);
    }

    for (var j = 0; prioritized.length < 5 && j < otherItems.length; j += 1) {
      prioritized.push(otherItems[j]);
    }

    return prioritized.map(function (exhibit, priorityIndex) {
      return { exhibit: exhibit, slot: BUBBLE_SLOT_PRIORITY[priorityIndex] };
    }).sort(function (a, b) {
      return a.slot - b.slot;
    });
  }

  function renderZone(zone, advance) {
    var visible = getPriorityBubbles(zone, advance);
    renderVersion += 1;
    isOrbiting = false;
    mapSection.classList.remove('has-detail');
    bubbleWrap.replaceChildren();
    visible.forEach(function (item) {
      bubbleWrap.appendChild(createBubble(item.exhibit, item.slot));
    });
    activeZone = zone;
    mapBubbles = Array.from(bubbleWrap.querySelectorAll('.loc-map__bubble'));
    bindBubbleEvents();

    markerWrap.querySelectorAll('.loc-map__marker').forEach(function (marker) {
      marker.classList.toggle('is-active', marker.dataset.zone === zone);
    });
  }

  function renderMarkers(floor) {
    var positions = JEJU_MARKERS[floor] || [];
    markerWrap.replaceChildren();
    positions.forEach(function (position) {
      var marker = document.createElement('button');
      marker.type = 'button';
      marker.className = 'loc-map__marker';
      marker.dataset.zone = position.zone;
      marker.style.left = position.left + 'px';
      marker.style.top = position.top + 'px';
      marker.textContent = position.zone;
      marker.setAttribute('aria-label', position.zone + '구역 ' + ZONE_LABELS[position.zone] + ' 보기');
      marker.addEventListener('click', function () {
        mapSection.classList.add('is-hovering');
        renderZone(position.zone, true);
      });
      markerWrap.appendChild(marker);
    });
  }

  function renderFloor(floor) {
    var exhibits = JEJU_EXHIBITS[floor];
    if (!exhibits || !bubbleWrap) return;

    currentFloor = floor;
    isOrbiting = false;
    currentExhibits = exhibits;
    activeZone = '';
    zoneCursor = 0;
    currentDataByKey = {};
    exhibits.forEach(function (exhibit) { currentDataByKey[exhibit.key] = exhibit; });

    renderMarkers(floor);
    renderZone(DEFAULT_ZONE[floor], false);

    if (mapImg) {
      mapImg.src = JEJU_MAPS[floor];
      mapImg.alt = '아쿠아플라넷 제주 가이드 맵 ' + floor;
    }
    floorTabs.forEach(function (tab) {
      var active = tab.dataset.floor === floor;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
    });
  }

  function updateMapPin() {
    if (!mapWrap || !mapSection) return;
    var wrapTop   = mapWrap.getBoundingClientRect().top;
    var stickyTop = window.innerHeight / 2 - 1011;
    if (wrapTop <= stickyTop) mapSection.classList.add('is-hovering');
    else mapSection.classList.remove('is-hovering', 'has-detail');
  }

  window.addEventListener('scroll', updateMapPin, { passive: true });

  if (mapSection && bubbleWrap) {

    /* ── 버블 캐러셀 ─────────────────────────────────────────────
       현재 층에서 계산된 공통 슬롯 사이를 버블들이 이동.
       wrap 버블은 오른쪽(축 방향)으로 빠져나갔다가 반대편 재진입.
       → 대형 전체 위치 불변, 버블끼리 자리만 바뀜               */
    function orbitThenDetail(clickedBubble, key) {
      var data = currentDataByKey[key];
      if (!data || !detailEl) return;

      isOrbiting = true;
      var actionVersion = renderVersion;
      mapBubbles.forEach(function (b) { b.classList.remove('is-selected'); });
      clickedBubble.classList.add('is-selected');

      /* 슬롯 위치: 클릭 시점 원래 좌표 (click handler가 이미 transform 초기화) */
      var n     = mapBubbles.length;
      var slots = mapBubbles.map(function (b) {
        var r = b.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width };
      });

      var selIdx    = mapBubbles.indexOf(clickedBubble);
      var centerIdx = Math.floor(n / 2);

      /* 회전 방향·스텝: 더 짧은 경로 선택 */
      var K_cw  = ((centerIdx - selIdx) % n + n) % n;  /* CW: 아래로 K_cw칸 */
      var K_ccw = ((selIdx - centerIdx) % n + n) % n;  /* CCW: 위로 K_ccw칸 */
      var steps, dir;
      if (K_cw <= K_ccw) { steps = K_cw;  dir = +1; }  /* +1: 버블 아래로 이동 */
      else               { steps = K_ccw; dir = -1; }  /* -1: 버블 위로 이동 */

      /* bubble[i] → slots[targetFor[i]] */
      var targetFor = mapBubbles.map(function (_, i) {
        return ((i + steps * dir) % n + n) % n;
      });

      /* off-screen 스테이징 (오른쪽, 축 방향) */
      var SX     = window.innerWidth + 260;
      var SY_TOP = slots[0].y - 360;
      var SY_BOT = slots[n - 1].y + 360;

      var DIRECT_DUR = 680;
      var WRAP_OUT   = 270;
      var WRAP_PAUSE = 55;
      var WRAP_IN    = 420;

      /* 현재 층의 슬롯별 자연 너비 */
      var slotW = slots.map(function (s) { return s.w; });

      mapBubbles.forEach(function (b, i) {
        var src      = slots[i];
        var dstIdx   = targetFor[i];
        var dst      = slots[dstIdx];
        var dx       = dst.x - src.x;
        var dy       = dst.y - src.y;
        /* 목적지 슬롯 크기로 스케일 → 슬롯 depth 유지 */
        var dstScale = (slotW[dstIdx] / src.w).toFixed(3);
        var wraps    = (dir === +1) ? ((i + steps) >= n) : ((i - steps) < 0);

        b.style.transition = 'none';
        b.style.transform  = '';

        if (!wraps) {
          /* 직접 이동 */
          requestAnimationFrame(function () {
            b.style.transition = 'transform ' + DIRECT_DUR + 'ms cubic-bezier(0.4,0,0.2,1)';
            b.style.transform  = 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px) scale(' + dstScale + ')';
          });
        } else {
          /* 오른쪽으로 빠져나간 뒤 반대편 재진입 */
          var exitX  = SX - src.x;
          var exitY  = (dir === +1 ? SY_BOT : SY_TOP) - src.y;
          var entryY = (dir === +1 ? SY_TOP : SY_BOT) - src.y;

          requestAnimationFrame(function () {
            b.style.transition = 'transform ' + WRAP_OUT + 'ms ease-in';
            b.style.transform  = 'translate(' + exitX.toFixed(1) + 'px,' + exitY.toFixed(1) + 'px) scale(0.25)';
          });

          setTimeout(function () {
            b.style.transition = 'none';
            b.style.transform  = 'translate(' + exitX.toFixed(1) + 'px,' + entryY.toFixed(1) + 'px) scale(0.25)';
            requestAnimationFrame(function () {
              requestAnimationFrame(function () {
                b.style.transition = 'transform ' + WRAP_IN + 'ms ease-out';
                b.style.transform  = 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px) scale(' + dstScale + ')';
              });
            });
          }, WRAP_OUT + WRAP_PAUSE);
        }
      });

      /* 모든 애니메이션 완료 후: 선택 버블 scale-up + detail 표시 */
      var TOTAL = Math.max(DIRECT_DUR, WRAP_OUT + WRAP_PAUSE + 50 + WRAP_IN) + 80;

      setTimeout(function () {
        if (actionVersion !== renderVersion || !clickedBubble.isConnected) return;
        var sel   = slots[selIdx];
        var cSlot = slots[centerIdx];
        /* center 슬롯 위치 기준 이동 + 추가 scale-up (center 슬롯 width의 1.25배) */
        var TARGET_SIZE = Math.round(slotW[centerIdx] * 1.25);
        var dx = (cSlot.x - sel.x).toFixed(1);
        var dy = (cSlot.y - sel.y).toFixed(1);
        var sc = (TARGET_SIZE / sel.w).toFixed(3);

        /* 선택 버블: center 슬롯 위치에서 scale-up (inline 유지) */
        clickedBubble.style.transition = 'transform 0.6s cubic-bezier(0.34,1.56,0.64,1)';
        clickedBubble.style.transform  =
          'translate(' + dx + 'px,' + dy + 'px) scale(' + sc + ')';

        /* 비선택: transition 복원 (opacity dim 애니메이션용) */
        mapBubbles.forEach(function (b) {
          if (b !== clickedBubble) b.style.transition = '';
        });

        detailEl.querySelector('.loc-map__detail-name').textContent  = data.name;
        detailEl.querySelector('.loc-map__detail-floor').textContent = data.floor;
        detailEl.querySelector('.loc-map__detail-desc').textContent  = data.desc;
        var img = detailEl.querySelector('.loc-map__detail-img');
        img.src = data.image;
        img.alt = data.name;

        mapSection.classList.add('is-hovering', 'has-detail');
        isOrbiting = false;
      }, TOTAL);
    }

    bindBubbleEvents = function () {
      mapBubbles.forEach(function (bubble) {
        bubble.addEventListener('click', function () {
          if (isOrbiting) return;
          var key = bubble.dataset.key;
          if (!currentDataByKey[key]) return;

          /* has-detail 상태에서 다른 버블 클릭 시: 먼저 inline transform 초기화 */
          mapBubbles.forEach(function (b) {
            b.style.transition = 'none';
            b.style.transform  = '';
          });
          mapSection.classList.remove('has-detail');

          /* 한 프레임 뒤 orbit 시작 (DOM transition reset 보장) */
          requestAnimationFrame(function () {
            requestAnimationFrame(function () { orbitThenDetail(bubble, key); });
          });
        });
        bubble.addEventListener('keydown', function (event) {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          bubble.click();
        });
      });
    };

    /* 닫기 버튼 — 회전된 비선택 버블들을 원래 자리로 복귀 후 상태 해제 */
    if (closeBtn) {
      closeBtn.addEventListener('click', function () {
        /* 비선택 버블: 회전된 위치 → 원래 자리로 트랜지션 */
        mapBubbles.forEach(function (b) {
          b.style.transition = 'transform 0.55s cubic-bezier(0.34, 1.56, 0.64, 1)';
        });
        /* reflow 강제 후 transform 제거 → CSS scale(1) 으로 귀환 */
        void mapSection.offsetHeight;
        mapBubbles.forEach(function (b) {
          b.style.transform = '';
          b.classList.remove('is-selected');
        });
        mapSection.classList.remove('has-detail');
        setTimeout(function () {
          mapBubbles.forEach(function (b) { b.style.transition = ''; });
        }, 560);
      });
    }

    floorTabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var floor = tab.dataset.floor;
        if (floor === currentFloor || !JEJU_EXHIBITS[floor]) return;
        renderFloor(floor);
      });
    });

    renderFloor(currentFloor);
    updateMapPin();
  }

}());
