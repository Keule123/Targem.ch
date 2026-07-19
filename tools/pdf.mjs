/**
 * tools/pdf.mjs – Winziger, abhängigkeitsfreier PDF-Writer
 * ------------------------------------------------------------------
 * Selbst geschrieben, keine npm-Pakete. Erzeugt einseitige oder
 * mehrseitige PDFs mit den Standard-14-Fonts Helvetica / Helvetica-Bold
 * und WinAnsi-Encoding. Dadurch erscheinen Umlaute (ä ö ü Ä Ö Ü),
 * ß, «CHF», Gedankenstrich «–» und weitere Zeichen korrekt.
 *
 * Koordinatensystem der öffentlichen API: Ursprung oben links,
 * y wächst nach unten (wie im Web). Intern wird nach PDF (unten links)
 * umgerechnet. Masse in PDF-Punkten (1 pt = 1/72 Zoll).
 *
 * Benutzt in build.mjs zur Erzeugung von dist/preisliste.pdf.
 * ------------------------------------------------------------------
 */

/* ---- WinAnsi (CP1252): Sonderzeichen im Bereich 0x80–0x9F ---- */
const CP1252_HIGH = {
  0x20AC: 0x80, 0x201A: 0x82, 0x0192: 0x83, 0x201E: 0x84, 0x2026: 0x85,
  0x2020: 0x86, 0x2021: 0x87, 0x02C6: 0x88, 0x2030: 0x89, 0x0160: 0x8A,
  0x2039: 0x8B, 0x0152: 0x8C, 0x017D: 0x8E, 0x2018: 0x91, 0x2019: 0x92,
  0x201C: 0x93, 0x201D: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
  0x02DC: 0x98, 0x2122: 0x99, 0x0161: 0x9A, 0x203A: 0x9B, 0x0153: 0x9C,
  0x017E: 0x9E, 0x0178: 0x9F,
};

/** Unicode-Zeichen -> WinAnsi-Codepunkt (0–255) oder null, wenn nicht darstellbar. */
function winAnsiCode(cp) {
  if (cp >= 0x20 && cp <= 0x7E) return cp;          // ASCII
  if (cp >= 0xA0 && cp <= 0xFF) return cp;          // Latin-1 == CP1252 in diesem Bereich
  if (CP1252_HIGH[cp] !== undefined) return CP1252_HIGH[cp];
  return null;
}

/* ---- Zeichenbreiten (AFM, Einheiten/1000) ---- */
// Kompakte Tabellen: ASCII exakt + die für Deutsch/Preise wichtigen Sonderzeichen.
function baseWidths(map, high) {
  const w = new Array(256).fill(556); // Default für nicht gelistete Zeichen
  for (let i = 0; i < map.length; i++) w[0x20 + i] = map[i];
  for (const [code, val] of Object.entries(high)) w[Number(code)] = val;
  return w;
}
// Reihenfolge ab 0x20 (space) bis 0x7E (~)
const HELV = [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584];
const HELV_HIGH = { 0xA9:737,0xAB:556,0xBB:556,0xB7:278,0xC4:667,0xD6:778,0xDC:722,0xDF:556,0xE0:556,0xE4:556,0xE9:556,0xF6:556,0xFC:556,0x80:556,0x84:556,0x93:556,0x94:556,0x91:222,0x92:222,0x96:556,0x97:1000,0x95:350,0x85:1000 };
const HELVB = [278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584];
const HELVB_HIGH = { 0xA9:737,0xAB:556,0xBB:556,0xB7:278,0xC4:722,0xD6:778,0xDC:722,0xDF:611,0xE0:556,0xE4:556,0xE9:556,0xF6:611,0xFC:611,0x80:556,0x84:500,0x93:500,0x94:500,0x91:278,0x92:278,0x96:556,0x97:1000,0x95:350,0x85:1000 };
const WIDTHS = { normal: baseWidths(HELV, HELV_HIGH), bold: baseWidths(HELVB, HELVB_HIGH) };

/** Kodiert einen String als WinAnsi-Bytes und escaped ( ) \ für PDF-Stringliterale. */
function encodeText(str) {
  const out = [];
  for (const ch of String(str)) {
    let code = winAnsiCode(ch.codePointAt(0));
    if (code === null) code = 0x3F; // '?' als Rückfall
    if (code === 0x28 || code === 0x29 || code === 0x5C) out.push(0x5C);
    out.push(code);
  }
  return Buffer.from(out);
}

/** Textbreite in PDF-Punkten. */
export function textWidth(str, size, bold = false) {
  const w = WIDTHS[bold ? 'bold' : 'normal'];
  let total = 0;
  for (const ch of String(str)) {
    let code = winAnsiCode(ch.codePointAt(0));
    if (code === null) code = 0x3F;
    total += w[code] || 556;
  }
  return (total / 1000) * size;
}

/* ============================================================
   PDF-Dokument
   ============================================================ */
