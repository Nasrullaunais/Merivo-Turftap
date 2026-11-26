import { Skeleton } from "@heroui/react";
import { Link } from "@tanstack/react-router";

import { TenantMark } from "../components/TenantMark";
import m from "../i18n/en/shell";
import { SECTIONS, useSectionIndex } from "./navigation";

/** The tenant's name, always on top: customers see whose portal they are on (POR-01). */
export function TopBar({ name }: { name?: string }) {
  const current = useSectionIndex();
  return (
    <header
      style={{ viewTransitionName: "tt-top-bar" }}
      className="tt-glass sticky top-0 z-30 animate-tt-drop border-b border-[var(--tt-line)]"
    >
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
        {name && (
          <nav
            aria-label={m.nav.label}
            className="relative ml-auto hidden animate-tt-fade grid-cols-2 rounded-full bg-[var(--tt-hover)] p-1 sm:grid"
          >
            <span
              aria-hidden
              style={{ translate: `${current * 100}% 0` }}
              className="pointer-events-none absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-[var(--tt-panel)] shadow-[var(--tt-shadow-card)] transition-[translate] duration-300 ease-[var(--tt-ease)]"
            />
            {SECTIONS.map(({ to, label, icon: Icon }, index) => (
              <Link
                key={to}
                to={to}
                aria-current={index === current ? "page" : undefined}
                className="tt-t1 group relative flex h-9 items-center justify-center gap-2 rounded-full px-4 text-sm font-medium text-muted hover:text-foreground active:scale-[0.97] aria-[current=page]:text-foreground"
              >
                <Icon
                  size={17}
                  aria-hidden
                  className="transition-colors group-aria-[current=page]:text-accent"
                />
                {label}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}
