/* Targem! – minimales JavaScript: Burger-Menü + Kontakt-Formular (mailto) */
(function () {
  'use strict';

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
    // Menü schliessen, wenn ein Link geklickt wird (nur im mobilen Zustand)
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) closeNav();
    });
    // ESC schliesst das Menü
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeNav();
    });
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
