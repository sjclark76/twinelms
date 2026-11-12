import { DEFAULT_LOCALE, type Locale } from './config';
import { en } from './en';

const strings: Partial<Record<Locale, typeof en>> = { en };

/** UI strings for a locale, falling back to English. */
export function useStrings(locale: Locale) {
  return strings[locale] ?? strings[DEFAULT_LOCALE]!;
}
