# twinelms

## Development

```sh
npm install
npm run dev      # local dev server
npm run build    # static build into dist/
npm run tokens   # regenerate design-system/tokens.css from tokens.json
npm run i18n:check  # list translations that are missing or out of date
npm test         # unit tests
```

### Town search data

Suggestions in the "Where's home?" box come from GeoNames (every place over 1,000 people, CC BY 4.0), built into static files in `public/places/` so guests' browsers only ever talk to our site. To refresh the data (once a year is plenty), download `cities1000.zip`, `countryInfo.txt` and `admin1CodesASCII.txt` from https://download.geonames.org/export/dump/, unzip, and run:

```sh
python3 -I scripts/build-places.py <folder with those files>
```

### Visitor map API (local)

```sh
echo "TURNSTILE_SECRET=1x0000000000000000000000000000000AA" > .dev.vars  # Cloudflare's always-pass test secret, gitignored
npx wrangler d1 migrations apply twinelms-visitors --local         # create the local database
npm run build && npx wrangler dev                                  # site + API on http://localhost:8787
```

- `GET /api/towns` returns every town with its visit count.
- `POST /api/towns` with `{"place": "G2158177", "token": "<Turnstile token>"}` (a picked suggestion, by GeoNames id) or `{"town": "Berlin", "token": ...}` (typed text) adds a visit. A town with the same name and country within about 25 km counts as the same pin. Errors come back as `{"error": "<code>"}` (`verification_failed`, `invalid_town`, `not_found`, `rate_limited`, `geocoder_unavailable`, `not_configured`).
- Spam protection is Cloudflare Turnstile (an automatic "not a robot" check) plus 5 submissions per minute per visitor.
- Only the geocoded town, country, rounded coordinates and visit count are stored. Never names, emails or IP addresses.
- Production needs a Turnstile widget: put its site key in `src/data/turnstile.ts` and set its secret with `npx wrangler secret put TURNSTILE_SECRET`.

## Hosting

Hosted free on Cloudflare (Workers static assets). Cloudflare builds from this repo:

- Every push to `main` builds with `npm run build` and deploys `dist/` using `npx wrangler deploy` (see `wrangler.jsonc`).
- Branches and pull requests get preview builds from `npx wrangler preview` (needs the `previews` block in `wrangler.jsonc`), each with its own preview URL. These URLs are public but unlisted.
- Node version comes from `.node-version`.
