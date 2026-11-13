// Pure helpers for the visitor map API (no I/O), so they can be unit tested.

export interface Place {
  placeKey: string;
  name: string;
  country: string;
  countryCode: string;
  lat: number;
  lng: number;
}

export interface NominatimResult {
  osm_type?: string;
  osm_id?: number;
  lat?: string;
  lon?: string;
  addresstype?: string;
  name?: string;
  address?: Record<string, string>;
  extratags?: Record<string, string> | null;
}

/** Accepted kinds of place: towns and cities, not streets, buildings or whole countries. */
const SETTLEMENTS = new Set([
  'city', 'town', 'village', 'hamlet', 'suburb', 'municipality', 'city_district', 'borough', 'locality', 'county',
]);

/** Trim and validate what a guest typed. Returns the cleaned text, or null if it isn't a plausible town. */
export function cleanTown(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const town = input.normalize('NFC').replace(/\s+/g, ' ').trim();
  if (town.length < 2 || town.length > 80) return null;
  // Letters (any script), marks, spaces and common punctuation in place names only.
  if (!/^[\p{L}\p{M}][\p{L}\p{M}\p{N} .,'’()-]*$/u.test(town)) return null;
  return town;
}

/** Cache key for a town query. */
export const normaliseQuery = (town: string) => town.toLocaleLowerCase('en');

/**
 * Is this result a town or city? Some big cities are mapped as a province or state (Tokyo is a prefecture),
 * so those count when OpenStreetMap links them to a city. Real states (California, Bavaria) don't.
 */
function isTown(result: NominatimResult): boolean {
  if (!result.addresstype) return false;
  if (SETTLEMENTS.has(result.addresstype)) return true;
  const linked = result.extratags?.linked_place;
  return (result.addresstype === 'province' || result.addresstype === 'state') && (linked === 'city' || linked === 'town');
}

/** Pick the first result that is a town (Shanghai's city entry comes after its state entry). */
export function pickPlace(results: NominatimResult[]): Place | null {
  for (const result of results) {
    const place = toPlace(result);
    if (place) return place;
  }
  return null;
}

/** Turn one Nominatim result into a Place, or null if it isn't a town. */
export function toPlace(result: NominatimResult | undefined): Place | null {
  if (!result || !result.osm_type || result.osm_id === undefined || !result.address) return null;
  if (!isTown(result)) return null;
  const a = result.address;
  const name = a.city ?? a.town ?? a.village ?? a.hamlet ?? a.suburb ?? a.municipality ?? a.province ?? a.state ?? a.county ?? result.name;
  const lat = Number(result.lat);
  const lng = Number(result.lon);
  if (!name || !a.country || !a.country_code || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return {
    placeKey: `${result.osm_type}:${result.osm_id}`,
    name,
    country: a.country,
    countryCode: a.country_code.toUpperCase(),
    // Town centre, rounded to about 100 m.
    lat: Math.round(lat * 1000) / 1000,
    lng: Math.round(lng * 1000) / 1000,
  };
}

/** One suggestion for the town search box. */
export interface Suggestion {
  /** OpenStreetMap id, e.g. "N240109189" or "R62422". */
  id: string;
  name: string;
  /** Region and country, in the guest's language. */
  detail: string;
}

export interface PhotonFeature {
  properties?: Record<string, string | number | undefined>;
}

const PHOTON_SETTLEMENTS = new Set(['city', 'town', 'village', 'hamlet', 'suburb', 'borough', 'municipality']);

/** Keep only towns and cities from Photon's results (it also returns airports, farms, shops...). */
export function toSuggestions(features: PhotonFeature[], max = 6): Suggestion[] {
  const out: Suggestion[] = [];
  const seen = new Set<string>();
  for (const f of features) {
    const p = f.properties ?? {};
    const value = String(p.osm_value ?? '');
    const isTownLike =
      p.osm_key === 'place' && (PHOTON_SETTLEMENTS.has(value) || (p.type === 'city' && (value === 'province' || value === 'state')));
    const type = String(p.osm_type ?? '');
    if (!isTownLike || !p.name || !p.country || !/^[NWR]$/.test(type) || !p.osm_id) continue;
    const id = `${type}${p.osm_id}`;
    const detail = [p.state, p.country].filter((x) => x && x !== p.name).join(', ');
    const key = `${p.name}|${detail}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ id, name: String(p.name), detail });
    if (out.length === max) break;
  }
  return out;
}

/** Is a suggestion id well formed ("N123", "W123" or "R123")? */
export const isPlaceId = (id: unknown): id is string => typeof id === 'string' && /^[NWR]\d{1,12}$/.test(id);

/** Photon only translates into a few languages; others get local names. */
export function photonLanguage(locale: string): string {
  return ['en', 'de', 'fr'].includes(locale) ? locale : 'default';
}
