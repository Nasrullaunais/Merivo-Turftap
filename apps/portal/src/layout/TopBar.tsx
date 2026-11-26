import { Skeleton } from "@heroui/react";
import { Link } from "@tanstack/react-router";

import { TenantMark } from "../components/TenantMark";
import m from "../i18n/en/shell";

/** The tenant's name, always on top: customers see whose portal they are on (POR-01). */
export function TopBar({ name }: { name?: string }) {
  return (
    <header className="tt-glass sticky top-0 z-30 animate-tt-drop border-b border-[var(--tt-line)]">
      <div className="mx-auto flex h-16 max-w-5xl items-center px-4">
        {name ? (
          <Link
            to="/"
            className="tt-t1 -mx-2 flex min-w-0 items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-[var(--tt-hover)] active:scale-[0.98]"
          >
            <TenantMark name={name} />
            <span className="animate-tt-fade truncate text-base font-semibold tracking-tight">
              {name}
            </span>
          </Link>
        ) : (
          <div role="status" aria-label={m.loading} className="flex items-center gap-3">
            <Skeleton className="size-9 rounded-[10px]" />
            <Skeleton className="h-4 w-36 rounded-md" />
          </div>
        )}
      </div>
    </header>
  );
}
