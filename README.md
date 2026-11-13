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

### Visitor map API (local)

```sh
echo "GUEST_CODE=ANYTESTCODE" > .dev.vars                          # local-only secret, gitignored
npx wrangler d1 migrations apply twinelms-visitors --local         # create the local database
npm run build && npx wrangler dev                                  # site + API on http://localhost:8787
```

- `GET /api/towns` returns every town with its visit count.
- `POST /api/towns` with `{"town": "Berlin", "code": "<guest code>"}` adds a visit. Errors come back as `{"error": "<code>"}` (`invalid_code`, `invalid_town`, `not_found`, `rate_limited`, `geocoder_unavailable`, `not_configured`).
- Only the geocoded town, country, rounded coordinates and visit count are stored. Never names, emails or IP addresses.
- The production guest code is a secret: set or change it with `npx wrangler secret put GUEST_CODE`.

## Hosting

Hosted free on Cloudflare (Workers static assets). Cloudflare builds from this repo:

- Every push to `main` builds with `npm run build` and deploys `dist/` using `npx wrangler deploy` (see `wrangler.jsonc`).
- Branches and pull requests get preview builds from `npx wrangler preview` (needs the `previews` block in `wrangler.jsonc`), each with its own preview URL. These URLs are public but unlisted.
- Node version comes from `.node-version`.
