/* Targem! – JavaScript: Burger-Menü, Sticky-Header, Scroll-Reveal,
   Kontakt-Formular (mailto), Übersetzungs-Preisrechner und
   Einstufungstest. Ohne Frameworks. */
(function () {
  'use strict';

  /* ---------- Kleine Helfer ---------- */
  function $(id) { return document.getElementById(id); }
  function readJson(id) {
    var el = $(id);
    if (!el) return null;
    try { return JSON.parse(el.textContent); } catch (e) { return null; }
  }

  /* ---------- UI-Strings (Locale, vom Build injiziert) ----------
     Fällt auf deutsche Standardtexte zurück, wenn nichts injiziert ist. */
  var UISTR = readJson('ui-strings') || {};
  var UQ = UISTR.quiz || {};
  var UR = UISTR.rechner || {};
  var UF = UISTR.form || {};
  function s(v, def) { return (v === undefined || v === null) ? def : v; }

  /* ---------- Mobile-Navigation ---------- */
  var toggle = document.querySelector('.nav-toggle');
  var nav = $('hauptnavigation');

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

  /* ---------- Scroll-Reveal (wenn Bewegung erlaubt) ---------- */
  var motionOk = !window.matchMedia || !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (motionOk && 'IntersectionObserver' in window) {
    var sel = '.section-head, .card, .service, .package, .about-grid, .hero-copy, .hero-figure, ' +
      '.form-card, .contact-info, .cal-embed, .voice-card, .faq-item, .rechner-card, .referenzen';
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
  var form = $('kontakt-form');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = (form.elements['name'].value || '').trim();
      var anliegen = form.elements['anliegen'].value || '';
      var nachricht = (form.elements['nachricht'].value || '').trim();

      var subject = s(UF.subject, 'Anfrage über targem.ch') + (anliegen ? s(UF.subject_sep, ' – ') + anliegen : '');
      var lines = [];
      if (anliegen) lines.push(s(UF.label_anliegen, 'Anliegen: ') + anliegen);
      if (name) lines.push(s(UF.label_name, 'Name: ') + name);
      lines.push('');
      lines.push(nachricht);
      lines.push('');
      lines.push('---');
      lines.push(s(UF.footer, 'Gesendet über das Kontaktformular auf targem.ch'));

      var href = 'mailto:info@targem.ch'
        + '?subject=' + encodeURIComponent(subject)
        + '&body=' + encodeURIComponent(lines.join('\n'));

      window.location.href = href;

      var status = $('form-status');
      if (status) {
        status.hidden = false;
        status.focus();
      }
    });
  }

  /* ---------- Übersetzungs-Preisrechner ---------- */
  var rechnerCfg = readJson('rechner-config');
  if (rechnerCfg) initRechner(rechnerCfg);

  function initRechner(cfg) {
    var worte = $('r-worte');
    var richtung = $('r-richtung');
    var tempoRadios = document.querySelectorAll('input[name="tempo"]');
    var preisEl = $('r-preis');
    var offerteBtn = $('r-offerte');
    var zuschlagEl = $('r-zuschlag');
    if (!worte || !preisEl) return;
    if (zuschlagEl) zuschlagEl.textContent = String(cfg.express_zuschlag_prozent);

    function tempo() {
      var t = 'normal';
      Array.prototype.forEach.call(tempoRadios, function (r) { if (r.checked) t = r.value; });
      return t;
    }
    function compute() {
      var n = parseInt(worte.value, 10);
      if (!n || n < 0) return null;
      var price = n * cfg.preis_pro_wort_chf;
      if (tempo() === 'express') price *= (1 + cfg.express_zuschlag_prozent / 100);
      if (price < cfg.mindestpreis_chf) price = cfg.mindestpreis_chf;
      return Math.round(price);
    }
    function update() {
      var p = compute();
      if (p === null) { preisEl.textContent = s(UR.leer, 'CHF –'); return; }
      preisEl.textContent = s(UR.preis, 'CHF {p}.–').replace('{p}', p);
      var n = parseInt(worte.value, 10) || 0;
      var subject = s(UR.subject, 'Offerte-Anfrage Übersetzung – targem.ch');
      var lines = [
        s(UR.greeting, 'Guten Tag'),
        '',
        s(UR.intro, 'Ich möchte gerne eine Offerte für eine Übersetzung anfragen:'),
        s(UR.label_worte, 'Wortzahl (ungefähr): ') + n,
        s(UR.label_richtung, 'Sprachrichtung: ') + richtung.value,
        s(UR.label_bearbeitung, 'Bearbeitung: ') + (tempo() === 'express' ? s(UR.express, 'Express') : s(UR.normal, 'Normal')),
        s(UR.label_richtpreis, 'Unverbindlicher Richtpreis (laut Rechner): CHF ') + p + '.–',
        '',
        cfg.hinweis,
        '',
        s(UR.gruss, 'Freundliche Grüsse')
      ];
      offerteBtn.href = 'mailto:' + cfg.email
        + '?subject=' + encodeURIComponent(subject)
        + '&body=' + encodeURIComponent(lines.join('\n'));
    }
    worte.addEventListener('input', update);
    if (richtung) richtung.addEventListener('change', update);
    Array.prototype.forEach.call(tempoRadios, function (r) { r.addEventListener('change', update); });
    update();
  }

  /* ---------- Einstufungstest Deutsch ---------- */
  var testCfg = readJson('test-config');
  if (testCfg) initQuiz(testCfg);

  function initQuiz(cfg) {
    var quiz = $('quiz');
    if (!quiz) return;
    var fragen = cfg.fragen || [];
    var stufen = cfg.stufen || [];
    if (!fragen.length || !stufen.length) return;

    var intro = $('quiz-intro');
    var run = $('quiz-run');
    var result = $('quiz-result');
    var frageEl = $('quiz-frage');
    var optionenEl = $('quiz-optionen');
    var bar = $('quiz-bar');
    var countEl = $('quiz-count');
    var backBtn = $('quiz-back');
    var nextBtn = $('quiz-next');
    var niveauEl = $('quiz-niveau');
    var empfehlungEl = $('quiz-empfehlung');
    var startBtn = $('quiz-start');
    var restartBtn = $('quiz-restart');

    var idx = 0;
    var answers = [];

    function show(el, on) { if (el) el.hidden = !on; }

    function start() {
      idx = 0;
      answers = fragen.map(function () { return null; });
      show(intro, false); show(result, false); show(run, true);
      render();
      if (frageEl) frageEl.focus();
    }

    function render() {
      var f = fragen[idx];
      frageEl.textContent = f.frage;
      optionenEl.innerHTML = '';
      (f.optionen || []).forEach(function (opt, i) {
        var wrap = document.createElement('label');
        wrap.className = 'quiz-opt';
        var input = document.createElement('input');
        input.type = 'radio';
        input.name = 'quiz-q' + idx;
        input.value = String(opt.punkte);
        var selected = answers[idx] !== null && answers[idx].index === i;
        if (selected) { input.checked = true; wrap.classList.add('is-selected'); }
        input.addEventListener('change', function () {
          answers[idx] = { punkte: opt.punkte, index: i };
          nextBtn.disabled = false;
          Array.prototype.forEach.call(optionenEl.querySelectorAll('.quiz-opt'), function (l) {
            l.classList.remove('is-selected');
          });
          wrap.classList.add('is-selected');
        });
        var span = document.createElement('span');
        span.textContent = opt.text;
        wrap.appendChild(input);
        wrap.appendChild(span);
        optionenEl.appendChild(wrap);
      });
      nextBtn.disabled = answers[idx] === null;
      nextBtn.textContent = idx === fragen.length - 1 ? s(UQ.ergebnis, 'Ergebnis anzeigen') : s(UQ.weiter, 'Weiter');
      backBtn.disabled = idx === 0;
      bar.style.width = Math.round((idx / fragen.length) * 100) + '%';
      countEl.textContent = s(UQ.frage, 'Frage {n} von {total}').replace('{n}', idx + 1).replace('{total}', fragen.length);
    }

    function next() {
      if (answers[idx] === null) return;
      if (idx < fragen.length - 1) { idx++; render(); }
      else finish();
    }

    function back() { if (idx > 0) { idx--; render(); } }

    function finish() {
      var total = answers.reduce(function (s, a) { return s + (a ? a.punkte : 0); }, 0);
      var stufe = stufen[stufen.length - 1];
      for (var i = 0; i < stufen.length; i++) {
        if (total <= stufen[i].bis_punkte) { stufe = stufen[i]; break; }
      }
      niveauEl.textContent = stufe.niveau;
      empfehlungEl.textContent = stufe.empfehlung;
      bar.style.width = '100%';
      show(run, false); show(result, true);
      result.focus();
    }

    if (startBtn) startBtn.addEventListener('click', start);
    if (nextBtn) nextBtn.addEventListener('click', next);
    if (backBtn) backBtn.addEventListener('click', back);
    if (restartBtn) restartBtn.addEventListener('click', start);
  }
})();
