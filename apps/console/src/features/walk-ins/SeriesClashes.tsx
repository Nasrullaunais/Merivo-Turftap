import { Alert, Button } from "@heroui/react";
import { CalendarCheck } from "lucide-react";

import { DateStub } from "../../components/DateStub";
import { LoadingButton } from "../../components/LoadingButton";
import m from "../../i18n/en/walkIns";

type Props = {
  dates: string[];
  canSkip: boolean;
  isSkipping: boolean;
  onSkip: () => void;
  onCancel: () => void;
};

/** BKG-09, D-10: nothing was booked; staff skip the weeks that clash or go back to the form. */
export function SeriesClashes({ dates, canSkip, isSkipping, onSkip, onCancel }: Props) {
  return (
    <Alert status="danger" role="alert" className="animate-tt-rise">
      <Alert.Indicator />
      <Alert.Content className="grid gap-3">
        <Alert.Title>{m.clashTitle(dates.length)}</Alert.Title>
        <ul aria-label={m.clashList} className="flex flex-wrap gap-2">
          {dates.map((date) => (
            <li key={date} className="animate-tt-pop">
              <DateStub date={date} label={m.fullDate(date)} />
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center gap-2">
          {canSkip && (
            <LoadingButton icon={CalendarCheck} isPending={isSkipping} onPress={onSkip}>
              {m.skipAndBook}
            </LoadingButton>
          )}
          <Button variant="tertiary" onPress={onCancel}>
            {m.cancelClash}
          </Button>
        </div>
      </Alert.Content>
    </Alert>
  );
}