export class PDFDocument {
  constructor({ width = 595.28, height = 841.89 } = {}) {
    this.width = width;
    this.height = height;
    this.pages = [];        // je Seite: Array von Buffer-Teilen (Content-Operatoren)
    this._newPage();
  }

  _newPage() {
    this._cur = [];
    this.pages.push(this._cur);
  }

  addPage() { this._newPage(); return this; }

  _push(s) { this._cur.push(Buffer.isBuffer(s) ? s : Buffer.from(s, 'latin1')); }

  /** Text an (x, y) – y von oben gemessen. opts: {size, bold, color:[r,g,b], align:'left'|'center'|'right'} */
  text(x, y, str, opts = {}) {
    const size = opts.size || 11;
    const bold = !!opts.bold;
    const color = opts.color || [0.07, 0.19, 0.20];
    const align = opts.align || 'left';
    let tx = x;
    if (align === 'center') tx = x - textWidth(str, size, bold) / 2;
    else if (align === 'right') tx = x - textWidth(str, size, bold);
    const py = this.height - y; // in PDF-Koordinaten
    this._push(`BT\n/${bold ? 'F2' : 'F1'} ${size} Tf\n`);
    this._push(`${color[0]} ${color[1]} ${color[2]} rg\n`);
    this._push(`1 0 0 1 ${tx.toFixed(2)} ${py.toFixed(2)} Tm\n(`);
    this._push(encodeText(str));
    this._push(') Tj\nET\n');
    return this;
  }

  /** Linie von (x1,y1) nach (x2,y2), y von oben. opts:{width,color:[r,g,b]} */
  line(x1, y1, x2, y2, opts = {}) {
    const width = opts.width || 0.6;
    const c = opts.color || [0.79, 0.64, 0.15];
    this._push(`${c[0]} ${c[1]} ${c[2]} RG\n${width} w\n`);
    this._push(`${x1.toFixed(2)} ${(this.height - y1).toFixed(2)} m ${x2.toFixed(2)} ${(this.height - y2).toFixed(2)} l S\n`);
    return this;
  }

  /** Gefülltes Rechteck. opts:{color:[r,g,b]} */
  rect(x, y, w, h, opts = {}) {
    const c = opts.color || [0.98, 0.94, 0.89];
    this._push(`${c[0]} ${c[1]} ${c[2]} rg\n`);
    this._push(`${x.toFixed(2)} ${(this.height - y - h).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f\n`);
    return this;
  }

  /** Erzeugt den fertigen PDF-Buffer. */
  toBuffer() {
    const objects = [];               // {body: Buffer}
    const addObj = (buf) => { objects.push(buf); return objects.length; };

    // 1 Catalog, 2 Pages – erst reservieren, später füllen
    const catalogNum = addObj(null);
    const pagesNum = addObj(null);
    const fontRegular = addObj(Buffer.from(
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>', 'latin1'));
    const fontBold = addObj(Buffer.from(
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>', 'latin1'));

    const pageNums = [];
    for (const parts of this.pages) {
      const content = Buffer.concat(parts);
      const streamNum = addObj(Buffer.concat([
        Buffer.from(`<< /Length ${content.length} >>\nstream\n`, 'latin1'),
        content,
        Buffer.from('\nendstream', 'latin1'),
      ]));
      const pageNum = addObj(Buffer.from(
        `<< /Type /Page /Parent ${pagesNum} 0 R /MediaBox [0 0 ${this.width.toFixed(2)} ${this.height.toFixed(2)}] ` +
        `/Resources << /Font << /F1 ${fontRegular} 0 R /F2 ${fontBold} 0 R >> >> ` +
        `/Contents ${streamNum} 0 R >>`, 'latin1'));
      pageNums.push(pageNum);
    }

    objects[catalogNum - 1] = Buffer.from(`<< /Type /Catalog /Pages ${pagesNum} 0 R >>`, 'latin1');
    objects[pagesNum - 1] = Buffer.from(
      `<< /Type /Pages /Kids [${pageNums.map((n) => n + ' 0 R').join(' ')}] /Count ${pageNums.length} >>`, 'latin1');

    // Zusammensetzen mit xref
    const header = Buffer.from('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n', 'latin1');
    const chunks = [header];
    const offsets = [];
    let pos = header.length;
    for (let i = 0; i < objects.length; i++) {
      offsets[i] = pos;
      const objBuf = Buffer.concat([
        Buffer.from(`${i + 1} 0 obj\n`, 'latin1'),
        objects[i],
        Buffer.from('\nendobj\n', 'latin1'),
      ]);
      chunks.push(objBuf);
      pos += objBuf.length;
    }
    const xrefStart = pos;
    let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    for (let i = 0; i < objects.length; i++) {
      xref += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
    }
    xref += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogNum} 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
    chunks.push(Buffer.from(xref, 'latin1'));
    return Buffer.concat(chunks);
  }
}
