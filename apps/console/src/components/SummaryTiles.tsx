import { Check, ChevronRight, type LucideIcon } from "lucide-react";

import { sweepIndex } from "./look";

export type SummaryTile<Show> = {
  show: Show | undefined;
  label: string;
  hint?: string;
  icon: LucideIcon;
  /** `HUE_COLOUR` or `TONE_COLOUR` of what the tile counts. */
  colour: string;
  count: number | string | undefined;
};

type Props<Show> = {
  label: string;
  tiles: SummaryTile<Show>[];
  show: Show | undefined;
  onShow: (show: Show | undefined) => void;
};

const COLUMNS: Record<number, string> = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
  4: "grid-cols-2 xl:grid-cols-4",
};

/** gen-ui V2's counts that double as quick filters; pressing the shown one again clears it. */
export function SummaryTiles<Show>({ label, tiles, show, onShow }: Props<Show>) {
  return (
    <div role="group" aria-label={label} className={`grid gap-3 tt-sweep ${COLUMNS[tiles.length]}`}>
      {tiles.map((tile, index) => {
        const active = show === tile.show;
        return (
          <button
            key={tile.label}
            type="button"
            aria-pressed={active}
            disabled={tile.count === undefined}
            onClick={() => onShow(active ? undefined : tile.show)}
            style={{ ...sweepIndex(index), "--c": tile.colour } as React.CSSProperties}
            className={`group relative flex cursor-pointer items-center gap-3 overflow-hidden rounded-2xl border p-3 text-start sm:p-4 outline-none transition-[translate,scale,box-shadow,background-color,border-color] duration-(--tt-dur-2) ease-(--tt-ease) focus-visible:ring-2 focus-visible:ring-focus enabled:hover:-translate-y-0.5 enabled:hover:shadow-[var(--tt-shadow-raised)] enabled:active:translate-y-0 enabled:active:scale-[0.985] disabled:cursor-default disabled:opacity-60 ${active ? "border-[color-mix(in_oklab,var(--c)_60%,transparent)] bg-[color-mix(in_oklab,var(--c)_7%,var(--tt-panel))] ring-2 ring-[color-mix(in_oklab,var(--c)_25%,transparent)]" : "border-[var(--tt-line)] bg-[var(--tt-panel)] shadow-[var(--tt-shadow-card)] enabled:hover:border-[color-mix(in_oklab,var(--c)_40%,transparent)]"}`}
          >
            <tile.icon
              aria-hidden
              strokeWidth={1.5}
              className={`pointer-events-none absolute -end-4 -bottom-5 size-24 -rotate-12 text-[var(--c)] transition-[opacity,rotate,scale] duration-300 group-enabled:group-hover:-rotate-6 group-enabled:group-hover:scale-110 ${active ? "opacity-15" : "opacity-[0.06] group-enabled:group-hover:opacity-10"}`}
            />
            <span className="relative hidden transition-[scale] duration-(--tt-dur-2) group-enabled:group-hover:scale-110 sm:block">
              <span
                aria-hidden
                className="grid size-9 place-items-center rounded-xl bg-[color-mix(in_oklab,var(--c)_14%,var(--tt-panel))] text-[var(--c)]"
              >
                <tile.icon size={18} strokeWidth={2.25} />
              </span>
              <span
                aria-hidden
                className={`absolute -end-1 -top-1 grid size-4 place-items-center rounded-full bg-accent text-accent-foreground ring-2 ring-[var(--tt-panel)] transition-[opacity,scale] duration-(--tt-dur-2) ${active ? "scale-100 opacity-100" : "scale-50 opacity-0"}`}
              >
                <Check size={10} strokeWidth={3.5} />
              </span>
            </span>
            <span className="relative grid min-w-0 flex-1">
              <span className="text-sm leading-snug font-medium">{tile.label}</span>
              {tile.hint && <span className="truncate text-xs text-muted">{tile.hint}</span>}
            </span>
            <span
              key={String(tile.count)}
              className={`relative shrink-0 animate-tt-pop text-2xl font-semibold tabular-nums ${active ? "text-[color-mix(in_oklab,var(--c)_80%,black)]" : ""}`}
            >
              {tile.count ?? "–"}
            </span>
            <ChevronRight
              aria-hidden
              size={16}
              className={`relative -ms-1 shrink-0 text-muted transition-[opacity,translate] duration-(--tt-dur-2) ${active ? "opacity-0" : "-translate-x-1 opacity-0 group-enabled:group-hover:translate-x-0 group-enabled:group-hover:opacity-100"}`}
            />
          </button>
        );
      })}
    </div>
  );
}
