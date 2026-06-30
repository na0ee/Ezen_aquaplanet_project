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
  var isOpeningCard = false;
  var cardOpenTimer = null;

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeInOut(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
  function getScale() {
    var parsed = Number(getComputedStyle(document.documentElement).getPropertyValue('--marin-scale'));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : window.innerWidth / 1920;
  }

  function getOrbitFactor() {
    if (window.innerWidth <= 760) return 0.42;
    return window.innerWidth <= 1023 ? 0.78 : 1;
  }

  function getSizeFactor() {
    if (window.innerWidth <= 760) return 0.4;
    return window.innerWidth <= 1023 ? 0.84 : 1;
  }

  function isMobileStatic() {
    return window.matchMedia && window.matchMedia('(max-width: 760px)').matches;
  }

  function isTabletLayout() {
    return window.matchMedia && window.matchMedia('(min-width: 761px) and (max-width: 1023px)').matches;
  }

  function getPinOffsetY() {
    if (!isTabletLayout()) return 0;
    return (window.innerHeight - 1080) / 2;
  }

  function clearInlineOrbitStyles(pin) {
    var stage1 = document.getElementById('cons-orbit-stage-1');
    var stage2 = document.getElementById('cons-orbit-stage-2');
    var hint = document.getElementById('cons-orbit-hint');
    var finalGrid = document.getElementById('cons-final-grid');

    if (pin) {
      pin.style.visibility = '';
      pin.style.pointerEvents = '';
      pin.style.transform = '';
      pin.style.opacity = '';
    }

    [stage1, stage2, hint].forEach(function (node) {
      if (node) node.style.transform = '';
    });

    if (finalGrid) {
      finalGrid.style.opacity = '';
      finalGrid.style.transform = '';
      finalGrid.classList.remove('is-visible');
    }

    orbEls.forEach(function (orb) {
      orb.el.style.transform = '';
      orb.el.style.opacity = '';
      orb.el.style.zIndex = '';
      orb.el.style.pointerEvents = '';
      orb.el.classList.remove('is-featured');
      if (orb.circle) orb.circle.style.transform = '';
    });
  }

  function updateMobileContentState() {
    var section = document.getElementById('cons-orbit');
    var footer = document.getElementById('marinFooter');
    var isContent = false;

    if (section && isMobileStatic() && document.body.classList.contains('marin-view-conservation')) {
      var rect = section.getBoundingClientRect();
      var footerIsEntering = footer && footer.getBoundingClientRect().top < window.innerHeight;
      isContent = rect.top < window.innerHeight && rect.bottom > window.innerHeight * 0.18 && !footerIsEntering;
    }

    document.body.classList.toggle('is-cons-content', isContent);
  }

  function random(min, max) {
    return Math.random() * (max - min) + min;
  }

  function clearConservationBubbles() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-cons-bubble-side]'), function (side) {
      side.replaceChildren();
    });
  }

  function buildConservationBubbles() {
    var root = document.querySelector('[data-cons-bubble-root]');
    if (!root) return;
    clearConservationBubbles();
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var rootHeight = Math.max(root.offsetHeight, window.innerHeight);
    var powerSaving = window.devicePixelRatio > 2 || (navigator.deviceMemory && navigator.deviceMemory < 4);
    var bubblesPerSide = Math.min(powerSaving ? 14 : 30, Math.max(powerSaving ? 10 : 16, Math.round(rootHeight / (powerSaving ? 360 : 260))));

    Array.prototype.forEach.call(root.querySelectorAll('[data-cons-bubble-side]'), function (side) {
      var sideWidth = Math.max(side.clientWidth, 72);

      for (var i = 0; i < bubblesPerSide; i += 1) {
        var bubble = document.createElement('span');
        var size = random(14, 54);
        var maxX = Math.max(4, sideWidth - size - 8);
        var duration = random(15, 30);

        bubble.className = 'm-cons-glass-bubble';
        bubble.style.setProperty('--bubble-size', size.toFixed(1) + 'px');
        bubble.style.setProperty('--bubble-x', random(4, maxX).toFixed(1) + 'px');
        bubble.style.setProperty('--bubble-y', random(0, rootHeight + window.innerHeight * 0.35).toFixed(1) + 'px');
        bubble.style.setProperty('--bubble-duration', duration.toFixed(2) + 's');
        bubble.style.setProperty('--bubble-delay', random(-duration, 4).toFixed(2) + 's');
        bubble.style.setProperty('--bubble-drift', random(-34, 34).toFixed(1) + 'px');
        bubble.style.setProperty('--bubble-sway', random(6, 22).toFixed(1) + 'px');
        bubble.style.setProperty('--bubble-sway-duration', random(3.8, 7.8).toFixed(2) + 's');
        bubble.style.setProperty('--bubble-opacity', random(0.16, 0.42).toFixed(2));

        side.appendChild(bubble);
      }
    });
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

  function steppedCarouselPosition(progress) {
    var totalSteps = N * 2;
    var raw = progress * totalSteps;
    var step = Math.floor(raw);
    var phase = raw - step;
    var holdRatio = 0.58;

    if (step >= totalSteps) return totalSteps;
    if (phase < holdRatio) return step;

    return step + easeInOut((phase - holdRatio) / (1 - holdRatio));
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
      size: (150 + centerWeight * 230 + edgeWeight * 30) * sizeFactor,
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
    var finalGrid = document.getElementById('cons-final-grid');

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

    var finalGridIn = (finalGrid && isTabletLayout()) ? easeInOut(clamp01((progress - 0.30) / 0.08)) : 0;
    var toCarousel = easeInOut(clamp01((progress - 0.32) / 0.12)) * (1 - finalGridIn);
    var featuredOrb = null;
    var featuredScore = -1;

    if (finalGrid) {
      var finalDrop = (1 - finalGridIn) * -90;
      finalGrid.style.opacity = finalGridIn.toFixed(3);
      finalGrid.style.transform = 'translate3d(calc(-50% + var(--cons-final-offset-x, 0px)), -50%, 0) translate3d(0, ' + finalDrop.toFixed(2) + 'px, 0) scale(' + (0.94 + finalGridIn * 0.06).toFixed(3) + ')';
      finalGrid.classList.toggle('is-visible', finalGridIn > 0.82);
    }

    orbEls.forEach(function (orb, index) {
      var intro = introPose(index, progress);
      var slot = slotPose(wrapDistance(index - currentCarouselPosition, N));
      var baseSize = (FLOWER[orb.category] && FLOWER[orb.category].size) || 120;

      var x = lerp(intro.x, slot.x, toCarousel);
      var y = lerp(intro.y, slot.y, toCarousel);
      var size = lerp(baseSize, slot.size, toCarousel);
      var opacity = lerp(1, slot.opacity, toCarousel) * (1 - finalGridIn);
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

    if (featuredOrb && featuredScore > 0.35 && finalGridIn < 0.2) {
      featuredOrb.el.style.opacity = '1';
      featuredOrb.el.style.pointerEvents = 'auto';
      featuredOrb.el.classList.add('is-featured');
    }

    if (!isMobileStatic() && !isTabletLayout()) {
      orbEls.forEach(function (orb) {
        var visible = Number(orb.el.style.opacity) > 0.28;
        orb.el.style.pointerEvents = visible ? 'auto' : 'none';
      });
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
    var progressTravel = isTabletLayout() ? Math.max(1, 8400 - vh) : travel;
    var shiftScreen = Math.min(Math.max(-rect.top, 0), travel);
    targetProgress = clamp01(shiftScreen / progressTravel);
    currentProgress += (targetProgress - currentProgress) * 0.075;
    if (Math.abs(targetProgress - currentProgress) < 0.0008) {
      currentProgress = targetProgress;
    }

    var carouselProgress = clamp01((currentProgress - 0.44) / 0.56);
    var targetStep = steppedCarouselPosition(carouselProgress);
    var positionDelta = targetStep - currentCarouselPosition;

    targetCarouselPosition = targetStep;
    currentCarouselPosition += positionDelta * 0.045;
    if (Math.abs(targetCarouselPosition - currentCarouselPosition) < 0.0008) {
      currentCarouselPosition = targetCarouselPosition;
    }

    var isPinned = rect.top <= 0 && rect.bottom >= 0;
    var enterOpacity = isPinned ? easeInOut(clamp01(-rect.top / (vh * 0.55))) : 0;
    if (isTabletLayout()) {
      var pinOffsetY = getPinOffsetY();
      pin.style.transform = 'translateX(-50%) translateY(' + pinOffsetY.toFixed(2) + 'px) scale(' + scale.toFixed(6) + ')';
    } else {
      pin.style.transform = 'translateX(-50%) scale(' + scale.toFixed(6) + ')';
    }
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
    var isGroupCard = category === 'pinniped' || category === 'seahorse';
    Array.prototype.forEach.call(overlay.querySelectorAll('.m-cons-card, .m-cons-card-group'), function (card) {
      card.classList.toggle('is-active', card.getAttribute('data-card') === category);
    });
    overlay.classList.toggle('is-single-card', !isGroupCard);
    overlay.classList.toggle('is-group-card', isGroupCard);
    overlay.setAttribute('data-active-card', category);
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
  }

  function burstOrbThenOpen(orb, category) {
    var circle = orb ? orb.querySelector('.m-cons-orb__circle.ticket-bubble') : null;
    if (!circle) {
      openCard(category);
      return;
    }

    isOpeningCard = true;
    circle.classList.remove('is-bursting');
    void circle.offsetWidth;
    circle.classList.add('is-bursting');
    spawnOrbBubbleSparks(circle);
    if (circle._consBurstEndHandler) {
      circle.removeEventListener('animationend', circle._consBurstEndHandler);
      circle._consBurstEndHandler = null;
    }

    function finishOpen() {
      if (cardOpenTimer) {
        window.clearTimeout(cardOpenTimer);
        cardOpenTimer = null;
      }
      circle.removeEventListener('animationend', onBurstEnd);
      circle._consBurstEndHandler = null;
      circle.classList.remove('is-bursting');
      isOpeningCard = false;
      openCard(category);
    }

    function onBurstEnd(event) {
      if (event.animationName !== 'mConsTicketBubbleBurst') return;
      finishOpen();
    }

    circle._consBurstEndHandler = onBurstEnd;
    circle.addEventListener('animationend', onBurstEnd);
    cardOpenTimer = window.setTimeout(function () {
      finishOpen();
    }, 760);
  }

  function spawnOrbBubbleSparks(circle) {
    var rect = circle.getBoundingClientRect();
    var cx = rect.left + rect.width / 2;
    var cy = rect.top + rect.height / 2;
    var count = 20;

    for (var i = 0; i < count; i += 1) {
      var spark = document.createElement('span');
      var size = 7 + Math.random() * 18;
      var angle = Math.random() * Math.PI * 2;
      var distance = rect.width * (0.42 + Math.random() * 0.62);
      var dx = Math.cos(angle) * distance;
      var dy = Math.sin(angle) * distance - Math.random() * 28;
      var duration = 800 + Math.random() * 480;

      spark.className = 'm-cons-bubble-spark';
      spark.style.width = size.toFixed(1) + 'px';
      spark.style.height = size.toFixed(1) + 'px';
      spark.style.left = (cx - size / 2).toFixed(1) + 'px';
      spark.style.top = (cy - size / 2).toFixed(1) + 'px';
      document.body.appendChild(spark);

      var anim = spark.animate(
        [
          { transform: 'translate(0,0) scale(0.2)', opacity: 0, offset: 0 },
          { opacity: 0.9, offset: 0.18 },
          { transform: 'translate(' + dx.toFixed(1) + 'px, ' + dy.toFixed(1) + 'px) scale(1)', opacity: 0, offset: 1 }
        ],
        {
          duration: duration,
          easing: 'cubic-bezier(.22,.61,.36,1)',
          delay: Math.random() * 120,
          fill: 'forwards'
        }
      );
      (function (el) {
        anim.onfinish = function () {
          el.remove();
        };
      })(spark);
    }
  }

  function clearPendingCardOpen() {
    if (cardOpenTimer) {
      window.clearTimeout(cardOpenTimer);
      cardOpenTimer = null;
    }
    isOpeningCard = false;
    Array.prototype.forEach.call(document.querySelectorAll('.m-cons-orb__circle.is-bursting'), function (circle) {
      if (circle._consBurstEndHandler) {
        circle.removeEventListener('animationend', circle._consBurstEndHandler);
        circle._consBurstEndHandler = null;
      }
      circle.classList.remove('is-bursting');
    });
    Array.prototype.forEach.call(document.querySelectorAll('.m-cons-bubble-spark'), function (spark) {
      spark.remove();
    });
  }

  function closeCard() {
    var overlay = document.getElementById('cons-card-overlay');
    clearPendingCardOpen();
    if (!overlay) return;
    overlay.classList.remove('is-open');
    overlay.classList.remove('is-single-card', 'is-group-card');
    overlay.removeAttribute('data-active-card');
    overlay.setAttribute('aria-hidden', 'true');
    Array.prototype.forEach.call(overlay.querySelectorAll('.m-cons-flip.is-flipped'), function (flip) {
      flip.classList.remove('is-flipped');
    });
  }

  function bindOnce() {
    if (bound) return;
    bound = true;
    var draggedBubbleScroller = false;

    function handleBubbleButtonClick(event) {
      if (draggedBubbleScroller) {
        draggedBubbleScroller = false;
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      var button = event.currentTarget;
      var category = button ? button.getAttribute('data-category') : '';
      event.preventDefault();
      event.stopPropagation();
      if (isOpeningCard || !category) return;
      burstOrbThenOpen(button, category);
    }

    function bindBubbleScroller() {
      var field = document.getElementById('cons-orbit-field');
      if (!field || field._consDragBound) return;
      var isDragging = false;
      var startX = 0;
      var startScrollLeft = 0;
      var dragDistance = 0;

      field._consDragBound = true;

      field.addEventListener('pointerdown', function (event) {
        if (!isTabletLayout()) return;
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        isDragging = true;
        dragDistance = 0;
        startX = event.clientX;
        startScrollLeft = field.scrollLeft;
        field.classList.add('is-dragging');
        if (field.setPointerCapture) field.setPointerCapture(event.pointerId);
      });

      field.addEventListener('pointermove', function (event) {
        if (!isDragging) return;
        var deltaX = event.clientX - startX;
        dragDistance = Math.max(dragDistance, Math.abs(deltaX));
        field.scrollLeft = startScrollLeft - deltaX;
        if (dragDistance > 4) {
          draggedBubbleScroller = true;
          event.preventDefault();
        }
      });

      function stopDrag(event) {
        if (!isDragging) return;
        isDragging = false;
        field.classList.remove('is-dragging');
        if (field.releasePointerCapture) {
          try {
            field.releasePointerCapture(event.pointerId);
          } catch (error) {
            // Pointer capture may already be released by the browser.
          }
        }
      }

      field.addEventListener('pointerup', stopDrag);
      field.addEventListener('pointercancel', stopDrag);
      field.addEventListener('pointerleave', stopDrag);
    }

    bindBubbleScroller();

    Array.prototype.forEach.call(document.querySelectorAll('.m-cons-orb, .m-cons-final-bubble'), function (button) {
      if (button._consBubbleClickBound) return;
      button._consBubbleClickBound = true;
      button.addEventListener('click', handleBubbleButtonClick);
    });

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
      if (draggedBubbleScroller) {
        draggedBubbleScroller = false;
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      var orb = event.target.closest ? event.target.closest('.m-cons-orb') : null;
      if (orb) {
        var category = orb.getAttribute('data-category');
        if (isOpeningCard) return;
        if (!category) return;
        burstOrbThenOpen(orb, category);
        return;
      }

      var finalBubble = event.target.closest ? event.target.closest('.m-cons-final-bubble') : null;
      if (finalBubble) {
        if (isOpeningCard) return;
        burstOrbThenOpen(finalBubble, finalBubble.getAttribute('data-category'));
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
      var activeSingleCard = event.target.closest ? event.target.closest('.m-cons-card.is-active') : null;
      if (overlay && overlay.classList.contains('is-single-card') && activeSingleCard) {
        closeCard();
        return;
      }

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
    collectOrbs();
    bindOnce();
    buildConservationBubbles();
    currentProgress = 0;
    targetProgress = 0;
    currentCarouselPosition = 0;
    targetCarouselPosition = 0;

    if (isMobileStatic()) {
      active = false;
      window.removeEventListener('scroll', requestUpdate);
      window.removeEventListener('resize', requestUpdate);
      window.removeEventListener('touchmove', requestUpdate);
      if (rafId) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
      section.classList.add('is-static-mobile');
      restorePin(pin);
      clearInlineOrbitStyles(pin);
      window.addEventListener('scroll', updateMobileContentState, { passive: true });
      window.addEventListener('resize', updateMobileContentState, { passive: true });
      window.addEventListener('touchmove', updateMobileContentState, { passive: true });
      updateMobileContentState();
      return;
    }

    document.body.classList.remove('is-cons-content');
    window.removeEventListener('scroll', updateMobileContentState);
    window.removeEventListener('resize', updateMobileContentState);
    window.removeEventListener('touchmove', updateMobileContentState);
    section.classList.remove('is-static-mobile');
    attachFixedPin(pin);
    pin.style.visibility = 'hidden';
    pin.style.pointerEvents = 'none';
    active = true;
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate, { passive: true });
    window.addEventListener('touchmove', requestUpdate, { passive: true });
    requestUpdate();
  }

  function destroyConservationOrbit() {
    var section = document.getElementById('cons-orbit');
    var pin = document.getElementById('cons-orbit-pin');
    active = false;
    window.removeEventListener('scroll', requestUpdate);
    window.removeEventListener('resize', requestUpdate);
    window.removeEventListener('touchmove', requestUpdate);
    window.removeEventListener('scroll', updateMobileContentState);
    window.removeEventListener('resize', updateMobileContentState);
    window.removeEventListener('touchmove', updateMobileContentState);
    if (rafId) {
      window.cancelAnimationFrame(rafId);
      rafId = null;
    }
    document.body.classList.remove('is-cons-content');
    if (section) section.classList.remove('is-static-mobile');
    restorePin(pin);
    clearInlineOrbitStyles(pin);
    clearConservationBubbles();
    closeCard();
  }

  window.initConservationOrbit = initConservationOrbit;
  window.destroyConservationOrbit = destroyConservationOrbit;
})();
