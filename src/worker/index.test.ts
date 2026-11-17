// Route tests for the visitor map API: the real worker code against a real SQLite database (Node's built-in
// node:sqlite, standing in for D1) with the schema from migrations/. Turnstile and Nominatim are faked.
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import worker from './index';

/** Just enough of D1's API for the worker: prepare → bind → all / first / run. */
class FakeD1 {
  db = new DatabaseSync(':memory:');
  constructor() {
    for (const file of ['0001_init.sql']) this.db.exec(readFileSync(`migrations/${file}`, 'utf8'));
  }
  prepare(sql: string) {
    const statement = (args: unknown[]) => ({
      bind: (...more: unknown[]) => statement(more),
      all: async () => ({ results: this.db.prepare(sql).all(...(args as never[])) }),
      first: async () => this.db.prepare(sql).get(...(args as never[])) ?? null,
      run: async () => this.db.prepare(sql).run(...(args as never[])),
    });
    return statement([]);
  }
}

const HOST = 'thenest.twinelms.co.nz';
const nominatimDunedin = [{
  osm_type: 'relation', osm_id: 2216047, lat: '-45.8739', lon: '170.5035', addresstype: 'city', name: 'Dunedin',
  address: { city: 'Dunedin', country: 'New Zealand', country_code: 'nz' },
}];

let env: ReturnType<typeof makeEnv>;
let allowed: boolean;
let turnstileHost: string;
let nominatimCalls: number;

function makeEnv(secret?: string) {
  return {
    DB: new FakeD1(),
    TURNSTILE_SECRET: secret,
    SUBMIT_LIMITER: { limit: async () => ({ success: allowed }) },
    // The town-search files the worker reads to confirm a picked town.
    ASSETS: { fetch: async (url: URL) => new Response(readFileSync(`public${new URL(url).pathname}`)) },
  };
}

const call = (path: string, init?: RequestInit) =>
  worker.fetch!(new Request(`https://${HOST}${path}`, init) as never, env as never, {} as never) as Promise<Response>;
const post = (body: unknown, headers: Record<string, string> = { 'content-type': 'application/json' }) =>
  call('/api/towns', { method: 'POST', headers, body: typeof body === 'string' ? body : JSON.stringify(body) });

beforeEach(() => {
  allowed = true;
  turnstileHost = HOST;
  nominatimCalls = 0;
  env = makeEnv('real-secret');
  vi.stubGlobal('fetch', async (input: string | URL) => {
    const url = String(input);
    if (url.startsWith('https://challenges.cloudflare.com/')) return Response.json({ success: true, hostname: turnstileHost });
    if (url.startsWith('https://nominatim.openstreetmap.org/')) {
      nominatimCalls++;
      return Response.json(url.includes('Dunedin') ? nominatimDunedin : []);
    }
    throw new Error(`Unexpected fetch ${url}`);
  });
});
afterEach(() => vi.unstubAllGlobals());

describe('GET /api/towns', () => {
  it('starts empty', async () => {
    const res = await call('/api/towns');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ towns: [], totals: { towns: 0, visits: 0 } });
  });
});

describe('POST /api/towns', () => {
  it('adds a picked town, then counts the next visit to it', async () => {
    const first = await post({ place: 'G2179537', token: 'ok' });
    expect(first.status).toBe(201);
    expect(await first.json()).toEqual({
      town: { name: 'Wellington', country: 'New Zealand', countryCode: 'NZ', lat: -41.287, lng: 174.776, visits: 1 },
    });
    expect(((await (await post({ place: 'G2179537', token: 'ok' })).json()) as { town: { visits: number } }).town.visits).toBe(2);
    expect(await (await call('/api/towns')).json()).toMatchObject({ totals: { towns: 1, visits: 2 } });
  });

  it('looks a typed town up once, then uses the cache', async () => {
    const res = await post({ town: 'Dunedin', token: 'ok' });
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ town: { name: 'Dunedin', countryCode: 'NZ', visits: 1 } });
    await post({ town: 'dunedin', token: 'ok' });
    expect(nominatimCalls).toBe(1);
  });

  it('counts a typed town and the same picked town as one pin', async () => {
    await post({ place: 'G2179537', token: 'ok' });
    vi.stubGlobal('fetch', async (input: string | URL) =>
      String(input).includes('nominatim')
        ? Response.json([{ ...nominatimDunedin[0], osm_id: 4266321, lat: '-41.2887', lon: '174.7772', name: 'Wellington',
            address: { city: 'Wellington', country: 'New Zealand', country_code: 'nz' } }])
        : Response.json({ success: true, hostname: HOST }));
    expect(await (await post({ town: 'Wellington', token: 'ok' })).json()).toMatchObject({ town: { visits: 2 } });
  });

  it('answers not_found for a place that is not a town', async () => {
    const res = await post({ town: 'Nowhereville', token: 'ok' });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'not_found' });
  });

  it('refuses bad requests', async () => {
    expect((await post({ town: 'Berlin', token: 'ok' }, { 'content-type': 'text/plain' })).status).toBe(415);
    expect((await post('{not json')).status).toBe(400);
    expect((await post({ town: 'x'.repeat(5000), token: 'ok' })).status).toBe(413);
    expect(await (await post({ place: 'Berlin', token: 'ok' })).json()).toEqual({ error: 'invalid_town' });
    expect(await (await post({ town: '<script>', token: 'ok' })).json()).toEqual({ error: 'invalid_town' });
  });

  it('needs a Turnstile token issued on this site', async () => {
    expect(await (await post({ town: 'Dunedin' })).json()).toEqual({ error: 'verification_failed' });
    turnstileHost = 'someone-else.example';
    const res = await post({ town: 'Dunedin', token: 'ok' });
    expect(res.status).toBe(403);
    expect(nominatimCalls).toBe(0);
  });

  it('applies the rate limit before anything else', async () => {
    allowed = false;
    const res = await post({ town: 'Dunedin', token: 'ok' });
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ error: 'rate_limited' });
  });

  it('is switched off until the Turnstile secret is set', async () => {
    env = makeEnv(undefined);
    expect((await post({ town: 'Dunedin', token: 'ok' })).status).toBe(503);
  });
});

describe('other routes', () => {
  it('rejects other methods and unknown API paths', async () => {
    const put = await call('/api/towns', { method: 'PUT' });
    expect(put.status).toBe(405);
    expect(put.headers.get('allow')).toBe('GET, POST');
    expect((await call('/api/nope')).status).toBe(404);
  });
});
