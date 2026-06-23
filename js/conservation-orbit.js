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
  var currentCarouselPosition = 0;
  var targetCarouselPosition = 0;

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeInOut(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

  function getScale() {
    var parsed = Number(getComputedStyle(document.documentElement).getPropertyValue('--marin-scale'));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : window.innerWidth / 1920;
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
    if (absS > 1.72) {
      return { x: SLOT_CENTER.x, y: SLOT_CENTER.y, size: 0, opacity: 0, centerWeight: 0 };
    }

    var angle = Math.PI + s * CAROUSEL_ORBIT.step;
    var centerWeight = Math.max(0, Math.cos(Math.min(absS, 1) * Math.PI / 2));
    var edgeWeight = Math.max(0, 1 - Math.abs(absS - 1) / 0.62);
    var farFade = clamp01((1.72 - absS) / 0.34);

    return {
      x: CAROUSEL_ORBIT.x + Math.cos(angle) * CAROUSEL_ORBIT.rx,
      y: CAROUSEL_ORBIT.y + Math.sin(angle) * CAROUSEL_ORBIT.ry,
      size: 210 + centerWeight * 350 + edgeWeight * 90,
      opacity: Math.max(centerWeight, edgeWeight * 0.42) * farFade,
      centerWeight: centerWeight
    };
  }

  function introPose(index, progress) {
    var angle = ((Math.PI * 2) / N) * index - Math.PI / 2 + progress * Math.PI * 7.2;
    var rx = 430;
    var ry = 300;
    var tilt = 28 * Math.PI / 180;

    return {
      x: Math.cos(angle) * rx * Math.cos(tilt) - Math.sin(angle) * ry * Math.sin(tilt),
      y: Math.cos(angle) * rx * Math.sin(tilt) + Math.sin(angle) * ry * Math.cos(tilt)
    };
  }

  function renderHeroTransition(scale) {
    var hero = document.querySelector('.m-cons-video-hero');
    if (!hero) return;

    var media = hero.querySelector('.m-cons-video-hero__video') || hero.querySelector('.m-cons-video-hero__fallback');
    var fallback = hero.querySelector('.m-cons-video-hero__fallback');
    var shade = hero.querySelector('.m-cons-video-hero__shade');
    var text = hero.querySelector('.m-cons-video-hero__text');
    var rect = hero.getBoundingClientRect();
    var travel = Math.max(1, 1080 * scale);
    var progress = clamp01(-rect.top / travel);
    var eased = easeInOut(progress);

    if (media) {
      media.style.opacity = String(lerp(1, 0.46, eased));
      media.style.filter = 'blur(' + lerp(0, 7, eased).toFixed(1) + 'px)';
      media.style.transform = 'scale(' + lerp(1, 1.045, eased).toFixed(3) + ')';
    }
    if (fallback) {
      fallback.style.opacity = String(lerp(1, 0.46, eased));
      fallback.style.filter = 'blur(' + lerp(0, 7, eased).toFixed(1) + 'px)';
      fallback.style.transform = 'scale(' + lerp(1, 1.045, eased).toFixed(3) + ')';
    }
    if (shade) {
      shade.style.background = 'rgba(38, 134, 231, ' + lerp(0.18, 0.9, eased).toFixed(3) + ')';
    }
    if (text) {
      text.style.opacity = String(1 - easeInOut(clamp01((progress - 0.08) / 0.52)));
      text.style.transform = 'translate(-50%, calc(-50% - ' + lerp(0, 90, eased).toFixed(1) + 'px))';
    }
  }

  function render(progress) {
    var stage1 = document.getElementById('cons-orbit-stage-1');
    var stage2 = document.getElementById('cons-orbit-stage-2');
    var hint = document.getElementById('cons-orbit-hint');

    var textOut = easeInOut(clamp01((progress - 0.08) / 0.04));
    if (stage1) stage1.classList.toggle('is-visible', progress < 0.08 && textOut < 0.98);
    if (stage2) stage2.classList.toggle('is-visible', progress >= 0.10 && progress < 0.30);
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

      orb.el.style.transform = 'translate(-50%, -50%) translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
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
    renderHeroTransition(scale);

    var vh = window.innerHeight;
    var rect = section.getBoundingClientRect();
    var travel = Math.max(1, rect.height - vh);
    var shiftScreen = clamp01((-rect.top) / travel) * travel;
    var progress = clamp01(shiftScreen / travel);
    var carouselProgress = clamp01((progress - 0.44) / 0.56);
    var targetStep = Math.round(carouselProgress * N * 2);
    var positionDelta = targetStep - currentCarouselPosition;

    targetCarouselPosition = targetStep;
    currentCarouselPosition += positionDelta * 0.09;
    if (Math.abs(targetCarouselPosition - currentCarouselPosition) < 0.002) {
      currentCarouselPosition = targetCarouselPosition;
    }

    var pinProgress = Math.min(progress, 0.90);
    var pinShiftScreen = pinProgress * travel;

    pin.style.transform = 'translateY(' + (pinShiftScreen / scale).toFixed(1) + 'px)';
    render(progress);

    if (Math.abs(targetCarouselPosition - currentCarouselPosition) > 0.002) {
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
    if (!document.getElementById('cons-orbit')) return;
    collectOrbs();
    bindOnce();
    currentCarouselPosition = 0;
    targetCarouselPosition = 0;
    active = true;
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate, { passive: true });
    requestUpdate();
  }

  function destroyConservationOrbit() {
    active = false;
    window.removeEventListener('scroll', requestUpdate);
    window.removeEventListener('resize', requestUpdate);
    closeCard();
  }

  window.initConservationOrbit = initConservationOrbit;
  window.destroyConservationOrbit = destroyConservationOrbit;
})();
