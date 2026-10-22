/* =========================================================
   STILL® — interactions
   Vanilla JavaScript. No dependencies.
   ========================================================= */

(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  var body = doc.body;
  var reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  var fineQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
  var reducedMotion = reduceQuery.matches;
  var finePointer = fineQuery.matches;

  function $(selector, context) {
    return (context || doc).querySelector(selector);
  }

  function $$(selector, context) {
    return Array.prototype.slice.call((context || doc).querySelectorAll(selector));
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function safeStorage(action, key, value) {
    try {
      if (action === 'get') return window.localStorage.getItem(key);
      if (action === 'set') window.localStorage.setItem(key, value);
    } catch (error) {
      return null;
    }
    return null;
  }

  function safeSession(action, key, value) {
    try {
      if (action === 'get') return window.sessionStorage.getItem(key);
      if (action === 'set') window.sessionStorage.setItem(key, value);
    } catch (error) {
      return null;
    }
    return null;
  }

  /* -------------------------------------------------------
     Preloader
     ------------------------------------------------------- */
  var loader = $('#loader');
  var loaderCount = $('#loaderCount');
  var loaderBar = $('#loaderBar');
  var loaderFinished = false;

  function finishLoading() {
    if (loaderFinished) return;
    loaderFinished = true;
    body.classList.add('is-ready');

    if (!loader) return;

    loader.classList.add('is-done');
    window.setTimeout(function () {
      loader.hidden = true;
    }, 1050);
  }

  function initLoader() {
    if (!loader) {
      body.classList.add('is-ready');
      return;
    }

    if (reducedMotion || safeSession('get', 'still-seen') === '1') {
      loader.hidden = true;
      body.classList.add('is-ready');
      return;
    }

    safeSession('set', 'still-seen', '1');

    var startTime = null;
    var duration = 1200;

    function tick(now) {
      if (startTime === null) startTime = now;
      var progress = clamp((now - startTime) / duration, 0, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      var percent = Math.round(eased * 100);

      if (loaderCount) {
        loaderCount.textContent = String(percent).padStart(3, '0');
      }
      if (loaderBar) {
        loaderBar.style.transform = 'scaleX(' + eased + ')';
      }

      if (progress < 1) {
        window.requestAnimationFrame(tick);
      } else {
        window.setTimeout(finishLoading, 260);
      }
    }

    window.requestAnimationFrame(tick);

    // Failsafe: never leave the visitor staring at a loading screen.
    window.setTimeout(finishLoading, 2800);
  }

  initLoader();

  /* -------------------------------------------------------
     Theme toggle
     ------------------------------------------------------- */
  var themeToggle = $('#themeToggle');
  var themeMeta = $('meta[name="theme-color"]');

  function syncThemeUI() {
    if (!themeToggle) return;
    var isDark = root.dataset.theme === 'dark';
    themeToggle.setAttribute('aria-label', isDark ? '切换至浅色模式' : '切换至深色模式');
    themeToggle.setAttribute('aria-pressed', isDark ? 'true' : 'false');
    if (themeMeta) {
      themeMeta.setAttribute('content', isDark ? '#121210' : '#f3f0e9');
    }
  }

  function applyTheme(theme) {
    root.dataset.theme = theme;
    safeStorage('set', 'still-theme', theme);
    syncThemeUI();
  }

  syncThemeUI();

  if (themeToggle) {
    themeToggle.addEventListener('click', function () {
      var nextTheme = root.dataset.theme === 'dark' ? 'light' : 'dark';

      if (doc.startViewTransition && !reducedMotion) {
        doc.startViewTransition(function () {
          applyTheme(nextTheme);
        });
      } else {
        applyTheme(nextTheme);
      }
    });
  }

  /* -------------------------------------------------------
     Live Hong Kong clock + current year
     ------------------------------------------------------- */
  var clockElements = $$('[data-clock]');

  function updateClock() {
    if (!clockElements.length) return;

    var formatted = '--:--';
    try {
      formatted = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Hong_Kong',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).format(new Date());
    } catch (error) {
      var now = new Date();
      formatted = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    }

    clockElements.forEach(function (element) {
      element.textContent = formatted;
    });
  }

  updateClock();
  window.setInterval(updateClock, 15000);

  $$('[data-year]').forEach(function (element) {
    element.textContent = String(new Date().getFullYear());
  });

  /* -------------------------------------------------------
     Header, scroll progress, active navigation
     ------------------------------------------------------- */
  var header = $('#siteHeader');
  var progressBar = $('#progressBar');
  var contactSection = $('#contact');
  var scrollQueued = false;

  function updateScrollUI() {
    var y = window.scrollY || window.pageYOffset || 0;

    if (header) {
      header.classList.toggle('is-scrolled', y > 16);

      if (contactSection) {
        var headerEdge = header.offsetHeight + 10;
        var contactTop = contactSection.getBoundingClientRect().top;
        header.classList.toggle('is-inverse', contactTop <= headerEdge);
      }
    }

    if (progressBar) {
      var scrollable = root.scrollHeight - window.innerHeight;
      var progress = scrollable > 0 ? clamp(y / scrollable, 0, 1) : 0;
      progressBar.style.transform = 'scaleX(' + progress + ')';
    }

    scrollQueued = false;
  }

  function requestScrollUI() {
    if (scrollQueued) return;
    scrollQueued = true;
    window.requestAnimationFrame(updateScrollUI);
  }

  window.addEventListener('scroll', requestScrollUI, { passive: true });
  window.addEventListener('resize', requestScrollUI);
  updateScrollUI();

  var navLinks = $$('[data-nav]');

  if (navLinks.length && 'IntersectionObserver' in window) {
    var navObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (link) {
          link.classList.toggle('is-active', link.getAttribute('data-nav') === entry.target.id);
        });
      });
    }, { rootMargin: '-28% 0px -62% 0px', threshold: 0 });

    ['work', 'about', 'contact'].forEach(function (id) {
      var section = doc.getElementById(id);
      if (section) navObserver.observe(section);
    });
  }

  /* -------------------------------------------------------
     Mobile menu
     ------------------------------------------------------- */
  var menuToggle = $('#menuToggle');
  var siteMenu = $('#siteMenu');
  var menuOpen = false;
  var lastFocusedElement = null;

  function menuFocusables() {
    if (!siteMenu) return [];
    return $$('a[href], button:not([disabled])', siteMenu);
  }

  function openMenu() {
    if (!siteMenu || !menuToggle || menuOpen) return;
    menuOpen = true;
    lastFocusedElement = doc.activeElement;

    body.classList.add('menu-open');
    siteMenu.setAttribute('aria-hidden', 'false');
    menuToggle.setAttribute('aria-expanded', 'true');
    menuToggle.setAttribute('aria-label', '关闭菜单');

    window.setTimeout(function () {
      var firstLink = siteMenu.querySelector('a[href]');
      if (firstLink && menuOpen) firstLink.focus({ preventScroll: true });
    }, reducedMotion ? 20 : 420);
  }

  function closeMenu(restoreFocus) {
    if (!siteMenu || !menuToggle || !menuOpen) return;
    menuOpen = false;

    body.classList.remove('menu-open');
    siteMenu.setAttribute('aria-hidden', 'true');
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', '打开菜单');

    if (restoreFocus !== false) {
      var target = lastFocusedElement && lastFocusedElement.focus ? lastFocusedElement : menuToggle;
      window.setTimeout(function () {
        target.focus({ preventScroll: true });
      }, 40);
    }
  }

  if (menuToggle && siteMenu) {
    menuToggle.addEventListener('click', function () {
      if (menuOpen) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    $$('.brand, .footer-brand').forEach(function (link) {
      link.addEventListener('click', function () {
        if (menuOpen) closeMenu(false);
      });
    });

    $$('a[href]', siteMenu).forEach(function (link) {
      link.addEventListener('click', function () {
        closeMenu();
      });
    });

    siteMenu.addEventListener('click', function (event) {
      if (event.target === siteMenu) closeMenu();
    });

    doc.addEventListener('keydown', function (event) {
      if (!menuOpen) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        closeMenu();
        return;
      }

      if (event.key !== 'Tab') return;

      var links = menuFocusables();
      if (!links.length) return;

      var first = links[0];
      var last = links[links.length - 1];
      var current = doc.activeElement;

      if (!event.shiftKey) {
        if (current === last) {
          event.preventDefault();
          menuToggle.focus({ preventScroll: true });
        } else if (current === menuToggle) {
          event.preventDefault();
          first.focus({ preventScroll: true });
        }
      } else if (current === first) {
        event.preventDefault();
        menuToggle.focus({ preventScroll: true });
      } else if (current === menuToggle) {
        event.preventDefault();
        last.focus({ preventScroll: true });
      }
    });

    window.addEventListener('resize', function () {
      if (menuOpen && window.innerWidth > 960) closeMenu(false);
    });
  }

  /* -------------------------------------------------------
     Scroll reveals
     ------------------------------------------------------- */
  var revealElements = $$('[data-reveal]');

  if (reducedMotion || !('IntersectionObserver' in window)) {
    revealElements.forEach(function (element) {
      element.classList.add('is-visible');
    });
  } else {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -7% 0px' });

    revealElements.forEach(function (element) {
      revealObserver.observe(element);
    });
  }

  /* -------------------------------------------------------
     Animated counters
     ------------------------------------------------------- */
  var counters = $$('[data-count]');

  function formatCount(value, padding) {
    return String(value).padStart(padding, '0');
  }

  function animateCounter(element) {
    var target = parseInt(element.getAttribute('data-count'), 10);
    if (isNaN(target)) return;

    var padding = parseInt(element.getAttribute('data-pad'), 10) || 0;
    var duration = 1400;
    var startTime = null;

    function frame(now) {
      if (startTime === null) startTime = now;
      var progress = clamp((now - startTime) / duration, 0, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      element.textContent = formatCount(Math.round(target * eased), padding);

      if (progress < 1) {
        window.requestAnimationFrame(frame);
      } else {
        element.textContent = formatCount(target, padding);
      }
    }

    window.requestAnimationFrame(frame);
  }

  if (counters.length) {
    if (reducedMotion || !('IntersectionObserver' in window)) {
      counters.forEach(function (element) {
        var target = parseInt(element.getAttribute('data-count'), 10);
        var padding = parseInt(element.getAttribute('data-pad'), 10) || 0;
        if (!isNaN(target)) {
          element.textContent = formatCount(target, padding);
        }
      });
    } else {
      counters.forEach(function (element) {
        var padding = parseInt(element.getAttribute('data-pad'), 10) || 0;
        element.textContent = formatCount(0, padding);
      });

      var counterObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          animateCounter(entry.target);
          counterObserver.unobserve(entry.target);
        });
      }, { threshold: 0.55 });

      counters.forEach(function (element) {
        counterObserver.observe(element);
      });
    }
  }

  /* -------------------------------------------------------
     Custom cursor
     ------------------------------------------------------- */
  var cursor = $('#cursor');

  if (cursor && finePointer && !reducedMotion) {
    var mouseX = -100;
    var mouseY = -100;
    var ringX = -100;
    var ringY = -100;
    var cursorReady = false;

    function moveCursor(event) {
      if (!(event.target instanceof Element)) return;

      mouseX = event.clientX;
      mouseY = event.clientY;

      if (!cursorReady) {
        cursorReady = true;
        ringX = mouseX;
        ringY = mouseY;
        body.classList.add('has-cursor');
      }

      cursor.classList.remove('is-hidden');
      cursor.style.setProperty('--x', mouseX + 'px');
      cursor.style.setProperty('--y', mouseY + 'px');

      var interactive = event.target.closest('a, button, .project, .theme-toggle, .menu-toggle');
      cursor.classList.toggle('is-hover', Boolean(interactive));
    }

    function drawCursor() {
      ringX += (mouseX - ringX) * 0.16;
      ringY += (mouseY - ringY) * 0.16;
      cursor.style.setProperty('--rx', ringX.toFixed(2) + 'px');
      cursor.style.setProperty('--ry', ringY.toFixed(2) + 'px');
      window.requestAnimationFrame(drawCursor);
    }

    doc.addEventListener('pointermove', moveCursor, { passive: true });
    doc.addEventListener('pointerdown', function () {
      cursor.classList.add('is-down');
    });
    doc.addEventListener('pointerup', function () {
      cursor.classList.remove('is-down');
    });

    root.addEventListener('pointerleave', function () {
      cursor.classList.add('is-hidden');
    });

    root.addEventListener('pointerenter', function () {
      if (cursorReady) cursor.classList.remove('is-hidden');
    });

    window.requestAnimationFrame(drawCursor);
  }

  /* -------------------------------------------------------
     Hero pointer parallax
     ------------------------------------------------------- */
  var hero = $('.hero');

  if (hero && finePointer && !reducedMotion) {
    var heroQueued = false;
    var targetMX = 0;
    var targetMY = 0;

    function applyHeroParallax() {
      hero.style.setProperty('--mx', targetMX.toFixed(3));
      hero.style.setProperty('--my', targetMY.toFixed(3));
      heroQueued = false;
    }

    hero.addEventListener('pointermove', function (event) {
      var rect = hero.getBoundingClientRect();
      targetMX = clamp(((event.clientX - rect.left) / rect.width - 0.5) * 2, -1, 1);
      targetMY = clamp(((event.clientY - rect.top) / rect.height - 0.5) * 2, -1, 1);

      if (!heroQueued) {
        heroQueued = true;
        window.requestAnimationFrame(applyHeroParallax);
      }
    }, { passive: true });

    hero.addEventListener('pointerleave', function () {
      targetMX = 0;
      targetMY = 0;
      if (!heroQueued) {
        heroQueued = true;
        window.requestAnimationFrame(applyHeroParallax);
      }
    });
  }

  /* -------------------------------------------------------
     Magnetic buttons
     ------------------------------------------------------- */
  var magneticElements = $$('.magnetic');

  if (magneticElements.length && finePointer && !reducedMotion) {
    magneticElements.forEach(function (element) {
      var bounds = null;

      element.addEventListener('pointerenter', function () {
        bounds = element.getBoundingClientRect();
        element.classList.add('is-magnetic');
      });

      element.addEventListener('pointermove', function (event) {
        if (!bounds) bounds = element.getBoundingClientRect();

        var relX = event.clientX - bounds.left - bounds.width / 2;
        var relY = event.clientY - bounds.top - bounds.height / 2;
        var max = bounds.width * 0.08;
        var x = clamp(relX * 0.18, -max, max);
        var y = clamp(relY * 0.22, -max, max);

        element.style.transform = 'translate3d(' + x.toFixed(2) + 'px, ' + y.toFixed(2) + 'px, 0)';
      });

      element.addEventListener('pointerleave', function () {
        bounds = null;
        element.classList.remove('is-magnetic');
        element.style.transform = '';
      });
    });
  }

  /* -------------------------------------------------------
     Work preview that follows the pointer
     ------------------------------------------------------- */
  var workPreview = $('#workPreview');
  var projectsWrap = $('#projects');
  var projects = $$('.project');
  var previewCards = $$('.preview-card');

  if (workPreview && projectsWrap && projects.length && finePointer) {
    var previewX = 0;
    var previewY = 0;
    var targetX = 0;
    var targetY = 0;
    var previewQueued = false;
    var previewW = workPreview.offsetWidth || 280;
    var previewH = workPreview.offsetHeight || 360;

    function hidePreview() {
      workPreview.classList.remove('is-on');
    }

    function setPreviewTarget(event, snap) {
      var margin = 18;
      var offsetX = 28;

      targetX = Math.min(event.clientX + offsetX, window.innerWidth - previewW - margin);
      targetY = clamp(
        event.clientY - previewH * 0.36,
        margin,
        Math.max(margin, window.innerHeight - previewH - margin)
      );

      if (snap) {
        previewX = targetX;
        previewY = targetY;
        workPreview.style.transform = 'translate3d(' + previewX + 'px, ' + previewY + 'px, 0)';
      }
    }

    function drawPreview() {
      previewX += (targetX - previewX) * 0.16;
      previewY += (targetY - previewY) * 0.16;
      workPreview.style.transform = 'translate3d(' + previewX.toFixed(2) + 'px, ' + previewY.toFixed(2) + 'px, 0)';

      if (Math.abs(targetX - previewX) > 0.12 || Math.abs(targetY - previewY) > 0.12) {
        window.requestAnimationFrame(drawPreview);
      } else {
        previewQueued = false;
      }
    }

    function queuePreview() {
      if (previewQueued) return;
      previewQueued = true;
      window.requestAnimationFrame(drawPreview);
    }

    function activatePreview(project, event) {
      if (window.innerWidth <= 960) {
        hidePreview();
        return;
      }

      var key = project.getAttribute('data-project');
      previewCards.forEach(function (card) {
        card.classList.toggle('is-active', card.getAttribute('data-preview-card') === key);
      });

      var isFirst = !workPreview.classList.contains('is-on');
      setPreviewTarget(event, isFirst);
      workPreview.classList.add('is-on');
      queuePreview();
    }

    projects.forEach(function (project) {
      project.addEventListener('pointerenter', function (event) {
        activatePreview(project, event);
      });

      project.addEventListener('pointermove', function (event) {
        if (!workPreview.classList.contains('is-on')) return;
        setPreviewTarget(event, false);
        queuePreview();
      });
    });

    projectsWrap.addEventListener('pointerleave', hidePreview);
    window.addEventListener('scroll', hidePreview, { passive: true });
    window.addEventListener('resize', function () {
      previewW = workPreview.offsetWidth || 280;
      previewH = workPreview.offsetHeight || 360;
      if (window.innerWidth <= 960) hidePreview();
    });
  }

  /* -------------------------------------------------------
     A tiny nicety: pause the marquee when the tab is hidden
     ------------------------------------------------------- */
  var marqueeTrack = $('.marquee-track');

  if (marqueeTrack) {
    doc.addEventListener('visibilitychange', function () {
      marqueeTrack.style.animationPlayState = doc.hidden ? 'paused' : 'running';
    });
  }

  /* -------------------------------------------------------
     Re-evaluate motion preferences when the user changes them
     ------------------------------------------------------- */
  if (typeof reduceQuery.addEventListener === 'function') {
    reduceQuery.addEventListener('change', function (event) {
      if (event.matches) {
        revealElements.forEach(function (element) {
          element.classList.add('is-visible');
        });
        if (cursor) body.classList.remove('has-cursor');
      }
    });
  }
})();
