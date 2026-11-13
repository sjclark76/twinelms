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

/** Turn Nominatim's answer into a Place, or null if it isn't a town. */
export function toPlace(result: NominatimResult | undefined): Place | null {
  if (!result || !result.osm_type || result.osm_id === undefined || !result.address) return null;
  if (!result.addresstype || !SETTLEMENTS.has(result.addresstype)) return null;
  const a = result.address;
  const name = a.city ?? a.town ?? a.village ?? a.hamlet ?? a.suburb ?? a.municipality ?? a.county ?? result.name;
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

/** Compare two strings in constant time, so the guest code can't be guessed by timing. */
export function safeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}
