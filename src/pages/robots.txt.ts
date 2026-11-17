import type { APIRoute } from 'astro';
import { SITE_URL } from '../data/site';

export const GET: APIRoute = ({ site }) => {
  const base = site ?? new URL(SITE_URL);
  // /api/ is the visitor-map backend, not pages. Everything else is open.
  const body = `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${new URL('/sitemap.xml', base).href}\n`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
