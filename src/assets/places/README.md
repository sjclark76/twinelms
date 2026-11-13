# Place photos

Drop a photo here named after the place's id in `src/data/places.ts`, for example `sauna.jpg` or `cardrona.jpg`.
Astro resizes it and converts it to WebP at build time. A card shows its photo only when the file exists and the
place has `alt` text in `src/i18n/en.ts` (under `highlights.places` or `eat.places` or `skiing.places`); otherwise the card stays text-only.
