import { initLightRays } from './lightrays.js';

const container = document.getElementById('light-rays');

initLightRays(container, {
  raysOrigin: 'top-center',
  raysColor: '#ffffff',
  raysSpeed: 1.5,
  lightSpread: 0.7,
  rayLength: 1.2,
  followMouse: true,
  mouseInfluence: 0,
  noiseAmount: 0.1,
  distortion: 0.05,
  fadeDistance: 0.9,
  saturation: 1.2
});

// ============================================================
//  지점 선택 인터랙션
//  · 지점(버블) 클릭 → 버블이 터지며 아래로, 나머지는 위로 올라가며 축소
//  · 우측 가격 / 할인 패널 등장
// ============================================================
const ticketSection = document.querySelector('.ticket');
const spots = Array.from(document.querySelectorAll('.ticket-spot'));
const priceTarget = document.querySelector('[data-price-target]');

// 상단 축소 행은 항상 이 순서로 고정 배치된다.
const BRANCH_ORDER = ['ilsan', 'yeosu', 'jeju', 'gwanggyo'];
// 각 슬롯의 left(.wrap 기준 %) — CSS 의 .slot-0~3 값과 반드시 일치시킬 것
const SLOT_LEFT = [-4, 20, 44, 68];

// 지점별 입장권 구매 페이지 URL (예매하기 버튼 클릭 시 이동)
const BRANCH_URLS = {
  ilsan: 'https://mall.aquaplanet.co.kr/product/view.do?seq=2700',
  yeosu: 'https://mall.aquaplanet.co.kr/product/view.do?seq=2940',
  jeju: 'https://mall.aquaplanet.co.kr/product/view.do?seq=3120',
  gwanggyo: 'https://mall.aquaplanet.co.kr/product/view.do?seq=1472',
};
// 현재 선택된 지점 (예매하기 버튼이 참조)
let selectedBranch = null;

// 안 터지고 살아남는 거품(큰 7개 중 가장 작은 것) — 빈 슬롯을 채운다.
let survivorBubble = null;

function branchIndexOf(spot) {
  return BRANCH_ORDER.findIndex((b) => spot.classList.contains('ticket-spot--' + b));
}

// 살아남은 거품을 '비어 있는 슬롯'(선택된 지점이 빠진 자리)으로 이동시킨다.
function placeSurvivor(emptySlotIdx) {
  if (!survivorBubble) return;
  const wrap = document.querySelector('.wrap');
  if (!wrap) return;

  const wrapRect = wrap.getBoundingClientRect();
  const sectionRect = ticketSection.getBoundingClientRect();
  const spotW = spots[0] ? spots[0].offsetWidth : 0;

  // 빈 슬롯에 있던 spot 의 화면상 중심 x (spot 박스는 가운데 기준 scale 되므로 중심 = left + 폭/2)
  const centerX = wrapRect.left + (SLOT_LEFT[emptySlotIdx] / 100) * wrapRect.width + spotW / 2;
  const bubbleW = survivorBubble.offsetWidth;
  const leftPct = ((centerX - sectionRect.left) - bubbleW / 2) / sectionRect.width * 100;
  survivorBubble.style.left = leftPct.toFixed(2) + '%';

  // 상단(축소 spot 높이)으로 떠오르게
  const y = parseFloat(getComputedStyle(survivorBubble).getPropertyValue('--y')) || 50;
  survivorBubble.style.setProperty('--rise', (9 - y).toFixed(1) + 'vh');
}

