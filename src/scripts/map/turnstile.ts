// Cloudflare Turnstile: an automatic "not a robot" check. It only shows a box if it needs the guest to tick it.

interface TurnstileApi {
  render(el: HTMLElement, options: Record<string, unknown>): string;
  getResponse(id: string): string | undefined;
  reset(id: string): void;
}

export interface Turnstile {
  /** Wait (up to 8 s) for a token; undefined if Turnstile is blocked, offline or still checking. */
  token(): Promise<string | undefined>;
  /** Each token works once, so get a fresh one after every submit. */
  reset(): void;
}

export function createTurnstile(el: HTMLElement, options: { siteKey: string; language: string }): Turnstile {
  let widgetId: string | undefined;
  const api = () => (window as unknown as { turnstile?: TurnstileApi }).turnstile;

  // Wait for the Turnstile script, but give up after 30 s (blocked or offline): submitting then shows the verification error.
  const whenReady = new Promise<TurnstileApi>((resolve) => {
    let tries = 0;
    const check = () => {
      const ready = api();
      if (ready) resolve(ready);
      else if (++tries < 300) setTimeout(check, 100);
    };
    check();
  });
  // The widget is invisible unless Turnstile needs the guest to tick a box, but its frame can still take keyboard focus.
  // Keep it inert (out of the Tab order) while it's hidden, and reachable only while it's asking for a tick.
  el.inert = true;
  whenReady.then((ready) => {
    widgetId = ready.render(el, {
      sitekey: options.siteKey,
      language: options.language,
      appearance: 'interaction-only',
      theme: 'light',
      'before-interactive-callback': () => (el.inert = false),
      'after-interactive-callback': () => (el.inert = true),
    });
  });

  return {
    async token() {
      const ready = await Promise.race([whenReady, new Promise<undefined>((r) => setTimeout(() => r(undefined), 8000))]);
      for (let i = 0; ready && widgetId && i < 80; i++) {
        const token = ready.getResponse(widgetId);
        if (token) return token;
        await new Promise((r) => setTimeout(r, 100));
      }
      return undefined;
    },
    reset() {
      if (widgetId) api()?.reset(widgetId);
    },
  };
}
