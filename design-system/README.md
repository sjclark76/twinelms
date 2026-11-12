# The Nest at Twin Elms

The design system for the guest website of The Nest at Twin Elms, a family-run Airbnb at 180 Capell Avenue, Lake Hawea. The look is **Misty lake**: soft and calm, like Lake Hawea on a still morning. Pale lake blue, sage green, oat and soft golden tussock carry the mountains, rivers and green spaces, with dark ink text on top so everything stays easy to read. The warmth comes from a gentle golden accent and a friendly voice that carries Jo, Stuart, Jessiah, Zoe, Dexter, the chickens and the ducks.

This is a first, deliberately small system built from the welcome guide alone (no logo, photos or existing brand files yet). Values are proposals to react to.

## Content fundamentals

- **Voice:** first person plural, like a host talking at the kitchen bench. "We love sharing our slice of paradise", not "Guests are invited to…".
- **Names, always:** the animals are Dexter, Duchess, Zelda, Thelma, Louise, Daphne and Elliot. Use them; they are the brand.
- **New Zealand English:** colour, centre, "take out", "café". Phone numbers in +64 format.
- **Practical first:** addresses, hours and phone numbers sit directly under a place's name in `small` / `slate`.
- **Multilingual:** every string is written to translate cleanly: short sentences, no puns that depend on English, no text baked into images. Place names (Lake Hawea, Roy's Peak) stay untranslated.

## Visual foundations

- **Soft by default:** most colour on a page is a pale tint (`lake-tint`, `meadow`, `oat`, `tussock`, `mist`) with `ink` text on it. Deeper tones are kept for the few things a guest must act on.
- **Ground:** pages sit on `cream`; cards on `white` or `mist`, with a `line` hairline and `radius-md`. No drop shadows.
- **Header:** a `lake-tint` band with the name in `display` and `ink`, never a dark bar.
- **Buttons:** primary is `lake` with white text; secondary is `beech`. `clay` is the rare warm call to action. Only one deep-filled button per screen.
- **The region:** `lake`, `lake-tint` and `lake-mist` for the lake and skiing; `beech`, `fern` and `meadow` for walks and green spaces; `river` for rivers and swims; `earth`, `schist` and `oat` for mountains, trails, timber and food.
- **Activity tags:** pale pills with ink text so guests can scan the guide: hiking `meadow`, biking and eateries `oat`, lake and skiing `lake-tint`, rivers and swims `river`, the animals `tussock`. Always pair the colour with a label or icon; never rely on colour alone.
- **Type:** `display` (Fraunces) for headlines only; `sans` (Figtree) for everything else. Load both from Google Fonts (Fraunces 600; Figtree 400, 600). Chinese, Japanese and Korean pages fall back to Noto Serif / Noto Sans in the same stacks: load the matching Noto family only on that language's pages.
- **Space:** be generous. `space-10` between sections; the page should feel like the lake, not a brochure.
- **Shape:** soft. Buttons, chips and tags are pills (`radius-pill`); cards and photos `radius-md`.
- **Mobile first:** most guests read on a phone. Body text never drops below 16px; tap targets at least 44px tall.

## Iconography

No icon set chosen yet. Recommended: a simple 1.5px line set (e.g. Lucide) in `ink` or `lake`, used beside facts (address, phone, hours, Wi-Fi), never decoratively. No logo yet: the name is set in `display` as the wordmark until one exists.

## Accessibility

Every text pairing in the colour usage notes meets WCAG AA (4.5:1 or better), with one exception: `lake` text on `lake-tint` is for 18px+ or bold text only. Text is always `ink`, `slate` or white on a deep button; `lake-mist`, `fern`, `river`, `schist`, `tussock` and `line` are fills, never text colours.

## Components

Plain HTML and CSS, ready for the Astro build: every class starts `nest-` and lives in `components/bundle.css`, which reads only these tokens. Wrap a page in `.nest`. Actions: Button, Tag. Navigation: SiteHeader, LanguageSwitcher. Content: PlaceCard, AnimalCard, InfoList, GalleryTile. Features: WifiCard, VisitorMap.

## Still to come

Dark theme, real photography (gallery and animal portraits) and an optional logo.
