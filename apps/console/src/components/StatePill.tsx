import type { LucideIcon } from "lucide-react";

import { TONE_CLASS, type Tone } from "./look";

type Props = { tone: Tone; icon: LucideIcon; label: string; className?: string };

/** The main state of a thing: its icon and label on its tone. */
export function StatePill({ tone, icon: Icon, label, className = "" }: Props) {
  return (
    <span className={`tt-pill ${TONE_CLASS[tone]} ${className}`}>
      <Icon aria-hidden size={13} strokeWidth={2.25} />
      {label}
    </span>
  );
}

/** A second state beside a pill, lighter so a row never becomes a wall of pills. */
export function StateDot({ tone, label }: { tone: Tone; label: string }) {
  return (
    <span className={`inline-flex items-center gap-2 text-sm ${TONE_CLASS[tone]}`}>
      <span className="tt-dot" />
      <span className={tone === "good" ? "text-muted" : "tt-tone-text font-medium"}>{label}</span>
    </span>
  );
}
