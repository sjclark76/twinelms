import type { APIRoute } from 'astro';
import { ENABLED_LOCALES, LOCALES, localePath } from '../i18n/config';

// Every public page in every enabled language, each listing its translations. Not-found and style-guide pages are left out.
const pages = ['/', '/guide/', '/map/', '/gallery/'];

export const GET: APIRoute = ({ site }) => {
  const base = site ?? new URL('https://thenest.twinelms.co.nz');
  const abs = (locale: (typeof ENABLED_LOCALES)[number], page: string) => new URL(localePath(locale, page), base).href;
  const urls = pages.flatMap((page) =>
    ENABLED_LOCALES.map((locale) => {
      const alternates = ENABLED_LOCALES.map(
        (l) => `    <xhtml:link rel="alternate" hreflang="${LOCALES[l].htmlLang}" href="${abs(l, page)}"/>`,
      ).join('\n');
      const xDefault = `    <xhtml:link rel="alternate" hreflang="x-default" href="${abs('en', page)}"/>`;
      return `  <url>\n    <loc>${abs(locale, page)}</loc>\n${alternates}\n${xDefault}\n  </url>`;
    }),
  );
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
