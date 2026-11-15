# LanguageSwitcher

Lets a guest pick their language. Each language is a short chip, never a flag: the two-letter code for languages written in the Latin alphabet ("EN", "DE", "FR") and the language's own name for Chinese, Japanese and Korean ("中文", "日本語", "한국어"), with a `lang` attribute, an `aria-label` giving the language's own name ("Deutsch", "日本語") and a link to the same page in that language (e.g. `/de/guide/`). The current one is filled lake with `aria-current="true"`.

The chips (`nest-lang`) are used at every width and are never tucked into the menu, so a guest can always see and change language. On phones they share one row under the wordmark, each 44px tall (about 28 to 40px wide, so slightly under the 44px target width). Remember the guest's choice in the browser.
