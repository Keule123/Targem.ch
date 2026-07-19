#!/usr/bin/env node
/**
 * Targem! – Static Site Builder
 * ------------------------------------------------------------------
 * Liest content/*.json + templates/*.html, ersetzt Platzhalter und
 * schreibt die fertige Website nach dist/.
 *
 *   node build.mjs
 *
 * KEINE npm-Abhängigkeiten. Läuft mit Node >= 18 ohne Installation.
 *
 * Mehrsprachigkeit (Locales):
 *   - Deutsch (de) ist die Basissprache. Inhalte in content/*.json.
 *   - Arabisch (ar) spiegelt die Struktur in content/ar/*.json.
 *     Fehlende AR-Werte fallen per tiefem Merge auf Deutsch zurück,
 *     damit nie etwas leer erscheint.
 *   - Die deutsche Seite landet in dist/, die arabische in dist/ar/
 *     mit <html lang="ar" dir="rtl">.
 *   - Impressum/Datenschutz bleiben nur deutsch (rechtlich massgeblich).
 *
 * Mini-Template-Sprache (in templates/*.html):
 *   {{ pfad.zum.wert }}         -> Wert, HTML-escaped
 *   {{{ pfad.zum.wert }}}       -> Wert, roh (nicht escaped)
 *   {{ helfer argument }}       -> Helfer-Ausgabe (roh HTML), z. B. {{ paragraphs text }}
 *   {{#if pfad}} ... {{else}} ... {{/if}}
 *   {{#each liste}} ... {{/each}}   (innen: {{ feld }}, {{ this }}, {{ @index }})
 * ------------------------------------------------------------------
 */

import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { PDFDocument, textWidth } from './tools/pdf.mjs';
import { qrSvg } from './tools/qr.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
const CONTENT = join(ROOT, 'content');
const TEMPLATES = join(ROOT, 'templates');
const DIST = join(ROOT, 'dist');

const SITE_URL = 'https://www.targem.ch';
const HOSTNAME = 'www.targem.ch';

/* ============================================================
   Hilfsfunktionen: Escaping & Text -> HTML
   ============================================================ */

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Inline-Markdown (nur **fett** und [text](url)) auf bereits escaptem Text. */
function mdInline(text) {
  let s = esc(text);
  s = s.replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\[([^\]]+?)\]\(([^)]+?)\)/g, (_m, t, u) => `<a href="${u}">${t}</a>`);
  return s;
}

/** Absätze: Leerzeilen trennen <p>, einzelne Zeilenumbrüche werden zu <br>. */
function paragraphs(text) {
  return String(text).trim().split(/\n\s*\n/).map(
    (block) => '<p>' + esc(block).replace(/\n/g, '<br>\n') + '</p>'
  ).join('\n');
}

/** Wie paragraphs(), zusätzlich mit Inline-Markdown (fett/Links). Für Rechtstexte. */
function mdParagraphs(text) {
  return String(text).trim().split(/\n\s*\n/).map(
    (block) => '<p>' + mdInline(block).replace(/\n/g, '<br>\n') + '</p>'
  ).join('\n');
}

/** Adress-Block: jede Zeile mit Inline-Markdown, verbunden durch <br>. */
function adrblock(text) {
  return mdInline(String(text).trim()).replace(/\n/g, '<br>\n');
}

/** "3075 Rüfenacht, Schweiz" -> "3075 Rüfenacht<br>Schweiz" (escaped). */
function brlines(text) {
  return esc(text).replace(/, /g, '<br>');
}

const MONATE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

/** "2026-07-19" -> "19. Juli 2026". Fällt auf Rohwert zurück, wenn kein ISO-Datum. */
function datumDe(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
  if (!m) return esc(iso || '');
  return `${Number(m[3])}. ${MONATE[Number(m[2]) - 1]} ${m[1]}`;
}

/* ============================================================
   Mini-Template-Engine
   ============================================================ */

function tokenize(tpl) {
  const re = /\{\{\{\s*([\s\S]*?)\s*\}\}\}|\{\{\s*([\s\S]*?)\s*\}\}/g;
  const tokens = [];
  let last = 0, m;
  while ((m = re.exec(tpl))) {
    if (m.index > last) tokens.push({ t: 'text', v: tpl.slice(last, m.index) });
    if (m[1] !== undefined) tokens.push({ t: 'raw', v: m[1].trim() });
    else tokens.push({ t: 'tag', v: m[2].trim() });
    last = re.lastIndex;
  }
  if (last < tpl.length) tokens.push({ t: 'text', v: tpl.slice(last) });
  return tokens;
}

function parse(tokens) {
  let i = 0;
  function walk() {
    const nodes = [];
    while (i < tokens.length) {
      const tok = tokens[i];
      if (tok.t === 'text') { nodes.push({ type: 'text', value: tok.v }); i++; continue; }
      if (tok.t === 'raw') { nodes.push({ type: 'raw', expr: tok.v }); i++; continue; }
      const v = tok.v;
      if (v === '/if' || v === '/each' || v === 'else') return { nodes, closer: v };
      if (v.startsWith('#if ')) {
        i++;
        const cond = v.slice(4).trim();
        const a = walk();
        let elseNodes = [];
        if (a.closer === 'else') { i++; const b = walk(); elseNodes = b.nodes; if (b.closer === '/if') i++; }
        else if (a.closer === '/if') { i++; }
        nodes.push({ type: 'if', cond, then: a.nodes, else: elseNodes });
        continue;
      }
      if (v.startsWith('#each ')) {
        i++;
        const path = v.slice(6).trim();
        const a = walk();
        if (a.closer === '/each') i++;
        nodes.push({ type: 'each', path, body: a.nodes });
        continue;
      }
      nodes.push({ type: 'var', expr: v }); i++;
    }
    return { nodes, closer: null };
  }
  return walk().nodes;
}