// 선택 시 '중앙 상단의 빛'(light-rays origin: top-center)에서 작은 버블(15~25px)이
// 생겨나, 빛이 퍼지듯 아래로 부채꼴(±70°)로 퍼지며 사라지는 파티클
function spawnBubbleSparks() {
  if (!ticketSection) return;
  const secRect = ticketSection.getBoundingClientRect();
  const ox = secRect.width / 2;          // 가로 중앙
  const oy = secRect.height * 0.05;      // 상단(빛이 시작되는 지점)

  const COUNT = 32;
  for (let i = 0; i < COUNT; i++) {
    const el = document.createElement('span');
    el.className = 'bubble-spark';
    const size = 8 + Math.random() * 28;             // 8~36px (크기 제각각)
    el.style.width = el.style.height = size.toFixed(1) + 'px';
    el.style.left = (ox - size / 2).toFixed(1) + 'px';
    el.style.top  = (oy - size / 2).toFixed(1) + 'px';
    ticketSection.appendChild(el);

    // 방향 분기:
    //  · 가운데 3개 → 아래(생물 쪽)로 내려가되 '짧게'만 가서 생물 근처 도달 전에 사라짐
    //  · 나머지     → 좌·우 양쪽으로 넓게 퍼짐(중앙 생물 쪽은 비움)
    let dx, dy;
    if (i < 3) {
      // 가운데로 내려오되 부채꼴(수직 ±45°)로 '퍼지며' 내려옴. 거리는 짧게 → 생물 전에 사라짐
      const ang = (Math.random() - 0.5) * (Math.PI * 0.5); // 수직 기준 ±45°
      const d = 140 + Math.random() * 130;
      dx = Math.sin(ang) * d;                        // 좌우로 퍼짐
      dy = Math.cos(ang) * d;                        // 아래로 내려옴
    } else {
      const side = (i % 2 === 0) ? 1 : -1;           // 좌/우 번갈아
      const phi = (Math.random() * 48) * Math.PI / 180; // 수평에서 아래로 0~48°
      const dist = 180 + Math.random() * 520;        // 좌우로 멀리
      dx = side * Math.cos(phi) * dist;
      dy = Math.sin(phi) * dist;
    }
    const dur = 900 + Math.random() * 900;           // 0.9~1.8s

    const anim = el.animate(
      [
        { transform: 'translate(0,0) scale(0.2)', opacity: 1, offset: 0 },
        { opacity: 1, offset: 0.5 },                                          // 50%까지 또렷하게 유지
        { transform: `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) scale(1)`, opacity: 0, offset: 1 },
      ],
      { duration: dur, easing: 'cubic-bezier(.22,.61,.36,1)', delay: Math.random() * 200 }
    );
    anim.onfinish = () => el.remove();
  }
}

function selectSpot(selected) {
  const emptySlotIdx = branchIndexOf(selected);
  selectedBranch = BRANCH_ORDER[emptySlotIdx];   // 예매하기 버튼이 참조할 선택 지점

  spawnBubbleSparks();   // 선택 순간 중앙 상단 빛에서 작은 버블이 퍼지는 파티클

  spots.forEach((spot) => {
    spot.classList.remove('is-selected', 'is-top', 'slot-0', 'slot-1', 'slot-2', 'slot-3');
    if (spot === selected) {
      spot.classList.add('is-selected');
    } else {
      // 각 지점은 자기 고정 슬롯(일산0·여수1·제주2·광교3)에 배치
      spot.classList.add('is-top', 'slot-' + branchIndexOf(spot));
    }
  });

  placeSurvivor(emptySlotIdx);
  renderDiscounts(BRANCH_ORDER[emptySlotIdx]);   // 지점별 할인 내용 채우기
  ticketSection.classList.add('is-selected');

  // 거품 터지며 아래로 내려오는 순간 — 스크롤 내려가는 효과
  const stage = document.querySelector('.ticket-stage');
  if (stage) {
    stage.classList.remove('scroll-reveal');
    void stage.offsetWidth;          // reflow → 애니메이션 리셋
    stage.classList.add('scroll-reveal');
  }

  const price = selected.getAttribute('data-price');
  if (price && priceTarget) priceTarget.textContent = price;
}


spots.forEach((spot) => {
  spot.addEventListener('click', (e) => {
    e.preventDefault();
    selectSpot(spot);
  });
});

