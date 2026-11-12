# Page mockups

The approved page designs, exported from the Claude design canvas. One file per page, each designed to work from desktop (1280px) down to phone (390px):

- `home.dc.html`: Home
- `guide.dc.html`: Guest guide
- `map.dc.html`: Visitor map
- `gallery.dc.html`: Gallery

These are design references, not production code. They use the canvas's component format: ignore the `<script src="./support.js">` line, the `<x-dc>` and `<helmet>` wrappers and the `<script type="text/x-dc">` block. The layout and copy are ordinary HTML with inline styles, and every colour is a value from `../tokens.json`. When building, rebuild each page as Astro components that use `../tokens.css` and the `nest-` classes in `../components/bundle.css` instead of inline styles.

Coloured blocks labelled "Photo: …" are photo placeholders. Text in [square brackets] is a placeholder for real data.
