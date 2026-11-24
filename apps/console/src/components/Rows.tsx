import type { ReactNode } from "react";

import { sweepIndex } from "./look";
import { SmoothHeight } from "./SmoothHeight";

/** Gives a row's main link the whole row as its press area; the row's buttons sit above it. */
export const ROW_LINK =
  "outline-none after:absolute after:inset-0 focus-visible:after:ring-2 focus-visible:after:ring-focus focus-visible:after:ring-inset";

export function Rows({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <SmoothHeight>
      <ul aria-label={label} className="divide-y divide-[var(--tt-line)] tt-sweep">
        {children}
      </ul>
    </SmoothHeight>
  );
}

type RowProps = {
  index: number;
  lead?: ReactNode;
  title: ReactNode;
  detail?: ReactNode;
  end?: ReactNode;
  landed?: boolean;
  /** Just removed: it fades out before it goes (`usePresence`). */
  leaving?: boolean;
};

/** One thing in a list: its tile or date, name and details, then its own buttons. */
export function Row({ index, lead, title, detail, end, landed = false, leaving }: RowProps) {
  return (
    <li
      style={sweepIndex(index)}
      inert={leaving}
      aria-hidden={leaving || undefined}
      className={`${leaving ? "tt-leaving" : ""} relative flex min-h-16 items-center gap-3 px-4 py-2.5 tt-t1 [&:has([data-row-link]:hover)]:bg-[var(--tt-hover)]`}
    >
      {landed && <span aria-hidden className="pointer-events-none absolute inset-0 tt-landed" />}
      {lead}
      <div className="grid min-w-0 flex-1 gap-0.5">
        <div className="truncate font-medium">{title}</div>
        {detail && <div className="flex flex-wrap gap-x-3 text-sm text-muted">{detail}</div>}
      </div>
      {end && <div className="relative z-10 flex shrink-0 items-center gap-1">{end}</div>}
    </li>
  );
}