// 예매하기 버튼 → 선택된 지점의 구매 페이지로 이동
const bookingBtn = document.querySelector('.ticket-booking__btn');
if (bookingBtn) {
  bookingBtn.addEventListener('click', () => {
    const url = selectedBranch ? BRANCH_URLS[selectedBranch] : '';
    if (url) window.location.href = url;
  });
}

// 장식 거품 연출 예약 (CSS 의 .ticket.is-selected 상태에서 재생)
//  · 큰 거품 6개   → 큰 순서대로 '펑' 터져 사라짐 (is-bursting)
//  · 큰 것 중 가장 작은 1개 → 안 터지고 빈 슬롯을 채움 (is-survivor)
//  · 작은 거품들   → 위로 떠올라 상단에서 둥둥 (is-floating)
(function prepareBubbleFx() {
  const bubbles = Array.from(document.querySelectorAll('.deco-bubble'));
  const sized = bubbles
    .map((el) => ({
      el,
      size: parseFloat(getComputedStyle(el).getPropertyValue('--s')) || 0,
      y: parseFloat(getComputedStyle(el).getPropertyValue('--y')) || 50,
    }))
    .sort((a, b) => b.size - a.size);

  // 살아남을(안 터지는) 거품: 지름이 SURVIVOR_SIZE 인 것. 없으면 큰 것 중 가장 작은 것.
  const SURVIVOR_SIZE = 120;
  let survivorIdx = sized.findIndex((b) => b.size === SURVIVOR_SIZE);
  if (survivorIdx === -1) survivorIdx = 6;

  let burstOrder = 0;
  sized.forEach((item, i) => {
    const { el, y } = item;

    if (i === survivorIdx) {
      // 살아남아 빈 슬롯을 채움
      survivorBubble = el;
      el.classList.add('is-floating', 'is-survivor');
      el.style.setProperty('--drift-dur', '6s');
    } else if (i < 7) {
      // 그 외 큰 거품: 큰 것부터 0.13초 간격으로 순차 터짐
      el.classList.add('is-bursting');
      el.style.animationDelay = (burstOrder * 0.13).toFixed(2) + 's';
      burstOrder += 1;
    } else {
      // 작은 거품: 위로 떠올라 그 자리에서 둥둥
      el.classList.add('is-floating');
      // 최종 세로 위치(top, vh): 인라인 --ty 가 있으면 그 값으로 '고정',
      // 없으면 기존처럼 상단 6~22% 랜덤. (가로 위치는 인라인 --x 로 이미 고정)
      const ty = parseFloat(getComputedStyle(el).getPropertyValue('--ty'));
      const targetY = Number.isFinite(ty) ? ty : (6 + Math.random() * 16);
      el.style.setProperty('--rise', (targetY - y).toFixed(1) + 'vh');
      // 흔들림 주기: 인라인 --drift-dur 가 있으면 그대로, 없으면 5~8s 랜덤
      const dd = getComputedStyle(el).getPropertyValue('--drift-dur').trim();
      if (!dd) el.style.setProperty('--drift-dur', (5 + Math.random() * 3).toFixed(1) + 's');
    }
  });
})();

// ============================================================
//  할인 아코디언 (지점별 내용)
//  · 선택한 지점에 따라 내용을 채움 (없는 지점은 default)
//  · 한 번에 하나만 열림 / 펼침 목록은 absolute 라 아래 항목을 덮음
//  · 행 클릭 시 위 라벨이 선택 항목명으로 바뀌고 닫힘
// ============================================================
const discountList = document.querySelector('.ticket-discount-list');

