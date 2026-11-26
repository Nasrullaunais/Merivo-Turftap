import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { TONE_CLASS, type Tone } from "../../components/look";

type Props = { tone: Tone; icon: LucideIcon; title: string; body: string; action?: ReactNode };

/** Takes the place of the slots when a day has none to pick, in the tone of why. */
export function DayNotice({ tone, icon: Icon, title, body, action }: Props) {
  return (
    <div
      className={`${TONE_CLASS[tone]} tt-panel grid animate-tt-rise justify-items-center gap-2 px-6 py-10 text-center`}
    >
      <span className="tt-status-badge mb-1 !size-14 !rounded-2xl">
        <Icon size={26} strokeWidth={1.75} aria-hidden />
      </span>
      <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
      <p className="max-w-xs text-sm text-pretty text-muted">{body}</p>
      {action}
    </div>
  );
}
