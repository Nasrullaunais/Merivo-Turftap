import type { Money } from "@turftap/contract/client";
import { formatMoney } from "@turftap/ui";
import { CircleX, LoaderCircle } from "lucide-react";
import { useEffect, useRef } from "react";

import m from "../../i18n/en/myBookings";

type Props = {
  title: string;
  /** What cancelling gives up. */
  body: string;
  paid: Money;
  open: boolean;
  cancelling: boolean;
  onKeep: () => void;
  onCancel: () => void;
};

/** BKG-06, MEM-02: asks before cancelling, folded open under the booking or membership it is about. */
export function CancelPanel({ title, body, paid, open, cancelling, onKeep, onCancel }: Props) {
  const keepButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) keepButton.current?.focus({ preventScroll: true });
  }, [open]);

  return (
    <div data-card-quiet data-open={open} inert={!open} className="tt-collapse">
      <div>
        <section
          aria-label={title}
          className="tt-tone-bad mx-3 mb-3 grid gap-3 rounded-xl bg-[color-mix(in_oklab,var(--tt-tone)_8%,var(--tt-panel))] p-4"
        >
          <div className="flex items-start gap-3">
            <span
              className="tt-tile size-9 rounded-xl"
              style={{ "--tt-hue": "var(--tt-tone)" } as React.CSSProperties}
            >
              <CircleX size={18} aria-hidden />
            </span>
            <div className="grid gap-0.5">
              <h4 className="font-semibold tracking-tight">{title}</h4>
              <p className="text-sm text-pretty text-muted">{body}</p>
              {paid.amount > 0 && (
                <p className="text-sm text-pretty text-muted">
                  {m.confirmCancel.paid(formatMoney(paid))}
                </p>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              ref={keepButton}
              type="button"
              onClick={onKeep}
              disabled={cancelling}
              className="tt-t1 inline-flex h-9 items-center rounded-full px-4 text-sm font-medium hover:bg-[var(--tt-hover)] active:scale-[0.97] disabled:opacity-50"
            >
              {m.confirmCancel.keep}
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={cancelling}
              className="tt-t1 inline-flex h-9 items-center gap-1.5 rounded-full bg-[var(--tt-tone)] px-4 text-sm font-medium text-white hover:bg-[color-mix(in_oklab,var(--tt-tone)_88%,black)] active:scale-[0.97] disabled:opacity-80"
            >
              {cancelling && <LoaderCircle size={15} aria-hidden className="animate-spin" />}
              {m.confirmCancel.yes}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
