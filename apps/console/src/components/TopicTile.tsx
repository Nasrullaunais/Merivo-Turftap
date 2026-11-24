import type { LucideIcon } from "lucide-react";

import { HUE_CLASS, type Hue } from "./look";

const TILE_SIZE_PX = 32;

type Props = { hue: Hue; icon: LucideIcon; size?: number; on?: boolean; className?: string };

/** A kind of thing's icon on its hue. `on` turns it solid: "you are in here". */
export function TopicTile({
  hue,
  icon: Icon,
  size = TILE_SIZE_PX,
  on = false,
  className = "",
}: Props) {
  return (
    <span
      aria-hidden
      data-on={on}
      className={`tt-tile ${HUE_CLASS[hue]} ${className}`}
      style={{ width: size, height: size }}
    >
      <Icon size={Math.round(size * 0.55)} />
    </span>
  );
}
