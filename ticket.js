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

function selectSpot(selected) {
  ticketSection.classList.add('is-selected');

  let slot = 0;
  spots.forEach((spot) => {
    spot.classList.remove('is-selected', 'is-top', 'slot-0', 'slot-1', 'slot-2');
    if (spot === selected) {
      spot.classList.add('is-selected');
    } else {
      spot.classList.add('is-top', 'slot-' + slot);
      slot += 1;
    }
  });

  const price = selected.getAttribute('data-price');
  if (price && priceTarget) priceTarget.textContent = price;
}

spots.forEach((spot) => {
  spot.addEventListener('click', (e) => {
    e.preventDefault();
    selectSpot(spot);
  });
});