const DISCOUNTS = {
  // 기본(데이터 없는 지점용)
  default: [
    { label: '입장권', rows: [['성인', '99,000원'], ['청소년', '79,000원'], ['어린이', '69,000원']] },
    { label: '제휴·멤버십 할인', rows: [['통신사 멤버십', '본인 30%'], ['제휴 카드', '본인 20%'], ['멤버십 회원', '본인 15%']] },
    { label: '우대할인', rows: [['경로(만 65세 이상)', '30%'], ['장애인', '50%'], ['국가유공자', '50%']] },
    { label: '프로모션', rows: [['지역민할인', '본인포함4인 40%'], ['학생 할인', '본인포함4인 35%']] },
  ],

  // 제주
  jeju: [
    {
      label: '문화누리카드 온라인 구매 할인',
      rows: [
        ['입장권', '31,900원'],
        ['입장권 + 음료', '33,100원'],
        ['입장권 + 키체인', '37,600원'],
        ['입장권 + 메탈 마그넷', '37,100원'],
        ['입장권 + 가오리인형', '38,600원'],
      ],
    },
    {
      label: '제휴·멤버십 할인',
      rows: [
        ['신한카드 프로모션', '본인포함4인 20%'],
        ['H-LIVE Club', '포인트 100%'],
        ['삼성카드 포인트', '포인트 100%'],
        ['현대카드 M포인트', '포인트 30%'],
        ['LG U+ · KT · SKT 멤버십', '본인포함4인 15%'],
        ['플라자호텔 멤버십', '본인포함4인 20%'],
        ['해피포인트 멤버십', '본인포함4인 15%'],
        ['대한항공 스카이패스', '본인포함4인 20%'],
        ['제주항공·에어부산', '본인포함4인 20%'],
        ['갤러리아 카드(플래티늄·시그니처)', '본인포함4인 20%'],
      ],
    },
    {
      label: '국가기관·관공서',
      rows: [
        ['경찰 우대할인', '본인포함4인 20%'],
        ['해양경찰 우대할인', '본인포함4인 20%'],
        ['한국철도공사 임직원', '본인포함4인 20%'],
      ],
    },
    {
      label: '우대할인',
      rows: [
        ['제주도민할인', '본인 30%'],
        ['복지우대할인', '본인 30%'],
        ['문화누리카드', '30%'],
        ['국가유공자 할인', '본인 20%'],
        ['3대 가족할인', '3대 가족 20%'],
        ['4대 가족할인', '4대 가족 20%'],
        ['3자녀이상 가족 할인', '3자녀 이상 가족 20%'],
        ['임산부 및 동반인 할인', '임산부 포함 2인 20%'],
        ['탐나는 제주페스', '본인포함4인 20%'],
        ['소방가족', '본인포함4인 20%'],
      ],
    },
  ],

  // 일산
  ilsan: [
    {
      label: '연간이용권',
      rows: [
        ['연간 이용권', '130,000원'],
        ['평일 오후 연간 이용권', '110,000원'],
        ['아쿠아 연간다인권(2인)', '220,000원'],
        ['아쿠아 연간다인권(3인)', '300,000원'],
        ['아쿠아 연간다인권(4인)', '390,000원'],
      ],
    },
    {
      label: '제휴·멤버십 할인',
      rows: [
        ['신한카드 프로모션', '본인포함4인 30%'],
        ['LG U+ · KT · SKT 멤버십', '본인포함4인 20%'],
        ['신한카드 포인트', '포인트 100%'],
        ['비씨카드 포인트', '포인트 100%'],
        ['롯데 L.POINT', '본인포함4인 30%'],
        ['현대카드 M포인트', '포인트 50%'],
        ['삼성카드 포인트', '포인트 100%'],
        ['해피포인트 멤버십', '본인포함4인 20%'],
        ['H-LIVE Club', '포인트 100%'],
        ['CJ ONE멤버십', '1000p 이상 사용시 30%'],
        ['맘맘 멤버십', '본인포함4인 20%'],
        ['갤러리아 카드(플래티늄·시그니처)', '본인포함4인 20%'],
      ],
    },
    {
      label: '우대할인',
      rows: [
        ['다자녀 고양e카드', '본인포함4인 30%'],
        ['문화누리카드', '본인포함4인 40%'],
        ['복지할인', '본인포함2인 20%'],
        ['한화복지카드 할인', '본인포함4인 20%'],
        ['문화가 있는 날 할인', '본인포함4인 40%'],
        ['소인/경로할인', '10%'],
        ['소방가족', '본인포함4인 20%'],
      ],
    },
    {
      label: '프로모션',
      rows: [
        ['지역민할인', '고양·파주40% | 인천·김포·부천30%'],
        ['세계헌혈자의 날 프로모션', '본인포함4인 40%'],
        ['현충일 호국보훈 프로모션', '본인포함4인 40%'],
        ['학생 할인', '본인포함4인 35%'],
      ],
    },
  ],

  // 여수
  yeosu: [
    {
      label: '문화바우처',
      rows: [
        ['문화누리카드', '본인포함4인 26,000원'],
        ['희망 / 행복 / 교육급여 바우처', '본인포함4인 26,000원'],
        ['전남청년문화지키카드', '본인포함4인 26,000원'],
        ['전남꿈실현공생카드', '본인포함4인 26,000원'],
      ],
    },
    {
      label: '제휴·멤버십 할인',
      rows: [
        ['신한카드 프로모션', '본인포함4인 20%'],
        ['비씨카드 TOP포인트', '포인트 100%'],
        ['LG U+ · KT · SKT 멤버십', '본인포함4인 15%'],
        ['해피포인트 멤버십', '본인포함4인 10%'],
        ['하나카드 하나머니', '포인트 100%'],
        ['현대카드 M포인트', '포인트 20%'],
        ['H-LIVE Club', '포인트 100%'],
        ['플라자호텔 멤버십', '본인포함5인 20%'],
        ['갤러리아 카드(플래티늄·시그니처)', '본인포함4인 20%'],
      ],
    },
    {
      label: '국가기관·관공서',
      rows: [
        ['경찰 공무원', '본인포함4인 20%'],
        ['선생님(교사)', '본인 50% 동반 30%'],
        ['소방가족', '본인포함4인 20%'],
        ['전남소방본부', '본인포함4인 20%'],
        ['군인우대할인', '본인포함4인 20%'],
        ['한국철도공사 임직원', '본인포함4인 20%'],
        ['현대자동차지부 전주공장', '본인 30% 동반 20%'],
        ['전라남도청 공무원 노조', '본인포함4인 20%'],
      ],
    },
    {
      label: '우대할인',
      rows: [
        ['연간이용권 소지자', '본인 50% 동반 3인 30%'],
        ['한화임직원', '본인포함5인 30%'],
        ['복지할인', '본인포함2인 20%'],
        ['국가유공자', '본인 30%'],
        ['지역민(여수·순천·광양)', '본인 25%'],
      ],
    },
  ],

  // 광교
  gwanggyo: [
    {
      label: '연간이용권',
      rows: [
        ['시니어 연간이용권', '66,000원'],
        ['갱신 연간이용권', '110,000원'],
        ['신규 연간이용권', '38,600원'],
      ],
    },
    {
      label: '제휴·멤버십 할인',
      rows: [
        ['신한카드 프로모션', '본인포함4인 20%'],
        ['LG U+ · KT · SKT 멤버십', '본인포함4인 20%'],
        ['해피포인트 멤버십', '본인포함4인 20%'],
        ['CJ ONE 멤버십', '1,000p이상 사용시 30%'],
        ['갤러리아 카드(플래티늄·시그니처)', '본인포함4인 20%'],
        ['맘맘 멤버십', '본인포함4인 20%'],
        ['경기아이플러스 카드', '본인포함4인 30%'],
        ['플라자호텔 멤버십', '본인포함5인 15%'],
      ],
    },
    {
      label: '우대할인',
      rows: [
        ['한국철도공사 임직원', '20%'],
        ['복지할인', '본인포함2인 30%'],
        ['문화누리카드', '본인포함4인 40%'],
        ['한화복지카드', '본인포함4인 20%'],
        ['소방가족', '본인포함4인 20%'],
      ],
    },
    {
      label: '프로모션',
      rows: [
        ['지역민할인', '본인포함4인 40%'],
        ['세계헌혈자의 날', '본인 50% 동반 30%'],
        ['현충일 호국보훈', '30%'],
        ['학생할인', '본인포함4인 20%'],
        ['한화 임직원 할인', '본인포함5인 50%'],
      ],
    },
  ],
};

