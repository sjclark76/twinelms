# twinelms

## Development

```sh
npm install
npm run dev      # local dev server
npm run build    # static build into dist/
npm run tokens   # regenerate design-system/tokens.css from tokens.json
npm run i18n:check  # list translations that are missing or out of date
```

## Hosting

Hosted free on Cloudflare (Workers static assets). Cloudflare builds from this repo:

- Every push to `main` builds with `npm run build` and deploys `dist/` using `npx wrangler deploy` (see `wrangler.jsonc`).
- Branches and pull requests get preview builds from `npx wrangler preview` (needs the `previews` block in `wrangler.jsonc`), each with its own preview URL. These URLs are public but unlisted.
- Node version comes from `.node-version`.
