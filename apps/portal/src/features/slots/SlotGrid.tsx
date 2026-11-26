import type { Slot } from "@turftap/contract/client";
import { formatMoney, onVenueClock } from "@turftap/ui";
import { Moon, Sun, Sunrise } from "lucide-react";
import { type CSSProperties, type ReactNode, useState } from "react";

import m from "../../i18n/en/slots";
import { covers, type Selection } from "./selection";

const NOON = 12 * 60;
const EVENING = 17 * 60;
const PARTS = [
  { key: "morning", icon: Sunrise, until: NOON },
  { key: "afternoon", icon: Sun, until: EVENING },
  { key: "evening", icon: Moon, until: Infinity },
] as const;

type Props = {
  slots: Slot[];
  timeZone: string;
  slotMs: number;
  choice?: Selection;
  /** Shown in place of the chosen start time, a full row wide. */
  block: ReactNode;
  onPick: (startsAt: string) => void;
};

/** Names each tile for withViewTransition, so it glides when the chosen block grows or shrinks. */
const glide = (name: string, kind = "tt-slot") =>
  ({ viewTransitionName: name, viewTransitionClass: kind }) as CSSProperties;

/**
 * BKG-01: start times grouped by part of the day, on the venue's clock. Taken ones can't be tapped.
 * Start times inside the chosen block merge into it.
 */
export function SlotGrid({ slots, timeZone, slotMs, choice, block, onPick }: Props) {
  // Tiles rise in one after another only until the first pick, so they never replay.
  const [sweep, setSweep] = useState(true);
  if (sweep && choice) setSweep(false);
  const merged = (slot: Slot) =>
    slot.startsAt !== choice?.startsAt && covers(choice, slot.startsAt, slotMs);
  const groups = PARTS.map((part, index) => {
    const from = index === 0 ? 0 : PARTS[index - 1]!.until;
    return {
      ...part,
      slots: slots.filter((slot) => {
        const minute = onVenueClock(slot.startsAt, timeZone).minute;
        return minute >= from && minute < part.until && !merged(slot);
      }),
    };
  }).filter((group) => group.slots.length > 0);

  return (
    <div className="grid gap-5">
      {groups.map(({ key, icon: Icon, slots: inPart }) => (
        <section key={key} aria-label={m.partsOfDay[key]} className="grid gap-2.5">
          <h3
            style={glide(`part-${key}`)}
            className="flex items-center gap-2 text-sm font-medium text-muted"
          >
            <Icon size={16} aria-hidden />
            {m.partsOfDay[key]}
          </h3>
          <ul
            className={`grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6 ${sweep ? "tt-sweep" : ""}`}
          >
            {inPart.map((slot) => {
              const name = `slot-${Date.parse(slot.startsAt)}`;
              if (slot.startsAt === choice?.startsAt) {
                return (
                  <li
                    key={slot.startsAt}
                    style={glide(name, "tt-slot tt-chosen")}
                    className="col-span-full"
                  >
                    {block}
                  </li>
                );
              }
              return (
                <li
                  key={slot.startsAt}
                  style={{ ...glide(name), "--i": slots.indexOf(slot) } as CSSProperties}
                >
                  <button
                    type="button"
                    disabled={!slot.free}
                    aria-label={m.slotLabel(
                      m.clock(slot.startsAt, timeZone),
                      slot.free ? formatMoney(slot.price) : m.taken,
                    )}
                    onClick={() => onPick(slot.startsAt)}
                    className={`grid h-16 w-full content-center justify-items-center gap-0.5 rounded-xl border transition-[background-color,color,border-color,scale,box-shadow] duration-200 ${
                      slot.free
                        ? "border-[var(--tt-line)] bg-[var(--tt-panel)] hover:border-accent hover:bg-[var(--tt-hover)] active:scale-95"
                        : "cursor-not-allowed border-transparent bg-[var(--tt-field)] text-muted"
                    }`}
                  >
                    <span
                      className={`text-base font-semibold tabular-nums ${slot.free ? "" : "line-through decoration-1"}`}
                    >
                      {m.clock(slot.startsAt, timeZone)}
                    </span>
                    <span
                      key={slot.free ? slot.price.amount : m.taken}
                      className="animate-tt-fade text-xs text-muted tabular-nums"
                    >
                      {slot.free ? formatMoney(slot.price) : m.taken}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
