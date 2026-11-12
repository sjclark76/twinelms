export type Locale = 'en' | 'zh' | 'de' | 'ja' | 'ko' | 'fr' | 'es';

interface LocaleInfo {
  /** URL prefix; English is served from the root. */
  prefix: string;
  /** Value for the html lang attribute. */
  htmlLang: string;
  /** Short label for the language chips. */
  chip: string;
  /** Language name in its own script, for the phone select. */
  name: string;
}

export const LOCALES: Record<Locale, LocaleInfo> = {
  en: { prefix: '', htmlLang: 'en', chip: 'EN', name: 'English' },
  zh: { prefix: 'zh', htmlLang: 'zh-Hans', chip: '中文', name: '简体中文' },
  de: { prefix: 'de', htmlLang: 'de', chip: 'DE', name: 'Deutsch' },
  ja: { prefix: 'ja', htmlLang: 'ja', chip: '日本語', name: '日本語' },
  ko: { prefix: 'ko', htmlLang: 'ko', chip: '한국어', name: '한국어' },
  fr: { prefix: 'fr', htmlLang: 'fr', chip: 'FR', name: 'Français' },
  es: { prefix: 'es', htmlLang: 'es', chip: 'ES', name: 'Español' },
};

export const DEFAULT_LOCALE: Locale = 'en';

/** Locales that have translated pages. Add each one here as its translation lands (issues #8 and #9). */
export const ENABLED_LOCALES: Locale[] = ['en'];

/** Remove a locale prefix from a pathname: "/de/guide/" -> "/guide/". */
export function stripLocale(pathname: string): string {
  for (const { prefix } of Object.values(LOCALES)) {
    if (prefix && (pathname === `/${prefix}` || pathname.startsWith(`/${prefix}/`))) {
      return pathname.slice(prefix.length + 1) || '/';
    }
  }
  return pathname;
}

/** Path for a page in a locale: ("de", "/guide/") -> "/de/guide/". */
export function localePath(locale: Locale, path: string): string {
  const { prefix } = LOCALES[locale];
  return prefix ? `/${prefix}${path === '/' ? '/' : path}` : path;
}
