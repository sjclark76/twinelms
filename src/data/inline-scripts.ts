// The two scripts that must run inline, before first paint. They live here as text so BaseLayout can add each
// one's hash to the Content Security Policy (Astro hashes its own bundled scripts, but not inline ones).
import { createHash } from 'node:crypto';
import { DEFAULT_LOCALE, ENABLED_LOCALES, LOCALES } from '../i18n/config';

/** CSP hash of a script's (or style's) exact text. */
export const scriptHash = (code: string) =>
  `sha256-${createHash('sha256').update(code).digest('base64')}` as const;

const prefixes = Object.fromEntries(ENABLED_LOCALES.map((code) => [code, LOCALES[code].prefix]));

/** On an English page, send guests to their saved language, or failing that their browser's language. */
export const languageRedirect = `(function () {
  var enabled = ${JSON.stringify(ENABLED_LOCALES)};
  var prefixes = ${JSON.stringify(prefixes)};
  var current = ${JSON.stringify(DEFAULT_LOCALE)};
  try {
    var saved = localStorage.getItem('nest-lang');
    var target = saved && enabled.indexOf(saved) > -1 ? saved : null;
    if (!saved) {
      var langs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language];
      for (var i = 0; i < langs.length && !target; i++) {
        var l = String(langs[i]).toLowerCase();
        var code = l.indexOf('zh') === 0 ? 'zh' : l.slice(0, 2);
        if (enabled.indexOf(code) > -1) target = code;
      }
    }
    if (target && target !== current) location.replace('/' + prefixes[target] + location.pathname);
  } catch (e) {}
})();`;

/** Phone menu toggle. Runs right after the header so phones never flash the open menu; without JavaScript the links stay visible. */
export const headerMenu = `(function () {
  var header = document.currentScript.previousElementSibling;
  var btn = header.querySelector('.nest-menu-btn');
  header.classList.add('has-menu');
  var set = function (open) {
    header.classList.toggle('is-open', open);
    btn.setAttribute('aria-expanded', String(open));
  };
  btn.addEventListener('click', function () {
    set(btn.getAttribute('aria-expanded') !== 'true');
  });
  header.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') {
      set(false);
      btn.focus();
    }
  });
})();`;
