// The visitor map page: wires the map, the town search, Turnstile and the "Where's home?" form together.
import { townLabel, townRequest, type MapConfig, type Town } from './text';
import { createTownSearch } from './town-search';
import { createTurnstile } from './turnstile';
import { createVisitorMap } from './visitor-map';

const config: MapConfig = JSON.parse(document.getElementById('map-config')!.textContent!);
const s = config.strings;

const map = createVisitorMap(document.getElementById('visitor-map')!, config);

const form = document.querySelector<HTMLFormElement>('[data-town-form]')!;
const button = form.querySelector<HTMLButtonElement>('[data-submit]')!;
const message = form.querySelector<HTMLElement>('[data-message]')!;
const townInput = form.querySelector<HTMLInputElement>('#town')!;
const search = createTownSearch(
  townInput,
  form.querySelector<HTMLUListElement>('#town-options')!,
  form.querySelector<HTMLElement>('[data-combo-status]')!,
  s,
  config.locale,
);
const turnstile = createTurnstile(form.querySelector<HTMLElement>('[data-turnstile]')!, config.turnstile);

function say(kind: 'error' | 'success', text: string) {
  message.dataset.kind = kind;
  message.textContent = text;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  townInput.removeAttribute('aria-invalid');
  const town = townInput.value.trim();
  search.close();
  if (!town) {
    townInput.setAttribute('aria-invalid', 'true');
    townInput.focus();
    return say('error', s.errors.invalid_town);
  }
  button.disabled = true;
  button.textContent = s.submitting;
  message.textContent = '';
  try {
    const token = await turnstile.token();
    if (!token) return say('error', s.errors.verification_failed);
    const res = await fetch('/api/towns', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(townRequest(town, search.chosen(), token)),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.town) {
      const added = data.town as Town;
      map.show(map.upsert(added));
      map.render();
      townInput.value = '';
      search.reset();
      say('success', s.success.replace('{town}', townLabel(added)));
    } else {
      const error: string = data.error ?? 'generic';
      if (error === 'invalid_town' || error === 'not_found') townInput.setAttribute('aria-invalid', 'true');
      say('error', s.errors[error] ?? s.errors.generic);
    }
  } catch {
    say('error', s.errors.generic);
  } finally {
    turnstile.reset();
    button.disabled = false;
    button.textContent = s.submit;
  }
});
