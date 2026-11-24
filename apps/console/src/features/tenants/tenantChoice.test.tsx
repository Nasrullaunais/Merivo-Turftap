import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { signInForTesting } from "../../lib/auth/session";
import { setActiveTenantId } from "../../lib/tenant/activeTenant";
import { mockApi } from "../../test/mockApi";
import { renderApp } from "../../test/renderApp";
import { myTenant } from "../../test/tenants";

const demoSports = myTenant({ id: 1, slug: "demo", name: "Demo Sports", role: "OWNER" });
const kickOff = myTenant({ id: 2, slug: "kickoff", name: "Kick Off Arena", role: "FRONT_DESK" });
const meWith = (tenants: object[], isPlatformAdmin = false) => ({
  id: 5,
  phone: "+94771234567",
  name: null,
  isPlatformAdmin,
  tenants,
});

/** The sidebar's bottom button names the tenant and role; it opens the account menu. */
const accountButton = (name: string) => screen.findByRole("button", { name });

describe("SIG-02 pick a tenant in the Staff Console", () => {
  it("oneTenant_opensStraightAway", async () => {
    signInForTesting("+94771234567");
    mockApi({ "GET /v1/me": meWith([demoSports]) });
    renderApp("/");
    fireEvent.click(await accountButton("Demo Sports · Owner"));
    expect(await screen.findByRole("menuitem", { name: "Sign out" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Switch tenant" })).not.toBeInTheDocument();
  });

  it("severalTenants_askWhichOneAndOpenTheChosenOne", async () => {
    signInForTesting("+94771234567");
    mockApi({ "GET /v1/me": meWith([demoSports, kickOff]) });
    renderApp("/");
    expect(await screen.findByRole("heading", { name: "Choose a tenant" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Kick Off Arena/ }));
    expect(await accountButton("Kick Off Arena · Front Desk")).toBeInTheDocument();
  });

  it("severalTenants_canSwitchFromTheTopBar", async () => {
    signInForTesting("+94771234567");
    setActiveTenantId(kickOff.id);
    mockApi({ "GET /v1/me": meWith([demoSports, kickOff]) });
    renderApp("/");
    fireEvent.click(await accountButton("Kick Off Arena · Front Desk"));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Switch tenant" }));
    fireEvent.click(await screen.findByRole("button", { name: /Demo Sports/ }));
    expect(await accountButton("Demo Sports · Owner")).toBeInTheDocument();
  });

  it("removedFromTheChosenTenant_opensTheOneTheyStillHave", async () => {
    signInForTesting("+94771234567");
    setActiveTenantId(kickOff.id);
    const fetch = mockApi({ "GET /v1/me": meWith([demoSports]) });
    renderApp("/");
    expect(await accountButton("Demo Sports · Owner")).toBeInTheDocument();
    const request = fetch.mock.calls[0]![0] as Request;
    expect(request.headers.get("X-Tenant-Id")).toBeNull();
  });

  it("noTenants_saysTheyHaveNoAccessYet", async () => {
    signInForTesting("+94771234567");
    mockApi({ "GET /v1/me": meWith([]) });
    renderApp("/");
    expect(
      await screen.findByRole("heading", { name: "You don't have access to any venue yet" }),
    ).toBeInTheDocument();
  });

  it("platformAdminWithoutTenants_stillOpensTheConsole", async () => {
    signInForTesting("+94771234567");
    mockApi({ "GET /v1/me": meWith([], true) });
    renderApp("/");
    expect(await accountButton("TurfTap · Platform Admin")).toBeInTheDocument();
  });
});
