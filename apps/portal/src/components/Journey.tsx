import {
  CalendarCheck,
  Check,
  CircleCheck,
  Hourglass,
  Landmark,
  type LucideIcon,
  ReceiptText,
  ScanSearch,
  Store,
} from "lucide-react";

import m from "../i18n/en/booking";
import { arrivalDelay } from "./look";

type Chip = { text: string; icon: LucideIcon; tone: string };
type Step = { label: string; icon: LucideIcon; colour: string; chip?: Chip };

// Written out in full so Tailwind finds each class name.
const COLOURS = {
  booking: "[--tt-tone:var(--accent)]",
  money: "[--tt-tone:var(--tt-hue-money)]",
  busy: "tt-tone-busy",
  good: "tt-tone-good",
};

type Props = {
  /** Whether money is sent online first, or all of it is paid at the venue. */
  online: boolean;
  /** Steps before this one are done; past the last, all are. */
  at: number;
  /** The Payment Time Limit, shown under the transfer step. */
  timeLimit?: string;
  /** The venue is checking the receipt, so the last step shows that. */
  checking?: boolean;
};

/** BKG-02, PAY-01: the whole way from confirming to booked, and where the customer is on it. */
export function Journey({ online, at, timeLimit, checking = false }: Props) {
  const booked: Step = checking
    ? {
        label: m.journey.booked,
        icon: ScanSearch,
        colour: COLOURS.busy,
        chip: { text: m.journey.checking, icon: ScanSearch, tone: "tt-tone-busy" },
      }
    : { label: m.journey.booked, icon: CircleCheck, colour: COLOURS.good };
  const steps: Step[] = online
    ? [
        { label: m.journey.confirm, icon: CalendarCheck, colour: COLOURS.booking },
        {
          label: m.journey.transfer,
          icon: Landmark,
          colour: COLOURS.money,
          chip: timeLimit ? { text: timeLimit, icon: Hourglass, tone: "tt-tone-watch" } : undefined,
        },
        { label: m.journey.receipt, icon: ReceiptText, colour: COLOURS.money },
        booked,
      ]
    : [
        { label: m.journey.confirm, icon: CalendarCheck, colour: COLOURS.booking },
        booked,
        { label: m.journey.payThere, icon: Store, colour: COLOURS.good },
      ];

  return (
    <ol aria-label={m.journey.title} className="flex">
      {steps.map((step, index) => {
        const state = index < at ? "done" : index === at ? "now" : "later";
        const Icon = state === "done" ? Check : step.icon;
        return (
          <li
            key={step.label}
            aria-current={state === "now" ? "step" : undefined}
            className={`${step.colour} relative grid flex-1 animate-tt-rise content-start justify-items-center gap-1.5 text-center`}
            style={arrivalDelay(index, 160)}
          >
            {index > 0 && (
              <span
                aria-hidden
                className={`absolute top-[17px] right-[calc(50%+24px)] left-[calc(-50%+24px)] h-0.5 rounded-full ${index <= at ? "bg-accent" : "bg-[repeating-linear-gradient(90deg,var(--tt-line-strong)_0_5px,transparent_5px_9px)]"}`}
              />
            )}
            <span
              className={`relative grid size-9 place-items-center rounded-full transition-colors duration-300 ${
                state === "done"
                  ? "bg-accent text-accent-foreground"
                  : state === "now"
                    ? "bg-[var(--tt-tone)] text-white shadow-[0_4px_12px_-4px_var(--tt-tone)]"
                    : "bg-[var(--tt-panel)] text-muted shadow-[inset_0_0_0_1.5px_var(--tt-line-strong)]"
              }`}
            >
              {state === "now" && <span className="tt-beacon" aria-hidden />}
              <Icon
                size={17}
                strokeWidth={state === "done" ? 3 : 2}
                aria-hidden
                className="relative"
              />
            </span>
            <span
              className={`text-xs leading-tight ${state === "later" ? "text-muted" : "font-semibold"}`}
            >
              {step.label}
              {state === "done" && <span className="sr-only">, {m.journey.done}</span>}
            </span>
            {step.chip && state !== "done" && (
              <span className={`${step.chip.tone} tt-pill !h-5 !gap-1 !px-1.5 !text-[11px]`}>
                <step.chip.icon size={11} aria-hidden />
                {step.chip.text}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
