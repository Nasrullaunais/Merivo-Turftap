import { flushSync } from "react-dom";

export const prefersCalm = () =>
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

/**
 * Applies a state change inside a View Transition, so elements with a `view-transition-name` glide
 * to their new place. `kind` is set on <html> while it runs, for styles meant for one kind of change.
 */
let latest: ViewTransition | undefined;

export function withViewTransition(kind: string, change: () => void) {
  if (prefersCalm() || !("startViewTransition" in document)) {
    change();
    return;
  }
  const root = document.documentElement;
  root.dataset.glide = kind;
  const transition = document.startViewTransition(() => flushSync(change));
  latest = transition;
  void transition.finished.finally(() => {
    if (latest === transition) delete root.dataset.glide;
  });
}