const HELPERS = {
  paragraphs, md: mdParagraphs, mdinline: mdInline, adrblock, brlines,
  datum: datumDe,
  telhref: (v) => 'tel:' + String(v).replace(/\s+/g, ''),
};

function truthy(v) {
  if (Array.isArray(v)) return v.length > 0;
  if (v === undefined || v === null || v === false || v === '' || v === 0) return false;
  return true;
}

function makeScope(item, idx, len) {
  const meta = { '@index': idx, '@number': idx + 1, '@first': idx === 0, '@last': idx === len - 1, 'this': item };
  if (item && typeof item === 'object' && !Array.isArray(item)) return Object.assign({}, item, meta);
  return meta;
}

function lookup(path, stack) {
  if (path === '.' || path === 'this') {
    for (let k = stack.length - 1; k >= 0; k--) if (stack[k] && 'this' in stack[k]) return stack[k].this;
    return undefined;
  }
  const parts = path.split('.');
  for (let k = stack.length - 1; k >= 0; k--) {
    const scope = stack[k];
    if (scope && typeof scope === 'object' && (parts[0] in scope)) {
      let cur = scope, ok = true;
      for (const p of parts) {
        if (cur != null && typeof cur === 'object' && (p in cur)) cur = cur[p];
        else { ok = false; break; }
      }
      if (ok) return cur;
    }
  }
  return undefined;
}

function interp(expr, stack, escapeIt) {
  if (/\s/.test(expr)) {
    const idx = expr.indexOf(' ');
    const h = expr.slice(0, idx);
    const arg = expr.slice(idx + 1).trim();
    if (HELPERS[h]) return HELPERS[h](lookup(arg, stack));
    // Unbekannter Helfer -> als normaler Pfad behandeln
  }
  const val = lookup(expr, stack);
  const s = val === undefined || val === null ? '' : String(val);
  return escapeIt ? esc(s) : s;
}

function render(nodes, stack) {
  let out = '';
  for (const n of nodes) {
    if (n.type === 'text') out += n.value;
    else if (n.type === 'var') out += interp(n.expr, stack, true);
    else if (n.type === 'raw') out += interp(n.expr, stack, false);
    else if (n.type === 'if') out += truthy(lookup(n.cond, stack)) ? render(n.then, stack) : render(n.else, stack);
    else if (n.type === 'each') {
      const arr = lookup(n.path, stack);
      if (Array.isArray(arr)) arr.forEach((item, idx) => { out += render(n.body, stack.concat([makeScope(item, idx, arr.length)])); });
    }
  }
  return out;
}

function renderTemplate(name, data) {
  const tpl = readFileSync(join(TEMPLATES, name), 'utf8');
  return render(parse(tokenize(tpl)), [data]);
}

/* ============================================================
   Inhalte laden (mit Locale-Merge)
   ============================================================ */

/** Tiefer Merge: Override (locale) über Basis (Deutsch).
 *  - Objekte werden rekursiv zusammengeführt.
 *  - Arrays werden elementweise gemerkt (Länge = Override), damit die
 *    AR-Datei nur die zu übersetzenden Felder je Eintrag angeben muss;
 *    fehlende Felder (z. B. Preis, Icon) erben aus dem Deutschen.
 *  - undefined/null im Override -> Basiswert bleibt (Fallback auf Deutsch).
 */
function isPlainObject(v) { return v !== null && typeof v === 'object' && !Array.isArray(v); }
function deepMerge(base, ov) {
  if (ov === undefined || ov === null) return base;
  if (Array.isArray(base) && Array.isArray(ov)) {
    return ov.map((item, i) => deepMerge(base[i], item));
  }
  if (isPlainObject(base) && isPlainObject(ov)) {
    const out = {};
    for (const k of new Set([...Object.keys(base), ...Object.keys(ov)])) {
      out[k] = (k in ov) ? deepMerge(base[k], ov[k]) : base[k];
    }
    return out;
  }
  return ov;
}

/** Content-Dateien: interner Schlüssel -> Dateiname. */
const CONTENT_FILES = {
  allgemein: 'allgemein.json',
  startseite: 'startseite.json',
  angebote: 'angebote.json',
  pakete: 'pakete.json',
  aktuell: 'aktuell.json',
  buchung: 'buchung.json',
  rechtliches: 'rechtliches.json',
  kundenstimmen: 'kundenstimmen.json',
  faq: 'faq.json',
  rechner: 'rechner.json',
  einstufungstest: 'einstufungstest.json',
  wortDerWoche: 'wort-der-woche.json',
  story: 'story.json',
};

