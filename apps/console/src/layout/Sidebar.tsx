import { Dropdown, Label, ScrollShadow, Tooltip } from "@heroui/react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import type { MyTenant } from "@turftap/contract";
import { ArrowLeftRight, ChevronRight, ChevronsUpDown, LogOut } from "lucide-react";
import { Fragment, useId, useState } from "react";
import { Focusable } from "react-aria-components";

import { BrandMark } from "@turftap/ui";
import { Collapse } from "../components/Collapse";
import { HUE_CLASS, type Hue } from "../components/look";
import { TopicTile } from "../components/TopicTile";
import { type NavPage, type NavSection, NAV_GROUPS } from "../config/nav";
import { canOpen } from "../config/routePermissions";
import m from "../i18n/en/shell";
import tenants from "../i18n/en/tenants";
import { useSignOut } from "../lib/auth/useSignOut";

type Props = { tenant?: MyTenant; canSwitchTenant: boolean; collapsed: boolean };

const rowBase =
  "relative flex items-center rounded-lg text-sm outline-none tt-t1 hover:bg-[var(--tt-hover)] hover:text-foreground focus-visible:ring-2 focus-visible:ring-focus";
const rowCurrent =
  "bg-accent-soft font-medium text-accent-soft-foreground hover:bg-accent-soft-hover";

/** gam-ui V2's sidebar: a 256px column that folds into a 64px rail (console-design.md §5.1). */
export function Sidebar({ tenant, canSwitchTenant, collapsed }: Props) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const groups = NAV_GROUPS.map((group) =>
    group.flatMap((section) => allowedPart(section, tenant) ?? []),
  ).filter((group) => group.length > 0);
  const sectionIn = groups.flat().find((section) => section.pages && section.isIn(pathname));
  const [openSection, setOpenSection] = useState(sectionIn?.label);
  const [seenPathname, setSeenPathname] = useState(pathname);
  if (seenPathname !== pathname) {
    setSeenPathname(pathname);
    setOpenSection(sectionIn?.label);
  }

  return (
    <aside
      className={`flex h-full flex-col border-e border-[var(--tt-line)] bg-[var(--tt-panel)] transition-[width] duration-(--tt-dur-3) ease-(--tt-ease) ${collapsed ? "w-16" : "w-64"}`}
    >
      <div className={`flex h-14 shrink-0 items-center ${collapsed ? "justify-center" : "px-4"}`}>
        <Link
          to="/"
          aria-label={m.title}
          className="flex items-center gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          <BrandMark />
          {!collapsed && (
            <span className="text-[17px] font-semibold tracking-tight">{m.brand}</span>
          )}
        </Link>
      </div>

      <ScrollShadow hideScrollBar className="min-h-0 flex-1 px-3 pt-2 pb-6">
        <nav aria-label={m.mainNav} className="flex flex-col">
          {groups.map((group, index) => (
            <Fragment key={group[0]!.to}>
              {index > 0 && (
                <div
                  aria-hidden
                  className={`my-3 border-t border-[var(--tt-line)] ${collapsed ? "mx-auto w-6" : "mx-3"}`}
                />
              )}
              <div className={`flex flex-col gap-1 ${collapsed ? "items-center" : ""}`}>
                {group.map((section) =>
                  collapsed ? (
                    <RailLink key={section.to} section={section} pathname={pathname} />
                  ) : section.pages ? (
                    <FoldingSection
                      key={section.to}
                      section={section}
                      pages={section.pages}
                      pathname={pathname}
                      isOpen={openSection === section.label}
                      onToggle={() =>
                        setOpenSection((open) =>
                          open === section.label ? undefined : section.label,
                        )
                      }
                    />
                  ) : (
                    <SectionLink key={section.to} section={section} pathname={pathname} />
                  ),
                )}
              </div>
            </Fragment>
          ))}
        </nav>
      </ScrollShadow>

      <div className="shrink-0 p-3">
        <WhoAndWhere tenant={tenant} canSwitchTenant={canSwitchTenant} collapsed={collapsed} />
      </div>
    </aside>
  );
}

/** The part of a section the person may open; a folding section then leads to its first page. */
function allowedPart(section: NavSection, tenant?: MyTenant): NavSection | undefined {
  if (!section.pages) return canOpen(tenant, section.to) ? section : undefined;
  const pages = section.pages.filter((page) => canOpen(tenant, page.to));
  return pages[0] && { ...section, to: pages[0].to, pages };
}

type FoldingProps = {
  section: NavSection;
  pages: NavPage[];
  pathname: string;
  isOpen: boolean;
  onToggle: () => void;
};

