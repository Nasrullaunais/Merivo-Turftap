import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { HUE_CLASS, type Hue } from "./look";
import { TopicTile } from "./TopicTile";

type Props = {
  hue: Hue;
  icon: LucideIcon;
  name: ReactNode;
  details?: ReactNode;
  actions?: ReactNode;
};

/** The top of a record's page (gen-ui V2): its tile on a soft glow of its hue, name and details. */
export function RecordHeader({ hue, icon, name, details, actions }: Props) {
  return (
    <header className="relative overflow-hidden rounded-2xl border border-[var(--tt-line)] bg-[var(--tt-panel)] p-5 sm:p-6">
      <div
        aria-hidden
        className={`pointer-events-none absolute -start-20 -top-24 size-64 rounded-full bg-[color-mix(in_oklab,var(--tt-hue)_22%,transparent)] blur-3xl ${HUE_CLASS[hue]}`}
      />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
        <TopicTile hue={hue} icon={icon} size={56} className="rounded-2xl shadow-lg" on />
        <div className="grid min-w-0 flex-1 gap-1.5">
          <h2 className="text-2xl font-semibold tracking-tight text-pretty">{name}</h2>
          {details && <div className="text-sm text-muted">{details}</div>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </header>
  );
}
