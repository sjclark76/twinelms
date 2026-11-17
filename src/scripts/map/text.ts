// Pure helpers for the visitor map page (no DOM, no Leaflet), so they can be unit tested.

export interface Town { name: string; country: string; countryCode: string; lat: number; lng: number; visits: number }
export interface Plural { one: string; other: string }

export interface MapStrings {
  stat: string; statEmpty: string; towns: Plural; countries: Plural; visits: Plural; loadError: string;
  noSuggestions: string; suggestionsCount: Plural;
  submit: string; submitting: string; success: string; errors: Record<string, string>;
}

/** Everything the page passes to its script, as JSON in #map-config. */
export interface MapConfig {
  locale: string;
  home: { lat: number; lng: number; label: string; place: string };
  turnstile: { siteKey: string; language: string };
  strings: MapStrings;
}

/** Escape text for use inside HTML (Leaflet popups and pins take HTML strings). */
export const esc = (text: string) => text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** "Berlin, Germany" */
export const townLabel = (t: Town) => `${t.name}, ${t.country}`;

/** Counting text in the page's language: count(forms, 3) -> "3 visits", with the right plural form and digits. */
export function counter(locale: string) {
  const plural = new Intl.PluralRules(locale);
  const number = new Intl.NumberFormat(locale);
  return (forms: Plural, n: number) => (plural.select(n) === 'one' ? forms.one : forms.other).replace('{n}', number.format(n));
}

/** The line over the map: "Guests from 8 towns in 7 countries", or the empty-map invitation. */
export function statLine(towns: Town[], s: MapStrings, count: ReturnType<typeof counter>): string {
  if (!towns.length) return s.statEmpty;
  const countries = new Set(towns.map((t) => t.countryCode)).size;
  return s.stat.replace('{towns}', count(s.towns, towns.length)).replace('{countries}', count(s.countries, countries));
}

/** Towns for the list under the map: most visits first, then by name. */
export const sortTowns = (towns: Town[]) =>
  [...towns].sort((a, b) => b.visits - a.visits || a.name.localeCompare(b.name));

/** Pin size grows gently with visits: 1 visit is the normal pin (18px), 10 or more is 1.6 times bigger. */
export const pinSize = (visits: number) =>
  Math.round(18 * (1 + 0.6 * Math.min(1, Math.log(Math.max(visits, 1)) / Math.log(10))));

/** Which suggestion the arrow keys move to (wrapping round), from the current one (-1 = none). */
export function moveActive(active: number, length: number, key: 'ArrowDown' | 'ArrowUp'): number {
  if (key === 'ArrowDown') return (active + 1) % length;
  return active <= 0 ? length - 1 : active - 1;
}

/** What the form sends: the picked suggestion's id if the text is still exactly what was picked, else the typed text. */
export function townRequest(typed: string, chosen: { id: string; label: string } | null, token: string) {
  return chosen && chosen.label === typed ? { place: chosen.id, token } : { town: typed, token };
}