function renderDiscounts(branch) {
  if (!discountList) return;
  const data = DISCOUNTS[branch] || DISCOUNTS.default;

  discountList.innerHTML = data
    .map(
      (cat) => `
      <details class="ticket-discount">
        <summary><span class="ticket-discount__label">${cat.label}</span></summary>
        <div class="ticket-discount__body">
          <div class="ticket-discount__row is-active">
            <span class="ticket-discount__name">선택없음</span>
            <span class="ticket-discount__val"></span>
          </div>
          ${cat.rows
            .map(
              (r) => `
            <div class="ticket-discount__row">
              <span class="ticket-discount__name">${r[0]}</span>
              <span class="ticket-discount__val">${r[1]}</span>
            </div>`
            )
            .join('')}
        </div>
      </details>`
    )
    .join('');

  bindDiscountAccordion();
}

function bindDiscountAccordion() {
  const discounts = Array.from(discountList.querySelectorAll('.ticket-discount'));

  discounts.forEach((det) => {
    // 아코디언: 열릴 때 나머지는 닫는다
    det.addEventListener('toggle', () => {
      if (det.open) {
        discounts.forEach((other) => {
          if (other !== det) other.open = false;
        });
      }
    });

    const label = det.querySelector('.ticket-discount__label');
    const rows = Array.from(det.querySelectorAll('.ticket-discount__row'));

    rows.forEach((row) => {
      row.addEventListener('click', () => {
        const name = row.querySelector('.ticket-discount__name');
        if (label && name) label.textContent = name.textContent;

        rows.forEach((r) => r.classList.remove('is-active'));
        row.classList.add('is-active');

        det.open = false; // 선택 후 닫기
      });
    });
  });
}

