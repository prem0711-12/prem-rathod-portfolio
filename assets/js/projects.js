(function () {
  /* ==========================================================
     PROJECTS PAGE — project index (switch between project
     panels) + directional, staggered panel transition.
     Loaded only by projects.html. Deliberately plain (no GSAP):
     this is a show/hide with a transform/opacity transition, not
     a scroll-linked sequence, so it doesn't need to share
     machinery with the pinned/scrubbed timelines in home.js.
     ========================================================== */
  var switchEl = document.getElementById('projectSwitch');
  var indicator = document.getElementById('pswIndicator');
  var switchItems = document.querySelectorAll('.project-switch-item');
  var panels = document.querySelectorAll('.project-panel');
  if (!switchEl || !switchItems.length || !panels.length) return;

  var itemList = Array.prototype.slice.call(switchItems);
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var switching = false; // guards against overlapping clicks mid-transition

  function isMobileLayout() {
    return window.matchMedia('(max-width: 640px)').matches;
  }

  /* Position the sliding indicator off the active button's real
     bounding box, so this keeps working for any number of project
     items without touching this function. animate=false is used for
     the initial placement and resize recalculation, so the indicator
     doesn't visibly slide in from nowhere on page load. */
  function moveIndicator(activeBtn, animate) {
    if (!indicator || !activeBtn) return;
    var switchRect = switchEl.getBoundingClientRect();
    var btnRect = activeBtn.getBoundingClientRect();

    if (!animate) indicator.style.transition = 'none';

    if (isMobileLayout()) {
      indicator.style.bottom = 'auto';
      indicator.style.width = '2px';
      indicator.style.left = '0px';
      indicator.style.top = (btnRect.top - switchRect.top) + 'px';
      indicator.style.height = btnRect.height + 'px';
    } else {
      indicator.style.top = 'auto';
      indicator.style.height = '2px';
      indicator.style.left = (btnRect.left - switchRect.left) + 'px';
      indicator.style.width = btnRect.width + 'px';
    }

    indicator.classList.remove('ind-blue', 'ind-teal');
    var accent = activeBtn.getAttribute('data-accent');
    if (accent === 'blue') indicator.classList.add('ind-blue');
    else if (accent === 'teal') indicator.classList.add('ind-teal');

    if (!animate) {
      // force reflow, then restore the transition for future moves
      // eslint-disable-next-line no-unused-expressions
      indicator.offsetHeight;
      indicator.style.transition = '';
    }
  }

  function activate(targetBtn) {
    if (switching || targetBtn.classList.contains('active')) return;

    var fromBtn = document.querySelector('.project-switch-item.active');
    var fromIdx = itemList.indexOf(fromBtn);
    var toIdx = itemList.indexOf(targetBtn);
    var direction = toIdx > fromIdx ? 'next' : 'prev';
    var targetId = targetBtn.getAttribute('data-target');
    var currentPanel = document.querySelector('.project-panel:not([hidden])');
    var nextPanel = document.getElementById(targetId);

    itemList.forEach(function (btn) {
      var isTarget = btn === targetBtn;
      btn.classList.toggle('active', isTarget);
      btn.setAttribute('aria-selected', isTarget ? 'true' : 'false');
      btn.setAttribute('tabindex', isTarget ? '0' : '-1');
    });
    moveIndicator(targetBtn, true);

    if (!currentPanel || !nextPanel || currentPanel === nextPanel) return;

    if (reduceMotion) {
      currentPanel.hidden = true;
      nextPanel.hidden = false;
      return;
    }

    switching = true;
    currentPanel.classList.add(direction === 'next' ? 'dir-exit-next' : 'dir-exit-prev');

    window.setTimeout(function () {
      currentPanel.hidden = true;
      currentPanel.classList.remove('dir-exit-next', 'dir-exit-prev');

      nextPanel.hidden = false;
      nextPanel.classList.add(direction === 'next' ? 'dir-enter-next' : 'dir-enter-prev');
      // Two rAFs so the browser paints the "entering" state first —
      // collapsing this to one frame skips straight to the end state
      // with no visible motion.
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          nextPanel.classList.remove('dir-enter-next', 'dir-enter-prev');
          window.setTimeout(function () { switching = false; }, 360);
        });
      });
    }, 200);
  }

  itemList.forEach(function (btn) {
    btn.addEventListener('click', function () { activate(btn); });
    btn.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      var idx = itemList.indexOf(btn);
      var next = e.key === 'ArrowRight' ? (idx + 1) % itemList.length : (idx - 1 + itemList.length) % itemList.length;
      itemList[next].focus();
      activate(itemList[next]);
    });
  });

  // Initial placement (no animation) once layout has settled.
  moveIndicator(document.querySelector('.project-switch-item.active'), false);

  var resizeTimer;
  window.addEventListener('resize', function () {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(function () {
      moveIndicator(document.querySelector('.project-switch-item.active'), false);
    }, 120);
  });
})();
