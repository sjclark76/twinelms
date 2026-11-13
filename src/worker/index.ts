// Visitor map API. Static pages are served by the assets binding; only /api/* reaches this code.
import { cleanTown, normaliseQuery, pickPlace, type NominatimResult, type Place } from './towns';

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  SUBMIT_LIMITER: RateLimit;
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

  let body: { town?: unknown; token?: unknown };
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
  const town = cleanTown(body.town);
  if (!town) return fail('invalid_town', 400);

  let place: Place | null;
  try {
    place = await geocode(town, env);
  } catch {
    return fail('geocoder_unavailable', 502);
  }
  if (!place) return fail('not_found', 404);

  const saved = await env.DB.prepare(
    `INSERT INTO towns (place_key, name, country, country_code, lat, lng) VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(place_key) DO UPDATE SET visits = visits + 1, updated_at = datetime('now')
     RETURNING name, country, country_code AS countryCode, lat, lng, visits`,
  )
    .bind(place.placeKey, place.name, place.country, place.countryCode, place.lat, place.lng)
    .first();
  return json({ town: saved }, 201, { 'cache-control': 'no-store' });
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
