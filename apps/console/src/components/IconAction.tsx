import { Button, type ButtonProps, Spinner, Tooltip } from "@heroui/react";
import type { LucideIcon } from "lucide-react";

type Props = Omit<ButtonProps, "children" | "isPending" | "isIconOnly" | "className"> & {
  className?: string;
  icon: LucideIcon;
  /** The full name screen readers hear, such as "Reopen Fri, 25 Dec 2026". */
  label: string;
  /** The short name in the tooltip, such as "Reopen". */
  hint: string;
  isPending?: boolean;
  danger?: boolean;
};

/** An icon-only button with its name as a tooltip; a spinner takes the icon's place while busy. */
export function IconAction({
  icon: Icon,
  label,
  hint,
  isPending = false,
  danger,
  className = "",
  ...props
}: Props) {
  return (
    <Tooltip>
      <Button
        {...props}
        isIconOnly
        size="sm"
        variant="ghost"
        aria-label={label}
        isPending={isPending}
        className={`text-muted hover:text-foreground ${danger ? "hover:bg-danger-soft hover:text-danger" : ""} ${className}`}
      >
        {isPending ? <Spinner color="current" size="sm" /> : <Icon aria-hidden size={17} />}
      </Button>
      <Tooltip.Content placement="top">{hint}</Tooltip.Content>
    </Tooltip>
  );
}