/** A section with sub-pages: its link, a separate chevron that folds the pages, then the pages. */
function FoldingSection({ section, pages, pathname, isOpen, onToggle }: FoldingProps) {
  const pagesId = useId();
  const isIn = section.isIn(pathname);
  return (
    <div>
      <div className="relative">
        <Link
          to={section.to}
          className={`${rowBase} h-10 gap-3 ps-1.5 pe-10 ${isIn ? "text-foreground" : "text-muted"}`}
        >
          <TopicTile hue={section.hue} icon={section.icon} size={28} on={isIn} />
          <span className="flex-1 truncate">{section.label}</span>
        </Link>
        <button
          type="button"
          aria-expanded={isOpen}
          aria-controls={pagesId}
          aria-label={m.showPages(section.label)}
          onClick={onToggle}
          className="absolute end-1 top-1 grid size-8 cursor-pointer place-items-center rounded-md text-muted outline-none tt-t1 hover:bg-[var(--tt-hover)] hover:text-foreground focus-visible:ring-2 focus-visible:ring-focus"
        >
          <ChevronRight
            aria-hidden
            size={16}
            className={`transition-transform duration-(--tt-dur-2) ease-(--tt-ease) ${isOpen ? "rotate-90" : ""}`}
          />
        </button>
      </div>
      <Collapse isOpen={isOpen} id={pagesId}>
        <ul className="flex flex-col gap-0.5 pt-0.5">
          {pages.map((page) => {
            const isCurrent = pathname === page.to;
            return (
              <li key={page.to}>
                <Link
                  to={page.to}
                  aria-current={isCurrent ? "page" : undefined}
                  className={`${rowBase} h-9 ps-[46px] pe-3 ${isCurrent ? rowCurrent : "text-muted"}`}
                >
                  <span className="truncate">{page.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </Collapse>
    </div>
  );
}

function SectionLink({ section, pathname }: { section: NavSection; pathname: string }) {
  const isIn = section.isIn(pathname);
  const isCurrent = pathname === section.to;
  return (
    <Link
      to={section.to}
      aria-current={isCurrent ? "page" : undefined}
      className={`${rowBase} h-10 gap-3 ps-1.5 pe-3 ${isCurrent ? rowCurrent : isIn ? "text-foreground" : "text-muted"}`}
    >
      <TopicTile hue={section.hue} icon={section.icon} size={28} on={isIn} />
      <span className="flex-1 truncate">{section.label}</span>
      {section.useCount && <CountBadge useCount={section.useCount} hue={section.hue} />}
    </Link>
  );
}

function RailLink({ section, pathname }: { section: NavSection; pathname: string }) {
  const isIn = section.isIn(pathname);
  return (
    <Tooltip delay={150}>
      <Focusable>
        <Link
          to={section.to}
          aria-label={section.label}
          aria-current={pathname === section.to ? "page" : undefined}
          className={`${rowBase} size-10 justify-center ${isIn ? rowCurrent : ""}`}
        >
          <TopicTile hue={section.hue} icon={section.icon} size={30} on={isIn} />
          {section.useCount && (
            <CountBadge
              useCount={section.useCount}
              hue={section.hue}
              className="absolute -end-1 -top-1 h-4 min-w-4 px-1 text-[10px]"
            />
          )}
        </Link>
      </Focusable>
      <Tooltip.Content placement="end" offset={10}>
        {section.label}
      </Tooltip.Content>
    </Tooltip>
  );
}

type BadgeProps = { useCount: () => number | undefined; hue: Hue; className?: string };

/** Shown only while someone must act; the number pops when it changes (§5.1). */
function CountBadge({ useCount, hue, className = "h-5 min-w-5 px-1.5 text-xs" }: BadgeProps) {
  const count = useCount();
  if (!count) return null;
  return (
    <span
      key={count}
      aria-label={m.waitingCount(count)}
      className={`grid animate-tt-pop place-items-center rounded-full bg-[var(--tt-hue)] font-semibold text-white tabular-nums ${HUE_CLASS[hue]} ${className}`}
    >
      {count}
    </span>
  );
}

/** Who is signed in where; its menu switches tenant or signs out. */
function WhoAndWhere({
  tenant,
  canSwitchTenant,
  collapsed,
}: Omit<Props, "tenant"> & { tenant?: MyTenant }) {
  const signOut = useSignOut();
  const navigate = useNavigate();
  const name = tenant?.name ?? m.brand;
  const role = tenant ? tenants.roles[tenant.role] : m.platformAdmin;

  return (
    <Dropdown>
      <Dropdown.Trigger
        aria-label={m.whoAndWhere(name, role)}
        className={`${rowBase} w-full gap-2.5 border border-[var(--tt-line)] p-1.5 text-start ${collapsed ? "justify-center border-transparent" : ""}`}
      >
        <span
          aria-hidden
          className="grid size-8 shrink-0 place-items-center rounded-lg bg-foreground text-sm font-semibold text-background"
        >
          {name.charAt(0).toUpperCase()}
        </span>
        {!collapsed && (
          <>
            <span className="grid min-w-0 flex-1">
              <span className="truncate font-medium text-foreground">{name}</span>
              <span className="truncate text-xs text-muted">{role}</span>
            </span>
            <ChevronsUpDown aria-hidden size={16} className="shrink-0 text-muted" />
          </>
        )}
      </Dropdown.Trigger>
      <Dropdown.Popover placement={collapsed ? "end bottom" : "top start"} className="min-w-56">
        <Dropdown.Menu
          onAction={(key) => {
            if (key === "switch") void navigate({ to: "/choose-tenant" });
            if (key === "signOut") signOut();
          }}
        >
          {canSwitchTenant ? (
            <Dropdown.Item id="switch" textValue={m.switchTenant}>
              <ArrowLeftRight aria-hidden size={16} className="text-muted" />
              <Label>{m.switchTenant}</Label>
            </Dropdown.Item>
          ) : null}
          <Dropdown.Item id="signOut" textValue={m.signOut}>
            <LogOut aria-hidden size={16} className="text-muted" />
            <Label>{m.signOut}</Label>
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}
