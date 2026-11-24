import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import type { Hue } from "./look";
import { TopicTile } from "./TopicTile";

type Props = { hue: Hue; icon: LucideIcon; children: ReactNode; action?: ReactNode };

/** A whole area with nothing in it: the kind's tile, one short sentence and what fills it. */
export function EmptyState({ hue, icon, children, action }: Props) {
  return (
    <div className="grid animate-tt-rise justify-items-center gap-3 tt-panel px-6 py-12 text-center">
      <TopicTile hue={hue} icon={icon} size={48} className="rounded-xl" />
      <p className="text-muted">{children}</p>
      {action}
    </div>
  );
}
