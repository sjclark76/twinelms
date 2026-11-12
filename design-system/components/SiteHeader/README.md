# SiteHeader

The soft lake-tint band at the top of every page: the wordmark (the name set in display type until a logo exists, with "Lake Hawea, New Zealand" beneath), the main navigation (`nest-nav`) and the language switcher. Never a dark bar.

Put the content in `nest-header-inner` so it lines up with the page's 1120px column. The current page's link gets `aria-current="page"` and a white pill. The four links (Home, Guest guide, Visitor map, Gallery) wrap onto a second row on phones rather than collapsing into a menu.

On phones the switcher collapses to the select form of LanguageSwitcher (wrap both in `nest-lang-switch` and this happens automatically below 640px) so the header stays compact.
