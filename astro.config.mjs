// @ts-check
import { existsSync, readdirSync, renameSync, rmdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';

/**
 * Astro writes /de/404.astro as /de/404/index.html, but Cloudflare serves the nearest 404.html.
 * Move each language's not-found page to /<lang>/404.html so broken links show it in that language.
 */
const localisedNotFoundPages = {
  name: 'localised-404-pages',
  hooks: {
    'astro:build:done': ({ dir }) => {
      const out = fileURLToPath(dir);
      for (const entry of readdirSync(out, { withFileTypes: true })) {
        const page = join(out, entry.name, '404', 'index.html');
        if (entry.isDirectory() && existsSync(page)) {
          renameSync(page, join(out, entry.name, '404.html'));
          rmdirSync(join(out, entry.name, '404'));
        }
      }
    },
  },
};

// https://astro.build/config
export default defineConfig({
  // Update when a custom domain is connected (issue #12).
  site: 'https://twinelms.sjclark76.workers.dev',
  integrations: [localisedNotFoundPages],
});
