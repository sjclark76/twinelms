/**
 * Cloudflare Turnstile site key (public; it is meant to be in the page).
 * Widget "The Nest guest site" (hostname sjclark76.workers.dev, Managed).
 * The matching secret is set with `npx wrangler secret put TURNSTILE_SECRET`.
 */
export const TURNSTILE_SITE_KEY = '0x4AAAAAAF_EQ0xnoYD8iGFf';

/** Turnstile's language codes for our locales. */
export const turnstileLanguage: Record<string, string> = {
  en: 'en', zh: 'zh-cn', de: 'de', ja: 'ja', ko: 'ko', fr: 'fr', es: 'es',
};
