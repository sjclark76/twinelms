# SiteHeader

The soft lake-tint band at the top of every page: the wordmark (the name set in display type until a logo exists, with "Lake Hawea, New Zealand" beneath), the main navigation (`nest-nav`) and the language switcher. Never a dark bar.

Put the content in `nest-header-inner` so it lines up with the page's 1120px column. The current page's link gets `aria-current="page"` and a white pill.

**Wide screens (640px and up):** wordmark, the four links (Home, Guest guide, Visitor map, Gallery) and the language chips sit in one row.

**Phones (under 640px):** the wordmark and a Menu button (`nest-menu-btn`, hamburger icon plus the word "Menu") share the top row. The language chips sit on their own row beneath, always visible. The four links are in a panel that opens under the chips when the button is tapped; it closes on Escape or a second tap. The button reports its state with `aria-expanded` and points at the nav with `aria-controls`.

The menu is added by a small inline script that puts `has-menu` on the header before first paint. Without JavaScript the links stay visible as a plain list, so the site still works.
