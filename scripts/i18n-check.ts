// Checks every translation against English: missing keys, extra keys, lost {placeholders},
// and strings whose English changed since they were translated.
//   npm run i18n:check                 report (exits 1 if anything needs attention)
//   npm run i18n:check -- --update de  record that `de` is up to date with the current English
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { en } from '../src/i18n/en';
import { zh } from '../src/i18n/zh';
import { de } from '../src/i18n/de';
import { ja } from '../src/i18n/ja';
import { ko } from '../src/i18n/ko';
import { fr } from '../src/i18n/fr';
import { es } from '../src/i18n/es';

const STATUS_FILE = 'src/i18n/status.json';
const translations: Record<string, unknown> = { zh, de, ja, ko, fr, es };

type Flat = Record<string, string>;
function flatten(value: unknown, prefix = '', out: Flat = {}): Flat {
  if (typeof value === 'string' || Array.isArray(value)) out[prefix] = JSON.stringify(value);
  else if (value && typeof value === 'object')
    for (const [k, v] of Object.entries(value)) flatten(v, prefix ? `${prefix}.${k}` : k, out);
  return out;
}
const hash = (s: string) => createHash('sha1').update(s).digest('hex').slice(0, 10);
const placeholders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(',');

interface Status { reviewed: boolean; source: Record<string, string> }
const status: Record<string, Status> = JSON.parse(readFileSync(STATUS_FILE, 'utf8'));
const english = flatten(en);

const updateIndex = process.argv.indexOf('--update');
if (updateIndex > -1) {
  const lang = process.argv[updateIndex + 1];
  if (!translations[lang]) throw new Error(`Unknown language: ${lang}`);
  const ours = flatten(translations[lang]);
  status[lang] = {
    reviewed: status[lang]?.reviewed ?? false,
    source: Object.fromEntries(Object.keys(ours).filter((k) => k in english).map((k) => [k, hash(english[k])])),
  };
  writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2) + '\n');
  console.log(`Recorded ${lang} as up to date with the current English.`);
}

let problems = 0;
for (const [lang, strings] of Object.entries(translations)) {
  const ours = flatten(strings);
  const issues: string[] = [];
  for (const key of Object.keys(english)) {
    if (!(key in ours)) issues.push(`missing     ${key}`);
    else if (placeholders(english[key]) !== placeholders(ours[key])) issues.push(`placeholder ${key}`);
    else if (status[lang]?.source[key] !== hash(english[key])) issues.push(`outdated    ${key}`);
  }
  for (const key of Object.keys(ours)) if (!(key in english)) issues.push(`extra       ${key}`);
  const reviewed = status[lang]?.reviewed ? 'native-speaker reviewed' : 'not yet reviewed by a native speaker';
  console.log(`${lang}: ${issues.length ? `${issues.length} to fix` : 'complete'} (${reviewed})`);
  issues.forEach((i) => console.log(`  ${i}`));
  problems += issues.length;
}
process.exit(problems ? 1 : 0);
