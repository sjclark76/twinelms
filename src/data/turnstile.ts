/**
 * Cloudflare Turnstile site key (public; it is meant to be in the page).
 * Until the real widget exists this is Cloudflare's test key, which always passes.
 * The matching secret is set with `npx wrangler secret put TURNSTILE_SECRET`.
 */
export const TURNSTILE_SITE_KEY = '1x00000000000000000000AA';

/** Turnstile's language codes for our locales. */
export const turnstileLanguage: Record<string, string> = {
  en: 'en', zh: 'zh-cn', de: 'de', ja: 'ja', ko: 'ko', fr: 'fr', es: 'es',
};
