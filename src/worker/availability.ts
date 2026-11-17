// Turns an Airbnb calendar feed (iCal) into plain "not available" date ranges.
// Only dates are kept: guest names, summaries and reservation codes never leave this file.

export interface DateRange {
  /** First unavailable night, YYYY-MM-DD. */
  from: string;
  /** The day after the last unavailable night (the check-out morning), YYYY-MM-DD. */
  to: string;
}

/** "20261120" or "20261120T150000Z" -> "2026-11-20", or null. */
function toDate(value: string): string | null {
  const m = /^(\d{4})(\d{2})(\d{2})/.exec(value.trim());
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

const addDay = (date: string) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
};

export function parseIcal(text: string, today: string): DateRange[] {
  // Long lines are folded onto the next line starting with a space or tab.
  const lines = text.replace(/\r?\n[ \t]/g, '').split(/\r?\n/);
  const ranges: DateRange[] = [];
  let start: string | null = null;
  let end: string | null = null;
  let inEvent = false;
  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      inEvent = true;
      start = end = null;
    } else if (line === 'END:VEVENT') {
      if (inEvent && start) ranges.push({ from: start, to: end && end > start ? end : addDay(start) });
      inEvent = false;
    } else if (inEvent) {
      const colon = line.indexOf(':');
      if (colon < 0) continue;
      const name = line.slice(0, colon).split(';')[0];
      if (name === 'DTSTART') start = toDate(line.slice(colon + 1));
      else if (name === 'DTEND') end = toDate(line.slice(colon + 1));
    }
  }
  return mergeRanges(ranges.filter((r) => r.to > today));
}

/** Sorts ranges and joins any that overlap or touch. */
export function mergeRanges(ranges: DateRange[]): DateRange[] {
  const sorted = [...ranges].sort((a, b) => (a.from < b.from ? -1 : a.from > b.from ? 1 : 0));
  const out: DateRange[] = [];
  for (const r of sorted) {
    const last = out[out.length - 1];
    if (last && r.from <= last.to) {
      if (r.to > last.to) last.to = r.to;
    } else {
      out.push({ ...r });
    }
  }
  return out;
}
