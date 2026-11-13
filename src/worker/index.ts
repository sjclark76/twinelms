// Visitor map API. Static pages are served by the assets binding; only /api/* reaches this code.
import {
  cleanTown, isPlaceId, normaliseQuery, photonLanguage, pickPlace, toSuggestions,
  type NominatimResult, type PhotonFeature, type Place,
} from './towns';

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  SUBMIT_LIMITER: RateLimit;
  SEARCH_LIMITER: RateLimit;
  TURNSTILE_SECRET?: string;
}

const USER_AGENT = 'TheNestAtTwinElms-VisitorMap/1.0 (+https://twinelms.sjclark76.workers.dev)';
const NOMINATIM_GAP_MS = 1100;

type ErrorCode =
  | 'invalid_request' | 'invalid_town' | 'verification_failed' | 'not_found' | 'rate_limited' | 'geocoder_unavailable'
  | 'not_configured' | 'not_found_route';

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'x-content-type-options': 'nosniff', ...headers },
  });
const fail = (error: ErrorCode, status: number) => json({ error }, status, { 'cache-control': 'no-store' });

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/api/towns') {
      if (request.method === 'GET') return listTowns(env);
      if (request.method === 'POST') return addTown(request, env);
      return new Response(null, { status: 405, headers: { allow: 'GET, POST' } });
    }
    if (url.pathname === '/api/places' && request.method === 'GET') return searchPlaces(request, url, env);
    if (url.pathname.startsWith('/api/')) return fail('not_found_route', 404);
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;

async function listTowns(env: Env): Promise<Response> {
  const { results } = await env.DB.prepare(
    'SELECT name, country, country_code AS countryCode, lat, lng, visits FROM towns ORDER BY visits DESC, name',
  ).all();
  const visits = results.reduce((sum, t) => sum + Number(t.visits), 0);
  return json({ towns: results, totals: { towns: results.length, visits } }, 200, { 'cache-control': 'public, max-age=60' });
}

async function addTown(request: Request, env: Env): Promise<Response> {
  if (!env.TURNSTILE_SECRET) return fail('not_configured', 503);
  if (!(request.headers.get('content-type') ?? '').includes('application/json')) return fail('invalid_request', 415);
  const raw = await request.text();
  if (raw.length > 1000) return fail('invalid_request', 413);

  let body: { town?: unknown; place?: unknown; token?: unknown };
  try {
    body = JSON.parse(raw);
  } catch {
    return fail('invalid_request', 400);
  }

  // Rate limit first (cheap), then the Turnstile check that keeps bots out.
  const key = request.headers.get('cf-connecting-ip') ?? 'unknown'; // used in memory only, never stored
  const { success } = await env.SUBMIT_LIMITER.limit({ key });
  if (!success) return fail('rate_limited', 429);

  if (typeof body.token !== 'string' || !(await verifyTurnstile(body.token, env.TURNSTILE_SECRET)))
    return fail('verification_failed', 403);
  // Either a town picked from the suggestions (an OpenStreetMap id) or typed text.
  let place: Place | null;
  try {
    if (body.place !== undefined) {
      if (!isPlaceId(body.place)) return fail('invalid_town', 400);
      place = await lookupById(body.place, env);
    } else {
      const town = cleanTown(body.town);
      if (!town) return fail('invalid_town', 400);
      place = await geocode(town, env);
    }
  } catch {
    return fail('geocoder_unavailable', 502);
  }
  if (!place) return fail('not_found', 404);

  return json({ town: await saveVisit(place, env) }, 201, { 'cache-control': 'no-store' });
}

const TOWN_COLUMNS = 'name, country, country_code AS countryCode, lat, lng, visits';

/**
 * Add a visit. The same town can reach us as different OpenStreetMap objects (a city's point or its boundary),
 * so a town with the same name and country within about 25 km counts as the same pin.
 */
async function saveVisit(place: Place, env: Env) {
  const near = await env.DB.prepare(
    `UPDATE towns SET visits = visits + 1, updated_at = datetime('now')
     WHERE id = (SELECT id FROM towns WHERE place_key = ?1
                 OR (country_code = ?2 AND lower(name) = lower(?3) AND abs(lat - ?4) < 0.25 AND abs(lng - ?5) < 0.35)
                 ORDER BY place_key = ?1 DESC, visits DESC LIMIT 1)
     RETURNING ${TOWN_COLUMNS}`,
  )
    .bind(place.placeKey, place.countryCode, place.name, place.lat, place.lng)
    .first();
  if (near) return near;
  return env.DB.prepare(
    `INSERT INTO towns (place_key, name, country, country_code, lat, lng) VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(place_key) DO UPDATE SET visits = visits + 1, updated_at = datetime('now')
     RETURNING ${TOWN_COLUMNS}`,
  )
    .bind(place.placeKey, place.name, place.country, place.countryCode, place.lat, place.lng)
    .first();
}

/**
 * Town suggestions as the guest types, from Photon (an OpenStreetMap search built for type-ahead).
 * Requests go through us, so guests' IP addresses never reach a third party, and answers are cached for a day.
 */
