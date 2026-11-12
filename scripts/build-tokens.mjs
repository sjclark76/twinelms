// Regenerates design-system/tokens.css from design-system/tokens.json.
import { readFileSync, writeFileSync } from 'node:fs';

const tokens = JSON.parse(readFileSync('design-system/tokens.json', 'utf8'));
const lines = [
  `/* ${tokens.name}: generated from tokens.json. Edit tokens.json, then regenerate. */`,
  ':root {',
  ...[...tokens.color.tokens, ...tokens.spacing.tokens, ...tokens.radius.tokens].map(
    (t) => `  --${t.name}: ${t.value};`,
  ),
  ...Object.entries(tokens.type.families).map(([name, value]) => `  --font-${name}: ${value};`),
  '}',
  ...tokens.type.groups.flatMap((g) =>
    g.styles.map((s) => {
      const ls = s.letterSpacing ? ` letter-spacing: ${s.letterSpacing};` : '';
      return `.${s.name} { font-family: var(--font-${g.family}); font-size: ${s.fontSize}; line-height: ${s.lineHeight}; font-weight: ${s.fontWeight};${ls} }`;
    }),
  ),
  '',
];
writeFileSync('design-system/tokens.css', lines.join('\n'));
