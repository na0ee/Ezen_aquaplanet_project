;(function () {
  'use strict';

  function isMobileViewport() {
    return window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
  }

  function initCustomCursor() {
    if (isMobileViewport()) return;

    var el = document.getElementById('custom-cursor');
    if (!el) return;

    var HALF = 17;
    var tx = -200;
    var ty = -200;
    var cx = tx;
    var cy = ty;
    var snapped = false;

    el.style.opacity = '1';

    window.addEventListener('mousemove', function (event) {
      tx = event.clientX;
      ty = event.clientY;
      if (!snapped || !Number.isFinite(cx) || !Number.isFinite(cy)) {
        snapped = true;
        cx = tx;
        cy = ty;
      }
    }, { passive: true });

    document.addEventListener('mouseleave', function () {
      snapped = false;
      el.style.opacity = '0';
    });

    document.addEventListener('mouseenter', function () {
      snapped = false;
      el.style.opacity = '1';
    });

    document.addEventListener('visibilitychange', function () {
      snapped = false;
      el.style.opacity = document.hidden ? '0' : '1';
    });

    document.addEventListener('mousedown', function () {
      el.classList.add('is-clicking');
    });

    document.addEventListener('mouseup', function () {
      el.classList.remove('is-clicking');
    });

    document.addEventListener('mouseover', function (event) {
      var over = event.target.closest
        ? event.target.closest('a, button, [role="button"], .m-cons-orb, .m-cons-final-bubble, .m-cons-flip')
        : null;
      el.classList.toggle('is-hovering', !!over);
    });

    (function loop() {
      cx += (tx - cx) * 0.38;
      cy += (ty - cy) * 0.38;
      if (!Number.isFinite(cx) || !Number.isFinite(cy)) {
        cx = tx;
        cy = ty;
      }
      el.style.transform = 'translate(' + (cx - HALF).toFixed(1) + 'px,' + (cy - HALF).toFixed(1) + 'px)';
      window.requestAnimationFrame(loop);
    })();
  }

  function initCursorWave() {
    if (isMobileViewport()) return;

    var canvas = document.createElement('canvas');
    canvas.className = 'marin-cursor-wave';
    canvas.setAttribute('aria-hidden', 'true');
    Object.assign(canvas.style, {
      position: 'fixed',
      inset: '0',
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      zIndex: '10000',
      opacity: '0.72'
    });
    document.body.appendChild(canvas);

    var ctx = canvas.getContext('2d');
    var SCALE = 14;
    var DAMP = 0.92;
    var DIST_INTERVAL = 16;
    var RX = 4;
    var RY = 1;
    var FORCE = 60;

    var W;
    var H;
    var bW;
    var bH;
    var cur;
    var prv;
    var offscreen;
    var offCtx;
    var imgData;
    var running = true;
    var waveRafId = null;
    var pointerReady = false;
    var mx = 0;
    var my = 0;
    var pmx = 0;
    var pmy = 0;
    var distAccum = 0;

    function resize() {
      W = Math.max(window.innerWidth || document.documentElement.clientWidth || 1, 1);
      H = Math.max(window.innerHeight || document.documentElement.clientHeight || 1, 1);
      bW = Math.ceil(W / SCALE) + 2;
      bH = Math.ceil(H / SCALE) + 2;
      canvas.width = W;
      canvas.height = H;
      cur = new Float32Array(bW * bH);
      prv = new Float32Array(bW * bH);
      offscreen = document.createElement('canvas');
      offscreen.width = bW;
      offscreen.height = bH;
      offCtx = offscreen.getContext('2d');
      imgData = offCtx.createImageData(bW, bH);
      pointerReady = false;
      distAccum = 0;
    }

    function disturb(cx, cy, force, rx, ry) {
      var waveForce = Number.isFinite(force) ? force : FORCE;
      var waveRx = Number.isFinite(rx) ? rx : RX;
      var waveRy = Number.isFinite(ry) ? ry : RY;

      for (var dy = -waveRy; dy <= waveRy; dy += 1) {
        for (var dx = -waveRx; dx <= waveRx; dx += 1) {
          var d = Math.hypot(dx / waveRx, dy / waveRy);
          if (d > 1) continue;
          var nx = cx + dx;
          var ny = cy + dy;
          if (nx < 1 || nx >= bW - 1 || ny < 1 || ny >= bH - 1) continue;
          cur[ny * bW + nx] += waveForce * (1 - d);
        }
      }
    }

    function startTick() {
      if (waveRafId === null) {
        waveRafId = window.requestAnimationFrame(tick);
      }
    }

    function tick() {
      waveRafId = null;
      if (!running) return;
      waveRafId = window.requestAnimationFrame(tick);

      var spd = Math.hypot(mx - pmx, my - pmy);
      if (document.body.classList.contains('has-custom-cursor') && spd > 0.5) {
        distAccum += spd;
        pmx = mx;
        pmy = my;
        if (distAccum >= DIST_INTERVAL) {
          disturb(Math.round(mx / SCALE), Math.round(my / SCALE));
          distAccum = 0;
        }
      }

      var nxt = prv;
      for (var y = 1; y < bH - 1; y += 1) {
        for (var x = 1; x < bW - 1; x += 1) {
          var i = y * bW + x;
          nxt[i] = ((cur[i - 1] + cur[i + 1] + cur[i - bW] + cur[i + bW]) / 2 - nxt[i]) * DAMP;
        }
      }
      prv = cur;
      cur = nxt;

      var px = imgData.data;
      px.fill(0);

      for (var yy = 1; yy < bH - 1; yy += 1) {
        for (var xx = 1; xx < bW - 1; xx += 1) {
          var idx = yy * bW + xx;
          var v = cur[idx];
          if (Math.abs(v) < 1.5) continue;

          var lx = cur[idx - 1] - cur[idx + 1];
          var ly = cur[idx - bW] - cur[idx + bW];
          var shine = lx * 0.85 + ly * 0.15;
          if (shine <= 0) continue;

          var amp = Math.min(Math.abs(v) / 48, 1);
          var alpha = Math.min(shine * amp, 1) * 160;
          if (alpha < 2) continue;

          var t = Math.min(shine * amp * 0.5, 1);
          var pidx = (yy * bW + xx) * 4;
          px[pidx] = Math.round(190 + t * 65);
          px[pidx + 1] = Math.round(220 + t * 35);
          px[pidx + 2] = Math.round(245 + t * 10);
          px[pidx + 3] = alpha;
        }
      }

      offCtx.putImageData(imgData, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.save();
      ctx.filter = 'blur(5px)';
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(offscreen, 0, 0, W, H);
      ctx.restore();
    }

    resize();
    var waveResizeTimer = null;
    window.addEventListener('resize', function () {
      window.clearTimeout(waveResizeTimer);
      waveResizeTimer = window.setTimeout(resize, 200);
    }, { passive: true });

    window.addEventListener('mousemove', function (event) {
      mx = event.clientX;
      my = event.clientY;
      if (!pointerReady) {
        pointerReady = true;
        pmx = mx;
        pmy = my;
        distAccum = 0;
      }
    }, { passive: true });

    document.addEventListener('visibilitychange', function () {
      running = !document.hidden;
      pointerReady = false;
      distAccum = 0;
      if (running) startTick();
    });

    window.__cursorWaveSubmerge = function (opts) {
      var options = opts || {};
      var y = Number.isFinite(options.y) ? options.y : H * 0.58;
      var strength = Number.isFinite(options.strength) ? options.strength : 0.7;
      var phase = Number.isFinite(options.phase) ? options.phase : performance.now() * 0.003;
      var step = Math.max(32, Number.isFinite(options.step) ? options.step : 48);
      var amp = Number.isFinite(options.amp) ? options.amp : 9;

      for (var x = -step; x <= W + step; x += step) {
        var yy = y + Math.sin(x * 0.012 + phase) * amp + Math.sin(x * 0.027 - phase * 0.7) * amp * 0.32;
        disturb(Math.round(x / SCALE), Math.round(yy / SCALE), FORCE * strength, 3, 1);
      }
    };

    startTick();
  }

  initCustomCursor();
  initCursorWave();
})();
