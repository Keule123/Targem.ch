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
   Inhalte laden
   ============================================================ */

function loadJson(name) {
  return JSON.parse(readFileSync(join(CONTENT, name), 'utf8'));
}

const allgemein = loadJson('allgemein.json');
const startseite = loadJson('startseite.json');
const angeboteData = loadJson('angebote.json');
const paketeData = loadJson('pakete.json');
const aktuellData = loadJson('aktuell.json');
const buchung = loadJson('buchung.json');
const rechtliches = loadJson('rechtliches.json');

const BUILD_DATE = new Date().toISOString().slice(0, 10);

/* ---- Abgeleitete Werte ---- */

// Kontaktdaten
allgemein.telefon_href = 'tel:' + String(allgemein.telefon).replace(/\s+/g, '');
allgemein.email_href = 'mailto:' + allgemein.email;
allgemein.whatsapp_href = 'https://wa.me/' + allgemein.whatsapp_nummer;

// Angebote
const angebote = angeboteData.angebote || [];
const pakete = paketeData.pakete || [];

// Leistungs-Icons (SVG) je nach gewähltem Icon-Schlüssel
const LEISTUNG_ICONS = {
  uebersetzung: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h7"/><path d="M9 3v2c0 4.4-2.2 7.6-5 9"/><path d="M5 9c0 2.4 2.7 4.5 6 5"/><path d="m13 21 4-9 4 9"/><path d="M14.5 17h5"/></svg>',
  korrektur: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
  dolmetschen: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z"/><path d="M8 9h8"/><path d="M8 13h5"/></svg>',
};
for (const l of startseite.uebersetzungen.leistungen || []) {
  l.icon_svg = LEISTUNG_ICONS[l.icon] || '';
}

// Aktuelles: nach Datum absteigend sortieren, max. 6, mit deutschem Datum
const aktuelles = (aktuellData.news || [])
  .slice()
  .sort((a, b) => String(b.datum).localeCompare(String(a.datum)))
  .slice(0, 6)
  .map((n) => Object.assign({}, n, { datum_de: datumDe(n.datum) }));
const hat_aktuelles = aktuelles.length > 0;

// Buchung
const buchung_aktiv = Boolean(buchung.aktiv) && Boolean(String(buchung.calcom_link || '').trim());
buchung.calcom_link_json = JSON.stringify(String(buchung.calcom_link || ''));

// Rechtstexte: Abschnitte in fertiges HTML umwandeln
function enrichAbschnitte(seite) {
  for (const a of seite.abschnitte || []) {
    a.ist_adresse = a.typ === 'adresse';
    a.inhalt_html = a.ist_adresse ? adrblock(a.inhalt) : mdParagraphs(a.inhalt);
  }
}
enrichAbschnitte(rechtliches.impressum);
enrichAbschnitte(rechtliches.datenschutz);

/* ---- JSON-LD (LocalBusiness) aus den Inhalten erzeugen ---- */

function buildJsonLd() {
  const alleLeistungen = startseite.uebersetzungen.leistungen || [];
  const offers = [];
  for (const a of angebote) {
    offers.push({
      '@type': 'Offer', name: a.titel, priceCurrency: 'CHF', price: String(a.preis_chf),
      description: `${a.untertitel}, ${a.dauer_min} Minuten, ${String(a.ort).toLowerCase()}.`,
    });
  }
  for (const p of pakete) {
    offers.push({ '@type': 'Offer', name: p.titel, priceCurrency: 'CHF', price: String(p.preis_chf), description: p.beschreibung });
  }
  for (const l of alleLeistungen) offers.push({ '@type': 'Offer', name: l.titel });

  const preise = [...angebote.map((a) => Number(a.preis_chf)), ...pakete.map((p) => Number(p.preis_chf))].filter((n) => !Number.isNaN(n));
  const min = preise.length ? Math.min(...preise) : 0;
  const max = preise.length ? Math.max(...preise) : 0;

  const obj = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': SITE_URL + '/#business',
    name: 'Targem!',
    description: 'Sprachkurse, Übersetzungen, Dolmetschen und Korrekturlesen auf Deutsch und Arabisch.',
    url: SITE_URL + '/',
    image: SITE_URL + '/assets/img/og-image.jpg',
    email: allgemein.email,
    telephone: String(allgemein.telefon).replace(/\s+/g, ''),
    priceRange: `CHF ${min}–${max}`,
    founder: {
      '@type': 'Person',
      name: startseite.ueber_mich.name,
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
    sameAs: [allgemein.instagram_url],
    makesOffer: offers,
  };
  return JSON.stringify(obj, null, 2);
}

/* ---- Gemeinsames Datenobjekt für Templates ---- */

const data = {
  allgemein,
  ...startseite,        // hero, ueber_mich, sprachkurse, uebersetzungen, aktuell, kontakt
  angebote,
  pakete,
  aktuelles,
  hat_aktuelles,
  buchung,
  buchung_aktiv,
  impressum: rechtliches.impressum,
  datenschutz: rechtliches.datenschutz,
  json_ld: buildJsonLd(),
  build_date: BUILD_DATE,
  jahr: BUILD_DATE.slice(0, 4),
};

/* ============================================================
   Build ausführen
   ============================================================ */

// dist/ leeren und neu anlegen
rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });

// HTML-Seiten rendern
const pages = [
  ['index.html', 'index.html'],
  ['impressum.html', 'impressum.html'],
  ['datenschutz.html', 'datenschutz.html'],
  ['404.html', '404.html'],
];
for (const [tpl, out] of pages) {
  writeFileSync(join(DIST, out), renderTemplate(tpl, data), 'utf8');
  console.log('  geschrieben:', out);
}

// sitemap.xml
const sitemapUrls = [
  { loc: SITE_URL + '/', changefreq: 'monthly', priority: '1.0' },
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

// robots.txt
writeFileSync(join(DIST, 'robots.txt'),
  `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`, 'utf8');

// .nojekyll (verhindert Jekyll-Verarbeitung durch GitHub Pages)
writeFileSync(join(DIST, '.nojekyll'), '', 'utf8');

// Keine CNAME-Datei: Beim Deploy über GitHub Actions wird die Custom Domain
// in den Pages-Einstellungen des Repos verwaltet, nicht über eine Datei.
// Eine CNAME-Datei würde ausserdem die Testadresse keule123.github.io
// vor der DNS-Umstellung auf die noch tote Domain umleiten.

// Statische Ordner kopieren
for (const dir of ['css', 'js', 'assets', 'admin', 'klassik']) {
  if (existsSync(join(ROOT, dir))) {
    cpSync(join(ROOT, dir), join(DIST, dir), { recursive: true });
    console.log('  kopiert:', dir + '/');
  }
}

console.log(`\nFertig. dist/ gebaut am ${BUILD_DATE}.`);
console.log(`Aktuelles-Einträge: ${aktuelles.length} | Buchung aktiv: ${buchung_aktiv}`);
