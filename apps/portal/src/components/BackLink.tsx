import { Skeleton } from "@heroui/react";
import { Link, type LinkProps } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";

/** A small "‹ Where you came from" link above a page's title. */
export function BackLink({ label, ...link }: LinkProps & { label?: string }) {
  if (!label) return <Skeleton className="h-8 w-32 rounded-full" />;
  return (
    <Link
      {...link}
      className="tt-t1 group -ml-2 inline-flex h-8 w-fit animate-tt-fade items-center gap-1 rounded-full pr-3 pl-1.5 text-sm font-medium text-muted hover:bg-[var(--tt-hover)] hover:text-foreground active:scale-[0.97]"
    >
      <ChevronLeft
        size={18}
        aria-hidden
        className="transition-transform duration-200 group-hover:-translate-x-0.5"
      />
      {label}
    </Link>
  );
}