async function searchPlaces(request: Request, url: URL, env: Env): Promise<Response> {
  const q = (url.searchParams.get('q') ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
  if (q.length < 2 || q.length > 80) return json({ suggestions: [] });
  const lang = photonLanguage(url.searchParams.get('lang') ?? 'en');

  const key = request.headers.get('cf-connecting-ip') ?? 'unknown'; // in memory only, never stored
  if (!(await env.SEARCH_LIMITER.limit({ key })).success) return fail('rate_limited', 429);

  const cacheKey = new Request(`https://cache.twinelms/places?lang=${lang}&q=${encodeURIComponent(q.toLowerCase())}`);
  const cache = caches.default;
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  const photon = new URL('https://photon.komoot.io/api/');
  photon.searchParams.set('q', q);
  photon.searchParams.set('limit', '12');
  photon.searchParams.set('lang', lang);
  for (const layer of ['city', 'district', 'locality']) photon.searchParams.append('layer', layer);
  const res = await fetch(photon, { headers: { 'user-agent': USER_AGENT } });
  if (!res.ok) return fail('geocoder_unavailable', 502);
  const data = (await res.json()) as { features?: PhotonFeature[] };
  const response = json({ suggestions: toSuggestions(data.features ?? []) }, 200, { 'cache-control': 'public, max-age=86400' });
  await cache.put(cacheKey, response.clone());
  return response;
}

/** Look up a town the guest picked from the suggestions, and check it really is a town. */
async function lookupById(id: string, env: Env): Promise<Place | null> {
  const query = `id:${id}`;
  const cached = await env.DB.prepare(
    "SELECT result FROM geocode_cache WHERE query = ? AND (result IS NOT NULL OR created_at > datetime('now', '-1 day'))",
  )
    .bind(query)
    .first<{ result: string | null }>();
  if (cached) return cached.result ? (JSON.parse(cached.result) as Place) : null;

  await waitForNominatim(env);
  const url = new URL('https://nominatim.openstreetmap.org/lookup');
  url.search = new URLSearchParams({
    osm_ids: id, format: 'jsonv2', addressdetails: '1', extratags: '1', 'accept-language': 'en',
  }).toString();
  const res = await fetch(url, { headers: { 'user-agent': USER_AGENT, referer: 'https://twinelms.sjclark76.workers.dev/' } });
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);
  const place = pickPlace((await res.json()) as NominatimResult[]);
  await env.DB.prepare("INSERT OR REPLACE INTO geocode_cache (query, result, created_at) VALUES (?, ?, datetime('now'))")
    .bind(query, place ? JSON.stringify(place) : null)
    .run();
  return place;
}

/** Look a town up, using the cache first and calling Nominatim at most once per second. */
async function geocode(town: string, env: Env): Promise<Place | null> {
  const query = normaliseQuery(town);
  // Found places are cached for good; "not found" answers expire after a day so they can be retried.
  const cached = await env.DB.prepare(
    "SELECT result FROM geocode_cache WHERE query = ? AND (result IS NOT NULL OR created_at > datetime('now', '-1 day'))",
  )
    .bind(query)
    .first<{ result: string | null }>();
  if (cached) return cached.result ? (JSON.parse(cached.result) as Place) : null;

  await waitForNominatim(env);
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.search = new URLSearchParams({
    q: town, format: 'jsonv2', addressdetails: '1', extratags: '1', limit: '5', featureType: 'settlement', 'accept-language': 'en',
  }).toString();
  const res = await fetch(url, { headers: { 'user-agent': USER_AGENT, referer: 'https://twinelms.sjclark76.workers.dev/' } });
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);
  const place = pickPlace((await res.json()) as NominatimResult[]);

  await env.DB.prepare("INSERT OR REPLACE INTO geocode_cache (query, result, created_at) VALUES (?, ?, datetime('now'))")
    .bind(query, place ? JSON.stringify(place) : null)
    .run();
  return place;
}

/** Nominatim's usage policy allows at most 1 request per second; space requests out across all visitors. */
async function waitForNominatim(env: Env): Promise<void> {
  const now = Date.now();
  const row = await env.DB.prepare("SELECT value FROM meta WHERE key = 'nominatim_last'").first<{ value: string }>();
  const wait = row ? Number(row.value) + NOMINATIM_GAP_MS - now : 0;
  const next = now + Math.max(0, wait);
  await env.DB.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('nominatim_last', ?)").bind(String(next)).run();
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, Math.min(wait, NOMINATIM_GAP_MS)));
}

/** Ask Cloudflare whether the Turnstile token from the form is genuine. Tokens are single-use. */
async function verifyTurnstile(token: string, secret: string): Promise<boolean> {
  if (!token || token.length > 2048) return false;
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: new URLSearchParams({ secret, response: token }),
  });
  if (!res.ok) return false;
  const outcome = (await res.json()) as { success?: boolean };
  return outcome.success === true;
}
