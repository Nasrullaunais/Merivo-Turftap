import { Tooltip } from "@heroui/react";
import { Link, type LinkComponentProps } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Focusable } from "react-aria-components";

/** One level up from a detail page. There is never a second hop (console-design.md §5.2). */
export function BackLink({ label, ...link }: LinkComponentProps & { label: string }) {
  return (
    <Tooltip>
      <Focusable>
        <Link
          {...link}
          aria-label={label}
          className="grid size-8 place-items-center rounded-lg text-muted outline-none tt-t1 hover:bg-[var(--tt-hover)] hover:text-foreground focus-visible:ring-2 focus-visible:ring-focus"
        >
          <ArrowLeft aria-hidden size={20} />
        </Link>
      </Focusable>
      <Tooltip.Content placement="bottom">{label}</Tooltip.Content>
    </Tooltip>
  );
}
