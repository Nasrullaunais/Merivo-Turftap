import { Link } from "@tanstack/react-router";

import m from "../i18n/en/shell";
import { SECTIONS, useSectionIndex } from "./navigation";

/** POR-05: on phones the sections sit under the thumb; a teal pill slides to the current one. */
export function BottomNav() {
  const current = useSectionIndex();
  return (
    <nav
      aria-label={m.nav.label}
      style={{ viewTransitionName: "tt-bottom-nav" }}
      className="tt-glass fixed inset-x-0 bottom-0 z-30 animate-tt-rise border-t border-[var(--tt-line)] pb-[env(safe-area-inset-bottom)] sm:hidden"
    >
      <div className="relative mx-auto grid h-16 max-w-md grid-cols-2 px-3 py-2">
        <span
          aria-hidden
          style={{ translate: `${current * 100}% 0` }}
          className="pointer-events-none absolute inset-y-2 left-3 w-[calc(50%-0.75rem)] rounded-2xl bg-[color-mix(in_oklab,var(--accent)_13%,transparent)] transition-[translate] duration-300 ease-[var(--tt-ease)]"
        />
        {SECTIONS.map(({ to, label, icon: Icon }, index) => (
          <Link
            key={to}
            to={to}
            aria-current={index === current ? "page" : undefined}
            className="tt-t1 group relative grid place-items-center content-center gap-0.5 rounded-2xl text-[11px] font-medium text-muted hover:text-foreground active:scale-[0.96] aria-[current=page]:text-accent"
          >
            <Icon
              size={22}
              aria-hidden
              className="transition-transform duration-200 group-hover:-translate-y-px group-aria-[current=page]:scale-110"
            />
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
