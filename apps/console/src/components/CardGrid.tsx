import { Plus } from "lucide-react";
import type { ReactNode } from "react";

import { sweepIndex } from "./look";
import type { Present } from "./usePresence";

/** Gives a card's main link the whole card as its press area; the card's buttons sit above it. */
export const CARD_LINK =
  "outline-none after:absolute after:inset-0 after:z-[1] after:rounded-2xl focus-visible:after:ring-2 focus-visible:after:ring-focus";

/** Cards that fill the width: as many columns of at least `min` as fit. */
export function CardGrid({
  label,
  min = "18rem",
  children,
}: {
  label?: string;
  min?: string;
  children: ReactNode;
}) {
  return (
    <ul
      aria-label={label}
      className="grid gap-3"
      style={{ gridTemplateColumns: `repeat(auto-fill, minmax(min(100%, ${min}), 1fr))` }}
    >
      {children}
    </ul>
  );
}

/** One card's place in a grid: it rises in, lands when new and fades when removed. */
export function CardCell({
  present,
  index,
  children,
}: {
  present: Pick<Present<unknown>, "isNew" | "isLeaving">;
  index: number;
  children: ReactNode;
}) {
  return (
    <li
      style={sweepIndex(index)}
      inert={present.isLeaving}
      aria-hidden={present.isLeaving || undefined}
      className={`relative flex animate-tt-card-in [animation-delay:calc(min(var(--i),11)*30ms)] ${present.isLeaving ? "tt-leaving" : ""}`}
    >
      {children}
      {present.isNew && (
        <span aria-hidden className="pointer-events-none absolute inset-0 rounded-2xl tt-landed" />
      )}
    </li>
  );
}

/** The dashed "+ Add …" card at the end of a grid. */
export function AddCard({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <li className="flex animate-tt-card-in">
      <button
        type="button"
        onClick={onPress}
        className="group flex min-h-36 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--tt-line-strong)] font-medium text-accent outline-none transition-[background-color,border-color,translate] duration-(--tt-dur-2) ease-(--tt-ease) hover:-translate-y-0.5 hover:border-accent hover:bg-accent-soft focus-visible:ring-2 focus-visible:ring-focus active:scale-[0.985]"
      >
        <span
          aria-hidden
          className="grid size-10 place-items-center rounded-xl border border-dashed border-current transition-transform duration-(--tt-dur-2) group-hover:rotate-90"
        >
          <Plus size={20} />
        </span>
        {label}
      </button>
    </li>
  );
}
