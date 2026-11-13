-- One row per town. Only the geocoded town is stored: never names, emails or IP addresses.
CREATE TABLE towns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  place_key TEXT NOT NULL UNIQUE,      -- OpenStreetMap id, e.g. "relation:2552648"
  name TEXT NOT NULL,
  country TEXT NOT NULL,
  country_code TEXT NOT NULL,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  visits INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Geocoding results, so each place is looked up at Nominatim once.
CREATE TABLE geocode_cache (
  query TEXT PRIMARY KEY,              -- normalised town text, e.g. "berlin"
  result TEXT,                         -- JSON of the matched place, or NULL if nothing was found
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Small key/value store; holds the time of the last Nominatim request (1 request per second limit).
CREATE TABLE meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
