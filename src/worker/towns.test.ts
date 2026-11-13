import { describe, expect, it } from 'vitest';
import { cleanTown, isPlaceId, normaliseQuery, pickPlace, toPlace } from './towns';
import { bucketFor, findTowns, foldName, startFor, topTowns, type SearchFile } from '../data/places-search';

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

describe('isPlaceId', () => {
  it('accepts only GeoNames ids', () => {
    expect(isPlaceId('G2158177')).toBe(true);
    expect(isPlaceId('R62422')).toBe(false);
    expect(isPlaceId('G1; DROP TABLE')).toBe(false);
    expect(isPlaceId(2158177)).toBe(false);
  });
});

describe('town search (must match scripts/build-places.py)', () => {
  it('folds names the same way as the build script', () => {
    expect(foldName('Lake Hāwea')).toBe('lake hawea');
    expect(foldName('  München ')).toBe('munchen');
    expect(foldName('Łódź')).toBe('lodz');
    expect(foldName('Straße')).toBe('strasse');
  });
  it('puts starts in the same files as Python zlib.crc32 % 1024', () => {
    expect(bucketFor('me')).toBe(706);
    expect(bucketFor('東')).toBe(589);
    expect(bucketFor('san')).toBe(418);
    expect(bucketFor('서')).toBe(758);
  });
  it('waits for two letters, one CJK character, and longer starts when a start is split', () => {
    const split = new Set(['sa', 'san']);
    expect(startFor('m', split)).toBeNull();
    expect(startFor('me', split)).toBe('me');
    expect(startFor('東', split)).toBe('東');
    expect(startFor('sa', split)).toBeNull();
    expect(startFor('sant', split)).toBe('sant');
  });
  it('finds towns by prefix, biggest first, once each', () => {
    const file: SearchFile = {
      k: [['melba', 1], ['melbourne', 0], ['melbourne', 2], ['merida', 3]],
      p: [[1, 'Melbourne', 'Victoria', 'Australia', 5000000], [2, 'Melba', 'Idaho', 'United States', 500],
        [3, 'Melbourne', 'Florida', 'United States', 80000], [4, 'Mérida', 'Yucatán', 'Mexico', 900000]],
    };
    expect(findTowns(file, 'melb').map((t) => `${t.name}, ${t.detail}`)).toEqual([
      'Melbourne, Victoria, Australia', 'Melba, Idaho, United States', 'Melbourne, Florida, United States',
    ]);
    expect(findTowns(file, 'melb')[0].id).toBe('G1');
  });
  it('ranks towns whose own name matches ahead of bigger towns matched by another name', () => {
    const file: SearchFile = {
      k: [['santa fe de bogota', 0, 1], ['santiago', 1]],
      p: [[1, 'Bogotá', 'Bogota D.C.', 'Colombia', 7600000], [2, 'Santiago', 'Santiago Metropolitan', 'Chile', 4800000]],
    };
    expect(findTowns(file, 'sant').map((t) => t.name)).toEqual(['Santiago', 'Bogotá']);
  });
  it('shows the biggest towns for a common start', () => {
    const split = { sa: [[3448439, 'São Paulo', 'São Paulo', 'Brazil', 10021295]] as [number, string, string, string, number][] };
    expect(topTowns(split, 'sa')).toEqual([{ id: 'G3448439', name: 'São Paulo', detail: 'Brazil' }]);
    expect(topTowns(split, 'me')).toEqual([]);
  });
});
