import { Button, Spinner, Tooltip } from "@heroui/react";
import { CHECK_IN_UNDO_MINUTES } from "@turftap/contract";
import type { CheckIn } from "@turftap/contract/client";
import { DoorOpen, Undo2 } from "lucide-react";
import { type CSSProperties, useEffect, useState } from "react";

import { Row, ROW_LINK, Rows } from "../../components/Rows";
import { EmptyLine, Section } from "../../components/Section";
import { SkeletonRows } from "../../components/SkeletonRows";
import { usePresence } from "../../components/usePresence";
import m from "../../i18n/en/checkIns";
import { useUndoCheckIn } from "./useCheckIns";

const UNDO_MS = CHECK_IN_UNDO_MINUTES * 60 * 1000;
const RING_RADIUS = 14;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

type Props = {
  checkIns: CheckIn[] | undefined;
  timeZone: string;
  canUndo: boolean;
  /** Opens the customer at the desk. */
  onOpen: (checkIn: CheckIn) => void;
};

/** MEM-05: who came in today, newest on top. A mistake can be undone for a few minutes. */
export function TodayCheckIns({ checkIns, timeZone, canUndo, onOpen }: Props) {
  const shown = usePresence(checkIns ?? [], (checkIn) => checkIn.id);
  const count = checkIns?.length;
  return (
    <Section
      hue="membership"
      icon={DoorOpen}
      title={m.today}
      actions={
        count !== undefined && (
          <span
            key={count}
            aria-live="polite"
            className="inline-flex animate-tt-pop items-baseline gap-1.5 tabular-nums"
          >
            <span className="text-2xl font-semibold tracking-tight">{count}</span>
            <span className="sr-only">{m.inCount(count)}</span>
          </span>
        )
      }
    >
      {!checkIns ? (
        <div className="p-3">
          <SkeletonRows label={m.loadingToday} rows={4} />
        </div>
      ) : checkIns.length === 0 && shown.length === 0 ? (
        <EmptyLine>{m.noneToday}</EmptyLine>
      ) : (
        <Rows label={m.today}>
          {shown.map((present, index) => {
            const checkIn = present.item;
            const time = m.clock(checkIn.checkedInAt, timeZone);
            return (
              <Row
                key={present.key}
                index={index}
                landed={present.isNew}
                leaving={present.isLeaving}
                lead={
                  <time
                    dateTime={checkIn.checkedInAt}
                    className="tt-tile tt-hue-membership h-9 w-14 rounded-lg text-sm font-semibold tabular-nums"
                  >
                    {time}
                  </time>
                }
                title={
                  <button
                    type="button"
                    data-row-link
                    className={`cursor-pointer text-start ${ROW_LINK}`}
                    onClick={() => onOpen(checkIn)}
                  >
                    {checkIn.customerName}
                  </button>
                }
                detail={<span className="truncate">{checkIn.planName}</span>}
                end={canUndo && <UndoButton checkIn={checkIn} />}
              />
            );
          })}
        </Rows>
      )}
    </Section>
  );
}

/** Shows only while the undo time lasts; its ring empties as that time runs out. */
function UndoButton({ checkIn }: { checkIn: CheckIn }) {
  const undo = useUndoCheckIn();
  const madeAt = Date.parse(checkIn.checkedInAt);
  const [since] = useState(() => Date.now() - madeAt);
  const [isOpen, setOpen] = useState(since < UNDO_MS);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => setOpen(false), UNDO_MS - since);
    return () => clearTimeout(timer);
  }, [isOpen, since]);

  if (!isOpen) return null;
  const ring = {
    "--tt-ring": `${RING_LENGTH}px`,
    "--tt-for": `${UNDO_MS}ms`,
    "--tt-since": `${since}ms`,
  } as CSSProperties;
  const label = m.undo(checkIn.customerName);
  return (
    <Tooltip>
      <Button
        isIconOnly
        size="sm"
        variant="ghost"
        aria-label={label}
        isPending={undo.isPending}
        onPress={() => undo.mutate({ path: { id: checkIn.id } })}
        className="relative size-9 animate-tt-pop text-muted hover:bg-danger-soft hover:text-danger"
      >
        <svg
          aria-hidden
          viewBox="0 0 32 32"
          className="absolute inset-0 size-9 -rotate-90 tt-tone-watch"
        >
          <circle
            cx="16"
            cy="16"
            r={RING_RADIUS}
            fill="none"
            strokeWidth="2"
            strokeLinecap="round"
            stroke="var(--tt-tone)"
            className="tt-drain"
            style={ring}
          />
        </svg>
        {undo.isPending ? <Spinner color="current" size="sm" /> : <Undo2 aria-hidden size={16} />}
      </Button>
      <Tooltip.Content placement="top">{m.undoShort}</Tooltip.Content>
    </Tooltip>
  );
}
