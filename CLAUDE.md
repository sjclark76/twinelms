# The Nest at Twin Elms: guest website

The guest website for The Nest at Twin Elms, Jo and Stuart's family-run Airbnb at 180 Capell Avenue, Lake Hawea 9382, New Zealand. Guests use it during their stay (mostly on phones) to join the Wi-Fi, read the house guide, find places to eat and explore, add their home town to a visitor map, and browse photos.

## Sources of truth

- `content/welcome-guide.md`: the hosts' welcome guide. All site copy comes from here. Don't invent facts about places, opening hours or the animals; if something is missing, use a clear placeholder like `[OPENING HOURS]` and flag it.
- `design-system/`: the Misty lake design system. Start with `design-system/README.md` (brand book, voice, accessibility rules).
  - `tokens.json` is the source of truth for colours, type, spacing and radii. `tokens.css` is generated from it as CSS custom properties; if tokens change, regenerate it.
  - `components/bundle.css` holds the component styles (`nest-` classes). Each `components/<Name>/README.md` says how to use that component; `preview.html` shows its markup.
  - `mockups/` holds the approved page designs; see `mockups/README.md`.
- GitHub issues and the "The Nest website" project board track the work, in milestone order.

## Stack and hosting (all free)

- **Astro**, static output, TypeScript. Keep client-side JavaScript to small islands (copy button, language memory, gallery lightbox, map).
- **Cloudflare (Workers static assets)** hosts the site; every push to `main` deploys, and pull requests get preview URLs (public but unlisted).
- **Visitor map backend:** a small Worker (`src/worker/`) that handles only `/api/*` (everything else is served straight from the static site), plus the `twinelms-visitors` D1 database. Schema changes go in `migrations/` and are applied with `npx wrangler d1 migrations apply twinelms-visitors --remote`. PR previews use a separate `twinelms-visitors-preview` database (see `previews` in `wrangler.jsonc`), which `migrations apply` can't see: apply each new migration to it with `npx wrangler d1 execute twinelms-visitors-preview --remote --file migrations/<file>.sql`. Test towns in either database have a `place_key` starting `test:`.
- **Map:** Leaflet with OpenStreetMap tiles; geocoding with OpenStreetMap Nominatim (server-side, cached, at most 1 request per second, with a proper User-Agent, per its usage policy). Show the "© OpenStreetMap contributors" attribution.
- No paid services, no translation APIs, no analytics or trackers without asking.

## Design rules

- Use only design tokens (`var(--lake)`, `var(--space-4)` …), never raw hex values in components.
- Soft by default: pale tints (`lake-tint`, `meadow`, `oat`, `tussock`, `mist`) with `ink` text. Deep colours only for things guests act on. One deep-filled button per screen; `clay` only for "Add your home town".
- Fonts: Fraunces 600 for display headings, Figtree 400/600 for everything else, self-hosted via `@fontsource` (bundled at build time, no Google requests). On zh/ja/ko pages also load the matching Noto Sans and Noto Serif families.
- Mobile first: body text 16px minimum, tap targets 44px minimum, layouts tested at 390px wide.
- Accessibility: WCAG AA contrast (every pairing is listed in the token usage notes), real buttons, links and labelled inputs, alt text on every image in every language, visible focus states.
- No emoji in the UI; icons are simple 1.5px line icons in `ink` or `lake`.

## Pages

1. **Home** (`/`): welcome hero with photo, quick-info cards (check-in after 3:00pm, check-out by 11:00am, address, hosts' phone numbers), Wi-Fi card, About us, Meet the family (Dexter, the chickens, Daphne and Elliot), "Where's home for you?" invitation to the map, footer.
2. **Guest guide** (`/guide/`): jump links, house essentials and "Before you leave", local highlights, where to eat (Hawea, Wanaka), shops and essentials, hikes, mountain biking, ski fields, emergency info.
3. **Visitor map** (`/map/`): world map with guest pins, a stat line, the "Where's home?" form and a short privacy explanation.
4. **Gallery** (`/gallery/`): filter chips and a photo grid with captions; tap to open a lightbox.

Every page shares the site header (wordmark, navigation, language switcher) and the beech footer (address, hosts' numbers, emergency 111, no smoking, review request).

## Wi-Fi

- Network `The Quack House Guest`, password `Quackers`.
- Show a QR code in the standard format `WIFI:T:WPA;S:The Quack House Guest;P:Quackers;;`, drawn in `ink` on white with a quiet zone. Generate it at build time (no runtime service).
- Also show the network name, the password and a "Copy password" button, for guests already reading on their phone.

## Languages

- Locales: `en` (default), `zh-Hans` (URL `/zh/`), `de`, `ja`, `ko`, `fr`, `es`. Use Astro's i18n routing.
- All UI strings and page copy live in per-language files in `src/i18n/` (`en.ts` is the full set; `zh.ts`, `de.ts` and the rest hold only what's translated, and anything missing falls back to English). No strings hard-coded in components. Place names, addresses and phone numbers live in `src/data/`.
- Page bodies are in `src/views/`; `src/pages/` has the English route and `src/pages/[locale]/` generates the other six, so every page exists under every language path.
- A language is hidden (not in the switcher, not in hreflang, `noindex`) until it's added to `ENABLED_LOCALES` in `src/i18n/config.ts`. Add it there once its translation is finished.
- **When English text changes:** edit `en.ts`, run `npm run i18n:check` to list every string that is now missing or outdated in each language, translate just those, then run `npm run i18n:check -- --update <lang>` to record that language as current. `src/i18n/status.json` holds those records and whether a native speaker has reviewed each language (`reviewed`).
- Guests on an English page are sent to their saved language, or their browser's language, once more than one language is enabled.
- Translations are done once and committed. Place names, addresses and phone numbers are never translated.
- The language switcher shows each language in its own script ("Deutsch", "日本語"), never flags, links to the same page in that language, and remembers the guest's choice.

## Visitor map rules

- Store only the town (as returned by geocoding: name, country, latitude, longitude) and a visit count per town. Never store names, emails or IP addresses.
- Submitting a town is protected by Cloudflare Turnstile (verified in the Worker; the secret is the `TURNSTILE_SECRET` Worker secret, never in the repo) plus a rate limit. There is no guest code: the hosts chose this so there's nothing to hand out.
- Basic rate limiting on the function. Validate and sanitise all input.
- One pin per town, showing the number of visits. The Nest is a separate terracotta pin.

## Working conventions

- Work one GitHub issue at a time, on a branch, and open a pull request that references the issue.
- Keep the build passing and check pages at 390px and 1280px before opening a PR.
- If a design question isn't answered by the design system or mockups, ask rather than guess.
- When the design system changes in code, update `design-system/` to match so the two never drift.
