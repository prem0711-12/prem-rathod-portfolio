(function () {
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fineHover = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var html = document.documentElement;

  /* ==========================================================
     SPLIT-LINE HEADLINE REVEAL — triggered once loader clears
     ========================================================== */
  function revealSplitLines() {
    document.querySelectorAll('.split-parent').forEach(function (el) {
      el.classList.add('split-ready');
    });
  }

  /* ==========================================================
     LOADER — short brand sequence, skipped after first visit
     in this browser session so internal navigation stays fast.
     ========================================================== */
  var loader = document.getElementById('loader');
  var loaderFill = document.getElementById('loaderFill');
  var isCinematicLoader = loader && loader.dataset.variant === 'cinematic';
  var alreadyLoaded = false;
  try { alreadyLoaded = sessionStorage.getItem('pr_loaded') === '1'; } catch (e) { alreadyLoaded = false; }

  function finishLoader() {
    if (!loader) return;
    loader.classList.add('done');
    try { sessionStorage.setItem('pr_loaded', '1'); } catch (e) {}
    revealSplitLines();
  }

  if (isCinematicLoader) {
    // Home page: the full cinematic name-reveal timeline (and its own
    // finish/skip/reduced-motion handling) lives in home.js, loaded
    // right after this file — nothing to do here.
  } else if (loader) {
    if (reduceMotion || alreadyLoaded) {
      // Skip the theatrical sequence — reveal instantly but keep it feeling intentional.
      if (loaderFill) loaderFill.style.width = '100%';
      setTimeout(finishLoader, reduceMotion ? 0 : 150);
    } else {
      var marks = loader.querySelectorAll('.loader-mark span');
      var role = loader.querySelector('.loader-role');
      if (window.gsap) {
        var tl = gsap.timeline({ onComplete: finishLoader });
        tl.to(marks, { y: 0, duration: 0.55, stagger: 0.05, ease: 'power3.out' })
          .to(role, { opacity: 1, duration: 0.35 }, '-=0.25')
          .to(loaderFill, { width: '100%', duration: 0.6, ease: 'power2.inOut' }, '-=0.3')
          .to(loader, { opacity: 0, duration: 0.4 }, '+=0.15');
      } else {
        marks.forEach(function (s, i) { s.style.transition = 'transform .5s ease ' + (i * 0.05) + 's'; s.style.transform = 'translateY(0)'; });
        if (role) { role.style.transition = 'opacity .35s ease .3s'; role.style.opacity = '1'; }
        if (loaderFill) { loaderFill.style.transition = 'width .6s ease .3s'; loaderFill.style.width = '100%'; }
        setTimeout(finishLoader, 1100);
      }
    }
  } else {
    revealSplitLines();
  }

  /* ==========================================================
     PAGE TRANSITION WIPE — intercepts internal same-origin nav
     ========================================================== */
  var wipe = document.getElementById('pageWipe');
  if (wipe && !reduceMotion) {
    document.querySelectorAll('a[href]').forEach(function (a) {
      var href = a.getAttribute('href');
      if (!href || href.charAt(0) === '#') return;
      if (a.target === '_blank' || a.hasAttribute('download')) return;
      if (/^https?:\/\//i.test(href) || href.indexOf('mailto:') === 0 || href.indexOf('tel:') === 0) return;
      a.addEventListener('click', function (e) {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        wipe.classList.add('active');
        if (window.gsap) {
          gsap.to(wipe, {
            y: '0%', duration: 0.5, ease: 'power3.inOut',
            onComplete: function () { window.location.href = href; }
          });
        } else {
          wipe.style.transition = 'transform .45s ease';
          wipe.style.transform = 'translateY(0%)';
          setTimeout(function () { window.location.href = href; }, 460);
        }
      });
    });
  }

  /* ==========================================================
     SMOOTH SCROLL (Lenis) — desktop, motion allowed
     ========================================================== */
  if (window.Lenis && !reduceMotion && fineHover) {
    try {
      // autoRaf defaults to true in Lenis 1.x, which means — unless it is
      // explicitly turned off — Lenis already runs its own internal RAF
      // loop the instant it's constructed. The block below ALSO calls
      // lenis.raf() from gsap.ticker every frame, so without autoRaf:false
      // the scroll position was being advanced by two independent clocks
      // at once. That's the actual mechanism behind the "scroll → pause →
      // catch up" feeling: two RAFs racing each other rather than one
      // continuous update. autoRaf:false makes GSAP's ticker the single
      // driver, which is what the comment below already assumed was
      // happening. duration is trimmed slightly further (0.8s → 0.7s) —
      // enough smoothing left to still read as cinematic, but short
      // enough that input no longer feels like it's "catching up".
      // Explicit cubic ease-out instead of Lenis's default exponential
      // curve. The exponential default has a long, slowly-decaying tail
      // as it approaches its target — the last portion of every scroll
      // move happens at a barely-perceptible creep, which is what reads
      // as lingering "catch-up" even after duration was already trimmed.
      // A cubic curve reaches its target in a bounded, evenly-decelerating
      // way: still smooth, no snap, but no long tail left over.
      var lenis = new Lenis({
        duration: 0.7,
        easing: function (t) { return 1 - Math.pow(1 - t, 3); },
        wheelMultiplier: 1,
        smoothWheel: true,
        autoRaf: false
      });
      html.classList.add('lenis', 'lenis-smooth');
      if (window.gsap && window.ScrollTrigger) {
        // Single driver: let GSAP's ticker tick Lenis. Do NOT also run a
        // self-contained requestAnimationFrame loop for Lenis — driving it
        // from two clocks at once was the main source of scroll jitter.
        lenis.on('scroll', ScrollTrigger.update);
        gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
        gsap.ticker.lagSmoothing(0);
      } else {
        // Fallback when GSAP isn't available: Lenis drives its own RAF.
        function raf(time) {
          lenis.raf(time);
          requestAnimationFrame(raf);
        }
        requestAnimationFrame(raf);
      }
    } catch (e) { /* smooth scroll is an enhancement, never block the page on it */ }
  }

  /* ==========================================================
     PARALLAX — hero glow/grid/content drift on scroll
     One ScrollTrigger driving one timeline (instead of three
     separate triggers on the same trigger element) — same visual
     result, a third of the trigger bookkeeping/measurement work.
     ========================================================== */
  if (window.gsap && window.ScrollTrigger && !reduceMotion) {
    gsap.registerPlugin(ScrollTrigger);
    var glow = document.querySelector('.hero-glow');
    var grid = document.querySelector('.hero-bg-grid');
    var heroShift = document.querySelector('.hero-shift');
    var heroEl = document.querySelector('.hero');
    if (heroEl && (glow || grid || heroShift)) {
      var heroTl = gsap.timeline({
        scrollTrigger: { trigger: heroEl, start: 'top top', end: 'bottom top', scrub: true }
      });
      if (glow) heroTl.to(glow, { y: 120, x: 40, ease: 'none' }, 0);
      if (grid) heroTl.to(grid, { y: -50, ease: 'none' }, 0);
      // Hand-off tween: the hero's own content recedes slightly as the
      // visitor scrolls through it, so the first scroll reads as "an
      // incident has been detected, now entering the investigation"
      // rather than an ordinary section boundary.
      if (heroShift) heroTl.to(heroShift, { opacity: 0.55, y: -26, scale: 0.985, ease: 'none', transformOrigin: 'top center' }, 0);

      // Trigger positions above were measured before web fonts (and the
      // hero's final line-heights) had settled — re-measure once they
      // have, so the scrub range doesn't drift out of sync with actual
      // scroll and feel stuck.
      var refreshST = function () { ScrollTrigger.refresh(); };
      if (document.fonts && document.fonts.ready) { document.fonts.ready.then(refreshST); }
      window.addEventListener('load', refreshST, { once: true });
    }
  }

  /* ==========================================================
     SCROLL REVEAL — plain sections + staggered groups
     ========================================================== */
  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) e.target.classList.add('in'); });
    }, { threshold: 0.15 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  }

  var staggerGroups = document.querySelectorAll('.stagger-group');
  if ('IntersectionObserver' in window && staggerGroups.length) {
    var sio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var items = e.target.querySelectorAll('.stagger-item');
        items.forEach(function (item, i) {
          setTimeout(function () { item.classList.add('in'); }, reduceMotion ? 0 : i * 90);
        });
        sio.unobserve(e.target);
      });
    }, { threshold: 0.2 });
    staggerGroups.forEach(function (el) { sio.observe(el); });
  } else {
    document.querySelectorAll('.stagger-item').forEach(function (el) { el.classList.add('in'); });
  }

  /* ==========================================================
     MOBILE NAV TOGGLE
     ========================================================== */
  var navToggle = document.querySelector('.nav-toggle');
  var navLinks = document.querySelector('.nav-links');
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', function () {
      var open = navLinks.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    navLinks.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        navLinks.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ==========================================================
     MAGNETIC BUTTONS — desktop, fine pointer only
     ========================================================== */
  if (!reduceMotion && fineHover) {
    document.querySelectorAll('.btn').forEach(function (btn) {
      btn.classList.add('magnetic');
      btn.addEventListener('mousemove', function (e) {
        var r = btn.getBoundingClientRect();
        var x = (e.clientX - r.left - r.width / 2) * 0.18;
        var y = (e.clientY - r.top - r.height / 2) * 0.28;
        btn.style.transform = 'translate(' + x + 'px,' + y + 'px)';
      });
      btn.addEventListener('mouseleave', function () { btn.style.transform = ''; });
    });
  }

  /* Home-page-only behavior (hero console simulation, the "How I
     Work" / "Technical Focus" pinned sequences, and the "Other
     Projects" archive) now lives in assets/js/home.js, loaded only
     by index.html — kept out of this shared file so about.html,
     contact.html, and the case-study page never pay for or depend
     on Home-only code. */

  /* ==========================================================
     CASE STUDY CHECKLIST — sticky, section-aware, progress spine

     Previously a plain `window.addEventListener('scroll', setActive)`
     that called `getBoundingClientRect()` on every checklist section
     (8 on this page) on every single native scroll event — with Lenis
     smooth-scrolling, that event can fire once per rendered frame, so
     this was doing 8 forced layout reads a frame while scrolling this
     page. Rebuilt on IntersectionObserver: the browser tracks section
     visibility itself (compositor-side, not main-thread layout reads),
     and setActive only re-runs when a section actually crosses the
     watch line — not on every scroll tick.
     ========================================================== */
  var checklistLinks = document.querySelectorAll('.checklist a');
  var checklistFill = document.getElementById('checklistFill');
  var sections = Array.prototype.map.call(checklistLinks, function (a) { return document.querySelector(a.getAttribute('href')); }).filter(Boolean);
  if (checklistLinks.length && sections.length) {
    var setActiveIdx = function (currentIdx) {
      checklistLinks.forEach(function (a, i) {
        a.classList.toggle('done', i < currentIdx);
        a.classList.toggle('active', i === currentIdx);
      });
      if (checklistFill) {
        var pct = sections.length > 1 ? (currentIdx / (sections.length - 1)) * 100 : 0;
        checklistFill.style.height = pct + '%';
      }
    };
    if ('IntersectionObserver' in window) {
      var visible = new Set();
      var checklistIo = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          var idx = sections.indexOf(e.target);
          if (e.isIntersecting) visible.add(idx); else visible.delete(idx);
        });
        if (visible.size) setActiveIdx(Math.min.apply(null, Array.from(visible)));
      }, { rootMargin: '0px 0px -60% 0px', threshold: 0 });
      sections.forEach(function (sec) { checklistIo.observe(sec); });
      setActiveIdx(0);
    } else {
      // Fallback for browsers without IntersectionObserver: same
      // getBoundingClientRect check as before, just this once on load.
      var current = sections[0];
      sections.forEach(function (sec) {
        if (sec.getBoundingClientRect().top < window.innerHeight * 0.4) current = sec;
      });
      setActiveIdx(sections.indexOf(current));
    }
  }

  /* ==========================================================
     WORKFLOW DIAGRAM — scroll-triggered step reveal
     ========================================================== */
  var flowSteps = document.querySelectorAll('.flow-step');
  if (flowSteps.length && 'IntersectionObserver' in window) {
    var flowIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          var i = Array.prototype.indexOf.call(flowSteps, e.target);
          setTimeout(function () { e.target.classList.add('lit'); }, i * 100);
          flowIo.unobserve(e.target);
        }
      });
    }, { threshold: 0.4 });
    flowSteps.forEach(function (el) { flowIo.observe(el); });
  }

  /* ==========================================================
     WORKFLOW SIMULATION — replay on demand
     ========================================================== */
  var runBtn = document.querySelector('#runSimBtn');
  var readoutState = document.querySelector('#simState');
  if (runBtn && flowSteps.length) {
    var running = false;
    runBtn.addEventListener('click', function () {
      if (running) return;
      running = true;
      runBtn.setAttribute('disabled', 'true');
      flowSteps.forEach(function (s) { s.classList.remove('sim-active'); });
      if (readoutState) readoutState.textContent = 'RUNNING…';
      var i = 0;
      var stepDelay = reduceMotion ? 0 : 260;
      function next() {
        if (i > 0) flowSteps[i - 1].classList.remove('sim-active');
        if (i >= flowSteps.length) {
          if (readoutState) readoutState.textContent = 'COMPLETE — RESPONSE SENT';
          runBtn.removeAttribute('disabled');
          running = false;
          return;
        }
        flowSteps[i].classList.add('lit');
        flowSteps[i].classList.add('sim-active');
        flowSteps[i].scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
        if (readoutState) readoutState.textContent = flowSteps[i].querySelector('.label').textContent;
        i++;
        setTimeout(next, stepDelay);
      }
      next();
    });
  }
})();
