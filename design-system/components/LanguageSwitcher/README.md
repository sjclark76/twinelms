# LanguageSwitcher

Lets a guest pick their language. Each language is a short code chip ("EN", "DE", "JA"), never a flag, with a `lang` attribute, an `aria-label` giving the language's own name ("Deutsch", "日本語") and a link to the same page in that language (e.g. `/de/guide/`). The current one is filled lake with `aria-current="true"`.

The chips (`nest-lang`) are used at every width and are never tucked into the menu, so a guest can always see and change language. On phones they spread evenly across their own row under the wordmark, each 44px tall. Remember the guest's choice in the browser.
