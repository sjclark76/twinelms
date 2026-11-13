"""
Builds the town search files in public/places/ from the GeoNames dump (CC BY 4.0, https://www.geonames.org).

    python3 -I scripts/build-places.py <folder with cities1000.txt, countryInfo.txt, admin1CodesASCII.txt>

Download those three files from https://download.geonames.org/export/dump/ (unzip cities1000.zip).
Output:
  public/places/split.json       the name starts common enough to be split into longer starts, each with its 6 biggest towns
  public/places/s/<bucket>.json  search files: towns whose names start with the same letters share a bucket
  public/places/id/<n>.json      the same towns by GeoNames id (id % 256), used by the Worker to confirm a pick
The bucket and folding rules must match src/data/places-search.ts.
"""
import json, os, re, sys, unicodedata, zlib

EXTRA = str.maketrans({'ß': 'ss', 'ø': 'o', 'æ': 'ae', 'œ': 'oe', 'ł': 'l', 'đ': 'd', 'ı': 'i', 'ð': 'd', 'þ': 'th'})
BUCKETS = 1024
ID_FILES = 256
MAX_KEYS = 800   # a start shared by more names than this is split into longer starts
MAX_LEN = 6


def fold(s):
    s = unicodedata.normalize('NFKD', s)
    s = ''.join(c for c in s if not unicodedata.category(c).startswith('M'))
    return re.sub(r'\s+', ' ', s.lower().translate(EXTRA)).strip()


def is_cjk(c):
    o = ord(c)
    return 0x3040 <= o <= 0x30FF or 0x3400 <= o <= 0x9FFF or 0xAC00 <= o <= 0xD7AF or 0x1100 <= o <= 0x11FF or 0xF900 <= o <= 0xFAFF


def base_len(key):
    """CJK names start being searchable after one character, everything else after two."""
    return 1 if is_cjk(key[0]) else 2


def prefix_for(key, split):
    n = base_len(key)
    while key[:n] in split and n < len(key) and n < MAX_LEN:
        n += 1
    return key[:n]


def bucket(start):
    return zlib.crc32(start.encode('utf-8')) % BUCKETS


def choose_splits(keys):
    """Find the starts that need splitting so that no start is shared by more than MAX_KEYS names."""
    split = set()
    level = {}
    for k in keys:
        level.setdefault(k[:base_len(k)], []).append(k)
    while level:
        nxt = {}
        for start, group in level.items():
            if len(group) > MAX_KEYS and len(start) < MAX_LEN:
                split.add(start)
                for k in group:
                    if len(k) > len(start):
                        nxt.setdefault(k[:len(start) + 1], []).append(k)
        level = nxt
    return split


def main(src):
    countries = {}
    for line in open(f'{src}/countryInfo.txt', encoding='utf-8'):
        if line.startswith('#'):
            continue
        f = line.rstrip('\n').split('\t')
        countries[f[0]] = f[4]
    regions = {}
    for line in open(f'{src}/admin1CodesASCII.txt', encoding='utf-8'):
        f = line.rstrip('\n').split('\t')
        regions[f[0]] = f[1]

    places, all_keys = {}, []
    for line in open(f'{src}/cities1000.txt', encoding='utf-8'):
        f = line.rstrip('\n').split('\t')
        gid, name, ascii_name, alternates, lat, lng, cc, admin1, pop = (
            int(f[0]), f[1], f[2], f[3], float(f[4]), float(f[5]), f[8], f[10], int(f[14] or 0))
        if cc not in countries:
            continue
        places[gid] = [name, regions.get(f'{cc}.{admin1}', ''), countries[cc], cc, round(lat, 3), round(lng, 3), pop]
        names = {fold(name), fold(ascii_name)} - {''}
        others = set()
        if pop >= 15000:  # bigger towns are also findable by their names in other languages and scripts
            for a in alternates.split(','):
                a = a.strip()
                if len(a) < 2 or re.fullmatch(r'[A-Z0-9]{2,4}', a) or re.search(r'\d|https?:', a):
                    continue
                others.add(fold(a))
        for key in names:
            all_keys.append((key, gid, 0))
        for key in others - names - {''}:
            all_keys.append((key, gid, 1))  # 1 = matched by another name, ranked after direct matches

    split = choose_splits([k for k, _, _ in all_keys])
    keys_by_bucket = {}
    for key, gid, other in all_keys:
        keys_by_bucket.setdefault(bucket(prefix_for(key, split)), []).append((key, gid, other))

    out = os.path.join(os.path.dirname(__file__), '..', 'public', 'places')
    os.makedirs(f'{out}/s', exist_ok=True)
    os.makedirs(f'{out}/id', exist_ok=True)
    # For each split start, the 6 biggest towns, so a common start like "sa" shows something straight away.
    # Direct name matches come first; towns matched only by another name fill any remaining places.
    tops = {start: {} for start in split}
    for key, gid, other in all_keys:
        for n in range(1, MAX_LEN + 1):
            if key[:n] in tops:
                rank = (other, -places[gid][6])
                tops[key[:n]][gid] = min(rank, tops[key[:n]].get(gid, rank))
    index = {start: [[g, *places[g][:3], places[g][6]] for g in sorted(ids, key=lambda g: ids[g])[:6]]
             for start, ids in sorted(tops.items())}
    open(f'{out}/split.json', 'w', encoding='utf-8').write(json.dumps(index, ensure_ascii=False, separators=(',', ':')))
    for old in os.listdir(f'{out}/s'):
        os.remove(f'{out}/s/{old}')
    total = 0
    for b, entries in keys_by_bucket.items():
        entries.sort()
        ids = sorted({gid for _, gid, _ in entries}, key=lambda g: -places[g][6])
        index = {gid: i for i, gid in enumerate(ids)}
        data = {'k': [[k, index[g], 1] if o else [k, index[g]] for k, g, o in entries],
                'p': [[g, *places[g][:3]] + [places[g][6]] for g in ids]}
        body = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
        total += len(body.encode('utf-8'))
        open(f'{out}/s/{b}.json', 'w', encoding='utf-8').write(body)
    by_file = {}
    for gid, p in places.items():
        by_file.setdefault(gid % ID_FILES, {})[str(gid)] = p[:6]
    id_total = 0
    for n, data in by_file.items():
        body = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
        id_total += len(body.encode('utf-8'))
        open(f'{out}/id/{n}.json', 'w', encoding='utf-8').write(body)
    print(f'{len(places)} towns; {len(split)} split starts; {len(keys_by_bucket)} search files ({total / 1e6:.1f} MB), '
          f'{len(by_file)} id files ({id_total / 1e6:.1f} MB)')


if __name__ == '__main__':
    main(sys.argv[1])
