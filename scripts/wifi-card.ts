// Makes the printed A6 Wi-Fi card for the room as a local file (out/wifi-card.html).
// The Wi-Fi details live only in .wifi.local.json (gitignored), so they never reach the repo or the website.
//   cp .wifi.local.example.json .wifi.local.json   # then put the real password in it
//   npm run wifi-card                              # then open out/wifi-card.html and print at A6, 100%
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import QRCode from 'qrcode';

const configPath = '.wifi.local.json';
if (!existsSync(configPath)) {
  console.error(`Missing ${configPath}. Copy .wifi.local.example.json to ${configPath} and fill in the network and password.`);
  process.exit(1);
}
const { ssid, password } = JSON.parse(readFileSync(configPath, 'utf8')) as { ssid: string; password: string };
if (!ssid || !password || password === 'PASSWORD') {
  console.error(`Fill in "ssid" and "password" in ${configPath}.`);
  process.exit(1);
}

// Standard join string that phone cameras understand. Special characters must be escaped.
const esc = (v: string) => v.replace(/([\;,:"])/g, '\\$1');
const { modules } = QRCode.create(`WIFI:T:WPA;S:${esc(ssid)};P:${esc(password)};;`, { errorCorrectionLevel: 'M' });
const size = modules.size;
let path = '';
for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (modules.get(x, y)) path += `M${x} ${y}h1v1h-1z`;

// Self-contained: copy the two fonts next to the page so it prints correctly offline.
mkdirSync('out/fonts', { recursive: true });
const fonts: [string, string, number][] = [
  ['fraunces', 'Fraunces', 600], ['figtree', 'Figtree', 400], ['figtree', 'Figtree', 600],
];
const faces = fonts
  .map(([pkg, family, weight]) => {
    const file = `${pkg}-latin-${weight}-normal.woff2`;
    copyFileSync(`node_modules/@fontsource/${pkg}/files/${file}`, `out/fonts/${file}`);
    return `@font-face{font-family:'${family}';font-weight:${weight};src:url(fonts/${file}) format('woff2')}`;
  })
  .join('\n');

const html = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Wi-Fi card</title>
<style>
${faces}
${readFileSync('design-system/tokens.css', 'utf8')}
body{margin:0;background:var(--mist);font-family:var(--font-sans);color:var(--ink)}
main{display:flex;flex-direction:column;align-items:center;gap:24px;padding:32px 16px}
.card{box-sizing:border-box;width:105mm;max-width:100%;height:148mm;padding:9mm 8mm;display:flex;flex-direction:column;align-items:center;text-align:center;background:var(--lake-tint);border-radius:var(--radius-md);-webkit-print-color-adjust:exact;print-color-adjust:exact}
.brand{margin:0;font:600 11pt/1.2 var(--font-sans);letter-spacing:.08em;text-transform:uppercase;color:var(--slate)}
h1{margin:4mm 0 5mm;font:600 26pt/1.1 var(--font-display)}
.qr{width:62mm;height:62mm;background:var(--white);border-radius:var(--radius-sm)}
.qr svg{display:block;width:100%;height:100%}
.hint{margin:4mm 0 5mm;font:400 11pt/1.3 var(--font-sans)}
dl{margin:0;display:grid;gap:1mm}
dt{font:600 9pt/1.2 var(--font-sans);letter-spacing:.08em;text-transform:uppercase;color:var(--slate)}
dd{margin:0 0 2mm;font:600 15pt/1.2 var(--font-sans)}
.controls{max-width:105mm;text-align:center}
.controls p{margin:12px 0 0;color:var(--slate);font-size:14px;line-height:20px}
button{min-height:44px;padding:0 20px;border-radius:var(--radius-pill);border:1px solid transparent;background:var(--lake);color:var(--white);font:600 15px/20px var(--font-sans);cursor:pointer}
@page{size:A6 portrait;margin:0}
@media print{body{background:none}main{padding:0;display:block}.card{border-radius:0}.controls{display:none}}
</style>
</head>
<body>
<main>
<article class="card">
<p class="brand">The Nest at Twin Elms</p>
<h1>Join the Wi-Fi</h1>
<div class="qr"><svg viewBox="-2 -2 ${size + 4} ${size + 4}" shape-rendering="crispEdges" role="img" aria-label="QR code to join the ${html(ssid)} Wi-Fi"><path fill="var(--ink)" d="${path}"/></svg></div>
<p class="hint">Point your phone camera at the code.</p>
<dl><dt>Network</dt><dd>${html(ssid)}</dd><dt>Password</dt><dd>${html(password)}</dd></dl>
</article>
<div class="controls"><button type="button" onclick="window.print()">Print this card</button>
<p>Prints at A6 (105 × 148 mm). On an A4 sheet, set the scale to 100% and cut around the card.</p></div>
</main>
</body>
</html>
`;
writeFileSync('out/wifi-card.html', page);
console.log('Wrote out/wifi-card.html. Open it in a browser and print at A6, 100%.');
