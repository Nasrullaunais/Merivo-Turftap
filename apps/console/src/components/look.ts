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
