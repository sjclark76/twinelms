# twinelms

## Development

```sh
npm install
npm run dev      # local dev server
npm run build    # static build into dist/
npm run tokens   # regenerate design-system/tokens.css from tokens.json
```

## Hosting

Hosted free on Cloudflare (Workers static assets). Cloudflare builds from this repo:

- Every push to `main` builds with `npm run build` and deploys `dist/` using `npx wrangler deploy` (see `wrangler.jsonc`).
- Other branches and pull requests get preview builds from `npx wrangler versions upload`.
- Node version comes from `.node-version`.
