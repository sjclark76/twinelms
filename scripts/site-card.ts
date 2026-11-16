// Makes a printable A4 poster with a QR code to the guest website, for a frame (out/site-card.html).
//   npm run site-card    # then open out/site-card.html and print at A4, 100% (or save as PDF)
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import QRCode from 'qrcode';

const url = 'https://thenest.twinelms.co.nz/';
const { modules } = QRCode.create(url, { errorCorrectionLevel: 'M' });
const size = modules.size;
let path = '';
for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (modules.get(x, y)) path += `M${x} ${y}h1v1h-1z`;

// Self-contained: copy the fonts (Latin plus Latin Extended for the macron in Hāwea) and the sign art next to the page.
mkdirSync('out/fonts', { recursive: true });
const fonts: [string, string, number, string, string][] = [
  ['fraunces', 'Fraunces', 600, 'latin', 'U+0000-00FF,U+0131,U+0152-0153,U+2000-206F,U+20AC,U+2122'],
  ['fraunces', 'Fraunces', 600, 'latin-ext', 'U+0100-02AF,U+1E00-1EFF,U+2020,U+20A0-20AB,U+20AD-20CF,U+2113,U+2C60-2C7F,U+A720-A7FF'],
  ['figtree', 'Figtree', 400, 'latin', 'U+0000-00FF,U+0131,U+0152-0153,U+2000-206F,U+20AC,U+2122'],
  ['figtree', 'Figtree', 400, 'latin-ext', 'U+0100-02AF,U+1E00-1EFF,U+2020,U+20A0-20AB,U+20AD-20CF,U+2113,U+2C60-2C7F,U+A720-A7FF'],
  ['figtree', 'Figtree', 600, 'latin', 'U+0000-00FF,U+0131,U+0152-0153,U+2000-206F,U+20AC,U+2122'],
  ['figtree', 'Figtree', 600, 'latin-ext', 'U+0100-02AF,U+1E00-1EFF,U+2020,U+20A0-20AB,U+20AD-20CF,U+2113,U+2C60-2C7F,U+A720-A7FF'],
];
const faces = fonts
  .map(([pkg, family, weight, subset, range]) => {
    const file = `${pkg}-${subset}-${weight}-normal.woff2`;
    copyFileSync(`node_modules/@fontsource/${pkg}/files/${file}`, `out/fonts/${file}`);
    return `@font-face{font-family:'${family}';font-weight:${weight};unicode-range:${range};src:url(fonts/${file}) format('woff2')}`;
  })
  .join('\n');
copyFileSync('src/assets/house-sign.jpg', 'out/house-sign.jpg');

const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>The Nest at Twin Elms: guest website poster</title>
<style>
${faces}
${readFileSync('design-system/tokens.css', 'utf8')}
html,body{margin:0}
body{background:var(--mist);font-family:var(--font-sans);color:var(--ink)}
main{display:flex;flex-direction:column;align-items:center;gap:24px;padding:24px}
.poster{box-sizing:border-box;width:210mm;height:297mm;padding:16mm 16mm 14mm;display:flex;flex-direction:column;align-items:center;text-align:center;background:var(--lake-tint);-webkit-print-color-adjust:exact;print-color-adjust:exact}
.sign{display:block;width:152mm;height:auto;border-radius:var(--radius-md)}
.where{margin:9mm 0 0;font:600 12pt/1.2 var(--font-sans);letter-spacing:.1em;text-transform:uppercase;color:var(--slate)}
h1{margin:3mm 0 0;font:600 40pt/1.08 var(--font-display)}
.sub{margin:4mm 0 0;max-width:140mm;font:400 15pt/1.4 var(--font-sans)}
.qr{margin-top:8mm;width:80mm;height:80mm;padding:5mm;box-sizing:border-box;background:var(--white);border-radius:var(--radius-md)}
.qr svg{display:block;width:100%;height:100%}
.url{margin:7mm 0 0;font:600 19pt/1.2 var(--font-sans)}
.hint{margin:2mm 0 0;font:400 12pt/1.3 var(--font-sans);color:var(--slate)}
.controls{text-align:center}
.controls p{margin:12px 0 0;color:var(--slate);font-size:14px;line-height:20px}
button{min-height:44px;padding:0 20px;border-radius:var(--radius-pill);border:1px solid transparent;background:var(--lake);color:var(--white);font:600 15px/20px var(--font-sans);cursor:pointer}
@page{size:A4 portrait;margin:0}
@media print{body{background:none}main{padding:0;display:block}.controls{display:none}}
</style>
</head>
<body>
<main>
<article class="poster">
<img class="sign" src="house-sign.jpg" alt="A hand-painted sign reading The Nest at Twin Elms, with Dexter the dog sitting in the grass among the chickens and two ducks.">
<p class="where">Lake Hāwea, New Zealand</p>
<h1>Our guest guide</h1>
<p class="sub">House essentials, where to eat and explore, our favourite walks and rides, and a map of where our guests come from.</p>
<div class="qr"><svg viewBox="-1 -1 ${size + 2} ${size + 2}" shape-rendering="crispEdges" role="img" aria-label="QR code for ${url}"><path fill="var(--ink)" d="${path}"/></svg></div>
<p class="url">thenest.twinelms.co.nz</p>
<p class="hint">Point your phone camera at the code.</p>
</article>
<div class="controls"><button type="button" onclick="window.print()">Print this poster</button>
<p>Prints at A4 (210 × 297 mm). Set the scale to 100%. It also fits an A5 frame if you choose "fit to page".</p></div>
</main>
</body>
</html>
`;
writeFileSync('out/site-card.html', page);
console.log('Wrote out/site-card.html. Open it in a browser and print at A4, 100%.');
