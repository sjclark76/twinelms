import { describe, expect, it } from 'vitest';
import { cleanTown, isPlaceId, normaliseQuery, photonLanguage, pickPlace, toPlace, toSuggestions } from './towns';

describe('cleanTown', () => {
  it('accepts towns in any script and tidies spaces', () => {
    expect(cleanTown('  Berlin ')).toBe('Berlin');
    expect(cleanTown('São  Paulo')).toBe('São Paulo');
    expect(cleanTown('東京')).toBe('東京');
    expect(cleanTown('서울')).toBe('서울');
    expect(cleanTown("St. John's")).toBe("St. John's");
    expect(cleanTown('Stratford-upon-Avon')).toBe('Stratford-upon-Avon');
  });
  it('rejects empty, too long, non-text and markup', () => {
    expect(cleanTown('')).toBeNull();
    expect(cleanTown('a')).toBeNull();
    expect(cleanTown('x'.repeat(81))).toBeNull();
    expect(cleanTown(42)).toBeNull();
    expect(cleanTown('<script>')).toBeNull();
    expect(cleanTown('http://spam.example')).toBeNull();
    expect(cleanTown('123 Main St')).toBeNull();
  });
});

describe('toPlace', () => {
  const berlin = {
    osm_type: 'relation', osm_id: 62422, lat: '52.5170365', lon: '13.3888599', addresstype: 'city', name: 'Berlin',
    address: { city: 'Berlin', country: 'Germany', country_code: 'de' },
  };
  it('keeps only the town, country and rounded centre', () => {
    expect(toPlace(berlin)).toEqual({
      placeKey: 'relation:62422', name: 'Berlin', country: 'Germany', countryCode: 'DE', lat: 52.517, lng: 13.389,
    });
  });
  it('rejects streets, buildings, countries and empty results', () => {
    expect(toPlace({ ...berlin, addresstype: 'road' })).toBeNull();
    expect(toPlace({ ...berlin, addresstype: 'country' })).toBeNull();
    expect(toPlace(undefined)).toBeNull();
    expect(toPlace({ ...berlin, address: { city: 'X' } })).toBeNull();
  });
});

describe('normaliseQuery', () => {
  it('normalises case for the cache', () => {
    expect(normaliseQuery('BERLIN')).toBe(normaliseQuery('berlin'));
  });
});

describe('pickPlace', () => {
  const base = { osm_type: 'relation', lat: '35.68', lon: '139.76' };
  it('accepts a city mapped as a province when it is linked to a city (Tokyo)', () => {
    const tokyo = { ...base, osm_id: 1543125, addresstype: 'province', name: 'Tokyo', extratags: { linked_place: 'city' },
      address: { province: 'Tokyo', country: 'Japan', country_code: 'jp' } };
    expect(pickPlace([tokyo])?.name).toBe('Tokyo');
  });
  it('skips a state entry and takes the city entry after it (Shanghai)', () => {
    const state = { ...base, osm_id: 1, addresstype: 'state', name: 'Shanghai', extratags: { linked_place: 'state' },
      address: { state: 'Shanghai', country: 'China', country_code: 'cn' } };
    const city = { ...base, osm_type: 'node', osm_id: 2, addresstype: 'city', name: 'Shanghai',
      address: { city: 'Shanghai', country: 'China', country_code: 'cn' } };
    expect(pickPlace([state, city])?.placeKey).toBe('node:2');
  });
  it('rejects a real state (California)', () => {
    const california = { ...base, osm_id: 3, addresstype: 'state', name: 'California', extratags: { linked_place: 'state' },
      address: { state: 'California', country: 'United States', country_code: 'us' } };
    expect(pickPlace([california])).toBeNull();
    expect(pickPlace([])).toBeNull();
  });
});

describe('toSuggestions', () => {
  const f = (p: Record<string, string | number>) => ({ properties: p });
  it('keeps towns and cities, drops airports, farms and shops', () => {
    const out = toSuggestions([
      f({ osm_key: 'place', osm_value: 'city', type: 'city', osm_type: 'R', osm_id: 4246124, name: 'Melbourne', state: 'Victoria', country: 'Australia' }),
      f({ osm_key: 'aeroway', osm_value: 'aerodrome', type: 'house', osm_type: 'W', osm_id: 1, name: 'Melbourne Airport', country: 'Australia' }),
      f({ osm_key: 'place', osm_value: 'farm', type: 'locality', osm_type: 'N', osm_id: 2, name: 'Lake Hāwea Station', country: 'New Zealand' }),
      f({ osm_key: 'place', osm_value: 'town', type: 'city', osm_type: 'N', osm_id: 3, name: 'Lake Hāwea', state: 'Otago', country: 'New Zealand' }),
    ]);
    expect(out).toEqual([
      { id: 'R4246124', name: 'Melbourne', detail: 'Victoria, Australia' },
      { id: 'N3', name: 'Lake Hāwea', detail: 'Otago, New Zealand' },
    ]);
  });
  it('accepts a city mapped as a province (Tokyo) but not a plain state', () => {
    const tokyo = f({ osm_key: 'place', osm_value: 'province', type: 'city', osm_type: 'R', osm_id: 5, name: 'Tokyo', country: 'Japan' });
    const bavaria = f({ osm_key: 'place', osm_value: 'state', type: 'state', osm_type: 'R', osm_id: 6, name: 'Bavaria', country: 'Germany' });
    expect(toSuggestions([tokyo, bavaria]).map((s) => s.name)).toEqual(['Tokyo']);
  });
});

describe('isPlaceId and photonLanguage', () => {
  it('accepts only OpenStreetMap ids', () => {
    expect(isPlaceId('R62422')).toBe(true);
    expect(isPlaceId('N1')).toBe(true);
    expect(isPlaceId('X1')).toBe(false);
    expect(isPlaceId('R1; DROP TABLE')).toBe(false);
    expect(isPlaceId(62422)).toBe(false);
  });
  it('uses Photon languages where available', () => {
    expect(photonLanguage('de')).toBe('de');
    expect(photonLanguage('ja')).toBe('default');
  });
});
