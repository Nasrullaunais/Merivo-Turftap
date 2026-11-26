import type { Money } from "@turftap/contract";
import { formatMoney } from "@turftap/ui";
import { ArrowRight, Minus, Plus, X, type LucideIcon } from "lucide-react";
import { useEffect, useEffectEvent, useRef, useState } from "react";

import common from "../../i18n/en/common";
import m from "../../i18n/en/slots";
import { prefersCalm } from "../../lib/motion/viewTransition";
import type { Selection } from "./selection";

/** Long enough for the Book press to play before the next page opens. */
const BOOK_PRESS_MS = 460;
/** The block counts as on screen while this much of it shows below the top bar. */
const SEEN_RATIO = 0.6;
const TOP_BAR_PX = 64;

/** Whether + can add one more slot, and if not, why. */
export type Longer = "yes" | "checking" | "notFree" | "longest";

type Props = {
  choice: Selection;
  endsAt: string;
  timeZone: string;
  slotMinutes: number;
  longestMinutes: number;
  total?: Money;
  longer: Longer;
  onLength: (count: number) => void;
  onClear: () => void;
  onBook: () => void;
  /** Told whether the block is on screen, so the Book bar shows only when it isn't. */
  onSeen: (seen: boolean) => void;
};

/** BKG-02: the chosen time as one block, from start to end, with − and +, × and Book. */
export function ChosenBlock(props: Props) {
  const { choice, endsAt, timeZone, slotMinutes, longestMinutes, total, longer } = props;
  const { onLength, onClear, onBook, onSeen } = props;
  const slotLength = common.lengthOf(slotMinutes);
  const shown = useKept(total);
  const [going, setGoing] = useState(false);
  const ref = useSeen(onSeen);

  const hint =
    longer === "notFree"
      ? m.nextNotFree
      : longer === "longest"
        ? m.longestOnline(common.lengthOf(longestMinutes))
        : m.tapToGrow;

  const book = () => {
    if (prefersCalm()) return onBook();
    setGoing(true);
    window.setTimeout(onBook, BOOK_PRESS_MS);
  };

  return (
    <div
      ref={ref}
      role="group"
      aria-label={m.yourTime}
      inert={going}
      data-going={going}
      className="tt-shine relative grid gap-4 overflow-hidden rounded-2xl bg-accent p-4 text-accent-foreground shadow-[0_12px_28px_-14px_var(--accent)]"
    >
      <div className="flex items-start gap-3">
        <div className="grid min-w-0 flex-1 gap-0.5">
          <p className="flex flex-wrap items-center gap-x-2 text-lg leading-7 font-semibold tabular-nums">
            <span>{m.clock(choice.startsAt, timeZone)}</span>
            <ArrowRight size={18} aria-hidden className="opacity-80" />
            <span key={endsAt} className="animate-tt-rise">
              {m.clock(endsAt, timeZone)}
            </span>
          </p>
          <p className="flex items-center gap-1.5 text-sm">
            <span key={choice.count} className="animate-tt-fade opacity-90">
              {common.lengthOf(choice.count * slotMinutes)}
            </span>
            {shown && (
              <>
                <span aria-hidden className="opacity-60">
                  ·
                </span>
                <span
                  key={shown.amount}
                  data-loading={!total}
                  className="animate-tt-pop font-semibold tabular-nums transition-opacity data-[loading=true]:opacity-50"
                >
                  {formatMoney(shown)}
                </span>
              </>
            )}
          </p>
        </div>
        <button
          type="button"
          aria-label={m.clear}
          onClick={onClear}
          className="-mt-1 -mr-1 grid size-9 shrink-0 place-items-center rounded-full bg-white/15 transition-[background-color,scale] duration-150 hover:bg-white/25 active:scale-90"
        >
          <X size={18} aria-hidden />
        </button>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-full bg-white/15 p-1">
          <Step
            icon={Minus}
            label={m.shorter(slotLength)}
            off={choice.count === 1}
            onPress={() => onLength(choice.count - 1)}
          />
          <Step
            icon={Plus}
            label={m.longer(slotLength)}
            off={longer === "notFree" || longer === "longest"}
            busy={longer === "checking"}
            onPress={() => onLength(choice.count + 1)}
          />
        </div>
        <button
          type="button"
          onClick={book}
          className="tt-book group inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 font-semibold text-accent shadow-[0_6px_16px_-8px_rgb(0_0_0/0.45)] transition-[scale,box-shadow] duration-150 hover:shadow-[0_10px_22px_-10px_rgb(0_0_0/0.5)] active:scale-95"
        >
          {m.book}
          <ArrowRight
            size={18}
            aria-hidden
            className="tt-book-arrow transition-transform group-hover:translate-x-0.5"
          />
        </button>
      </div>

      <p key={hint} className="-mt-1 animate-tt-fade text-xs opacity-85">
        {hint}
      </p>
    </div>
  );
}

type StepProps = {
  icon: LucideIcon;
  label: string;
  off: boolean;
  /** Waiting for the server: looks ready so it doesn't flicker, but ignores presses. */
  busy?: boolean;
  onPress: () => void;
};

function Step({ icon: Icon, label, off, busy = false, onPress }: StepProps) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={off}
      aria-disabled={busy || undefined}
      onClick={() => !busy && onPress()}
      className="grid size-10 place-items-center rounded-full transition-[background-color,opacity,scale] duration-150 hover:bg-white/20 active:scale-90 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
    >
      <Icon size={20} aria-hidden />
    </button>
  );
}

/** The last price known, so a new length dims the old total instead of blanking it. */
function useKept(total?: Money) {
  const [kept, setKept] = useState(total);
  if (total && total.amount !== kept?.amount) setKept(total);
  return total ?? kept;
}

function useSeen(onSeen: (seen: boolean) => void) {
  const ref = useRef<HTMLDivElement>(null);
  const report = useEffectEvent(onSeen);
  useEffect(() => {
    const block = ref.current;
    if (!block || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => entry && report(entry.intersectionRatio >= SEEN_RATIO),
      { threshold: [0, SEEN_RATIO, 1], rootMargin: `-${TOP_BAR_PX}px 0px 0px 0px` },
    );
    observer.observe(block);
    return () => observer.disconnect();
  }, []);
  return ref;
}
