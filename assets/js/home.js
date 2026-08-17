(function () {
  /* ==========================================================
     HOME PAGE MOTION — loaded only by index.html, after main.js.
     GSAP is the single animation authority for every scrubbed
     property here: nothing in home.css puts a `transition` on a
     property this file also sets with gsap.set/gsap.to inside a
     scrub callback, so nothing fights the scrub frame to frame.
     ========================================================== */
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fineHover = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var hasGSAP = !!(window.gsap && window.ScrollTrigger);
  if (hasGSAP) gsap.registerPlugin(ScrollTrigger);

  /* ==========================================================
     CINEMATIC NAME-REVEAL LOADER — Home page only. Owns #loader
     entirely here (main.js skips it for the cinematic variant).
     Dark minimal state → signal marker → PREM RATHOD arrives
     character-by-character (blur → sharp, slight rise) → role
     line → the loader fades out WHILE the hero's own split-line
     titles begin their reveal underneath, so the intro and the
     hero read as one sequence rather than a hard cut.

     Only transform / opacity / filter are animated — no canvas,
     no WebGL, no perpetual RAF. will-change and the blur filter
     are only present while this timeline is actually running and
     are explicitly cleared the moment it completes.
     ========================================================== */
  (function () {
    var loader = document.getElementById('loader');
    if (!loader || loader.dataset.variant !== 'cinematic') return;

    function revealSplitLines() {
      document.querySelectorAll('.split-parent').forEach(function (el) { el.classList.add('split-ready'); });
    }

    var loaderFill = document.getElementById('loaderFill');
    var rows = [document.getElementById('loaderRow0'), document.getElementById('loaderRow1')];
    var roleLine = document.getElementById('loaderRoleLine');
    var signalDot = loader.querySelector('.loader-signal-dot');
    var signalLine = loader.querySelector('.loader-signal-line');
    var loaderInner = loader.querySelector('.loader-inner');

    var alreadyLoaded = false;
    try { alreadyLoaded = sessionStorage.getItem('pr_loaded') === '1'; } catch (e) { alreadyLoaded = false; }

    function finish() {
      loader.classList.add('done');
      try { sessionStorage.setItem('pr_loaded', '1'); } catch (e) {}
      revealSplitLines();
    }

    // Build character spans from each row's data-text — flat markup in
    // HTML would be error-prone to hand-author for two names.
    var allChars = [];
    rows.forEach(function (row) {
      if (!row) return;
      var text = row.getAttribute('data-text') || '';
      text.split('').forEach(function (ch) {
        var span = document.createElement('span');
        span.className = 'ch';
        span.textContent = ch;
        row.appendChild(span);
        allChars.push(span);
      });
    });

    if (reduceMotion || alreadyLoaded || !hasGSAP) {
      // Skip the theatrics — instant, intentional, not a stutter.
      allChars.forEach(function (c) { c.style.opacity = 1; c.style.filter = 'none'; c.style.transform = 'none'; });
      if (roleLine) roleLine.style.opacity = 1;
      if (signalDot) signalDot.style.opacity = 1;
      if (signalLine) signalLine.style.transform = 'scaleX(1)';
      if (loaderFill) loaderFill.style.width = '100%';
      setTimeout(finish, reduceMotion ? 0 : 150);
      return;
    }

    gsap.set(allChars, { opacity: 0, y: 26, scale: 1.045, filter: 'blur(14px)', willChange: 'transform, opacity, filter' });
    if (roleLine) gsap.set(roleLine, { opacity: 0, y: 10 });

    var tl = gsap.timeline({
      onComplete: function () {
        // Hygiene: drop the filter/will-change the instant the intro is
        // done, so the browser returns to a normal rendering state.
        gsap.set(allChars, { clearProps: 'filter,willChange' });
        if (loaderInner) gsap.set(loaderInner, { clearProps: 'willChange' });
        finish();
      }
    });

    tl.to(signalDot, { opacity: 1, scale: 1, duration: 0.25, ease: 'power2.out' }, 0)
      .to(signalLine, { scaleX: 1, duration: 0.35, ease: 'power2.out' }, 0.1)
      // the name settles in from a very slight over-scale rather than a
      // flat y-rise, so it reads as "resolving into focus" rather than
      // "sliding up" — closer to the intro's own "signal locking on" idea
      .to(allChars, { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', duration: 0.7, stagger: 0.028, ease: 'power3.out' }, 0.25)
      .to(roleLine, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }, '-=0.35')
      .to(loaderFill, { width: '100%', duration: 0.45, ease: 'power2.inOut' }, '-=0.15')
      .to({}, { duration: 0.55 }); // hold — let the locked name register as a title card before the outro begins

    // ---- cinematic outro: the camera gently pulls away from the
    // title into the portfolio, rather than a hard cut or a flashy
    // exit. One slow, simultaneous move — the name recedes (scale +
    // opacity + a touch of blur) while the loader itself fades, and
    // the hero begins rising underneath partway through, so the two
    // read as one continuous handoff instead of "intro, then hero".
    // transform/opacity/filter only, no extra effects, no spin.
    if (loaderInner) gsap.set(loaderInner, { willChange: 'transform, opacity, filter' });
    tl.addLabel('outro')
      .to(loaderInner, { scale: 0.92, opacity: 0.35, filter: 'blur(3px)', duration: 1.2, ease: 'power2.inOut' }, 'outro')
      .to(loader, { opacity: 0, duration: 1.2, ease: 'power2.inOut' }, 'outro')
      .call(revealSplitLines, null, 'outro+=0.5'); // hero rises underneath while the outro is still finishing

    // finish() (called from onComplete, once the outro tween is fully
    // done) adds .done for good — opacity is already 0 by then via
    // GSAP, so the CSS transition on .loader.done (style.css) has
    // nothing left to animate; it only flips visibility/pointer-events.
  })();

  /* ==========================================================
     HERO CONSOLE — cursor-reactive glow + investigation pipeline
     simulation (moved here unchanged from the previous main.js,
     since it only exists on Home).
     ========================================================== */
  (function () {
    var consolePanel = document.querySelector('.console');
    if (consolePanel && !reduceMotion && fineHover) {
      consolePanel.addEventListener('mousemove', function (e) {
        var r = consolePanel.getBoundingClientRect();
        consolePanel.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%');
        consolePanel.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100) + '%');
      });
    }

    var pipelineNodes = document.querySelectorAll('.hero-path .node');
    var stageEl = document.querySelector('#consoleStage');
    var feedEl = document.querySelector('#consoleFeed');
    if (!pipelineNodes.length || !stageEl) return;

    var stages = ['Signal', 'Impact', 'Investigation', 'Evidence', 'Root Cause', 'Resolution', 'Prevention'];
    var feedLines = [
      ['t+00s', 'New signal received from monitoring', ''],
      ['t+04s', 'Impact scoped: single workflow affected', ''],
      ['t+11s', 'Investigation opened, logs pulled', ''],
      ['t+19s', 'Evidence correlated across services', ''],
      ['t+27s', 'Root cause isolated', 'ok'],
      ['t+33s', 'Fix validated, resolution applied', 'ok'],
      ['t+40s', 'Prevention step logged for next review', 'ok']
    ];
    var idx = 0;
    function paintStage() {
      pipelineNodes.forEach(function (n, i) { n.classList.toggle('on', i <= idx); });
      stageEl.textContent = stages[idx];
      if (feedEl) {
        var f = feedLines[idx];
        var line = document.createElement('div');
        line.className = 'feed-line';
        line.innerHTML = '<span class="t">' + f[0] + '</span><span class="' + (f[2] || '') + '">' + f[1] + '</span>';
        feedEl.appendChild(line);
        while (feedEl.children.length > 4) feedEl.removeChild(feedEl.firstChild);
      }
      idx = (idx + 1) % stages.length;
    }
    paintStage();
    if (!reduceMotion) {
      var consoleTimer = null;
      var startConsole = function () { if (!consoleTimer) consoleTimer = setInterval(paintStage, 2600); };
      var stopConsole = function () { if (consoleTimer) { clearInterval(consoleTimer); consoleTimer = null; } };
      if ('IntersectionObserver' in window) {
        var consoleIo = new IntersectionObserver(function (entries) {
          entries.forEach(function (e) { e.isIntersecting ? startConsole() : stopConsole(); });
        }, { threshold: 0.2 });
        consoleIo.observe(stageEl.closest('.console') || stageEl);
      } else {
        startConsole();
      }
    }
  })();

  /* ==========================================================
     PINNED CINEMATIC SEQUENCE ENGINE — shared by "How I Work"
     (7 stages) and "Technical Focus" (3 capabilities). Vertical
     scroll drives horizontal position: the active panel owns the
     center, the previous one exits left, the next enters from the
     right, as one continuous scrub rather than a card carousel.

     Geometry (panel width → shift distance) is measured once on
     build and again on ScrollTrigger's onRefresh (font swap,
     resize) — never inside onUpdate, so scrubbing itself only ever
     does arithmetic + gsap.set and never forces a layout read while
     the visitor is actively scrolling. Pinned + scrubbed on desktop
     with motion allowed; a plain user-driven horizontal scroll-snap
     row everywhere else (touch, narrow viewport, reduced motion) —
     never a second RAF loop, never a resize/scroll listener firing
     per frame.
     ========================================================== */
  function createSequence(opts) {
    var pin = document.getElementById(opts.pinId);
    var track = document.getElementById(opts.trackId);
    var panels = track ? Array.prototype.slice.call(track.children) : [];
    var dots = opts.dotsId ? document.querySelectorAll('#' + opts.dotsId + ' .seq-dot') : [];
    var railFill = opts.railFillId ? document.getElementById(opts.railFillId) : null;
    if (!pin || !track || !panels.length) return;

    function setActivePanel(idx) {
      panels.forEach(function (p, i) { p.classList.toggle('active', i === idx); });
      dots.forEach(function (d, i) { d.classList.toggle('active', i === idx); });
      if (railFill) railFill.style.width = (panels.length > 1 ? (idx / (panels.length - 1)) * 100 : 0) + '%';
    }

    var canPin = hasGSAP && !reduceMotion && fineHover && window.matchMedia('(min-width: 900px)').matches;

    if (canPin) {
      pin.classList.add('pin-active');

      var lastStep = panels.length - 1;
      var lastIdx = 0;
      var shift = 0;

      function measure() {
        var panelW = panels[0].getBoundingClientRect().width;
        shift = panelW * 0.86 + Math.max(48, panelW * 0.12);
      }

      function render(progress) {
        panels.forEach(function (panel, i) {
          var delta = i - progress;
          var absDelta = Math.abs(delta);
          var eased = Math.min(absDelta, 1);
          var overflow = Math.max(absDelta - 1, 0);
          var dir = delta < 0 ? -1 : 1;
          var x = delta * shift + dir * overflow * shift * 0.5;
          var scale = 1 - eased * 0.16;
          var opacity = Math.max(1 - eased * 0.88 - overflow * 0.4, 0);
          // transform/opacity only — no per-frame style/zIndex writes here.
          // Stacking + pointer-events are handled once per whole-step
          // change (see setActivePanel via CSS .active), not every tick.
          gsap.set(panel, { x: x, scale: scale, opacity: opacity, force3D: true });
        });
      }

      var st;
      function build() {
        if (st) st.kill();
        measure();
        render(0);
        setActivePanel(0);
        lastIdx = 0;
        st = ScrollTrigger.create({
          trigger: pin,
          start: 'top top',
          end: '+=' + Math.round(window.innerHeight * lastStep * (opts.scrollLengthFactor || 0.9)),
          // Lenis already smooths the raw input before ScrollTrigger sees
          // it, so this only needs a very light touch of its own — a
          // larger value here double-smooths on top of Lenis, which reads
          // as "scroll, pause, catch up" instead of one continuous move.
          // Trimmed slightly further (0.15 → 0.1) now that Lenis's own
          // duration is shorter too, so the two stay in proportion.
          scrub: 0.1,
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onRefresh: measure,
          onUpdate: function (self) {
            var progress = self.progress * lastStep;
            render(progress);
            var idx = Math.round(progress);
            if (idx !== lastIdx) { lastIdx = idx; setActivePanel(idx); }
          }
        });
      }
      build();

      var resizeT;
      window.addEventListener('resize', function () {
        clearTimeout(resizeT);
        resizeT = setTimeout(build, 200);
      });
    } else {
      pin.classList.add('no-pin');
      setActivePanel(0);
      if ('IntersectionObserver' in window) {
        var fIo = new IntersectionObserver(function (entries) {
          entries.forEach(function (e) {
            if (e.isIntersecting) setActivePanel(panels.indexOf(e.target));
          });
        }, { root: track, threshold: 0.6 });
        panels.forEach(function (p) { fIo.observe(p); });
      }
    }
  }

  // scrollLengthFactor bumped up for both sequences (0.62→0.78,
  // 0.9→1.0) now that each stage is a full-viewport investigation
  // screen with real evidence to read — the scrub still moves 1:1
  // with input the instant the visitor scrolls, this only changes
  // how much scroll distance one full step covers.
  createSequence({ pinId: 'workflowPin', trackId: 'workflowTrack', dotsId: 'workflowDots', railFillId: 'workflowRailFill', scrollLengthFactor: 0.78 });
  createSequence({ pinId: 'focusPin', trackId: 'focusTrack', dotsId: 'focusDots', railFillId: 'focusRailFill', scrollLengthFactor: 1.0 });

  /* ==========================================================
     FEATURED CASE STUDY — pinned cinematic reveal. One scrub
     timeline: index/title scale in first, the status panel
     arrives next, then description/tags/CTA stagger in — a single
     continuous choreography rather than independent fade-ins.
     ========================================================== */
  (function () {
    var pin = document.getElementById('caseCinemaPin');
    if (!pin) return;

    var idxEl = document.getElementById('ccIdx');
    var titleEl = document.getElementById('ccTitle');
    var descEl = document.getElementById('ccDesc');
    var tagsEl = document.getElementById('ccTags');
    var pipelineEl = document.getElementById('ccPipeline');
    var ctaEl = document.getElementById('ccCta');
    var statusEl = document.getElementById('ccStatus');

    if (!hasGSAP || reduceMotion) {
      // No-motion / no-GSAP fallback: everything simply visible.
      [idxEl, titleEl, descEl, tagsEl, pipelineEl, ctaEl, statusEl].forEach(function (el) {
        if (el) { el.style.opacity = 1; el.style.transform = 'none'; }
      });
      return;
    }

    var tl = gsap.timeline({
      scrollTrigger: {
        trigger: pin,
        start: 'top 75%',
        end: 'top 20%',
        scrub: 0.1
      }
    });
    tl.to(idxEl, { opacity: 1, duration: 0.15 }, 0)
      .to(titleEl, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }, 0.05)
      .to(statusEl, { opacity: 1, y: 0, scale: 1, duration: 0.35, ease: 'power2.out' }, 0.25)
      .to(descEl, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }, 0.5)
      .to(tagsEl, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }, 0.65)
      .to(pipelineEl, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }, 0.76)
      .to(ctaEl, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }, 0.88);
  })();
})();
