import { Link } from "@tanstack/react-router";
import { BadgeCheck, CalendarClock, History, type LucideIcon } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";

import m from "../../i18n/en/myBookings";
import type { Show } from "./shows";

const SHOW_ICONS: Record<Show, LucideIcon> = {
  upcoming: CalendarClock,
  past: History,
  memberships: BadgeCheck,
};

type Props = { tabs: readonly Show[]; shown: Show; counts: Partial<Record<Show, number>> };

/** Which list is shown, kept in the address so Back returns to it. A white pill slides to it. */
export function ShowSwitch({ tabs, shown, counts }: Props) {
  const nav = useRef<HTMLElement>(null);
  const [pill, setPill] = useState<{ left: number; width: number }>();

  // Tabs are as wide as their labels, so the pill measures the chosen one.
  useLayoutEffect(() => {
    const measure = () => {
      const current = nav.current?.querySelector<HTMLElement>("[aria-current=page]");
      if (current) setPill({ left: current.offsetLeft, width: current.offsetWidth });
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (nav.current) observer.observe(nav.current);
    return () => observer.disconnect();
  }, [shown, tabs.length, counts.upcoming, counts.memberships]);

  return (
    <nav
      ref={nav}
      aria-label={m.show.label}
      className="relative flex animate-tt-rise rounded-2xl bg-[var(--tt-hover)] p-1 [animation-delay:100ms]"
    >
      {pill && (
        <span
          aria-hidden
          style={{ width: pill.width, translate: `${pill.left}px 0` }}
          className="pointer-events-none absolute inset-y-1 left-0 rounded-xl bg-[var(--tt-panel)] shadow-[var(--tt-shadow-card)] transition-[translate,width] duration-300 ease-[var(--tt-ease)]"
        />
      )}
      {tabs.map((tab) => {
        const Icon = SHOW_ICONS[tab];
        const count = counts[tab];
        return (
          <Link
            key={tab}
            to="/me"
            search={(prev) => ({ ...prev, show: tab })}
            replace
            aria-current={tab === shown ? "page" : undefined}
            className="tt-t1 group relative flex h-11 flex-auto items-center justify-center gap-1.5 rounded-xl px-2.5 text-sm font-medium text-muted hover:text-foreground active:scale-[0.97] aria-[current=page]:text-foreground sm:gap-2"
          >
            <Icon
              size={17}
              aria-hidden
              className="shrink-0 transition-colors group-aria-[current=page]:text-accent max-sm:hidden"
            />
            {m.show[tab]}
            {count !== undefined && count > 0 && (
              <span
                key={count}
                className="grid h-5 min-w-5 animate-tt-pop place-items-center rounded-full bg-accent px-1.5 text-[11px] font-semibold text-accent-foreground tabular-nums"
              >
                {count}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
