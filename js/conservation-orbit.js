/* Conservation orbit interaction restored from the Codex build. */
;(function () {
  'use strict';

  var SPECIES = ['whale', 'pinniped', 'otter', 'penguin', 'turtle', 'seahorse', 'shark'];

  var FLOWER = {
    whale:    { size: 168 },
    pinniped: { size: 160 },
    otter:    { size: 116 },
    penguin:  { size: 120 },
    turtle:   { size: 116 },
    seahorse: { size: 120 },
    shark:    { size: 108 }
  };

  var SLOT_CENTER = { x: -68, y: 6, size: 560 };
  var CAROUSEL_ORBIT = { x: 560, y: 6, rx: 628, ry: 410, step: 1.08 };

  var CIRCLE_BASE = 160;
  var N = SPECIES.length;
  var active = false;
  var rafId = null;
  var orbEls = [];
  var bound = false;
  var currentProgress = 0;
  var targetProgress = 0;
  var currentCarouselPosition = 0;
  var targetCarouselPosition = 0;
  var pinOriginalParent = null;
  var pinOriginalNextSibling = null;

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeInOut(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
  function getScale() {
    var parsed = Number(getComputedStyle(document.documentElement).getPropertyValue('--marin-scale'));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : window.innerWidth / 1920;
  }

  function getOrbitFactor() {
    if (window.innerWidth <= 760) return 0.42;
    return window.innerWidth <= 1280 ? 0.78 : 1;
  }

  function getSizeFactor() {
    if (window.innerWidth <= 760) return 0.58;
    return window.innerWidth <= 1280 ? 0.84 : 1;
  }

  function attachFixedPin(pin) {
    if (!pin) return;
    if (!pinOriginalParent) {
      pinOriginalParent = pin.parentNode;
      pinOriginalNextSibling = pin.nextSibling;
    }
    if (pin.parentNode !== document.body) {
      document.body.appendChild(pin);
    }
    pin.classList.add('is-fixed');
  }

  function restorePin(pin) {
    if (!pin) return;
    pin.classList.remove('is-fixed');
    pin.style.visibility = '';
    pin.style.pointerEvents = '';
    pin.style.transform = '';
    pin.style.opacity = '';
    if (pinOriginalParent && pin.parentNode !== pinOriginalParent) {
      pinOriginalParent.insertBefore(pin, pinOriginalNextSibling);
    }
  }

  function collectOrbs() {
    orbEls = SPECIES.map(function (category) {
      var el = document.querySelector('.m-cons-orb[data-category="' + category + '"]');
      if (!el) return null;
      return { category: category, el: el, circle: el.querySelector('.m-cons-orb__circle') };
    }).filter(Boolean);
  }

  function wrapDistance(value, period) {
    var half = period / 2;
    return ((value + half) % period + period) % period - half;
  }

  function slotPose(s) {
    var absS = Math.abs(s);
    var orbitFactor = getOrbitFactor();
    var sizeFactor = getSizeFactor();
    if (absS > 1.72) {
      return { x: SLOT_CENTER.x, y: SLOT_CENTER.y, size: 0, opacity: 0, centerWeight: 0 };
    }

    var angle = Math.PI + s * CAROUSEL_ORBIT.step;
    var centerWeight = Math.max(0, Math.cos(Math.min(absS, 1) * Math.PI / 2));
    var edgeWeight = Math.max(0, 1 - Math.abs(absS - 1) / 0.62);
    var farFade = clamp01((1.72 - absS) / 0.34);

    return {
      x: CAROUSEL_ORBIT.x * orbitFactor + Math.cos(angle) * CAROUSEL_ORBIT.rx * orbitFactor,
      y: CAROUSEL_ORBIT.y * orbitFactor + Math.sin(angle) * CAROUSEL_ORBIT.ry * orbitFactor,
      size: (210 + centerWeight * 350 + edgeWeight * 90) * sizeFactor,
      opacity: Math.max(centerWeight, edgeWeight * 0.42) * farFade,
      centerWeight: centerWeight
    };
  }

  function introPose(index, progress) {
    var angle = ((Math.PI * 2) / N) * index - Math.PI / 2 + progress * Math.PI * 7.2;
    var orbitFactor = getOrbitFactor();
    var rx = 430 * orbitFactor;
    var ry = 300 * orbitFactor;
    var tilt = 28 * Math.PI / 180;

    return {
      x: Math.cos(angle) * rx * Math.cos(tilt) - Math.sin(angle) * ry * Math.sin(tilt),
      y: Math.cos(angle) * rx * Math.sin(tilt) + Math.sin(angle) * ry * Math.cos(tilt)
    };
  }

  function render(progress) {
    var stage1 = document.getElementById('cons-orbit-stage-1');
    var stage2 = document.getElementById('cons-orbit-stage-2');
    var hint = document.getElementById('cons-orbit-hint');

    var textOut = easeInOut(clamp01((progress - 0.08) / 0.04));
    if (stage1) {
      stage1.classList.toggle('is-visible', progress < 0.08 && textOut < 0.98);
      stage1.style.transform = 'translate3d(-50%, -50%, 0)';
    }
    if (stage2) {
      stage2.classList.toggle('is-visible', progress >= 0.10 && progress < 0.30);
      stage2.style.transform = 'translate3d(-50%, -50%, 0)';
    }
    if (hint) hint.classList.remove('is-visible');

    var toCarousel = easeInOut(clamp01((progress - 0.32) / 0.12));
    var featuredOrb = null;
    var featuredScore = -1;

    orbEls.forEach(function (orb, index) {
      var intro = introPose(index, progress);
      var slot = slotPose(wrapDistance(index - currentCarouselPosition, N));
      var baseSize = (FLOWER[orb.category] && FLOWER[orb.category].size) || 120;

      var x = lerp(intro.x, slot.x, toCarousel);
      var y = lerp(intro.y, slot.y, toCarousel);
      var size = lerp(baseSize, slot.size, toCarousel);
      var opacity = lerp(1, slot.opacity, toCarousel);
      var centerScore = toCarousel > 0.92 ? slot.centerWeight : 0;

      if (centerScore > featuredScore) {
        featuredScore = centerScore;
        featuredOrb = orb;
      }

      orb.el.style.transform = 'translate3d(-50%, -50%, 0) translate3d(' + x.toFixed(2) + 'px,' + y.toFixed(2) + 'px, 0)';
      if (orb.circle) orb.circle.style.transform = 'scale(' + Math.max(0, size / CIRCLE_BASE).toFixed(3) + ')';
      orb.el.style.opacity = String(opacity);
      orb.el.style.zIndex = String(Math.round(size));
      orb.el.style.pointerEvents = 'none';
      orb.el.classList.remove('is-featured');
    });

    if (featuredOrb && featuredScore > 0.35) {
      featuredOrb.el.style.opacity = '1';
      featuredOrb.el.style.pointerEvents = 'auto';
      featuredOrb.el.classList.add('is-featured');
    }
  }

  function update() {
    rafId = null;
    if (!active) return;

    var section = document.getElementById('cons-orbit');
    var pin = document.getElementById('cons-orbit-pin');
    if (!section || !pin) return;

    var scale = getScale();

    var vh = window.innerHeight;
    var rect = section.getBoundingClientRect();
    var travel = Math.max(1, rect.height - vh);
    var shiftScreen = Math.min(Math.max(-rect.top, 0), travel);
    targetProgress = clamp01(shiftScreen / travel);
    currentProgress += (targetProgress - currentProgress) * 0.075;
    if (Math.abs(targetProgress - currentProgress) < 0.0008) {
      currentProgress = targetProgress;
    }

    var carouselProgress = clamp01((currentProgress - 0.44) / 0.56);
    var targetStep = carouselProgress * N * 2;
    var positionDelta = targetStep - currentCarouselPosition;

    targetCarouselPosition = targetStep;
    currentCarouselPosition += positionDelta * 0.045;
    if (Math.abs(targetCarouselPosition - currentCarouselPosition) < 0.0008) {
      currentCarouselPosition = targetCarouselPosition;
    }

    var isPinned = rect.top <= 0 && rect.bottom >= 0;
    var enterOpacity = isPinned ? easeInOut(clamp01(-rect.top / (vh * 0.55))) : 0;
    pin.style.transform = 'translateX(-50%) scale(' + scale.toFixed(6) + ')';
    pin.style.opacity = String(enterOpacity);
    pin.style.visibility = isPinned ? 'visible' : 'hidden';
    pin.style.pointerEvents = isPinned ? 'auto' : 'none';
    render(currentProgress);

    if (
      isPinned ||
      Math.abs(targetCarouselPosition - currentCarouselPosition) > 0.0008 ||
      Math.abs(targetProgress - currentProgress) > 0.0008
    ) {
      requestUpdate();
    }
  }

  function requestUpdate() {
    if (rafId || !active) return;
    rafId = window.requestAnimationFrame(update);
  }

  function openCard(category) {
    var overlay = document.getElementById('cons-card-overlay');
    if (!overlay || !category) return;
    Array.prototype.forEach.call(overlay.querySelectorAll('.m-cons-card, .m-cons-card-group'), function (card) {
      card.classList.toggle('is-active', card.getAttribute('data-card') === category);
    });
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
  }

  function closeCard() {
    var overlay = document.getElementById('cons-card-overlay');
    if (!overlay) return;
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    Array.prototype.forEach.call(overlay.querySelectorAll('.m-cons-flip.is-flipped'), function (flip) {
      flip.classList.remove('is-flipped');
    });
  }

  function bindOnce() {
    if (bound) return;
    bound = true;

    document.addEventListener('click', function (event) {
      var trigger = event.target.closest ? event.target.closest('.hero__scroll[href="#cons-orbit"]') : null;
      if (!trigger) return;

      var section = document.getElementById('cons-orbit');
      if (!section) return;

      event.preventDefault();
      window.scrollTo({
        top: section.getBoundingClientRect().top + window.pageYOffset + window.innerHeight * 0.55,
        behavior: 'smooth'
      });
      requestUpdate();
    });

    document.addEventListener('click', function (event) {
      var orb = event.target.closest ? event.target.closest('.m-cons-orb') : null;
      if (orb) {
        if (!orb.classList.contains('is-featured')) return;
        openCard(orb.getAttribute('data-category'));
        return;
      }

      var flip = event.target.closest ? event.target.closest('.m-cons-flip') : null;
      if (flip) {
        Array.prototype.forEach.call(flip.parentNode.querySelectorAll('.m-cons-flip.is-flipped'), function (other) {
          if (other !== flip) other.classList.remove('is-flipped');
        });
        flip.classList.toggle('is-flipped');
        return;
      }

      var overlay = document.getElementById('cons-card-overlay');
      if (overlay && event.target === overlay) closeCard();
    });

    var closeBtn = document.getElementById('cons-card-overlay-close');
    if (closeBtn) closeBtn.addEventListener('click', closeCard);

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeCard();
    });
  }

  function initConservationOrbit() {
    var section = document.getElementById('cons-orbit');
    var pin = document.getElementById('cons-orbit-pin');
    if (!section || !pin) return;
    attachFixedPin(pin);
    pin.style.visibility = 'hidden';
    pin.style.pointerEvents = 'none';
    collectOrbs();
    bindOnce();
    currentProgress = 0;
    targetProgress = 0;
    currentCarouselPosition = 0;
    targetCarouselPosition = 0;
    active = true;
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate, { passive: true });
    window.addEventListener('touchmove', requestUpdate, { passive: true });
    requestUpdate();
  }

  function destroyConservationOrbit() {
    var pin = document.getElementById('cons-orbit-pin');
    active = false;
    window.removeEventListener('scroll', requestUpdate);
    window.removeEventListener('resize', requestUpdate);
    window.removeEventListener('touchmove', requestUpdate);
    restorePin(pin);
    closeCard();
  }

  window.initConservationOrbit = initConservationOrbit;
  window.destroyConservationOrbit = destroyConservationOrbit;
})();
