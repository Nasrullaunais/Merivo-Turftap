/** How it is doing (console-design.md §3.3). */
export type Tone = "good" | "busy" | "watch" | "bad" | "off";

// Written out in full so Tailwind finds each class name.
export const TONE_CLASS: Record<Tone, string> = {
  good: "tt-tone-good",
  busy: "tt-tone-busy",
  watch: "tt-tone-watch",
  bad: "tt-tone-bad",
  off: "tt-tone-off",
};

const STAGGER_STEP_MS = 70;
const MAX_STAGGERED = 8;

/** Lets a list's items arrive one after another, starting `startMs` after the page. */
export const arrivalDelay = (index: number, startMs = 0): React.CSSProperties => ({
  animationDelay: `${startMs + Math.min(index, MAX_STAGGERED) * STAGGER_STEP_MS}ms`,
});
