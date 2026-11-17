// Visitor map API. Static pages are served by the assets binding; only /api/* reaches this code.
import {
  cleanTown, isPlaceId, normaliseQuery, pickPlace, readBody, turnstileAccepts, type NominatimResult, type Place, type TurnstileOutcome,
} from './towns';
import { foldName, ID_FILES } from '../data/places-search';
import { SITE_URL } from '../data/site';

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  SUBMIT_LIMITER: RateLimit;
  TURNSTILE_SECRET?: string;
}

const USER_AGENT = `TheNestAtTwinElms-VisitorMap/1.0 (+${SITE_URL})`;
const NOMINATIM_GAP_MS = 1100;
/** If the queue for Nominatim is longer than this, give up rather than keep the guest waiting. */
const NOMINATIM_MAX_WAIT_MS = 5000;
/** Turnstile tokens can be up to 2048 characters, plus a town of up to 80 (3 bytes each in some scripts). */
const MAX_BODY = 4096;

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
  // Refuse big bodies before reading them into memory.
  const raw = await readBody(request, MAX_BODY);
  if (raw === null) return fail('invalid_request', 413);

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

  const ip = request.headers.get('cf-connecting-ip') ?? undefined;
  if (typeof body.token !== 'string' || !(await verifyTurnstile(body.token, env.TURNSTILE_SECRET, new URL(request.url).hostname, ip)))
    return fail('verification_failed', 403);
  // Either a town picked from the suggestions (an OpenStreetMap id) or typed text.
  let place: Place | null;
  try {
    if (body.place !== undefined) {
      if (!isPlaceId(body.place)) return fail('invalid_town', 400);
      place = await lookupById(body.place, request, env);
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
 * Add a visit. The same town can reach us from different sources (a picked suggestion or typed text),
 * so a town in the same country with the same name (ignoring accents) within about 25 km counts as the same pin.
 */
async function saveVisit(place: Place, env: Env) {
  const { results } = await env.DB.prepare(
    `SELECT id, name, place_key FROM towns
     WHERE place_key = ?1 OR (country_code = ?2 AND abs(lat - ?3) < 0.25 AND abs(lng - ?4) < 0.35)
     ORDER BY visits DESC`,
  )
    .bind(place.placeKey, place.countryCode, place.lat, place.lng)
    .all<{ id: number; name: string; place_key: string }>();
  const same =
    results.find((t) => t.place_key === place.placeKey) ?? results.find((t) => foldName(t.name) === foldName(place.name));
  if (same) {
    return env.DB.prepare(`UPDATE towns SET visits = visits + 1, updated_at = datetime('now') WHERE id = ? RETURNING ${TOWN_COLUMNS}`)
      .bind(same.id)
      .first();
  }
  // Two guests adding the same new town at once: the second insert becomes a visit instead of failing.
  return env.DB.prepare(
    `INSERT INTO towns (place_key, name, country, country_code, lat, lng) VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(place_key) DO UPDATE SET visits = visits + 1, updated_at = datetime('now')
     RETURNING ${TOWN_COLUMNS}`,
  )
    .bind(place.placeKey, place.name, place.country, place.countryCode, place.lat, place.lng)
    .first();
}

/** A town the guest picked from the suggestions, read from our own GeoNames files (never from the browser). */
async function lookupById(id: string, request: Request, env: Env): Promise<Place | null> {
  const gid = Number(id.slice(1));
  const res = await env.ASSETS.fetch(new URL(`/places/id/${gid % ID_FILES}.json`, request.url));
  if (!res.ok) throw new Error(`places file ${res.status}`);
  const entry = ((await res.json()) as Record<string, [string, string, string, string, number, number]>)[String(gid)];
  if (!entry) return null;
  const [name, , country, countryCode, lat, lng] = entry;
  return { placeKey: `geonames:${gid}`, name, country, countryCode, lat, lng };
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
  const res = await fetch(url, { headers: { 'user-agent': USER_AGENT, referer: `${SITE_URL}/` } });
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);
  const place = pickPlace((await res.json()) as NominatimResult[]);

  await env.DB.prepare("INSERT OR REPLACE INTO geocode_cache (query, result, created_at) VALUES (?, ?, datetime('now'))")
    .bind(query, place ? JSON.stringify(place) : null)
    .run();
  return place;
}

/**
 * Nominatim's usage policy allows at most 1 request per second. Each request books the next free slot in one
 * statement (D1 runs statements one at a time, so two visitors can't get the same slot), then waits for it.
 */
async function waitForNominatim(env: Env): Promise<void> {
  const now = Date.now();
  const row = await env.DB.prepare(
    `INSERT INTO meta (key, value) VALUES ('nominatim_last', ?1)
     ON CONFLICT(key) DO UPDATE SET value = CAST(max(CAST(value AS INTEGER) + ?2, ?1) AS TEXT)
     RETURNING value`,
  )
    .bind(now, NOMINATIM_GAP_MS)
    .first<{ value: string }>();
  const wait = Number(row?.value ?? now) - now;
  if (wait > NOMINATIM_MAX_WAIT_MS) throw new Error('Nominatim queue too long');
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
}

/** Ask Cloudflare whether the Turnstile token from the form is genuine, and was issued on this site. Tokens are single-use. */
async function verifyTurnstile(token: string, secret: string, host: string, ip?: string): Promise<boolean> {
  if (!token || token.length > 2048) return false;
  const form = new URLSearchParams({ secret, response: token });
  if (ip) form.set('remoteip', ip);
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form });
  if (!res.ok) return false;
  return turnstileAccepts((await res.json()) as TurnstileOutcome, host, secret);
}
