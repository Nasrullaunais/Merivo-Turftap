import { Button, type ButtonProps, Spinner } from "@heroui/react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type Props = Omit<ButtonProps, "children" | "isPending"> & {
  isPending: boolean;
  icon?: LucideIcon;
  children: ReactNode;
};

/** A button that starts work: a spinner while it runs, same width, and no second press. */
export function LoadingButton({ isPending, icon: Icon, children, ...props }: Props) {
  if (Icon)
    return (
      <Button {...props} isPending={isPending}>
        {isPending ? <Spinner color="current" size="sm" /> : <Icon aria-hidden size={16} />}
        {children}
      </Button>
    );
  return (
    <Button {...props} isPending={isPending}>
      <span className="grid place-items-center">
        <span className={`col-start-1 row-start-1 tt-t1 ${isPending ? "opacity-0" : ""}`}>
          {children}
        </span>
        {isPending && (
          <span className="col-start-1 row-start-1 flex animate-tt-pop">
            <Spinner color="current" size="sm" />
          </span>
        )}
      </span>
    </Button>
  );
}
