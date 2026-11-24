import type { ReactNode } from "react";

type Props = { isOpen: boolean; id?: string; children: ReactNode };

/** Folds open and shut. Children stay mounted so closing animates; `inert` hides them meanwhile. */
export function Collapse({ isOpen, id, children }: Props) {
  return (
    <div id={id} data-open={isOpen} inert={!isOpen} className="tt-collapse">
      <div>{children}</div>
    </div>
  );
}
