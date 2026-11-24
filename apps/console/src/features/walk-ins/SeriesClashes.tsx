import { Button } from "@heroui/react";
import { CalendarCheck, CalendarX } from "lucide-react";

import { DateStub } from "../../components/DateStub";
import { LoadingButton } from "../../components/LoadingButton";
import m from "../../i18n/en/walkIns";

type Props = {
  dates: string[];
  weeks: number;
  /** Weeks left out on an earlier try, which aren't booked either. */
  skippedBefore: number;
  isSkipping: boolean;
  onSkip: () => void;
  onCancel: () => void;
};

/** BKG-09, D-10: nothing was booked; staff skip the weeks that clash or go back to the form. */
export function SeriesClashes({ dates, weeks, skippedBefore, isSkipping, ...on }: Props) {
  const free = weeks - skippedBefore - dates.length;
  return (
    <section
      role="alert"
      aria-label={m.clashTitle(dates.length)}
      className="grid animate-tt-rise gap-4 rounded-2xl border border-[var(--tt-line)] p-4"
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="tt-tone-bad tt-block grid size-10 place-items-center rounded-xl"
        >
          <CalendarX size={20} />
        </span>
        <div className="grid">
          <span className="font-semibold tt-tone-bad tt-tone-text">
            {m.clashTitle(dates.length)}
          </span>
          <span className="text-sm text-muted tabular-nums">{m.freeOf(free, weeks)}</span>
        </div>
      </div>
      <ul aria-label={m.clashList} className="flex flex-wrap gap-2">
        {dates.map((date) => (
          <li key={date} className="animate-tt-pop">
            <DateStub date={date} label={m.fullDate(date)} tone="bad" />
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-2 border-t border-[var(--tt-line)] pt-4">
        {free > 0 && (
          <LoadingButton icon={CalendarCheck} isPending={isSkipping} onPress={on.onSkip}>
            {m.skipAndBook(free)}
          </LoadingButton>
        )}
        <Button variant="tertiary" onPress={on.onCancel}>
          {m.cancelClash}
        </Button>
      </div>
    </section>
  );
}
