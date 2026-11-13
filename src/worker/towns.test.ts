import { describe, expect, it } from 'vitest';
import { cleanTown, normaliseQuery, safeEqual, toPlace } from './towns';

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

describe('safeEqual and normaliseQuery', () => {
  it('compares exactly', () => {
    expect(safeEqual('NEST2026', 'NEST2026')).toBe(true);
    expect(safeEqual('NEST2026', 'NEST2027')).toBe(false);
    expect(safeEqual('NEST', 'NEST2026')).toBe(false);
  });
  it('normalises case for the cache', () => {
    expect(normaliseQuery('BERLIN')).toBe(normaliseQuery('berlin'));
  });
});
