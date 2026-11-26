import { Button, Skeleton } from "@heroui/react";
import type { Money } from "@turftap/contract";
import { formatMoney } from "@turftap/ui";
import { ArrowRight, X } from "lucide-react";
import { useState } from "react";

import m from "../../i18n/en/slots";

type Props = {
  open: boolean;
  /** "6:00 PM – 8:00 PM" */
  times: string;
  /** "Fri 27 Nov" */
  day: string;
  price?: Money;
  onBook: () => void;
  onClear: () => void;
};

/**
 * Rises from the bottom while the chosen block is scrolled away, with the total the server will charge.
 * It keeps showing the last values while it slides away or a new price loads, so nothing blinks.
 */
export function BookBar({ open, times, day, price, onBook, onClear }: Props) {
  const [kept, setKept] = useState({ times, day, price });
  const next = { times, day, price: price ?? kept.price };
  const changed = (Object.keys(next) as (keyof typeof next)[]).some((k) => kept[k] !== next[k]);
  if (open && changed) setKept(next);
  const shown = open ? next : kept;

  return (
    <div
      inert={!open}
      data-open={open}
      style={{ viewTransitionName: "tt-book-bar" }}
      className="fixed inset-x-0 bottom-0 z-20 translate-y-full px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] opacity-0 transition-[translate,opacity] duration-300 ease-[var(--tt-ease)] data-[open=true]:translate-y-0 data-[open=true]:opacity-100"
    >
      <div
        role="region"
        aria-label={m.book}
        className="tt-glass mx-auto flex max-w-xl items-center gap-3 rounded-2xl border border-[var(--tt-line)] p-3 pl-4 shadow-[var(--tt-shadow-raised)]"
      >
        <button
          type="button"
          aria-label={m.clear}
          onClick={onClear}
          className="tt-t1 grid size-8 shrink-0 place-items-center rounded-full text-muted hover:bg-[var(--tt-hover)] hover:text-foreground active:scale-95"
        >
          <X size={18} aria-hidden />
        </button>
        <div className="grid min-w-0 flex-1">
          <span key={shown.times} className="animate-tt-fade truncate font-semibold tabular-nums">
            {shown.times}
          </span>
          <span className="flex items-center gap-1.5 text-sm text-muted">
            {shown.day}
            <span aria-hidden>·</span>
            {shown.price ? (
              <span
                key={shown.price.amount}
                data-loading={open && !price}
                className="tt-t1 animate-tt-pop font-semibold text-foreground tabular-nums data-[loading=true]:opacity-50"
              >
                {formatMoney(shown.price)}
              </span>
            ) : (
              <Skeleton className="h-4 w-16 rounded-md" />
            )}
          </span>
        </div>
        <Button onPress={onBook} className="shrink-0">
          {m.book}
          <ArrowRight size={16} aria-hidden />
        </Button>
      </div>
    </div>
  );
}
