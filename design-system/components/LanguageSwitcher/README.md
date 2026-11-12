# LanguageSwitcher

Lets a guest pick their language. Each language is written in itself ("Deutsch", "日本語"), never as a flag, with a `lang` attribute and a link to the same page in that language (e.g. `/de/guide/`). The current one is filled lake with `aria-current="true"`.

Use the chips (`nest-lang`) where there is room and the select (`nest-lang-select`) on phones. Remember the guest's choice in the browser.