function readJsonFile(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

/** Lädt alle Content-Dateien für eine Locale (de = Basis, sonst gemergt). */
function loadContent(locale) {
  const out = {};
  for (const [key, file] of Object.entries(CONTENT_FILES)) {
    const base = readJsonFile(join(CONTENT, file));
    if (locale === 'de') {
      out[key] = structuredClone(base);
    } else {
      const ovPath = join(CONTENT, locale, file);
      const ov = existsSync(ovPath) ? readJsonFile(ovPath) : undefined;
      out[key] = structuredClone(ov ? deepMerge(base, ov) : base);
    }
  }
  return out;
}

const BUILD_DATE = new Date().toISOString().slice(0, 10);

/* ============================================================
   UI-Strings (fest im Template/js verankerte Bedientexte)
   ------------------------------------------------------------
   ENTWURF für Arabisch – von der Inhaberin zu prüfen.
   ============================================================ */

const UI = {
  de: {
    skip: 'Zum Inhalt springen',
    brand_aria: 'Targem! – Startseite',
    menu_aria: 'Menü öffnen und schliessen',
    nav_aria: 'Hauptnavigation',
    footer_nav_aria: 'Footer-Navigation',
    nav_start: 'Start',
    nav_ueber: 'Über mich',
    nav_sprachkurse: 'Sprachkurse',
    nav_uebersetzungen: 'Übersetzungen & Dolmetschen',
    nav_preise: 'Preise',
    nav_faq: 'FAQ',
    nav_kontakt: 'Kontakt',
    min_unit: 'Minuten',
    portrait_alt: 'Inhaberin von Targem!',
    badges_aria: 'Qualifikationen',
    booking_note_1: 'Um eine Buchung vorzunehmen, kontaktieren Sie mich schnell und einfach über das',
    booking_note_link: 'Kontaktformular weiter unten',
    pdf_download: 'Preisliste als PDF herunterladen',
    pdf_sprache: '',
    quiz_intro: 'Der Test dauert nur wenige Minuten. Ihre Antworten bleiben auf Ihrem Gerät – es werden keine Daten übertragen.',
    quiz_sprachhinweis: '',
    quiz_back: 'Zurück',
    quiz_next: 'Weiter',
    quiz_result_label: 'Ihr geschätztes Niveau',
    quiz_cta: 'Kostenlose Probelektion anfragen',
    quiz_restart: 'Test wiederholen',
    quiz_disclaimer: 'Diese Einschätzung ist eine unverbindliche Orientierung und ersetzt kein persönliches Gespräch.',
    rechner_worte_label: 'Ungefähre Wortzahl',
    rechner_worte_ph: 'z. B. 500',
    rechner_richtung_label: 'Sprachrichtung',
    rechner_richtung_de_ar: 'Deutsch → Arabisch',
    rechner_richtung_ar_de: 'Arabisch → Deutsch',
    rechner_tempo_aria: 'Bearbeitungstempo',
    rechner_normal: 'Normal',
    rechner_express: 'Express',
    rechner_out_label: 'Unverbindlicher Richtpreis',
    rechner_preis_leer: 'CHF –',
    rechner_offerte: 'Offerte anfragen',
    voices_google: 'Bewerten Sie uns auf Google',
    wort_bedeutung: 'Bedeutung',
    wort_beispiel: 'Beispiel',
    kontakt_email_btn: 'E-Mail schreiben',
    kontakt_anrufen: 'Anrufen',
    kontakt_whatsapp: 'WhatsApp',
    vcard_title: 'Kontakt speichern',
    vcard_text: 'QR-Code scannen oder Datei herunterladen – so haben Sie meine Kontaktdaten sofort im Adressbuch.',
    vcard_btn: 'Kontakt speichern (.vcf)',
    form_name: 'Name',
    form_name_ph: 'Ihr Name',
    form_anliegen: 'Anliegen',
    form_anliegen_default: 'Option wählen …',
    form_anliegen_sprachkurse: 'Sprachkurse',
    form_anliegen_uebersetzung: 'Übersetzung',
    form_anliegen_korrektur: 'Korrekturlesen',
    form_anliegen_dolmetschen: 'Dolmetschen',
    form_anliegen_anderes: 'Anderes Anliegen',
    form_nachricht: 'Nachricht',
    form_nachricht_ph: 'Wie kann ich Ihnen helfen?',
    form_senden: 'Nachricht senden',
    form_hint_1: 'Beim Absenden öffnet sich Ihr E-Mail-Programm mit einer vorausgefüllten Nachricht an',
    form_hint_2: '– so behalten Sie die volle Kontrolle über Ihre Angaben.',
    form_status_1: 'Ihr E-Mail-Programm sollte sich nun geöffnet haben. Klappt das nicht, schreiben Sie mir bitte direkt an',
    booking_eyebrow: 'Buchung',
    booking_title: 'Termin buchen',
    footer_nav_titel: 'Navigation',
    footer_kontakt_titel: 'Kontakt & Rechtliches',
    footer_impressum: 'Impressum',
    footer_datenschutz: 'Datenschutz',
    legal_sprache: '',
    instagram_aria: 'Targem! auf Instagram',
    version_label: 'Version:',
    version_neu: 'Neu',
    version_bisherig: 'Bisherig',
    err_title: 'Seite nicht gefunden | Targem!',
    err_h1: 'Diese Seite gibt es leider nicht',
    err_text: 'Vielleicht wurde die Seite verschoben oder der Link ist nicht mehr aktuell. Kein Problem – kehren Sie einfach zur Startseite zurück.',
    err_btn: 'Zur Startseite',
  },
  ar: {
    skip: 'انتقل إلى المحتوى',
    brand_aria: 'Targem! – الصفحة الرئيسية',
    menu_aria: 'فتح القائمة وإغلاقها',
    nav_aria: 'التنقّل الرئيسي',
    footer_nav_aria: 'تنقّل التذييل',
    nav_start: 'البداية',
    nav_ueber: 'من أنا',
    nav_sprachkurse: 'دورات لغوية',
    nav_uebersetzungen: 'الترجمة التحريرية والشفهية',
    nav_preise: 'الأسعار',
    nav_faq: 'أسئلة شائعة',
    nav_kontakt: 'تواصل',
    min_unit: 'دقيقة',
    portrait_alt: 'صاحبة Targem!',
    badges_aria: 'المؤهلات',
    booking_note_1: 'لإجراء حجز، تواصلوا معي بسرعة وسهولة عبر',
    booking_note_link: 'نموذج التواصل في الأسفل',
    pdf_download: 'تنزيل قائمة الأسعار بصيغة PDF',
    pdf_sprache: '(بالألمانية)',
    quiz_intro: 'يستغرق الاختبار دقائق قليلة فقط. تبقى إجاباتكم على جهازكم – ولا يتم نقل أي بيانات.',
    quiz_sprachhinweis: 'ملاحظة: أسئلة الاختبار باللغة الألمانية، لأنه اختبار لتحديد مستواكم في الألمانية – وهو موجّه تحديداً للناطقين بالعربية.',
    quiz_back: 'السابق',
    quiz_next: 'التالي',
    quiz_result_label: 'مستواكم المقدَّر',
    quiz_cta: 'اطلبوا درساً تجريبياً مجانياً',
    quiz_restart: 'إعادة الاختبار',
    quiz_disclaimer: 'هذا التقدير توجيه غير مُلزِم ولا يغني عن حديث شخصي.',
    rechner_worte_label: 'عدد الكلمات التقريبي',
    rechner_worte_ph: 'مثلاً 500',
    rechner_richtung_label: 'اتجاه الترجمة',
    rechner_richtung_de_ar: 'من الألمانية إلى العربية',
    rechner_richtung_ar_de: 'من العربية إلى الألمانية',
    rechner_tempo_aria: 'سرعة الإنجاز',
    rechner_normal: 'عادي',
    rechner_express: 'سريع',
    rechner_out_label: 'سعر استرشادي غير مُلزِم',
    rechner_preis_leer: 'CHF –',
    rechner_offerte: 'اطلبوا عرض سعر',
    voices_google: 'قيّمونا على Google',
    wort_bedeutung: 'المعنى',
    wort_beispiel: 'مثال',
    kontakt_email_btn: 'أرسلوا بريداً إلكترونياً',
    kontakt_anrufen: 'اتصلوا',
    kontakt_whatsapp: 'واتساب',
    vcard_title: 'حفظ جهة الاتصال',
    vcard_text: 'امسحوا رمز QR أو نزّلوا الملف – لتحفظوا بياناتي فوراً في دفتر العناوين.',
    vcard_btn: 'حفظ جهة الاتصال (.vcf)',
    form_name: 'الاسم',
    form_name_ph: 'اسمكم',
    form_anliegen: 'الطلب',
    form_anliegen_default: 'اختاروا خياراً …',
    form_anliegen_sprachkurse: 'دورات لغوية',
    form_anliegen_uebersetzung: 'ترجمة تحريرية',
    form_anliegen_korrektur: 'تدقيق لغوي',
    form_anliegen_dolmetschen: 'ترجمة شفهية',
    form_anliegen_anderes: 'طلب آخر',
    form_nachricht: 'الرسالة',
    form_nachricht_ph: 'كيف يمكنني مساعدتكم؟',
    form_senden: 'إرسال الرسالة',
    form_hint_1: 'عند الإرسال يفتح برنامج البريد لديكم برسالة مُعبّأة مسبقاً إلى',
    form_hint_2: '– وهكذا تحتفظون بالسيطرة الكاملة على بياناتكم.',
    form_status_1: 'من المفترض أن يكون برنامج البريد لديكم قد فُتِح الآن. إن لم يحدث ذلك، راسلوني مباشرة على',
    booking_eyebrow: 'الحجز',
    booking_title: 'حجز موعد',
    footer_nav_titel: 'التنقّل',
    footer_kontakt_titel: 'التواصل والشؤون القانونية',
    footer_impressum: 'بيانات الناشر (Impressum)',
    footer_datenschutz: 'سياسة الخصوصية',
    legal_sprache: '(بالألمانية فقط)',
    instagram_aria: 'Targem! على إنستغرام',
    version_label: 'الإصدار:',
    version_neu: 'الجديد',
    version_bisherig: 'السابق',
    err_title: 'الصفحة غير موجودة | Targem!',
    err_h1: 'عذراً، هذه الصفحة غير موجودة',
    err_text: 'ربما نُقِلت الصفحة أو لم يعد الرابط صالحاً. لا مشكلة – عودوا ببساطة إلى الصفحة الرئيسية.',
    err_btn: 'إلى الصفحة الرئيسية',
  },
};

/* UI-Strings, die js/main.js zur Laufzeit braucht (werden ins HTML injiziert). */
const UI_JS = {
  de: {
    quiz: { weiter: 'Weiter', ergebnis: 'Ergebnis anzeigen', frage: 'Frage {n} von {total}' },
    rechner: {
      leer: 'CHF –',
      subject: 'Offerte-Anfrage Übersetzung – targem.ch',
      greeting: 'Guten Tag',
      intro: 'Ich möchte gerne eine Offerte für eine Übersetzung anfragen:',
      label_worte: 'Wortzahl (ungefähr): ',
      label_richtung: 'Sprachrichtung: ',
      label_bearbeitung: 'Bearbeitung: ',
      express: 'Express',
      normal: 'Normal',
      label_richtpreis: 'Unverbindlicher Richtpreis (laut Rechner): CHF ',
      gruss: 'Freundliche Grüsse',
      preis: 'CHF {p}.–',
    },
    form: {
      subject: 'Anfrage über targem.ch',
      subject_sep: ' – ',
      label_anliegen: 'Anliegen: ',
      label_name: 'Name: ',
      footer: 'Gesendet über das Kontaktformular auf targem.ch',
    },
  },
  ar: {
    quiz: { weiter: 'التالي', ergebnis: 'عرض النتيجة', frage: 'السؤال {n} من {total}' },
    rechner: {
      leer: 'CHF –',
      subject: 'طلب عرض سعر لترجمة – targem.ch',
      greeting: 'تحية طيبة',
      intro: 'أودّ الحصول على عرض سعر لترجمة:',
      label_worte: 'عدد الكلمات (تقريباً): ',
      label_richtung: 'اتجاه الترجمة: ',
      label_bearbeitung: 'نوع الإنجاز: ',
      express: 'سريع',
      normal: 'عادي',
      label_richtpreis: 'سعر استرشادي غير مُلزِم (حسب الحاسبة): CHF ',
      gruss: 'مع خالص التحية',
      preis: 'CHF {p}.–',
    },
    form: {
      subject: 'استفسار عبر targem.ch',
      subject_sep: ' – ',
      label_anliegen: 'الطلب: ',
      label_name: 'الاسم: ',
      footer: 'أُرسِلت عبر نموذج التواصل على targem.ch',
    },
  },
};

/* Leistungs-Icons (SVG) je nach gewähltem Icon-Schlüssel */
const LEISTUNG_ICONS = {
  uebersetzung: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h7"/><path d="M9 3v2c0 4.4-2.2 7.6-5 9"/><path d="M5 9c0 2.4 2.7 4.5 6 5"/><path d="m13 21 4-9 4 9"/><path d="M14.5 17h5"/></svg>',
  korrektur: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
  dolmetschen: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z"/><path d="M8 9h8"/><path d="M8 13h5"/></svg>',
};

/* JSON sicher in ein <script>-Tag einbetten (kein </script>-Ausbruch). */
function jsonForScript(obj) {
  return JSON.stringify(obj).replace(/</g, '\\u003c');
}

/* ============================================================
   Locale-Daten zusammenbauen
   ============================================================ */

/** vCard 3.0 aus DE-Inhalten (einmalig, gemeinsam für beide Sprachen). */
function buildVCard(allgemein, name) {
  const parts = String(name).trim().split(/\s+/);
  const last = parts.length > 1 ? parts[parts.length - 1] : name;
  const first = parts.length > 1 ? parts.slice(0, -1).join(' ') : '';
  const tel = '+' + String(allgemein.whatsapp_nummer || '').replace(/\D/g, '');
  const adr = String(allgemein.adresse || '');
  const [ortTeil, landTeil] = adr.split(',').map((s) => s.trim());
  const m = /^(\d+)\s+(.+)$/.exec(ortTeil || '');
  const plz = m ? m[1] : '';
  const ort = m ? m[2] : (ortTeil || '');
  const land = landTeil || '';
  return [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${last};${first};;;`,
    `FN:${name}`,
    'ORG:Targem!',
    `TEL;TYPE=CELL,VOICE:${tel}`,
    `EMAIL;TYPE=INTERNET:${allgemein.email}`,
    `URL:${SITE_URL}`,
    `ADR;TYPE=WORK:;;;${ort};;${plz};${land}`,
    'NOTE:Sprachkurse und Übersetzungen Deutsch/Arabisch',
    'END:VCARD',
    '',
  ].join('\r\n');
}

/* ---- PDF-Preisliste erzeugen (dependency-frei, eigener Writer) ---- */
function wrapText(text, size, bold, maxWidth) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? cur + ' ' + w : w;
    if (cur && textWidth(test, size, bold) > maxWidth) { lines.push(cur); cur = w; }
    else cur = test;
  }
  if (cur) lines.push(cur);
  return lines;
}

function buildPriceListPdf(d) {
  const angebote = d.angebote;
  const pakete = d.pakete;
  const allgemein = d.allgemein;
  const doc = new PDFDocument();
  const M = 56;
  const right = doc.width - M;
  const innerW = doc.width - 2 * M;
  const petrol = [0.07, 0.19, 0.20];
  const teal = [0.18, 0.48, 0.51];
  const gold = [0.79, 0.64, 0.15];
  const grey = [0.30, 0.36, 0.35];
  let y = 72;

  doc.text(M, y, 'Targem!', { size: 30, bold: true, color: teal });
  y += 24;
  doc.text(M, y, 'Preisliste – Sprachkurse, Übersetzungen & Dolmetschen', { size: 12.5, bold: true, color: petrol });
  y += 15;
  doc.text(M, y, 'Deutsch · Arabisch · Ägyptisch-Arabisch', { size: 10, color: grey });
  y += 14;
  doc.line(M, y, right, y, { color: gold, width: 1.3 });
  y += 30;

  // Sprachkurse
  doc.text(M, y, 'Sprachkurse', { size: 16, bold: true, color: petrol });
  y += 8;
  doc.line(M, y, M + 60, y, { color: teal, width: 2 });
  y += 20;
  const probe = String(d.sprachkurse.probe_hinweis || '').trim();
  if (probe) { doc.text(M, y, '• ' + probe, { size: 10.5, bold: true, color: [0.51, 0.26, 0.04] }); y += 20; }
  for (const a of angebote) {
    doc.text(M, y, a.titel, { size: 12, bold: true, color: petrol });
    doc.text(right, y, `CHF ${a.preis_chf}`, { size: 12, bold: true, align: 'right', color: teal });
    y += 14;
    const meta = `${a.dauer_min} Minuten · ${a.ort} · ${a.teilnehmer}`;
    doc.text(M, y, meta, { size: 9.5, color: grey });
    y += 13;
    for (const ln of wrapText(a.untertitel, 9.5, false, innerW)) { doc.text(M, y, ln, { size: 9.5, color: grey }); y += 12; }
    y += 8;
  }

  // Sparpakete
  y += 6;
  doc.text(M, y, 'Sparpakete für den Privatunterricht', { size: 14, bold: true, color: petrol });
  y += 8;
  doc.line(M, y, M + 60, y, { color: teal, width: 2 });
  y += 20;
  for (const p of pakete) {
    doc.text(M, y, `${p.titel}${p.badge ? '  (' + p.badge + ')' : ''}`, { size: 12, bold: true, color: petrol });
    doc.text(right, y, `CHF ${p.preis_chf}`, { size: 12, bold: true, align: 'right', color: teal });
    y += 14;
    for (const ln of wrapText(p.beschreibung, 9.5, false, innerW)) { doc.text(M, y, ln, { size: 9.5, color: grey }); y += 12; }
    y += 8;
  }

  // Übersetzungen / Dienstleistungen
  y += 6;
  doc.text(M, y, 'Übersetzungen, Korrekturlesen & Dolmetschen', { size: 14, bold: true, color: petrol });
  y += 8;
  doc.line(M, y, M + 60, y, { color: teal, width: 2 });
  y += 20;
  for (const ln of wrapText('Preise auf Anfrage – Sie erhalten zeitnah eine unverbindliche, persönliche Offerte. In dringenden Fällen sind Eilübersetzungen auch übers Wochenende und an Feiertagen möglich.', 10.5, false, innerW)) {
    doc.text(M, y, ln, { size: 10.5, color: petrol }); y += 14;
  }

  // Fusszeile: Kontakt
  const fy = doc.height - 74;
  doc.line(M, fy, right, fy, { color: gold, width: 1 });
  doc.text(M, fy + 18, 'Kontakt', { size: 11, bold: true, color: petrol });
  doc.text(M, fy + 33, `${allgemein.email}  ·  ${allgemein.telefon}`, { size: 10, color: grey });
  doc.text(M, fy + 46, `${allgemein.adresse}  ·  ${SITE_URL}`, { size: 10, color: grey });
  doc.text(right, fy + 46, `Stand: ${datumDe(BUILD_DATE)}`, { size: 9, align: 'right', color: grey });

  return doc.toBuffer();
}

// Rechtstexte: Abschnitte in fertiges HTML umwandeln
function enrichAbschnitte(seite) {
  for (const a of (seite && seite.abschnitte) || []) {
    a.ist_adresse = a.typ === 'adresse';
    a.inhalt_html = a.ist_adresse ? adrblock(a.inhalt) : mdParagraphs(a.inhalt);
  }
}

/* ---- JSON-LD (LocalBusiness) aus den Inhalten erzeugen ---- */
function buildJsonLd(d) {
  const alleLeistungen = d.uebersetzungen.leistungen || [];
  const offers = [];
  for (const a of d.angebote) {
    offers.push({
      '@type': 'Offer', name: a.titel, priceCurrency: 'CHF', price: String(a.preis_chf),
      description: `${a.untertitel}, ${a.dauer_min} Minuten, ${String(a.ort).toLowerCase()}.`,
    });
  }
  for (const p of d.pakete) {
    offers.push({ '@type': 'Offer', name: p.titel, priceCurrency: 'CHF', price: String(p.preis_chf), description: p.beschreibung });
  }
  for (const l of alleLeistungen) offers.push({ '@type': 'Offer', name: l.titel });

  const preise = [...d.angebote.map((a) => Number(a.preis_chf)), ...d.pakete.map((p) => Number(p.preis_chf))].filter((n) => !Number.isNaN(n));
  const min = preise.length ? Math.min(...preise) : 0;
  const max = preise.length ? Math.max(...preise) : 0;

  const obj = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': SITE_URL + '/#business',
    name: 'Targem!',
    description: 'Sprachkurse, Übersetzungen, Dolmetschen und Korrekturlesen auf Deutsch und Arabisch.',
    url: d.page_url,
    inLanguage: d.lang,
    image: SITE_URL + '/assets/img/og-image.jpg',
    email: d.allgemein.email,
    telephone: String(d.allgemein.telefon).replace(/\s+/g, ''),
    priceRange: `CHF ${min}–${max}`,
    founder: {
      '@type': 'Person',
      name: d.ueber_mich.name,
      jobTitle: 'Sprachlehrerin, Übersetzerin und Dolmetscherin',
      knowsLanguage: ['de', 'ar'],
    },
    areaServed: 'CH',
    availableLanguage: ['Deutsch', 'Arabisch'],
    address: {
      '@type': 'PostalAddress',
      postalCode: '3075',
      addressLocality: 'Rüfenacht',
      addressRegion: 'BE',
      addressCountry: 'CH',
    },
    sameAs: [d.allgemein.instagram_url],
    makesOffer: offers,
  };
  return JSON.stringify(obj, null, 2);
}

function buildFaqJsonLd(faq) {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((f) => ({
      '@type': 'Question',
      name: f.frage,
      acceptedAnswer: { '@type': 'Answer', text: f.antwort },
    })),
  }, null, 2);
}

/** Digitale Visitenkarte: QR ist locale-unabhängig (zeigt auf /kontakt.vcf). */
const VCARD_QR_SVG = qrSvg(`${SITE_URL}/kontakt.vcf`, { cell: 4, margin: 4 });

/** Baut das komplette Datenobjekt für eine Locale. */
function computeData(locale) {
  const c = loadContent(locale);
  const allgemein = c.allgemein;
  const startseite = c.startseite;
  const isAr = locale === 'ar';

  // Kontaktdaten (abgeleitet)
  allgemein.telefon_href = 'tel:' + String(allgemein.telefon).replace(/\s+/g, '');
  allgemein.email_href = 'mailto:' + allgemein.email;
  allgemein.whatsapp_href = 'https://wa.me/' + allgemein.whatsapp_nummer;

  // Leistungs-Icons
  for (const l of startseite.uebersetzungen.leistungen || []) {
    l.icon_svg = LEISTUNG_ICONS[l.icon] || '';
  }

  // Angebote / Pakete
  const angebote = c.angebote.angebote || [];
  const pakete = c.pakete.pakete || [];

  // Aktuelles: nach Datum absteigend, max. 6, mit passendem Datum
  const aktuelles = (c.aktuell.news || [])
    .slice()
    .sort((a, b) => String(b.datum).localeCompare(String(a.datum)))
    .slice(0, 6)
    .map((n) => Object.assign({}, n, { datum_de: datumDe(n.datum) }));
  const hat_aktuelles = aktuelles.length > 0;

  // Buchung
  const buchung = c.buchung;
  const buchung_aktiv = Boolean(buchung.aktiv) && Boolean(String(buchung.calcom_link || '').trim());
  buchung.calcom_link_json = JSON.stringify(String(buchung.calcom_link || ''));

  // Kundenstimmen & Referenzen
  const kundenstimmenData = c.kundenstimmen;
  const kundenstimmen_sichtbar = (kundenstimmenData.eintraege || []).filter((e) => e && e.anzeigen === true);
  const hat_kundenstimmen = kundenstimmen_sichtbar.length > 0;
  const google_review_url = String(kundenstimmenData.google_review_url || '').trim();
  const referenzen = kundenstimmenData.referenzen || {};
  const referenzen_sichtbar = referenzen.anzeigen === true && (referenzen.kundentypen || []).length > 0;

  // FAQ
  const faq = c.faq.eintraege || [];
  const hat_faq = faq.length > 0;

  // Einstufungstest
  const einstufungstestData = c.einstufungstest;
  const einstufungstest_aktiv = einstufungstestData.aktiv === true && (einstufungstestData.fragen || []).length > 0;

  // Preisrechner
  const rechnerData = c.rechner;
  const rechner_aktiv = rechnerData.aktiv === true;

  // Wort der Woche (neuester Eintrag)
  const wdw = c.wortDerWoche || {};
  const wdwEintraege = (wdw.eintraege || []).slice()
    .sort((a, b) => String(b.datum).localeCompare(String(a.datum)));
  const wort = wdwEintraege[0] || null;
  const hat_wort = !!wort;

  // Story / Werdegang
  const story = c.story || {};
  const hat_story = (story.stationen || []).length > 0;

  // Rechtstexte anreichern (nur DE gerendert, aber unschädlich)
  enrichAbschnitte(c.rechtliches.impressum);
  enrichAbschnitte(c.rechtliches.datenschutz);

  const rechner_json = jsonForScript({
    preis_pro_wort_chf: Number(rechnerData.preis_pro_wort_chf) || 0,
    mindestpreis_chf: Number(rechnerData.mindestpreis_chf) || 0,
    express_zuschlag_prozent: Number(rechnerData.express_zuschlag_prozent) || 0,
    hinweis: String(rechnerData.hinweis || ''),
    email: allgemein.email,
  });
  const einstufungstest_json = jsonForScript({
    fragen: einstufungstestData.fragen || [],
    stufen: einstufungstestData.stufen || [],
  });

  const data = {
    // Locale-Meta
    locale,
    lang: isAr ? 'ar' : 'de',
    dir: isAr ? 'rtl' : 'ltr',
    is_ar: isAr,
    base: isAr ? '../' : '',
    page_url: isAr ? SITE_URL + '/ar/' : SITE_URL + '/',
    og_locale: isAr ? 'ar' : 'de_CH',
    og_locale_alt: isAr ? 'de_CH' : 'ar',
    lang_switch_href: isAr ? '../' : 'ar/',
    lang_switch_url: isAr ? SITE_URL + '/' : SITE_URL + '/ar/',
    home_path: isAr ? '/ar/' : '/',
    lang_switch_label: isAr ? 'Deutsch' : 'العربية',
    lang_switch_lang: isAr ? 'de' : 'ar',
    lang_switch_hreflang: isAr ? 'de' : 'ar',
    ui: UI[locale],
    ui_js_json: jsonForScript(UI_JS[locale]),

    allgemein,
    ...startseite,        // hero, ueber_mich, sprachkurse, uebersetzungen, aktuell, kontakt
    angebote,
    pakete,
    aktuelles,
    hat_aktuelles,
    buchung,
    buchung_aktiv,
    impressum: c.rechtliches.impressum,
    datenschutz: c.rechtliches.datenschutz,
    build_date: BUILD_DATE,
    jahr: BUILD_DATE.slice(0, 4),

    // Vertrauen & Conversion
    kundenstimmen_kopf: kundenstimmenData,
    kundenstimmen: kundenstimmen_sichtbar,
    hat_kundenstimmen,
    google_review_url,
    referenzen,
    referenzen_sichtbar,
    faq_kopf: c.faq,
    faq,
    hat_faq,

    // Werkzeuge
    einstufungstest: einstufungstestData,
    einstufungstest_aktiv,
    einstufungstest_json,
    rechner: rechnerData,
    rechner_aktiv,
    rechner_json,
    vcard_qr_svg: VCARD_QR_SVG,

    // Neue Features
    wort_kopf: wdw,
    wort,
    hat_wort,
    story,
    hat_story,
  };

  data.json_ld = buildJsonLd(data);
  data.faq_json_ld = hat_faq ? buildFaqJsonLd(faq) : '';
  return data;
}

/* ============================================================
   Build ausführen
   ============================================================ */

// dist/ leeren und neu anlegen
rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });

const dataDe = computeData('de');
const dataAr = computeData('ar');

// Deutsche Seiten (dist/)
const dePages = [
  ['index.html', 'index.html'],
  ['impressum.html', 'impressum.html'],
  ['datenschutz.html', 'datenschutz.html'],
  ['404.html', '404.html'],
];
for (const [tpl, out] of dePages) {
  writeFileSync(join(DIST, out), renderTemplate(tpl, dataDe), 'utf8');
  console.log('  geschrieben:', out);
}

// Arabische Seiten (dist/ar/) – Impressum/Datenschutz bleiben nur deutsch
mkdirSync(join(DIST, 'ar'), { recursive: true });
const arPages = [
  ['index.html', 'index.html'],
  ['404.html', '404.html'],
];
for (const [tpl, out] of arPages) {
  writeFileSync(join(DIST, 'ar', out), renderTemplate(tpl, dataAr), 'utf8');
  console.log('  geschrieben: ar/' + out);
}

// sitemap.xml
const sitemapUrls = [
  { loc: SITE_URL + '/', changefreq: 'monthly', priority: '1.0' },
  { loc: SITE_URL + '/ar/', changefreq: 'monthly', priority: '0.9' },
  { loc: SITE_URL + '/impressum.html', changefreq: 'yearly', priority: '0.3' },
  { loc: SITE_URL + '/datenschutz.html', changefreq: 'yearly', priority: '0.3' },
];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls.map((u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${BUILD_DATE}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>
`;
writeFileSync(join(DIST, 'sitemap.xml'), sitemap, 'utf8');

// robots.txt – der eingefrorene Snapshot /klassik/ wird nicht indexiert
writeFileSync(join(DIST, 'robots.txt'),
  `User-agent: *\nAllow: /\nDisallow: /klassik/\n\nSitemap: ${SITE_URL}/sitemap.xml\n`, 'utf8');

// .nojekyll (verhindert Jekyll-Verarbeitung durch GitHub Pages)
writeFileSync(join(DIST, '.nojekyll'), '', 'utf8');

// Digitale Visitenkarte (vCard 3.0) – aus DE-Inhalten, gemeinsam genutzt
const vcardText = buildVCard(dataDe.allgemein, String(dataDe.ueber_mich.name || 'Sally Mobasher').trim());
writeFileSync(join(DIST, 'kontakt.vcf'), vcardText, 'utf8');
console.log('  geschrieben: kontakt.vcf');

// PDF-Preisliste (deutsch – der Writer kann kein Arabisch)
writeFileSync(join(DIST, 'preisliste.pdf'), buildPriceListPdf(dataDe));
console.log('  geschrieben: preisliste.pdf');

// Statische Ordner kopieren
for (const dir of ['css', 'js', 'assets', 'admin', 'klassik']) {
  if (existsSync(join(ROOT, dir))) {
    cpSync(join(ROOT, dir), join(DIST, dir), { recursive: true });
    console.log('  kopiert:', dir + '/');
  }
}

console.log(`\nFertig. dist/ gebaut am ${BUILD_DATE}.`);
console.log(`Sprachen: de (dist/) + ar (dist/ar/)`);
console.log(`Aktuelles: ${dataDe.aktuelles.length} | Kundenstimmen sichtbar: ${dataDe.kundenstimmen.length} | ` +
  `FAQ: ${dataDe.faq.length} | Einstufungstest aktiv: ${dataDe.einstufungstest_aktiv} | ` +
  `Rechner aktiv: ${dataDe.rechner_aktiv} | Wort der Woche: ${dataDe.hat_wort} | Story: ${dataDe.hat_story}`);
