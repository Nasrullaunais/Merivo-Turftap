import { Plus } from "lucide-react";
import { type ReactNode, useId, useState } from "react";

import { Collapse } from "./Collapse";

type Props = { label: string; children: (fold: () => void) => ReactNode };

/** The dashed "+ Add …" line at the end of a section; it unfolds its form and folds after saving. */
export function AddSlot({ label, children }: Props) {
  const [isOpen, setOpen] = useState(false);
  const formId = useId();
  return (
    <div className="border-t border-[var(--tt-line)]">
      <h3>
        <button
          type="button"
          aria-expanded={isOpen}
          aria-controls={formId}
          onClick={() => setOpen((open) => !open)}
          className="flex min-h-14 w-full cursor-pointer items-center gap-3 px-4 text-start font-medium text-accent outline-none tt-t1 hover:bg-[var(--tt-hover)] focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-inset"
        >
          <span
            aria-hidden
            className="grid size-7 place-items-center rounded-lg border border-dashed border-current"
          >
            <Plus
              size={16}
              className={`transition-transform duration-(--tt-dur-2) ${isOpen ? "rotate-45" : ""}`}
            />
          </span>
          {label}
        </button>
      </h3>
      <Collapse id={formId} isOpen={isOpen}>
        <div className="px-4 pt-1 pb-5">{children(() => setOpen(false))}</div>
      </Collapse>
    </div>
  );
}
