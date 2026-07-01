(function () {
  'use strict';

  var ROOT_SELECTOR = '.cartegory-tabs-a';
  var ITEM_SELECTOR = '.cartegory-tabs-a__item';
  var ACTIVE_SELECTOR = '.cartegory-tabs-a__item--active, .is-active, [aria-selected="true"]';
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var initialized = new WeakSet();
  var moveTimers = new WeakMap();
  var resizeObserver = 'ResizeObserver' in window ? new ResizeObserver(function (entries) {
    entries.forEach(function (entry) {
      updateIndicator(entry.target, false);
    });
  }) : null;

  function getActiveItem(root) {
    return root.querySelector(ACTIVE_SELECTOR) || root.querySelector(ITEM_SELECTOR);
  }

  function updateIndicator(root, animate) {
    if (!root || !root.matches || !root.matches(ROOT_SELECTOR)) return;

    var active = getActiveItem(root);
    if (!active) return;

    var rootRect = root.getBoundingClientRect();
    var activeRect = active.getBoundingClientRect();
    if (!rootRect.width || !activeRect.width) return;

    var previousLeft = parseFloat(root.style.getPropertyValue('--seg-left'));
    var nextLeft = activeRect.left - rootRect.left;
    var nextWidth = activeRect.width;
    var movingLeft = Number.isFinite(previousLeft) && nextLeft < previousLeft;

    root.style.setProperty('--seg-left', nextLeft.toFixed(2) + 'px');
    root.style.setProperty('--seg-width', nextWidth.toFixed(2) + 'px');
    root.style.setProperty('--seg-origin', movingLeft ? 'right center' : 'left center');
    root.classList.add('segmented-tabs-ready');

    if (!animate || reduceMotion.matches) return;

    window.clearTimeout(moveTimers.get(root));
    root.classList.remove('is-segment-moving');
    void root.offsetWidth;
    root.classList.add('is-segment-moving');
    moveTimers.set(root, window.setTimeout(function () {
      root.classList.remove('is-segment-moving');
    }, 520));
  }

  function initRoot(root) {
    if (!root || initialized.has(root)) return;
    initialized.add(root);
    updateIndicator(root, false);

    root.addEventListener('click', function () {
      window.requestAnimationFrame(function () {
        updateIndicator(root, true);
      });
    });

    if (resizeObserver) resizeObserver.observe(root);
  }

  function initAll() {
    document.querySelectorAll(ROOT_SELECTOR).forEach(initRoot);
    document.querySelectorAll(ROOT_SELECTOR).forEach(function (root) {
      updateIndicator(root, false);
    });
  }

  function scheduleRootUpdate(node, animate) {
    var root = node && node.closest ? node.closest(ROOT_SELECTOR) : null;
    if (!root && node && node.matches && node.matches(ROOT_SELECTOR)) root = node;
    if (!root) return;
    initRoot(root);
    window.requestAnimationFrame(function () {
      updateIndicator(root, animate);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

  var observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      if (mutation.type === 'childList') {
        if (mutation.target.matches && mutation.target.matches(ROOT_SELECTOR)) {
          scheduleRootUpdate(mutation.target, false);
        }
        mutation.addedNodes.forEach(function (node) {
          if (node.nodeType !== 1) return;
          if (node.matches && node.matches(ROOT_SELECTOR)) initRoot(node);
          if (node.querySelectorAll) node.querySelectorAll(ROOT_SELECTOR).forEach(initRoot);
          scheduleRootUpdate(node, false);
        });
        return;
      }

      if (mutation.type === 'attributes') {
        if (mutation.target.matches && mutation.target.matches(ROOT_SELECTOR)) return;
        if (mutation.target.matches && mutation.target.matches(ITEM_SELECTOR)) {
          scheduleRootUpdate(mutation.target, true);
        }
      }
    });
  });

  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['class', 'aria-selected']
  });

  window.addEventListener('resize', initAll, { passive: true });
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(initAll).catch(function () {});
  }
}());
