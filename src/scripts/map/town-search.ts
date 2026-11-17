// Town search: suggestions as the guest types (ARIA combobox pattern). Typing and submitting a town still works too.
import { bucketFor, findTowns, foldName, minLength, startFor, topTowns, type SearchFile, type SplitIndex } from '../../data/places-search';
import { counter, moveActive, type MapStrings } from './text';

interface Suggestion { id: string; name: string; detail: string }

export interface TownSearch {
  /** The suggestion the guest picked, if they picked one. */
  chosen(): { id: string; label: string } | null;
  /** Clear the picked suggestion (after a successful submit). */
  reset(): void;
  close(): void;
}

export function createTownSearch(input: HTMLInputElement, list: HTMLUListElement, status: HTMLElement, s: MapStrings, locale: string): TownSearch {
  const count = counter(locale);

  // The town list is static files on our own site: a tiny index of split starts, then one small file per start.
  let splitIndex: Promise<{ index: SplitIndex; starts: Set<string> }> | undefined;
  const searchFiles = new Map<number, Promise<SearchFile>>();
  const getSplit = () =>
    (splitIndex ??= fetch('/places/split.json')
      .then((r) => r.json())
      .then((index: SplitIndex) => ({ index, starts: new Set(Object.keys(index)) })));
  function getFile(bucket: number) {
    let file = searchFiles.get(bucket);
    if (!file) {
      file = fetch(`/places/s/${bucket}.json`).then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<SearchFile>;
      });
      file.catch(() => searchFiles.delete(bucket));
      searchFiles.set(bucket, file);
    }
    return file;
  }

  let suggestions: Suggestion[] = [];
  let active = -1;
  let chosen: { id: string; label: string } | null = null;
  let debounce: ReturnType<typeof setTimeout> | undefined;
  const fullLabel = (sg: Suggestion) => (sg.detail ? `${sg.name}, ${sg.detail}` : sg.name);

  function close() {
    list.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    active = -1;
  }
  function highlight(index: number) {
    active = index;
    [...list.querySelectorAll('[role="option"]')].forEach((li, i) => li.setAttribute('aria-selected', String(i === index)));
    if (index >= 0) {
      input.setAttribute('aria-activedescendant', `town-opt-${index}`);
      list.querySelector(`#town-opt-${index}`)?.scrollIntoView({ block: 'nearest' });
    } else input.removeAttribute('aria-activedescendant');
  }
  function choose(index: number) {
    const sg = suggestions[index];
    if (!sg) return;
    chosen = { id: sg.id, label: fullLabel(sg) };
    input.value = chosen.label;
    input.removeAttribute('aria-invalid');
    close();
  }
  function show() {
    list.replaceChildren();
    if (!suggestions.length) {
      const li = document.createElement('li');
      li.className = 'empty';
      li.textContent = s.noSuggestions;
      list.append(li);
      status.textContent = s.noSuggestions;
    } else {
      suggestions.forEach((sg, i) => {
        const li = document.createElement('li');
        li.id = `town-opt-${i}`;
        li.setAttribute('role', 'option');
        li.setAttribute('aria-selected', 'false');
        const b = document.createElement('b');
        b.textContent = sg.name;
        li.append(b);
        if (sg.detail) {
          const span = document.createElement('span');
          span.textContent = sg.detail;
          li.append(span);
        }
        li.addEventListener('mousedown', (e) => e.preventDefault()); // keep focus in the input
        li.addEventListener('click', () => choose(i));
        list.append(li);
      });
      status.textContent = count(s.suggestionsCount, suggestions.length);
    }
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    active = -1;
  }
  async function search(q: string) {
    try {
      const folded = foldName(q);
      const { index, starts } = await getSplit();
      const start = startFor(folded, starts);
      // A very common start ("sa") has no file of its own: show its biggest towns until another letter is typed.
      suggestions = start ? findTowns(await getFile(bucketFor(start)), folded) : topTowns(index, folded);
      if (document.activeElement === input && input.value.trim() === q) show();
    } catch {
      close(); // offline or a file failed to load: free typing still works
    }
  }

  input.addEventListener('input', () => {
    chosen = null;
    clearTimeout(debounce);
    const q = input.value.trim();
    if (foldName(q).length < minLength(foldName(q))) return close();
    debounce = setTimeout(() => search(q), 120);
  });
  input.addEventListener('keydown', (e) => {
    const open = !list.hidden && suggestions.length > 0;
    if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && open) {
      e.preventDefault();
      highlight(moveActive(active, suggestions.length, e.key));
    } else if (e.key === 'Enter' && open && active >= 0) {
      e.preventDefault(); // pick the suggestion instead of submitting
      choose(active);
    } else if (e.key === 'Escape' && !list.hidden) {
      e.preventDefault();
      close();
    }
  });
  input.addEventListener('blur', () => setTimeout(close, 150));

  return { chosen: () => chosen, reset: () => (chosen = null), close };
}
