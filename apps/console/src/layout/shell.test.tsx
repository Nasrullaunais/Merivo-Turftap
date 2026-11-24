import { act, cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { signInForTesting } from "../lib/auth/session";
import { mockApi } from "../test/mockApi";
import { renderApp } from "../test/renderApp";
import { myTenant } from "../test/tenants";

const me = {
  id: 1,
  phone: "+94771234567",
  name: "Demo Owner",
  isPlatformAdmin: false,
  tenants: [myTenant({ id: 1, slug: "demo", name: "Demo Sports", role: "OWNER" })],
};
const page = { content: [], page: 0, size: 100, totalElements: 0, totalPages: 1 };

const screenIsWide = (wide: boolean) =>
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: wide, media: query }));
const sidebars = () => screen.queryAllByRole("navigation", { name: "Main" });
const openConsole = async (path = "/") => {
  signInForTesting(me.phone);
  mockApi({ "GET /v1/me": me, "GET /v1/venues": page, "GET /v1/membership-plans": page });
  const app = renderApp(path);
  await screen.findByRole("navigation", { name: "Main" });
  return app;
};

describe("Staff Console shell (console-design.md §5)", () => {
  it("wideScreen_menuButtonFoldsTheSidebarToIconsAndRemembersIt", async () => {
    screenIsWide(true);
    await openConsole();
    const calendarLink = () => within(sidebars()[0]!).getByRole("link", { name: "Calendar" });
    expect(calendarLink()).toHaveTextContent("Calendar");

    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    expect(calendarLink()).not.toHaveTextContent("Calendar");

    cleanup();
    await openConsole();
    expect(calendarLink()).not.toHaveTextContent("Calendar");
  });

  it("narrowScreen_menuButtonOpensADrawerThatClosesOnEscapeAndOnGoingElsewhere", async () => {
    screenIsWide(false);
    const { router } = await openConsole();
    expect(sidebars()).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    expect(sidebars()).toHaveLength(2);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(sidebars()).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    await act(() => router.navigate({ to: "/venues" }));
    await waitFor(() => expect(sidebars()).toHaveLength(1));
  });

  it("foldingSection_opensWhereYouAreAndItsChevronFoldsThePages", async () => {
    screenIsWide(true);
    const { router } = await openConsole();
    const nav = () => within(sidebars()[0]!);
    const chevron = () => nav().getByRole("button", { name: "Memberships pages" });
    expect(chevron()).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(chevron());
    expect(chevron()).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(nav().getByRole("link", { name: "Membership Plans" }));
    await waitFor(() => expect(router.state.location.pathname).toBe("/membership-plans"));
    expect(nav().getByRole("link", { name: "Membership Plans" })).toHaveAttribute(
      "aria-current",
      "page",
    );

    fireEvent.click(chevron());
    expect(chevron()).toHaveAttribute("aria-expanded", "false");
    await act(() => router.navigate({ to: "/venues" }));
    await act(() => router.navigate({ to: "/membership-plans" }));
    expect(chevron()).toHaveAttribute("aria-expanded", "true");
  });
});
