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
     지점별 페이지 콘텐츠
     제주 레이아웃을 공통으로 사용하고 URL의 ?loc= 값으로 전환합니다.
     ================================================================ */
  var locationParam = new URLSearchParams(window.location.search).get('loc');
  var currentLocation = locationParam ? locationParam.toLowerCase() : 'jeju';
  if (currentLocation !== 'ilsan' && currentLocation !== 'yeosu' && currentLocation !== 'gwanggyo') currentLocation = 'jeju';
  var isIlsan    = currentLocation === 'ilsan';
  var isYeosu    = currentLocation === 'yeosu';
  var isGwanggyo = currentLocation === 'gwanggyo';

  var LOCATION_PAGES = {
    yeosu: {
      en: 'Yeosu',
      kr: '여수',
      sub: '여수 밤바다를 품은 국내 최대 규모 아쿠아리움',
      address: '전라남도 여수시 오동도로 61-11',
      tel: '1833-7001',
      heroImage: 'assets/images/locationYeosu_hero.gif',
      introImage: 'assets/images/locationYeosu_intro_bg_1.jpg',
      quote: '<p><span class="loc-intro__qm">&quot;</span>국내 유일 <strong>벨루가 고래</strong>와 함께하는</p><p>특별한 해양 체험을 만나보세요<span class="loc-intro__qm">&quot;</span></p>',
      description: [
        '아쿠아플라넷 여수는 GS칼텍스 예울마루 옆에 위치한 대규모 복합 해양문화시설로, <br> 국내 유일의 벨루가(흰 고래)를 보유하고 있습니다.',
        '오션라이프, 마린라이프, 아쿠아포리스트 등 다양한 테마존으로 구성되어 있으며, <br> 여수 밤바다의 아름다운 풍경과 함께 잊지 못할 해양 체험을 제공합니다.'
      ],
      programDescription: '여수의 아름다운 바다와 함께하는 특별한 해양 문화 체험 공간입니다<br><strong>국내 유일 벨루가 고래</strong>와 다양한 해양 생물 전시를 통해 교육과 감동이 함께하는 공간을 제공합니다',
      programs: [
        { image: 'assets/images/Yeosu_program_a.jpg', title: '벨루가 생태설명회' },
        { image: 'assets/images/Yeosu_program_f.jpg', title: '바다사자 생태설명회' }
      ],
      floors: ['1F', '2F', '3F'],
      defaultFloor: '3F',
      maps: {
        '1F': 'assets/images/locationYeosu_map_f1.png',
        '2F': 'assets/images/locationYeosu_map_f2.png',
        '3F': 'assets/images/locationYeosu_map_f3.png'
      },
      openingTime: '09:30 - 18:00',
      openingLabel: '연중 무휴',
      openingNote: '매표 마감시간은 17:00이며, 입장 마감시간은 17:30이오니 이용에 참고 부탁드립니다'
    },
    ilsan: {
      en: 'Ilsan',
      kr: '일산',
      sub: '일산 호수공원 옆 국내 대표 아쿠아리움',
      address: '경기도 고양시 일산동구 장항동 838',
      tel: '1833-7001',
      heroImage: 'assets/images/locationIlsan_hero.gif',
      introImage: 'assets/images/locationIlsan_intro_bg_1.jpg',
      quote: '<p><span class="loc-intro__qm">&quot;</span>국내에서 처음으로 실내동물원이 결합된</p><p><strong>컨버전스 아쿠아리움</strong>을 만나보세요<span class="loc-intro__qm">&quot;</span></p>',
      description: [
        '초대형 규모(연면적 1만 4660m², 수조량 4300톤)를 자랑하며 <br> 최대 규모 2000톤에 달하는 대형수조를 비롯해 수조 44개, 동물사 9개와 조류방사장 등 <br> 관람과 체험을 동시에 즐길 수 있는 도심 속 체험형 복합관람시설입니다.'
      ],
      programDescription: '도심 가까이에서 바다를 경험할 수 있는 수도권 대표 아쿠아리움입니다<br><strong>국내 유일 바다코끼리</strong>와 다양한 생물 전시를 통해 교육과 체험이 결합된 해양문화공간을 제공합니다',
      programs: [
        { image: 'assets/images/image 136.png', title: '국내 유일! 바다코끼리 자매 메리&바랴 생태설명회' },
        { image: 'assets/images/programIL.png', title: '메인수조 투명보트 탑승 체험' }
      ],
      floors: ['B1F', '1F', '2F', '3F', '5F'],
      defaultFloor: '1F',
      maps: {
        'B1F': 'assets/images/locationIlsan_map_b1f.png',
        '1F': 'assets/images/locationIlsan_map_f1.png',
        '2F': 'assets/images/locationIlsan_map_f2.png',
        '3F': 'assets/images/locationIlsan_map_f3.png',
        '5F': 'assets/images/locationIlsan_map_f5.png'
      },
      openingTime: '10:00 - 18:00',
      openingLabel: '연중 무휴',
      openingNote: '매표 및 입장 마감시간은 17:00이오니 이용에 참고 부탁드립니다'
    },
    gwanggyo: {
      en: 'Gwanggyo',
      kr: '광교',
      sub: '광교 수변도시의 아름다운 아쿠아리움',
      address: '경기도 수원시 영통구 광교호수공원로 300 포레나 광교 B1F',
      tel: '1833-7001',
      heroImage: 'assets/images/locationGwanggyo_hero.gif',
      introImage: 'assets/images/locationGwanggyo_intro_bg_1.jpg',
      quote: '<p><span class="loc-intro__qm">&quot;</span>다양한 교육&amp;체험 프로그램과 다양한 공연 등</p><p><strong>환상적인 콘텐츠</strong>를 365일 체험해보세요<span class="loc-intro__qm">&quot;</span></p>',
      description: [
        '지금까지 경험해보지 못한 Funny한 체험과 Fantasy한 바닷속 세상, 아쿠아플라넷 광교입니다.',
        '도심 속 바다에 살고 있는 210여종 30,000마리의 해양 및 육지 생물들을 <br> 가장 가까운 거리에서 생생하게 만나보세요.',
        '빛과 생물이 어우러진, 환상의 아쿠아리움, <br> 아쿠아플라넷 광교에서 바닷속 탐험의 즐거움을 느껴보세요.'
      ],
      programDescription: '쇼핑과 문화, 체험이 결합된 도심형 아쿠아리움입니다<br><strong>생물 관람</strong>뿐 아니라 체험 콘텐츠와 다양한 테마 공간을 통해 새로운 해양문화 경험을 제공합니다',
      programs: [
        { image: 'assets/images/gwanggyo_guide_map04.jpg', title: "아쿠아플라넷 광교의 마스코트! '펭귄' 생태설명회" },
        { image: 'assets/images/Gwanggyo_program_e.jpg', title: '머메이드쇼' }
      ],
      floors: ['B1F', 'B2F'],
      defaultFloor: 'B2F',
      maps: {
        'B1F': 'assets/images/locationGwanggyo_map_b2f.png',
        'B2F': 'assets/images/locationGwanggyo_map_b1f.png'
      },
      openingTime: '10:30 - 19:30',
      openingLabel: '연중 무휴',
      openingNote: '매표 및 입장 마감시간은 18:30이오니 이용에 참고 부탁드립니다'
    }
  };

  function setText(selector, value) {
    var element = document.querySelector(selector);
    if (element) element.textContent = value;
  }

  function applyLocationPage() {
    document.body.dataset.location = currentLocation;
    document.querySelectorAll('[data-gnb-loc]').forEach(function (link) {
      link.classList.toggle('gnb__dropdown-item--active', link.dataset.gnbLoc === currentLocation);
    });

    if (!isIlsan && !isYeosu && !isGwanggyo) return;
    var page = isIlsan ? LOCATION_PAGES.ilsan : isYeosu ? LOCATION_PAGES.yeosu : LOCATION_PAGES.gwanggyo;
    document.title = 'aqua planet — ' + page.en;

    setText('#loc-city-en', page.en);
    setText('#loc-city-sub', page.sub);
    setText('#loc-city-kr', page.kr);
    setText('#loc-city-addr', page.address);
    setText('#loc-city-tel', 'TEL. ' + page.tel);

    var heroImage = document.querySelector('.loc-hero__bg-img');
    var introImage = document.querySelector('.loc-intro__bg-img');
    if (heroImage) heroImage.src = page.heroImage;
    if (introImage) introImage.src = page.introImage;

    var heroSection = document.querySelector('.loc-hero');
    var introSection = document.querySelector('.loc-intro');
    if (heroSection) heroSection.setAttribute('aria-label', 'Location ' + page.kr + ' 히어로');
    if (introSection) introSection.setAttribute('aria-label', page.kr + ' 지점 소개');

    var quote = document.getElementById('loc-city-quote');
    var description = document.getElementById('loc-city-desc');
    if (quote) quote.innerHTML = page.quote;
    if (description) {
      description.innerHTML = page.description.map(function (paragraph) {
        return '<p>' + paragraph + '</p>';
      }).join('');
    }

    var programDescription = document.querySelector('.loc-programs__sub');
    if (programDescription) programDescription.innerHTML = page.programDescription;
    document.querySelectorAll('.loc-programs__card').forEach(function (card, index) {
      var program = page.programs[index];
      if (!program) return;
      var image = card.querySelector('.loc-programs__card-img');
      var title = card.querySelector('.loc-programs__card-title');
      var link = card.querySelector('.loc-programs__card-btn');
      if (image) {
        image.src = program.image;
        image.alt = program.title;
      }
      if (title) title.textContent = program.title;
      if (link) link.href = 'program.html?loc=' + page.en;
    });

    /* solo + exhibits 두 섹션의 floor-tabs 모두 갱신 */
    document.querySelectorAll('.loc-map__floor-tabs').forEach(function (tabs) {
      tabs.innerHTML = page.floors.map(function (floor) {
        var active = floor === page.defaultFloor;
        return '<button class="loc-map__floor-tab' + (active ? ' is-active' : '') + '" role="tab" data-floor="' + floor + '" aria-selected="' + (active ? 'true' : 'false') + '">' + floor + '</button>';
      }).join('');
    });

    var mapSection = document.querySelector('.loc-map');
    var mapHint = document.querySelector('.loc-map__hint');
    var markerLayer = document.querySelector('.loc-map__markers');
    var bubbleLayer = document.querySelector('.loc-map__bubbles');
    var detailCard  = document.querySelector('.loc-map__detail');
    if (mapHint) mapHint.hidden = true;
    if (markerLayer) markerLayer.replaceChildren();
    if (bubbleLayer) bubbleLayer.replaceChildren();

    setText('.loc-hours__time', page.openingTime);
    setText('.loc-hours__label', page.openingLabel);
    setText('.loc-hours__note', page.openingNote);
    var firstNotice = document.querySelector('.loc-hours__notice-list li');
    if (firstNotice) firstNotice.textContent = page.openingNote;
  }

  applyLocationPage();

  /* ================================================================
     Hero ↔ Intro 스크롤 전환 애니메이션
     - 스크롤 시 hero__content 위로 페이드아웃
     - 동시에 intro__content 아래에서 페이드인
     ================================================================ */
  var heroWrap    = document.querySelector('.loc-sticky-wrap');
  var heroContent = document.querySelector('.loc-hero__content');
  var introContent = document.querySelector('.loc-intro__content');
  var HERO_ZONE   = 500; /* 전환 완료까지 스크롤 거리(px) */

  function updateHeroTransition() {
    if (!heroWrap || !heroContent || !introContent) return;
    if (window.matchMedia('(max-width: 820px)').matches) {
      heroContent.style.opacity   = '';
      heroContent.style.transform = '';
      return;
    }
    var top      = heroWrap.getBoundingClientRect().top;
    var progress = Math.max(0, Math.min(1, -top / HERO_ZONE));

    /* hero content: 페이드아웃 + 위로 이동 */
    heroContent.style.opacity   = Math.max(0, 1 - progress * 2.5).toFixed(3);
    heroContent.style.transform = 'translateY(' + (-60 * progress).toFixed(1) + 'px)';

    /* intro content: 페이드인 + 아래서 위로 (progress 0.25 이후 시작) */
    var ip = Math.max(0, (progress - 0.25) / 0.75);
    introContent.style.opacity      = ip.toFixed(3);
    introContent.style.transform    = 'translate(-50%, calc(-50% + ' + (40 * (1 - ip)).toFixed(1) + 'px))';
    introContent.style.pointerEvents = ip > 0.5 ? 'auto' : 'none';
  }

  /* 스크롤 인디케이터 클릭 → 전환 구간만큼 스크롤 */
  var scrollBtn = document.querySelector('.loc-scroll');
  if (scrollBtn) {
    scrollBtn.addEventListener('click', function () {
      window.scrollTo({ top: HERO_ZONE, behavior: 'smooth' });
    });
  }

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
  /* exhibits 섹션을 기준으로 모든 인터랙션 처리 */
  var mapSection  = document.querySelector('.loc-map--exhibits');
  var soloSection = document.querySelector('.loc-map--solo');
  var soloWrapEl  = document.querySelector('.loc-map-wrap--solo');
  var soloImg     = document.getElementById('loc-map-img-solo');
  var soloMarkersEl = document.getElementById('loc-map-markers-solo');
  var mapImg      = document.getElementById('loc-map-img');
  var markerWrap  = mapSection ? mapSection.querySelector('.loc-map__markers') : null;
  var bubbleWrap  = mapSection ? mapSection.querySelector('.loc-map__bubbles')  : null;
  var floorTabs   = Array.from(document.querySelectorAll('.loc-map__floor-tab'));
  var detailEl    = document.getElementById('loc-map-detail');
  var closeBtn    = document.getElementById('loc-map-close');
  var mapBubbles  = [];
  var currentFloor = isIlsan     ? LOCATION_PAGES.ilsan.defaultFloor
                   : isYeosu    ? LOCATION_PAGES.yeosu.defaultFloor
                   : isGwanggyo ? LOCATION_PAGES.gwanggyo.defaultFloor
                   : '2F';
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

  var ACTIVE_MAPS = isIlsan     ? LOCATION_PAGES.ilsan.maps
                 : isYeosu    ? LOCATION_PAGES.yeosu.maps
                 : isGwanggyo ? LOCATION_PAGES.gwanggyo.maps
                 : JEJU_MAPS;

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

  var ILSAN_EXHIBITS = {
    'B1F': [
      { key: 'insects',  zone: 'A', name: '곤충관',       floor: 'B1F', thumb: 'assets/images/ilsan_guide_thum01.jpg', image: 'assets/images/ilsan_guide_map01.jpg', desc: '다양한 곤충들을 가까이서 관찰할 수 있는 전시 공간입니다.' },
      { key: 'reptiles', zone: 'A', name: '파충류관',     floor: 'B1F', thumb: 'assets/images/ilsan_guide_thum02.jpg', image: 'assets/images/ilsan_guide_map02.jpg', desc: '신비로운 파충류들의 세계를 만나보세요.' },
      { key: 'vivarium', zone: 'A', name: '비바리움관',   floor: 'B1F', thumb: 'assets/images/ilsan_guide_thum03.jpg', image: 'assets/images/ilsan_guide_map03.jpg', desc: '식물과 동물이 공존하는 자연 생태계 전시 공간입니다.' }
    ],
    '1F': [
      { key: 'ticket',    zone: 'B', name: '매표소',   floor: '1F', thumb: 'assets/images/ilsan_guide_thum05.jpg', image: 'assets/images/ilsan_guide_map05.jpg', desc: '입장권 구매 및 안내 서비스를 제공합니다.' },
      { key: 'nursing',   zone: 'B', name: '수유실',   floor: '1F', thumb: 'assets/images/ilsan_guide_thum06.jpg', image: 'assets/images/ilsan_guide_map06.jpg', desc: '영아와 함께 방문하시는 가족을 위한 편의 공간입니다.' },
      { key: 'foodcourt', zone: 'B', name: '푸드코트', floor: '1F', thumb: 'assets/images/ilsan_guide_thum07.jpg', image: 'assets/images/ilsan_guide_map07.jpg', desc: '관람 중 다양한 식사와 간식을 즐길 수 있습니다.' }
    ],
    '2F': [
      { key: 'bridge',    zone: 'C', name: '물 위를 걷는 스릴 브릿지 폭포다리', floor: '2F', thumb: 'assets/images/ilsan_guide_thum09.jpg', image: 'assets/images/ilsan_guide_map09.jpg', desc: '물 위를 가로지르는 스릴 넘치는 투명 브릿지 체험입니다.' },
      { key: 'sandtiger', zone: 'D', name: '샌드타이거샤크',               floor: '2F', thumb: 'assets/images/ilsan_guide_thum10.jpg', image: 'assets/images/ilsan_guide_map10.jpg', desc: '날카로운 이빨의 샌드타이거샤크를 가까이서 만나보세요.' },
      { key: 'deepblue',  zone: 'D', name: '딥 블루 오션 (메인수조)',       floor: '2F', thumb: 'assets/images/ilsan_guide_thum11.jpg', image: 'assets/images/ilsan_guide_map11.jpg', desc: '최대 2000톤 규모의 대형 메인수조에서 다양한 해양생물을 만나보세요.' },
      { key: 'jellyfish', zone: 'D', name: '더 젤리피쉬',                   floor: '2F', thumb: 'assets/images/ilsan_guide_thum12.jpg', image: 'assets/images/ilsan_guide_map12.jpg', desc: '신비롭고 아름다운 해파리들의 세계를 감상해보세요.' },
      { key: 'aquacafe',  zone: 'E', name: '바다 속 아쿠아카페',            floor: '2F', thumb: 'assets/images/ilsan_guide_thum13.jpg', image: 'assets/images/ilsan_guide_map13.jpg', desc: '바다 전망과 함께 음료와 간식을 즐길 수 있는 카페입니다.' },
      { key: 'giftshop',  zone: 'E', name: '추억을 남겨가는 기프트 샵',    floor: '2F', thumb: 'assets/images/ilsan_guide_thum15.jpg', image: 'assets/images/ilsan_guide_map15.jpg', desc: '아쿠아플라넷 공식 굿즈와 다양한 기념품을 구매할 수 있습니다.' }
    ],
    '3F': [
      { key: 'rockplay',      zone: 'F', name: '바위놀이터',           floor: '3F', thumb: 'assets/images/ilsan_guide_thum16.jpg', image: 'assets/images/ilsan_guide_map16.jpg', desc: '아이들이 신나게 뛰어놀 수 있는 자연 테마 놀이터입니다.' },
      { key: 'lemur',         zone: 'F', name: '알락꼬리 여우원숭이', floor: '3F', thumb: 'assets/images/ilsan_guide_thum17.jpg', image: 'assets/images/ilsan_guide_map17.jpg', desc: '마다가스카르 출신의 귀여운 알락꼬리 여우원숭이를 만나보세요.' },
      { key: 'penguinvillage',zone: 'G', name: '펭귄빌리지',          floor: '3F', thumb: 'assets/images/ilsan_guide_thum19.jpg', image: 'assets/images/ilsan_guide_map19.jpg', desc: '귀여운 펭귄들이 사는 마을에서 특별한 만남을 경험해보세요.' },
      { key: 'freshwater',    zone: 'G', name: '담수터널',            floor: '3F', thumb: 'assets/images/ilsan_guide_thum20.jpg', image: 'assets/images/ilsan_guide_map20.jpg', desc: '민물고기들이 가득한 투명 터널을 걸어보세요.' },
      { key: 'penguin',       zone: 'G', name: '펭귄',               floor: '3F', thumb: 'assets/images/ilsan_guide_thum21.jpg', image: 'assets/images/ilsan_guide_map21.jpg', desc: '생생한 펭귄의 일상을 가까이서 관찰해보세요.' },
      { key: 'oceanarena3f',  zone: 'G', name: '오션 아레나',        floor: '3F', thumb: 'assets/images/ilsan_guide_thum22.jpg', image: 'assets/images/ilsan_guide_map22.jpg', desc: '화려한 해양 퍼포먼스가 펼쳐지는 대형 공연장입니다.' },
      { key: 'touchpool',     zone: 'G', name: '터치 풀',            floor: '3F', thumb: 'assets/images/ilsan_guide_thum23.jpg', image: 'assets/images/ilsan_guide_map23.jpg', desc: '바다생물을 직접 만지며 교감할 수 있는 체험 공간입니다.' }
    ],
    '5F': [
      { key: 'donkey', zone: 'H', name: '당나귀',          floor: '5F', thumb: 'assets/images/ilsan_guide_thum24.jpg', image: 'assets/images/ilsan_guide_map24.jpg', desc: '순하고 친근한 당나귀를 만나볼 수 있습니다.' },
      { key: 'duck',   zone: 'H', name: '오리',            floor: '5F', thumb: 'assets/images/ilsan_guide_thum29.jpg', image: 'assets/images/ilsan_guide_map29.jpg', desc: '귀여운 오리들의 생동감 넘치는 모습을 관찰해보세요.' },
      { key: 'pony',   zone: 'H', name: '셰틀랜드 포니', floor: '5F', thumb: 'assets/images/ilsan_guide_thum30.jpg', image: 'assets/images/ilsan_guide_map30.jpg', desc: '작고 귀여운 셰틀랜드 포니와 교감해보세요.' },
      { key: 'sheep',  zone: 'H', name: '양',              floor: '5F', thumb: 'assets/images/ilsan_guide_thum31.jpg', image: 'assets/images/ilsan_guide_map31.jpg', desc: '폭신폭신한 양들과 함께하는 특별한 시간을 보내보세요.' },
      { key: 'goat',   zone: 'H', name: '염소',            floor: '5F', thumb: 'assets/images/ilsan_guide_thum32.jpg', image: 'assets/images/ilsan_guide_map32.jpg', desc: '장난기 넘치는 염소들을 만나보세요.' },
      { key: 'rabbit', zone: 'H', name: '토끼',            floor: '5F', thumb: 'assets/images/ilsan_guide_thum32.jpg', image: 'assets/images/ilsan_guide_map32.jpg', desc: '사랑스러운 토끼들과 교감하는 힐링 시간입니다.' }
    ]
  };

  /* 제공된 지도 이미지의 A–H 표기를 1320×790 좌표로 환산 */
  var JEJU_MARKERS = {
    '2F': [
      { zone: 'A', left: 105, top: 160 },
      { zone: 'A', left: 167, top: 390 },
      { zone: 'B', left: 295, top: 285 },
      { zone: 'C', left: 736, top: 425 }
    ],
    '1F': [
      { zone: 'D', left: 372, top: 283 },
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

  var ILSAN_MARKERS = {
    'B1F': [
      { zone: 'A', left: 1090, top: 260 }
    ],
    '1F': [
      { zone: 'B', left: 800, top: 500 },
      { zone: 'B', left: 1000, top: 376 },
      { zone: 'B', left: 1217, top: 369 }
    ],
    '2F': [
      { zone: 'C', left: 213, top: 355 },
      { zone: 'D', left: 700, top: 355 },
      { zone: 'E', left: 1226, top: 335 }
    ],
    '3F': [
      { zone: 'F', left: 185, top: 360 },
      { zone: 'G', left: 713, top: 360 }
    ],
    '5F': [
      { zone: 'H', left: 629, top: 325 }
    ]
  };

  var ILSAN_ZONE_LABELS = {
    A: '다흑 기획전2', B: '부대시설', C: '더 정글',
    D: '더 아쿠아',   E: '부대시설', F: '더 정글',
    G: '더 아쿠아',   H: '더 스카이팜'
  };

  var ILSAN_DEFAULT_ZONE = { 'B1F': 'A', '1F': 'B', '2F': 'D', '3F': 'G', '5F': 'H' };

  var YEOSU_EXHIBITS = {
    '1F': [
      { key: 'yr-monet',    zone: 'A', name: '클로드 모네, 빛의 순간들 展', floor: '1F', thumb: 'assets/images/yeosu_guide_thum35.jpg', image: 'assets/images/yeosu_guide_map35.jpg', desc: '인상파의 거장 클로드 모네의 작품 세계를 빛과 영상으로 재해석한 몰입형 미디어 아트 특별 전시입니다.' },
      { key: 'yr-artshop',  zone: 'A', name: '아트샵',               floor: '1F', thumb: 'assets/images/yeosu_guide_thum36.jpg', image: 'assets/images/yeosu_guide_map36.jpg', desc: '전시와 연계된 아트 상품을 만나볼 수 있습니다.' },
      { key: 'yr-oceancinema', zone: 'B', name: '오션시네마',        floor: '1F', thumb: 'assets/images/yeosu_guide_thum01.jpg', image: 'assets/images/yeosu_guide_map01.jpg', desc: '바다를 배경으로 한 몰입형 영상을 감상할 수 있는 특별한 시네마 공간입니다.' },
      { key: 'yr-fishnfish', zone: 'C', name: 'Fish n fish (기프트샵)', floor: '1F', thumb: 'assets/images/yeosu_guide_thum03.jpg', image: 'assets/images/yeosu_guide_map03.jpg', desc: '아쿠아플라넷 공식 굿즈와 다양한 기념품을 구매할 수 있습니다.' },
      { key: 'yr-aquaterr',  zone: 'C', name: '아쿠아테라스 (푸드코트)', floor: '1F', thumb: 'assets/images/yeosu_guide_thum34.jpg', image: 'assets/images/yeosu_guide_map34.jpg', desc: '여수 바다 전망과 함께 다양한 식사를 즐길 수 있는 테라스 레스토랑입니다.' },
      { key: 'yr-cafe1f',    zone: 'C', name: '아쿠아카페 (1F)',     floor: '1F', thumb: 'assets/images/yeosu_guide_thum05.jpg', image: 'assets/images/yeosu_guide_map05.jpg', desc: '1층에서 편안하게 쉬며 음료와 간식을 즐겨보세요.' },
      { key: 'yr-cafe2f',    zone: 'C', name: '아쿠아카페 (2F)',     floor: '1F', thumb: 'assets/images/yeosu_guide_thum04.jpg', image: 'assets/images/yeosu_guide_map04.jpg', desc: '2층에서 편안하게 쉬며 음료와 간식을 즐겨보세요.' },
      { key: 'yr-samdaeok',  zone: 'C', name: '삼대옥',              floor: '1F', thumb: 'assets/images/yeosu_guide_thum37.jpg', image: 'assets/images/yeosu_guide_map37.jpg', desc: '관람 전후 맛있는 식사를 즐길 수 있습니다.' },
      { key: 'yr-nyangchike',zone: 'C', name: '냥치케',              floor: '1F', thumb: 'assets/images/yeosu_guide_thum38.jpg', image: 'assets/images/yeosu_guide_map38.jpg', desc: '여수의 명물 냥치케에서 특별한 시간을 보내보세요.' }
    ],
    '2F': [
      { key: 'yr-mediawall',  zone: 'D', name: '대형 미디어 월',     floor: '2F', thumb: 'assets/images/yeosu_guide_thum06.jpg', image: 'assets/images/yeosu_guide_map06.jpg', desc: '아쿠아포리스트를 가득 채우는 대형 미디어 월에서 디지털 자연의 경이로움을 경험하세요.' },
      { key: 'yr-lifetree',   zone: 'D', name: '생명의 나무',        floor: '2F', thumb: 'assets/images/yeosu_guide_thum07.jpg', image: 'assets/images/yeosu_guide_map07.jpg', desc: '열대우림의 생명력을 상징하는 대형 나무 구조물과 다양한 생물을 만나보세요.' },
      { key: 'yr-waterfall',  zone: 'D', name: '폭포 수조',          floor: '2F', thumb: 'assets/images/yeosu_guide_thum08.jpg', image: 'assets/images/yeosu_guide_map08.jpg', desc: '시원한 폭포가 흐르는 수조 속 민물 생물들을 관찰하세요.' },
      { key: 'yr-uppertank',  zone: 'D', name: '상단 수조',          floor: '2F', thumb: 'assets/images/yeosu_guide_thum09.jpg', image: 'assets/images/yeosu_guide_map09.jpg', desc: '상단에 위치한 대형 수조에서 다양한 열대 어종을 내려다보세요.' },
      { key: 'yr-discus',     zone: 'D', name: '디스커스 수조',      floor: '2F', thumb: 'assets/images/yeosu_guide_thum10.jpg', image: 'assets/images/yeosu_guide_map10.jpg', desc: '화려한 색채의 열대 민물고기 디스커스의 아름다움을 감상하세요.' },
      { key: 'yr-arowana',    zone: 'D', name: '아로와나 수조',      floor: '2F', thumb: 'assets/images/yeosu_guide_thum11.jpg', image: 'assets/images/yeosu_guide_map11.jpg', desc: '황금빛 비늘이 빛나는 아로와나의 우아한 유영을 감상하세요.' },
      { key: 'yr-piranha',    zone: 'D', name: '피라니아',           floor: '2F', thumb: 'assets/images/yeosu_guide_thum12.jpg', image: 'assets/images/yeosu_guide_map12.jpg', desc: '아마존의 강력한 포식자 피라니아와 다채로운 민물고기들을 만나보세요.' },
      { key: 'yr-forestpond', zone: 'D', name: '포리스트 연못',      floor: '2F', thumb: 'assets/images/yeosu_guide_thum13.jpg', image: 'assets/images/yeosu_guide_map13.jpg', desc: '숲 속 연못을 재현한 생태 공간에서 다양한 수생 생물을 관찰하세요.' },
      { key: 'yr-jellyfish2f',zone: 'D', name: '젤리피쉬',          floor: '2F', thumb: 'assets/images/yeosu_guide_thum14.jpg', image: 'assets/images/yeosu_guide_map14.jpg', desc: '신비롭고 아름다운 해파리들의 세계를 감상해보세요.' },
      { key: 'yr-otter',      zone: 'E', name: '작은발톱수달 수조', floor: '2F', thumb: 'assets/images/yeosu_guide_thum18.jpg', image: 'assets/images/yeosu_guide_map18.jpg', desc: '귀엽고 장난기 넘치는 작은발톱수달의 일상을 가까이서 관찰해보세요.' },
      { key: 'yr-penguin2f',  zone: 'E', name: '펭귄 수조',         floor: '2F', thumb: 'assets/images/yeosu_guide_thum19.jpg', image: 'assets/images/yeosu_guide_map19.jpg', desc: '아프리카 펭귄을 비롯한 귀여운 펭귄 친구들과 함께하세요.' },
      { key: 'yr-beluga2f',   zone: 'E', name: '벨루가 수조',       floor: '2F', thumb: 'assets/images/yeosu_guide_thum20.jpg', image: 'assets/images/yeosu_guide_map20.jpg', desc: '순백의 벨루가 고래를 유리 너머로 가까이 만나볼 수 있습니다.' },
      { key: 'yr-sealion2f',  zone: 'E', name: '바다사자 수조',     floor: '2F', thumb: 'assets/images/yeosu_guide_thum22.jpg', image: 'assets/images/yeosu_guide_map22.jpg', desc: '바다사자의 힘차고 우아한 유영을 관찰하세요.' },
      { key: 'yr-seal2f',     zone: 'E', name: '참물범 수조',       floor: '2F', thumb: 'assets/images/yeosu_guide_thum23.jpg', image: 'assets/images/yeosu_guide_map23.jpg', desc: '귀여운 참물범을 다양한 각도에서 만나보세요.' },
      { key: 'yr-paludarium', zone: 'E', name: '팔루다리움 수조',   floor: '2F', thumb: 'assets/images/yeosu_guide_thum21.jpg', image: 'assets/images/yeosu_guide_map21.jpg', desc: '수중과 육지 생태계가 공존하는 팔루다리움에서 독특한 자연을 경험하세요.' },
      { key: 'yr-main',       zone: 'F', name: '메인 수조',         floor: '2F', thumb: 'assets/images/yeosu_guide_thum02.jpg', image: 'assets/images/yeosu_guide_map02.jpg', desc: '국내 최대 규모의 메인 수조에서 상어, 가오리, 바다거북 등 다양한 대형 해양생물을 만나보세요.' },
      { key: 'yr-pacific',    zone: 'F', name: '태평양 수조',       floor: '2F', thumb: 'assets/images/yeosu_guide_thum15.jpg', image: 'assets/images/yeosu_guide_map15.jpg', desc: '태평양의 광활한 바다를 담은 대형 수조에서 다양한 해양생물을 만나보세요.' },
      { key: 'yr-seaturtle',  zone: 'F', name: '푸른바다 거북 수조', floor: '2F', thumb: 'assets/images/yeosu_guide_thum26.jpg', image: 'assets/images/yeosu_guide_map26.jpg', desc: '멸종위기 해양생물인 푸른바다거북을 가까이서 만날 수 있습니다.' },
      { key: 'yr-sandtiger',  zone: 'F', name: '샌드타이거 샤크 수조', floor: '2F', thumb: 'assets/images/yeosu_guide_thum24.jpg', image: 'assets/images/yeosu_guide_map24.jpg', desc: '날카로운 이빨의 샌드타이거 샤크를 가까이서 만나보세요.' },
      { key: 'yr-aquadome',   zone: 'F', name: '아쿠아돔',          floor: '2F', thumb: 'assets/images/yeosu_guide_thum25.jpg', image: 'assets/images/yeosu_guide_map25.jpg', desc: '돔형 수조 속 다양한 해양생물들을 360도로 감상해보세요.' },
      { key: 'yr-tunnel2f',   zone: 'F', name: '터널 수조',         floor: '2F', thumb: 'assets/images/yeosu_guide_thum16.jpg', image: 'assets/images/yeosu_guide_map16.jpg', desc: '바다 속을 걷는 듯한 터널형 수조를 통과하며 수중 생물들을 360도로 감상해보세요.' },
      { key: 'yr-miniaqua',   zone: 'F', name: '미니 아쿠아리움',   floor: '2F', thumb: 'assets/images/yeosu_guide_thum17.jpg', image: 'assets/images/yeosu_guide_map17.jpg', desc: '수십 개의 소형 수조가 줄지어 펼쳐지는 미니 아쿠아리움입니다.' }
    ],
    '3F': [
      { key: 'yr-baikalseal', zone: 'G', name: '바이칼물범 수조',   floor: '3F', thumb: 'assets/images/yeosu_guide_thum30.jpg', image: 'assets/images/yeosu_guide_map30.jpg', desc: '시베리아 바이칼 호수에서 온 희귀한 바이칼물범을 만나보세요.' },
      { key: 'yr-belugaseat', zone: 'G', name: '벨루가 관람석',     floor: '3F', thumb: 'assets/images/yeosu_guide_thum31.jpg', image: 'assets/images/yeosu_guide_map31.jpg', desc: '3층 관람석에서 순백의 벨루가 고래의 유영을 위에서 감상해보세요.' },
      { key: 'yr-sealionstage',zone: 'G', name: '바다사자 관람석',  floor: '3F', thumb: 'assets/images/yeosu_guide_thum32.jpg', image: 'assets/images/yeosu_guide_map32.jpg', desc: '3층에서 내려다보는 바다사자의 힘차고 우아한 모습을 감상하세요.' },
      { key: 'yr-seal3f',    zone: 'G', name: '참물범 수조',        floor: '3F', thumb: 'assets/images/yeosu_guide_thum33.jpg', image: 'assets/images/yeosu_guide_map33.jpg', desc: '3층에서 귀여운 참물범의 수중 생활을 가까이서 관찰해보세요.' }
    ]
  };

  var YEOSU_MARKERS = {
    '1F': [
      { zone: 'A', left: 327, top: 190 },
      { zone: 'B', left: 473, top: 395 },
      { zone: 'C', left: 565, top: 480 },
      { zone: 'C', left: 615, top: 420 },
      { zone: 'C', left: 708, top: 270 },
      { zone: 'C', left: 776, top: 403 },
      { zone: 'C', left: 390, top: 437 },
      { zone: 'C', left: 908, top: 440 }
    ],
    '2F': [
      { zone: 'D', left: 345, top: 185 },
      { zone: 'E', left: 345, top: 440 },
      { zone: 'F', left: 922, top: 345 }
    ],
    '3F': [
      { zone: 'G', left: 350, top: 430 }
    ]
  };

  var YEOSU_ZONE_LABELS = {
    A: '클로드 모네',
    B: '오션시네마',
    C: '부대시설',
    D: '아쿠아포리스트',
    E: '마린라이프',
    F: '오션라이프',
    G: '마린라이프'
  };

  var YEOSU_DEFAULT_ZONE = { '1F': 'A', '2F': 'D', '3F': 'G' };

  var GWANGGYO_EXHIBITS = {
    'B1F': [
      { key: 'gw-penguin',   zone: 'A', name: '훔볼트 펭귄',    floor: 'B1F', thumb: 'assets/images/gwanggyo_guide_thum04.jpg', image: 'assets/images/gwanggyo_guide_map04.jpg',  desc: '귀여운 훔볼트 펭귄들이 사는 마을! 도도하면서도 귀여운 펭귄들의 일상을 가까이서 만나보세요.' },
      { key: 'gw-jellyfish', zone: 'B', name: '보름달 물해파리', floor: 'B1F', thumb: 'assets/images/gwanggyo_guide_thum07.jpg', image: 'assets/images/gwanggyo_guide_map07.jpg',  desc: '형형색색 빛을 발하는 해파리의 신비로운 세계! 해파리 연구실에서 다양한 종류의 해파리를 가까이서 관찰해보세요.' },
      { key: 'gw-archer',    zone: 'C', name: '물총고기',        floor: 'B1F', thumb: 'assets/images/gwanggyo_guide_thum01.jpg', image: 'assets/images/gwanggyo_guide_map01.jpg',  desc: '물을 발사해 먹이를 잡는 독특한 사냥꾼, 물총고기를 만나보세요.' },
      { key: 'gw-angel',     zone: 'D', name: '엠페러엔젤',      floor: 'B1F', thumb: 'assets/images/gwanggyo_guide_thum01.jpg', image: 'assets/images/gwanggyo_guide_map01.jpg',  desc: '황제 엔젤피시를 비롯한 형형색색 열대어들이 여러분을 맞이합니다.' },
      { key: 'gw-gardeneel', zone: 'E', name: '가든일 수조',     floor: 'B1F', thumb: 'assets/images/gwanggyo_guide_thum08.jpg', image: 'assets/images/gwanggyo_guide_map08.jpg',  desc: '반구형 버블 속에서 주변을 둘러싼 바다 생물들을 360도로 감상하는 특별한 공간입니다.' },
      { key: 'gw-axolotl',   zone: 'E', name: '우파루파',        floor: 'B1F', thumb: 'assets/images/gwanggyo_guide_thum09.jpg', image: 'assets/images/gwanggyo_guide_map09.jpg',  desc: '신비로운 "영원의 동물" 우파루파(아홀로틀)를 만나보세요. 물 속에서 생활하면서도 폐로 숨 쉬는 독특한 생태를 관찰해보세요.' },
      { key: 'gw-kidszone',  zone: 'F', name: '키즈존',          floor: 'B1F', thumb: 'assets/images/gwanggyo_guide_thum02.jpg', image: 'assets/images/gwanggyo_guide_map02.jpg',  desc: '잠수함 모양의 아쿠아 키즈 놀이터에서 아이들이 즐거운 해양 탐험을 즐길 수 있습니다.' },
      { key: 'gw-ray-b1f',   zone: 'G', name: '얼룩매가오리',    floor: 'B1F', thumb: 'assets/images/gwanggyo_guide_thum12.jpg', image: 'assets/images/gwanggyo_guide_map12.jpg',  desc: '가오리와 함께하는 이색 수중 체험! 수조 위 투명한 공간에서 가오리를 바로 아래에서 생생하게 관찰해보세요.' },
      { key: 'gw-shark',     zone: 'H', name: '샌드타이거샤크',  floor: 'B1F', thumb: 'assets/images/gwanggyo_guide_thum03.jpg', image: 'assets/images/gwanggyo_guide_map03.jpg',  desc: '상어수조 투명보트 체험! 투명 보트를 타고 상어 수조 위를 이동하며 상어를 바로 아래에서 생생하게 관찰하세요.' }
    ],
    'B2F': [
      { key: 'gw-turtle',    zone: 'I', name: '푸른바다거북',    floor: 'B2F', thumb: 'assets/images/gwanggyo_guide_thum10.jpg', image: 'assets/images/gwanggyo_guide_map10.png',  desc: '유유자적 헤엄치는 바다거북을 가까이서 만나보세요. 멸종위기종 바다거북의 생태연구도 함께 진행하고 있습니다.' },
      { key: 'gw-otter',     zone: 'I', name: '작은발톱수달',    floor: 'B2F', thumb: 'assets/images/gwanggyo_guide_thum11.jpg', image: 'assets/images/gwanggyo_guide_map11.png',  desc: '귀여운 수달의 재기발랄한 모습을 가까이서 만나보세요. 활달한 성격의 수달이 장난치며 노는 모습을 직접 관찰할 수 있습니다.' },
      { key: 'gw-piranha',   zone: 'I', name: '피라니아',        floor: 'B2F', thumb: 'assets/images/gwanggyo_guide_thum16.jpg', image: 'assets/images/gwanggyo_guide_map16.jpg',  desc: '아마존 강의 피라냐를 비롯한 열대 민물 생물들의 세계로 빠져보세요.' },
      { key: 'gw-ray-b2f',   zone: 'J', name: '얼룩매가오리',    floor: 'B2F', thumb: 'assets/images/gwanggyo_guide_thum12.jpg', image: 'assets/images/gwanggyo_guide_map12.jpg',  desc: '가오리와 함께하는 이색 수중 체험! 수조 위 투명한 공간에서 가오리를 바로 아래에서 생생하게 관찰해보세요.' }
    ]
  };

  var GWANGGYO_MARKERS = {
    'B1F': [
      { zone: 'A', left:  64, top: 118 },
      { zone: 'B', left:  39, top: 278 },
      { zone: 'C', left: 350, top: 155 },
      { zone: 'D', left: 254, top: 518 },
      { zone: 'E', left: 570, top: 204 },
      { zone: 'F', left: 578, top: 508 },
      { zone: 'G', left: 786, top: 252 },
      { zone: 'H', left: 829, top: 550 }
    ],
    'B2F': [
      { zone: 'I', left: 627, top: 243 },
      { zone: 'J', left: 650, top: 483 }
    ]
  };

  var GWANGGYO_ZONE_LABELS = {
    A: '훔볼트 펭귄',
    B: '해파리',
    C: '물총고기',
    D: '엠페러엔젤',
    E: '아쿠아 비블',
    F: '키즈존',
    G: '얼룩매가오리',
    H: '샌드타이거샤크',
    I: '마린라이프',
    J: '얼룩매가오리'
  };

  var GWANGGYO_DEFAULT_ZONE = { 'B1F': 'A', 'B2F': 'I' };

  /* 모든 층의 버블 위치·크기는 이 설정만 공유합니다.
     x: hover 맵 우측(x≈1261) 기준 ~180px 간격, 피그마 그룹 left=1444 참고
     y: 수직 중심 section-y=1011 (뷰포트 중앙) 기준 대칭 */
  /* leftOffset: 맵 우측 기준 상대값 (slot2=0, slot1/3=+120, slot0/4=+270)
     hover 맵 우측 = innerWidth/2 + 294, Figma 기준 gap = 190px */
  var BUBBLE_LAYOUT = [
    { leftOffset: 230, top: 510,  size: 108 },
    { leftOffset: 100, top: 669,  size: 130 },
    { leftOffset:   0, top: 844,  size: 155 },
    { leftOffset: 100, top: 1040, size: 130 },
    { leftOffset: 230, top: 1210, size: 108 }
  ];

  /* 뷰포트 너비 기준 맵 스케일 계산
     맵(924) + gap(80) + 버블컬럼(390) = 1394px → 최소 필요 너비 */
  function getMapScale() {
    return Math.min(1, window.innerWidth / 1394);
  }

  function updateMapScale() {
    var s = getMapScale().toFixed(4);
    if (mapSection)  mapSection.style.setProperty('--map-s', s);
    if (soloSection) soloSection.style.setProperty('--map-s', s);
  }

  function getBubbleLayout(index) {
    var s   = getMapScale();
    var rel = BUBBLE_LAYOUT[index];
    /* 버블 좌표계: .loc-exhibits__bubble-side 기준 (top-left = 0,0)
       leftOffset: 버블 컬럼 내 x, top - 470: 컬럼 상단(슬롯0 위치) 기준 y */
    return {
      left: Math.round(rel.leftOffset * s),
      top:  Math.round((rel.top - 470) * s),
      size: Math.round(rel.size * s)
    };
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
    var markerData = isIlsan     ? ILSAN_MARKERS
                   : isYeosu    ? YEOSU_MARKERS
                   : isGwanggyo ? GWANGGYO_MARKERS
                   : JEJU_MARKERS;
    var labels     = isIlsan     ? ILSAN_ZONE_LABELS
                   : isYeosu    ? YEOSU_ZONE_LABELS
                   : isGwanggyo ? GWANGGYO_ZONE_LABELS
                   : ZONE_LABELS;
    var positions  = markerData[floor] || [];

    /* Exhibits 마커: 클릭 시 해당 존 버블 표시 */
    if (markerWrap) {
      markerWrap.replaceChildren();
      positions.forEach(function (position) {
        var marker = document.createElement('button');
        marker.type = 'button';
        marker.className = 'loc-map__marker';
        marker.dataset.zone = position.zone;
        marker.style.left = position.left + 'px';
        marker.style.top = position.top + 'px';
        marker.textContent = position.zone;
        marker.setAttribute('aria-label', position.zone + '구역 ' + (labels[position.zone] || '') + ' 보기');
        marker.addEventListener('click', function () {
          renderZone(position.zone, true);
        });
        markerWrap.appendChild(marker);
      });
    }

    /* Solo 마커: 시각적 표시만 (클릭 없음) */
    if (soloMarkersEl) {
      soloMarkersEl.replaceChildren();
      positions.forEach(function (position) {
        var marker = document.createElement('div');
        marker.className = 'loc-map__marker';
        marker.dataset.zone = position.zone;
        marker.style.left = position.left + 'px';
        marker.style.top = position.top + 'px';
        marker.textContent = position.zone;
        soloMarkersEl.appendChild(marker);
      });
    }
  }

  function renderFloor(floor) {
    var exhibits = isIlsan     ? ILSAN_EXHIBITS[floor]
                 : isYeosu    ? YEOSU_EXHIBITS[floor]
                 : isGwanggyo ? GWANGGYO_EXHIBITS[floor]
                 : JEJU_EXHIBITS[floor];
    if (!exhibits || !bubbleWrap) return;

    currentFloor = floor;
    isOrbiting = false;
    currentExhibits = exhibits;
    activeZone = '';
    zoneCursor = 0;
    currentDataByKey = {};
    exhibits.forEach(function (exhibit) { currentDataByKey[exhibit.key] = exhibit; });

    renderMarkers(floor);

    var defaultZone = isIlsan     ? ILSAN_DEFAULT_ZONE[floor]
                    : isYeosu    ? YEOSU_DEFAULT_ZONE[floor]
                    : isGwanggyo ? GWANGGYO_DEFAULT_ZONE[floor]
                    : DEFAULT_ZONE[floor];
    renderZone(defaultZone, false);

    var locationName = isIlsan ? '일산' : isYeosu ? '여수' : isGwanggyo ? '광교' : '제주';
    if (mapImg) {
      mapImg.src = ACTIVE_MAPS[floor];
      mapImg.alt = '아쿠아플라넷 ' + locationName + ' 가이드 맵 ' + floor;
      mapImg.style.transform = (isGwanggyo && floor === 'B2F') ? 'rotate(180deg)' : '';
    }
    /* Solo 섹션 맵 이미지도 동기화 */
    if (soloImg) {
      soloImg.src = ACTIVE_MAPS[floor];
      soloImg.alt = '아쿠아플라넷 ' + locationName + ' 가이드 맵 ' + floor;
      soloImg.style.transform = (isGwanggyo && floor === 'B2F') ? 'rotate(180deg)' : '';
    }
    if (mapSection)  mapSection.dataset.floor  = floor;
    if (soloSection) soloSection.dataset.floor = floor;
    floorTabs.forEach(function (tab) {
      var active = tab.dataset.floor === floor;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
    });
  }

  function updateMapPin() {
    /* 모바일 전용: sticky 해제된 상태에서 is-visible 제거 */
    if (!mapSection) return;
    if (window.matchMedia('(max-width: 820px)').matches) {
      mapSection.classList.remove('is-visible');
    }
  }

  /* solo → exhibits 스크롤 전환 애니메이션
     solo 섹션 sticky가 끝나기 전 ZONE px 구간에서 crossfade + 맵 이동 */
  var soloStageEl = soloSection ? soloSection.querySelector('.loc-map__stage') : null;

  function updateSoloExhibitsTransition() {
    if (!soloSection || !mapSection || !soloWrapEl) return;
    if (window.matchMedia('(max-width: 820px)').matches) {
      soloSection.style.opacity       = '';
      soloSection.style.pointerEvents = '';
      if (soloStageEl) soloStageEl.style.transform = '';
      mapSection.style.opacity        = '0';
      mapSection.style.pointerEvents  = 'none';
      return;
    }

    var s    = getMapScale();
    var vh   = window.innerHeight;
    var ZONE = 480; /* 전환 구간 (px) */

    /* soloWrap.bottom 이 vh 에 가까워질수록 progress → 1
       solo sticky 종료 시점 = soloWrap.bottom == vh */
    var sBottom  = soloWrapEl.getBoundingClientRect().bottom;
    var progress = Math.max(0, Math.min(1, 1 - (sBottom - vh) / ZONE));

    if (progress <= 0) {
      /* 전환 전: solo 완전 표시, exhibits 숨김 */
      soloSection.style.opacity      = '';
      soloSection.style.pointerEvents = '';
      if (soloStageEl) soloStageEl.style.transform = '';
      mapSection.style.opacity       = '0';
      mapSection.style.pointerEvents = 'none';
      mapSection.classList.remove('is-visible', 'has-detail');

    } else if (progress >= 1) {
      /* 전환 완료: solo 숨김, exhibits 완전 표시 */
      soloSection.style.opacity      = '0';
      soloSection.style.pointerEvents = 'none';
      if (soloStageEl) soloStageEl.style.transform = '';
      mapSection.style.opacity       = '1';
      mapSection.style.pointerEvents = '';
      mapSection.classList.add('is-visible');

    } else {
      /* 전환 중: solo 맵이 exhibits 위치로 이동하며 페이드아웃
         exhibits는 후반부(progress > 0.5)부터 페이드인 */
      soloSection.style.opacity      = Math.max(0, 1 - progress * 1.8).toFixed(3);
      soloSection.style.pointerEvents = 'none';

      /* solo 맵: scale 0.8→0.7, 중앙→exhibits 맵 위치(-235*s) */
      if (soloStageEl) {
        var sc   = (0.56 - 0.07 * progress) * s;
        var xOff = (-235 * s * progress).toFixed(2);
        soloStageEl.style.transform =
          'translate(calc(-50% + ' + xOff + 'px), -50%) scale(' + sc.toFixed(4) + ')';
      }

      var exProg = Math.max(0, (progress - 0.5) * 2);
      mapSection.style.opacity       = exProg.toFixed(3);
      mapSection.style.pointerEvents = 'none';
      mapSection.classList.remove('is-visible', 'has-detail');
    }
  }

  var rafPending = false;
  window.addEventListener('scroll', function () {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(function () {
      rafPending = false;
      updateHeroTransition();
      updateMapPin();
      updateSoloExhibitsTransition();
    });
  }, { passive: true });

  function repositionBubbles() {
    mapBubbles.forEach(function (bubble) {
      var slotIndex = parseInt(bubble.style.getPropertyValue('--bubble-index'), 10);
      if (isNaN(slotIndex)) return;
      var layout = getBubbleLayout(slotIndex);
      bubble.style.left  = layout.left + 'px';
      bubble.style.top   = layout.top  + 'px';
      bubble.style.width = layout.size + 'px';
    });
  }

  var bubbleResizeTimer;
  window.addEventListener('resize', function () {
    if (window.matchMedia('(max-width: 820px)').matches) return;
    clearTimeout(bubbleResizeTimer);
    bubbleResizeTimer = setTimeout(function () {
      updateMapScale();
      repositionBubbles();
      updateSoloExhibitsTransition();
    }, 150);
  }, { passive: true });

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

        mapSection.classList.add('has-detail');
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
        if (floor === currentFloor || (!isIlsan && !isYeosu && !isGwanggyo && !JEJU_EXHIBITS[floor])) return;
        renderFloor(floor);
      });
    });

    updateMapScale();
    renderFloor(currentFloor);
    updateHeroTransition();
    updateMapPin();
    updateSoloExhibitsTransition();
  }

}());


/* ─────────────────────────────────────────────────────────────
   모바일 햄버거 메뉴 토글
   (location.html은 main.js를 로드하지 않으므로 여기서 처리)
   ───────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var hamburger  = document.querySelector('.gnb__hamburger');
  var mobileMenu = document.querySelector('.gnb__mobile-menu');
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

  hamburger.addEventListener('click', function () {
    if (mobileMenu.classList.contains('is-open')) closeMenu();
    else openMenu();
  });

  /* 서브메뉴 아코디언 */
  mobileMenu.querySelectorAll('.gnb__mobile-link--toggle').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var item   = btn.closest('.gnb__mobile-item');
      var isOpen = item.classList.contains('is-open');
      /* 다른 열린 항목 닫기 */
      mobileMenu.querySelectorAll('.gnb__mobile-item.is-open').forEach(function (el) {
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
  mobileMenu.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', closeMenu);
  });

  /* ESC 키로 닫기 */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && mobileMenu.classList.contains('is-open')) closeMenu();
  });

  /* 820px 초과로 리사이즈되면 강제 닫기 */
  window.addEventListener('resize', function () {
    if (window.innerWidth > 820 && mobileMenu.classList.contains('is-open')) closeMenu();
  });

}());