// 선택 전에도 패널이 비지 않도록 기본 내용으로 초기 렌더
renderDiscounts('default');

// ============================================================
//  커스텀 커서 + 수면 물결 효과 (index.html / main.js 와 동일)
//  · style.css 의 `html,body,* { cursor:none }` 때문에 기본 커서가 숨겨지므로
//    이 페이지에도 동일한 대체 커서를 띄운다.
// ============================================================
function initCustomCursor() {
  const el = document.getElementById('custom-cursor');
  if (!el) return;

  const HALF = 17;
  let tx = -200, ty = -200;
  let cx = tx, cy = ty;
  let snapped = false;

  // 즉시 보이게 (마우스 이동 전엔 화면 밖 위치에 있으므로 안 보임)
  el.style.opacity = '1';

  // 밝은(흰) 영역 위에서는 파란 링으로 전환 (location 페이지와 동일)
  const LIGHT_SELS = '.ticket-booking, .ticket-discount, .ticket-scroll-below';

  window.addEventListener('mousemove', e => {
    tx = e.clientX;
    ty = e.clientY;
    if (!snapped) {
      snapped = true;
      cx = tx; cy = ty;
    }
    const hit = document.elementFromPoint(e.clientX, e.clientY);
    el.classList.toggle('is-over-light', !!(hit && hit.closest(LIGHT_SELS)));
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

initCustomCursor();
// initCursorWave();   // location 커서와 동일하게 — 수면 물결 효과 비활성화 (복원하려면 주석 해제)
