import { DEFAULT_LOCALE, type Locale } from './config';
import { en } from './en';
import { zh } from './zh';
import { de } from './de';
import { ja } from './ja';
import { ko } from './ko';
import { fr } from './fr';
import { es } from './es';

export type Strings = typeof en;
export type PartialStrings = DeepPartial<Strings>;

type DeepPartial<T> = { [K in keyof T]?: T[K] extends Record<string, unknown> ? DeepPartial<T[K]> : T[K] };

const translations: Record<Locale, PartialStrings> = { en, zh, de, ja, ko, fr, es };

function merge<T>(base: T, over: DeepPartial<T> | undefined): T {
  if (!over) return base;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [key, value] of Object.entries(over)) {
    if (value === undefined) continue;
    const baseValue = out[key];
    out[key] =
      value && typeof value === 'object' && !Array.isArray(value) && baseValue && typeof baseValue === 'object'
        ? merge(baseValue, value as never)
        : value;
  }
  return out as T;
}

/** UI strings for a locale. Any string a translation doesn't provide falls back to English. */
export function useStrings(locale: Locale): Strings {
  return locale === DEFAULT_LOCALE ? en : merge(en, translations[locale]);
}
