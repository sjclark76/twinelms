// Town search over the GeoNames files in public/places/ (built by scripts/build-places.py).
// Used by the map page in the browser and by the Worker; the rules here must match the build script.

export const BUCKETS = 1024;
export const ID_FILES = 256;
const MAX_LEN = 6;

const EXTRA: Record<string, string> = { ß: 'ss', ø: 'o', æ: 'ae', œ: 'oe', ł: 'l', đ: 'd', ı: 'i', ð: 'd', þ: 'th' };

/** Search form of a name: no accents, lower case, single spaces ("Lake Hāwea" -> "lake hawea"). */
export function foldName(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[ßøæœłđıðþ]/g, (c) => EXTRA[c] ?? c)
    .replace(/\s+/g, ' ')
    .trim();
}

const isCjk = (c: string) => {
  const o = c.codePointAt(0) ?? 0;
  return (o >= 0x3040 && o <= 0x30ff) || (o >= 0x3400 && o <= 0x9fff) || (o >= 0xac00 && o <= 0xd7af) ||
    (o >= 0x1100 && o <= 0x11ff) || (o >= 0xf900 && o <= 0xfaff);
};

/** Chinese, Japanese and Korean names are searchable after one character, others after two. */
export const minLength = (folded: string) => (folded && isCjk(folded[0]) ? 1 : 2);

/**
 * The file "start" for a folded query: common starts are split into longer ones (listed in split.json).
 * Returns null if the query is too short, or ends exactly on a start that is split (keep typing).
 */
export function startFor(folded: string, split: Set<string>): string | null {
  let n = minLength(folded);
  if (folded.length < n) return null;
  while (split.has(folded.slice(0, n)) && n < folded.length && n < MAX_LEN) n++;
  const start = folded.slice(0, n);
  return split.has(start) && n < MAX_LEN ? null : start;
}

let table: Uint32Array | undefined;
function crc32(text: string): number {
  if (!table) {
    table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[i] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (const byte of new TextEncoder().encode(text)) crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/** Which search file (public/places/s/<n>.json) holds a start. Same as Python's zlib.crc32 % BUCKETS. */
export const bucketFor = (start: string) => crc32(start) % BUCKETS;

/**
 * One search file: sorted [name key, place index] pairs (with a trailing 1 when the key is another name for the town,
 * such as "munchen" for Munich), and places as [id, name, region, country, population], biggest first.
 */
export interface SearchFile {
  k: ([string, number] | [string, number, 1])[];
  p: PlaceRow[];
}

export interface Suggestion {
  id: string;
  name: string;
  detail: string;
}

type PlaceRow = [number, string, string, string, number];

/** split.json: each split start with its 6 biggest towns. */
export type SplitIndex = Record<string, PlaceRow[]>;

const toSuggestion = ([id, name, region, country]: PlaceRow): Suggestion => ({
  id: `G${id}`,
  name,
  detail: [region, country].filter((x) => x && x !== name).join(', '),
});

/** The biggest towns for a common start the guest has typed exactly ("sa"), or [] if it isn't one. */
export const topTowns = (split: SplitIndex, folded: string): Suggestion[] => (split[folded] ?? []).map(toSuggestion);

/** Towns whose names start with the query, biggest first. */
export function findTowns(file: SearchFile, folded: string, max = 6): Suggestion[] {
  // Binary search for the first key >= query, then walk while keys still start with it.
  let lo = 0;
  let hi = file.k.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (file.k[mid][0] < folded) lo = mid + 1;
    else hi = mid;
  }
  const direct = new Set<number>();
  const other = new Set<number>();
  for (let i = lo; i < file.k.length && file.k[i][0].startsWith(folded); i++) {
    (file.k[i][2] ? other : direct).add(file.k[i][1]);
  }
  // Towns whose own name matches come first, then towns matched by another name ("München" for Munich).
  // Places are stored biggest first, so lower indexes are bigger towns.
  const byIndex = (a: number, b: number) => a - b;
  const ranked = [...[...direct].sort(byIndex), ...[...other].filter((i) => !direct.has(i)).sort(byIndex)];
  return ranked.slice(0, max).map((i) => toSuggestion(file.p[i]));
}
