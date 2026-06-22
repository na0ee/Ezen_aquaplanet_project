// Shared GNB scroll behavior — mirrors program/script.js GNB section
// Used by all sub-pages (business, location, marinlab, ticket, Oceanfriends)
document.addEventListener('DOMContentLoaded', function () {
  const gnb = document.querySelector('.gnb');
  if (!gnb) return;

  const ticketIcon = gnb.querySelector('.btn--ticket .btn__icon img');
  const logoImg    = gnb.querySelector('.gnb__logo-center img');

  const ticketIconWhite = 'assets/images/ticket_icon_white.svg';
  const ticketIconBlue  = 'assets/images/ticket_icon_blue.svg';
  const logoWhite = 'assets/images/headerLogo.png';
  const logoBlue  = 'assets/images/headerLogo_blue.png';

  let lastScrollY = window.scrollY;

  function updateGnb() {
    const y   = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const scrolled = max > 0 ? y / max >= 0.1 : false;

    gnb.classList.toggle('gnb--scrolled', scrolled);
    if (ticketIcon) ticketIcon.src = scrolled ? ticketIconBlue : ticketIconWhite;
    if (logoImg)    logoImg.src    = scrolled ? logoBlue       : logoWhite;

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
