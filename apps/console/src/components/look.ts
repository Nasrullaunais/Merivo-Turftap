/** What kind of thing it is: the same hue on every screen (console-design.md §3.2). */
export type Hue = "booking" | "place" | "money" | "membership" | "people" | "plain";

/** How it is doing (console-design.md §3.3). */
export type Tone = "good" | "busy" | "watch" | "bad" | "off";

// Written out in full so Tailwind finds each class name.
export const HUE_CLASS: Record<Hue, string> = {
  booking: "tt-hue-booking",
  place: "tt-hue-place",
  money: "tt-hue-money",
  membership: "tt-hue-membership",
  people: "tt-hue-people",
  plain: "tt-hue-plain",
};

export const TONE_CLASS: Record<Tone, string> = {
  good: "tt-tone-good",
  busy: "tt-tone-busy",
  watch: "tt-tone-watch",
  bad: "tt-tone-bad",
  off: "tt-tone-off",
};

/** Lets a list's rows rise one after another (`tt-sweep`). */
export const sweepIndex = (index: number) => ({ "--i": index }) as React.CSSProperties;

/** The colour itself, for parts that mix their own shades of it (`SummaryTiles`). */
export const HUE_COLOUR: Record<Hue, string> = {
  booking: "var(--tt-hue-booking)",
  place: "var(--tt-hue-place)",
  money: "var(--tt-hue-money)",
  membership: "var(--tt-hue-membership)",
  people: "var(--tt-hue-people)",
  plain: "var(--tt-hue-plain)",
};

export const TONE_COLOUR: Record<Tone, string> = {
  good: "var(--tt-tone-good)",
  busy: "var(--tt-tone-busy)",
  watch: "var(--tt-tone-watch)",
  bad: "var(--tt-tone-bad)",
  off: "var(--tt-tone-off)",
};
