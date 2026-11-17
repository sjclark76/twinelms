import { describe, expect, it } from 'vitest';
import { mergeRanges, parseIcal } from './availability';

const ics = (events: string[]) => `BEGIN:VCALENDAR\r\nVERSION:2.0\r\n${events.join('\r\n')}\r\nEND:VCALENDAR\r\n`;
const ev = (lines: string) => `BEGIN:VEVENT\r\n${lines}\r\nEND:VEVENT`;

describe('parseIcal', () => {
  it('reads date-only events and drops everything but the dates', () => {
    const text = ics([ev('DTSTART;VALUE=DATE:20261120\r\nDTEND;VALUE=DATE:20261123\r\nSUMMARY:Reserved\r\nDESCRIPTION:Guest Name 0123456789')]);
    expect(parseIcal(text, '2026-11-01')).toEqual([{ from: '2026-11-20', to: '2026-11-23' }]);
  });

  it('reads date-time values and unfolds long lines', () => {
    const text = ics([ev('DTSTART:20261201T150000Z\r\nDTEND:20261203T\r\n 110000Z')]);
    expect(parseIcal(text, '2026-11-01')).toEqual([{ from: '2026-12-01', to: '2026-12-03' }]);
  });

  it('treats an event with no end as one night', () => {
    expect(parseIcal(ics([ev('DTSTART;VALUE=DATE:20261220')]), '2026-11-01')).toEqual([{ from: '2026-12-20', to: '2026-12-21' }]);
  });

  it('drops stays that have already finished and joins back-to-back stays', () => {
    const text = ics([
      ev('DTSTART;VALUE=DATE:20260101\r\nDTEND;VALUE=DATE:20260105'),
      ev('DTSTART;VALUE=DATE:20261110\r\nDTEND;VALUE=DATE:20261115'),
      ev('DTSTART;VALUE=DATE:20261115\r\nDTEND;VALUE=DATE:20261118'),
    ]);
    expect(parseIcal(text, '2026-11-01')).toEqual([{ from: '2026-11-10', to: '2026-11-18' }]);
  });

  it('copes with an empty or unrelated feed', () => {
    expect(parseIcal('', '2026-11-01')).toEqual([]);
    expect(parseIcal('<html>nope</html>', '2026-11-01')).toEqual([]);
  });
});

describe('mergeRanges', () => {
  it('sorts and merges overlapping ranges', () => {
    expect(
      mergeRanges([{ from: '2026-12-05', to: '2026-12-08' }, { from: '2026-12-01', to: '2026-12-06' }]),
    ).toEqual([{ from: '2026-12-01', to: '2026-12-08' }]);
  });
});
