import type { LucideIcon } from "lucide-react";
import { type ReactNode, useId } from "react";

import type { Hue } from "./look";
import { TopicTile } from "./TopicTile";

type Props = {
  hue: Hue;
  icon: LucideIcon;
  title: string;
  /** How many things it holds; zero shows nothing. */
  count?: number;
  actions?: ReactNode;
  children: ReactNode;
};

/** A panel on a page: its kind's tile and name on top, then rows, an empty line or a form. */
export function Section({ hue, icon, title, count, actions, children }: Props) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="overflow-hidden tt-panel">
      <header className="flex min-h-14 items-center gap-3 border-b border-[var(--tt-line)] px-4 py-2">
        <TopicTile hue={hue} icon={icon} size={28} />
        <h2 id={headingId} className="text-lg font-semibold tracking-tight">
          {title}
        </h2>
        {!!count && <span className="text-lg font-medium text-muted tabular-nums">{count}</span>}
        {actions && <div className="ms-auto flex items-center gap-2">{actions}</div>}
      </header>
      {children}
    </section>
  );
}

/** A section with nothing in it yet: one short line. */
export function EmptyLine({ children }: { children: ReactNode }) {
  return <p className="animate-tt-rise px-4 py-5 text-muted">{children}</p>;
}
