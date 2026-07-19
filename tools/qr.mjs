/**
 * tools/qr.mjs – QR-Code als SVG (zur BUILD-Zeit)
 * ------------------------------------------------------------------
 * Nutzt die vendorte MIT-Lib qrcode-generator (tools/vendor/) und
 * erzeugt daraus einen schlanken, markengerechten SVG-QR-Code.
 * Läuft ausschliesslich in build.mjs (Node) und landet NICHT im
 * ausgelieferten Browser-JavaScript.
 * ------------------------------------------------------------------
 */
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const qrcode = require(join(__dirname, 'vendor', 'qrcode-generator.cjs'));

/**
 * Erzeugt einen QR-Code als eigenständigen SVG-String.
 * @param {string} text  – zu kodierender Inhalt (z. B. eine URL)
 * @param {object} opts  – moduleColor, bg, margin (Module), cell (px/Modul), ecc, radius
 */
export function qrSvg(text, opts = {}) {
  const {
    moduleColor = '#123033',
    bg = '#ffffff',
    margin = 4,
    cell = 4,
    ecc = 'M',
    radius = 14,
  } = opts;

  const qr = qrcode(0, ecc); // typeNumber 0 = automatische Grösse
  qr.addData(String(text));
  qr.make();

  const count = qr.getModuleCount();
  const size = (count + margin * 2) * cell;

  let path = '';
  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (qr.isDark(r, c)) {
        const x = (c + margin) * cell;
        const y = (r + margin) * cell;
        path += `M${x} ${y}h${cell}v${cell}h-${cell}z`;
      }
    }
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" ` +
    `width="${size}" height="${size}" role="img" ` +
    `aria-label="QR-Code zum Speichern der Kontaktdaten">` +
    `<rect width="${size}" height="${size}" rx="${radius}" fill="${bg}"/>` +
    `<path d="${path}" fill="${moduleColor}"/></svg>`
  );
}
