import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { TONE_CLASS, type Tone } from "../../components/look";

type Props = { tone: Tone; icon: LucideIcon; title: string; body?: string; action?: ReactNode };

/** Where a booking stands once there is nothing to pay online, in that state's tone. */
export function Outcome({ tone, icon: Icon, title, body, action }: Props) {
  return (
    <section
      className={`${TONE_CLASS[tone]} tt-panel relative isolate grid animate-tt-rise justify-items-center gap-2 overflow-hidden px-6 py-10 text-center`}
    >
      <div className="tt-status-glow" aria-hidden />
      <span className="tt-status-badge mb-2">
        <span className="tt-status-ring" aria-hidden />
        <Icon size={32} strokeWidth={1.75} aria-hidden />
      </span>
      <h1 className="animate-tt-rise text-2xl font-semibold tracking-tight [animation-delay:120ms]">
        {title}
      </h1>
      {body && (
        <p className="max-w-sm animate-tt-rise text-sm text-pretty text-muted [animation-delay:180ms]">
          {body}
        </p>
      )}
      {action && <div className="mt-2 animate-tt-rise [animation-delay:240ms]">{action}</div>}
    </section>
  );
}
