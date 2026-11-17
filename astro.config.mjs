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
  site: 'https://thenest.twinelms.co.nz',
  integrations: [localisedNotFoundPages],
  // Content Security Policy: Astro hashes every script and style it writes into a page and puts the policy in a <meta> tag.
  // Headers that a <meta> tag can't set (framing, HSTS and so on) are in public/_headers.
  security: {
    csp: {
      directives: [
        "default-src 'self'",
        // Map tiles from OpenStreetMap; data: for Leaflet's built-in images.
        "img-src 'self' data: https://tile.openstreetmap.org",
        // data: for the tiny font files the build inlines.
        "font-src 'self' data:",
        "connect-src 'self'",
        // Cloudflare Turnstile (the robot check on the map form) runs in a frame.
        'frame-src https://challenges.cloudflare.com',
        "base-uri 'self'",
        "form-action 'self'",
        "object-src 'none'",
      ],
      scriptDirective: { resources: ["'self'", 'https://challenges.cloudflare.com'] },
      // Map pins and a few tiles size themselves with style attributes.
      styleDirective: { resources: ["'self'", { resource: "'unsafe-inline'", kind: 'attribute' }] },
    },
  },
});
