// Shared GNB scroll behavior — used by all sub-pages
document.addEventListener('DOMContentLoaded', function () {
  const gnb = document.querySelector('.gnb');
  if (!gnb) return;

  document.body.classList.add('is-logo-at-header');

  let lastScrollY = window.scrollY;

  function updateGnb() {
    const y   = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const scrolled = max > 0 ? y / max >= 0.1 : false;

    gnb.classList.toggle('gnb--scrolled', scrolled);

    if (scrolled && y > lastScrollY) {
      gnb.classList.add('gnb--hidden');
    } else {
      gnb.classList.remove('gnb--hidden');
    }
    lastScrollY = y;
  }

  window.addEventListener('scroll', updateGnb);
  window.addEventListener('resize', updateGnb);
  updateGnb();
});
