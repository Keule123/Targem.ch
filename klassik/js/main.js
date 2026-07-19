/* Targem! – JavaScript: Design-Umschalter, Burger-Menü, Sticky-Header,
   Scroll-Reveal und Kontakt-Formular (mailto). Ohne Frameworks. */
(function () {
  'use strict';

  var root = document.documentElement;
  var STORAGE_KEY = 'targem-design';

  /* ---------- Mobile-Navigation ---------- */
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('hauptnavigation');

  function closeNav() {
    if (!nav || !toggle) return;
    nav.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  }

  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) closeNav();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeNav();
    });
  }

  /* ---------- Design-Umschalter (klassisch <-> modern, ohne Reload) ---------- */
  var linkModern = document.getElementById('css-modern');
  var linkKlassisch = document.getElementById('css-klassisch');
  var opts = Array.prototype.slice.call(document.querySelectorAll('.design-opt'));

  function currentDesign() {
    return root.getAttribute('data-design') === 'klassisch' ? 'klassisch' : 'modern';
  }

  function syncButtons(d) {
    opts.forEach(function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-design') === d ? 'true' : 'false');
    });
  }

  function applyDesign(d, persist) {
    d = (d === 'klassisch') ? 'klassisch' : 'modern';
    root.setAttribute('data-design', d);
    if (linkModern && linkKlassisch) {
      if (d === 'klassisch') {
        linkKlassisch.media = 'all';
        linkModern.media = 'not all';
      } else {
        linkModern.media = 'all';
        linkKlassisch.media = 'not all';
      }
    }
    if (persist) {
      try { localStorage.setItem(STORAGE_KEY, d); } catch (e) {}
      // Beim Live-Wechsel: keine Reveal-Elemente unsichtbar hängen lassen.
      Array.prototype.forEach.call(document.querySelectorAll('.reveal'), function (el) {
        el.classList.add('is-visible');
      });
    }
    syncButtons(d);
  }

  // Buttons an tatsächlichen Zustand (aus dem Inline-Head-Skript) angleichen.
  syncButtons(currentDesign());
  opts.forEach(function (b) {
    b.addEventListener('click', function () {
      applyDesign(b.getAttribute('data-design'), true);
    });
  });

  /* ---------- Sticky-Header verkleinern beim Scrollen ---------- */
  var header = document.querySelector('.site-header');
  if (header) {
    var onScroll = function () {
      if (window.scrollY > 24) header.classList.add('is-scrolled');
      else header.classList.remove('is-scrolled');
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---------- Scroll-Reveal (nur modern + wenn Bewegung erlaubt) ---------- */
  var motionOk = !window.matchMedia || !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (currentDesign() === 'modern' && motionOk && 'IntersectionObserver' in window) {
    var sel = '.section-head, .card, .service, .package, .about-grid, .hero-copy, .hero-figure, .form-card, .contact-info, .cal-embed';
    var els = Array.prototype.slice.call(document.querySelectorAll(sel));
    els.forEach(function (el) { el.classList.add('reveal'); });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('is-visible');
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Kontakt-Formular -> mailto ---------- */
  var form = document.getElementById('kontakt-form');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = (form.elements['name'].value || '').trim();
      var anliegen = form.elements['anliegen'].value || '';
      var nachricht = (form.elements['nachricht'].value || '').trim();

      var subject = 'Anfrage über targem.ch' + (anliegen ? ' – ' + anliegen : '');
      var lines = [];
      if (anliegen) lines.push('Anliegen: ' + anliegen);
      if (name) lines.push('Name: ' + name);
      lines.push('');
      lines.push(nachricht);
      lines.push('');
      lines.push('---');
      lines.push('Gesendet über das Kontaktformular auf targem.ch');

      var href = 'mailto:info@targem.ch'
        + '?subject=' + encodeURIComponent(subject)
        + '&body=' + encodeURIComponent(lines.join('\n'));

      window.location.href = href;

      var status = document.getElementById('form-status');
      if (status) {
        status.hidden = false;
        status.focus();
      }
    });
  }
})();
