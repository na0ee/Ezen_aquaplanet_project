(function () {
  'use strict';

  function random(min, max) {
    return Math.random() * (max - min) + min;
  }

  function ensureBubbleLayer() {
    var root = document.querySelector('[data-detail-bubble-root]');
    if (root) return root;

    root = document.createElement('div');
    root.className = 'detail-bubble-layer';
    root.setAttribute('data-detail-bubble-root', '');
    root.setAttribute('aria-hidden', 'true');
    root.innerHTML = [
      '<div class="detail-bubble-side detail-bubble-side--left" data-detail-bubble-side="left"></div>',
      '<div class="detail-bubble-side detail-bubble-side--right" data-detail-bubble-side="right"></div>'
    ].join('');

    document.body.insertBefore(root, document.body.firstChild);
    return root;
  }

  function initDetailBubbles() {
    var root = ensureBubbleLayer();
    var motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    var powerSaving = motionQuery.matches || window.devicePixelRatio > 2 || (navigator.deviceMemory && navigator.deviceMemory < 4);
    var resizeTimer = null;

    function buildBubbles() {
      var sides = root.querySelectorAll('[data-detail-bubble-side]');

      Array.prototype.forEach.call(sides, function (side) {
        side.replaceChildren();
      });

      if (motionQuery.matches) return;

      var rootHeight = Math.max(root.offsetHeight, window.innerHeight);
      var bubblesPerSide = Math.min(powerSaving ? 14 : 30, Math.max(powerSaving ? 10 : 16, Math.round(rootHeight / (powerSaving ? 360 : 260))));

      Array.prototype.forEach.call(sides, function (side) {
        var sideWidth = Math.max(side.clientWidth, 72);

        for (var i = 0; i < bubblesPerSide; i += 1) {
          var bubble = document.createElement('span');
          var size = random(14, 54);
          var maxX = Math.max(4, sideWidth - size - 8);
          var duration = random(15, 30);

          bubble.className = 'detail-glass-bubble';
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

    function scheduleBuild() {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(buildBubbles, 120);
    }

    buildBubbles();
    window.addEventListener('resize', scheduleBuild, { passive: true });

    if (typeof motionQuery.addEventListener === 'function') {
      motionQuery.addEventListener('change', buildBubbles);
    } else if (typeof motionQuery.addListener === 'function') {
      motionQuery.addListener(buildBubbles);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDetailBubbles);
  } else {
    initDetailBubbles();
  }
}());
