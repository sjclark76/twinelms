import { describe, expect, it } from 'vitest';
import { counter, esc, moveActive, pinSize, sortTowns, statLine, townRequest, type MapStrings, type Town } from './text';

const town = (name: string, countryCode: string, visits = 1): Town => ({ name, country: countryCode, countryCode, lat: 0, lng: 0, visits });
const strings = {
  stat: 'Guests from {towns} in {countries}',
  statEmpty: 'Be the first!',
  towns: { one: '{n} town', other: '{n} towns' },
  countries: { one: '{n} country', other: '{n} countries' },
} as MapStrings;

describe('counter', () => {
  it('picks the plural form and formats the number for the language', () => {
    const en = counter('en');
    expect(en({ one: '{n} visit', other: '{n} visits' }, 1)).toBe('1 visit');
    expect(en({ one: '{n} visit', other: '{n} visits' }, 1200)).toBe('1,200 visits');
    expect(counter('de')({ one: '{n} Besuch', other: '{n} Besuche' }, 1200)).toBe('1.200 Besuche');
    // French counts 0 as singular.
    expect(counter('fr')({ one: '{n} visite', other: '{n} visites' }, 0)).toBe('0 visite');
  });
});

describe('statLine', () => {
  const count = counter('en');
  it('counts towns and distinct countries', () => {
    expect(statLine([town('Berlin', 'DE'), town('Munich', 'DE'), town('Lyon', 'FR')], strings, count)).toBe(
      'Guests from 3 towns in 2 countries',
    );
    expect(statLine([town('Berlin', 'DE')], strings, count)).toBe('Guests from 1 town in 1 country');
  });
  it('invites the first guest when the map is empty', () => {
    expect(statLine([], strings, count)).toBe('Be the first!');
  });
});

describe('sortTowns', () => {
  it('puts the most visits first, then sorts by name, without changing the input', () => {
    const input = [town('Lyon', 'FR', 2), town('Berlin', 'DE', 5), town('Auckland', 'NZ', 2)];
    expect(sortTowns(input).map((t) => t.name)).toEqual(['Berlin', 'Auckland', 'Lyon']);
    expect(input[0].name).toBe('Lyon');
  });
});

describe('pinSize', () => {
  it('grows from 18px at one visit to 1.6 times at ten or more', () => {
    expect(pinSize(1)).toBe(18);
    expect(pinSize(0)).toBe(18);
    expect(pinSize(10)).toBe(29);
    expect(pinSize(500)).toBe(29);
    expect(pinSize(3)).toBeGreaterThan(18);
  });
});

describe('moveActive', () => {
  it('moves down and up through the suggestions, wrapping round', () => {
    expect(moveActive(-1, 3, 'ArrowDown')).toBe(0);
    expect(moveActive(2, 3, 'ArrowDown')).toBe(0);
    expect(moveActive(-1, 3, 'ArrowUp')).toBe(2);
    expect(moveActive(0, 3, 'ArrowUp')).toBe(2);
    expect(moveActive(2, 3, 'ArrowUp')).toBe(1);
  });
});

describe('townRequest', () => {
  const picked = { id: 'G2950159', label: 'Berlin, Germany' };
  it('sends the picked town id while the text is unchanged', () => {
    expect(townRequest('Berlin, Germany', picked, 't')).toEqual({ place: 'G2950159', token: 't' });
  });
  it('sends the typed text if nothing was picked or the text was edited', () => {
    expect(townRequest('Berlin', null, 't')).toEqual({ town: 'Berlin', token: 't' });
    expect(townRequest('Berlin, Germanyy', picked, 't')).toEqual({ town: 'Berlin, Germanyy', token: 't' });
  });
});

describe('esc', () => {
  it('escapes HTML special characters', () => {
    expect(esc(`<b>"Tom's" & co</b>`)).toBe('&#60;b&#62;&#34;Tom&#39;s&#34; &#38; co&#60;/b&#62;');
  });
});
