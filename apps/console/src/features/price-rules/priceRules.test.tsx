import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import type { StaffRole } from "@turftap/contract";
import { describe, expect, it } from "vitest";

import { signInForTesting } from "../../lib/auth/session";
import { apiError, mockApi } from "../../test/mockApi";
import { renderApp } from "../../test/renderApp";
import { myTenant } from "../../test/tenants";

const PHONE = "+94771234567";
const meAs = (role: StaffRole) => ({
  id: 1,
  phone: PHONE,
  name: "Demo Owner",
  isPlatformAdmin: false,
  tenants: [myTenant({ id: 1, slug: "demo", name: "Demo Sports", role })],
});
const ok = (data: unknown) => Response.json({ status: 200, message: "success", data });
const page = (content: object[]) => ({
  content,
  page: 0,
  size: 100,
  totalElements: content.length,
  totalPages: 1,
});
const times = { createdAt: "2026-11-22T04:00:00.000Z", updatedAt: "2026-11-22T04:00:00.000Z" };
const court = {
  id: 11,
  venueId: 3,
  name: "Court 1",
  type: "FUTSAL_COURT",
  slotMinutes: 60,
  startIntervalMinutes: 30,
  price: { amount: 450_000, currency: "LKR" },
  active: true,
  ...times,
};
const weekend = {
  id: 21,
  resourceId: 11,
  weekdays: [6, 7],
  startTime: "18:00",
  endTime: "22:00",
  price: { amount: 600_000, currency: "LKR" },
  ...times,
};

const bodiesOf = (fetch: ReturnType<typeof mockApi>, method: string) =>
  Promise.all(
    fetch.mock.calls
      .map(([request]) => request as Request)
      .filter((request) => request.method === method)
      .map((request) => request.clone().json()),
  );

const openAddForm = async () =>
  fireEvent.click(await screen.findByRole("button", { name: "Add a Price Rule" }));

describe("VEN-05 set prices", () => {
  it("resourcePage_showsTheDefaultPriceAndPriceRules", async () => {
    signInForTesting(PHONE);
    mockApi({
      "GET /v1/me": meAs("FRONT_DESK"),
      "GET /v1/resources/11": court,
      "GET /v1/price-rules": page([weekend]),
    });
    renderApp("/resources/11");
    expect(await screen.findByRole("heading", { name: "Court 1" })).toBeInTheDocument();
    expect(await screen.findByText("LKR 4,500")).toBeInTheDocument();
    const rule = (await screen.findByText("Sat, Sun 18:00–22:00")).closest("li")!;
    expect(within(rule).getByText("LKR 6,000")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Add a Price Rule" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save price" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Delete/ })).not.toBeInTheDocument();
  });

  it("manager_changesTheDefaultPrice", async () => {
    signInForTesting(PHONE);
    let resource = court;
    const fetch = mockApi({
      "GET /v1/me": meAs("MANAGER"),
      "GET /v1/resources/11": () => ok(resource),
      "PATCH /v1/resources/11": () => {
        resource = { ...court, price: { amount: 500_000, currency: "LKR" } };
        return ok(resource);
      },
      "GET /v1/price-rules": page([]),
    });
    renderApp("/resources/11");
    const field = await screen.findByLabelText(/^Default price per slot/);
    expect(field).toHaveValue(4500);
    fireEvent.change(field, { target: { value: "5000" } });
    fireEvent.click(screen.getByRole("button", { name: "Save price" }));

    expect(await screen.findByText("Saved")).toBeInTheDocument();
    expect(await bodiesOf(fetch, "PATCH")).toEqual([
      { price: { amount: 500_000, currency: "LKR" } },
    ]);
  });

  it("manager_addsAWeekendEveningPriceRule", async () => {
    signInForTesting(PHONE);
    let rules: object[] = [];
    const fetch = mockApi({
      "GET /v1/me": meAs("MANAGER"),
      "GET /v1/resources/11": court,
      "GET /v1/price-rules": () => ok(page(rules)),
      "POST /v1/price-rules": () => {
        rules = [weekend];
        return Response.json({ status: 201, message: "success", data: weekend }, { status: 201 });
      },
    });
    renderApp("/resources/11");
    await screen.findByText("No Price Rules yet. Every slot costs the default price.");
    await openAddForm();
    fireEvent.click(screen.getByRole("checkbox", { name: "Sun" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Sat" }));
    fireEvent.change(screen.getByLabelText(/^Price per slot/), { target: { value: "6000" } });
    fireEvent.click(screen.getByRole("button", { name: "Add Price Rule" }));

    expect(await screen.findByText("Sat, Sun 18:00–22:00")).toBeInTheDocument();
    expect(await bodiesOf(fetch, "POST")).toEqual([
      {
        resourceId: 11,
        weekdays: [6, 7],
        startTime: "18:00",
        endTime: "22:00",
        price: { amount: 600_000, currency: "LKR" },
      },
    ]);
  });

  it("addPriceRule_needsADayAnEndAfterTheStartAndWholeRupees", async () => {
    signInForTesting(PHONE);
    const fetch = mockApi({
      "GET /v1/me": meAs("MANAGER"),
      "GET /v1/resources/11": court,
      "GET /v1/price-rules": page([]),
    });
    renderApp("/resources/11");
    await openAddForm();
    fireEvent.click(screen.getByRole("button", { name: /To$/ }));
    fireEvent.click(await screen.findByRole("option", { name: "17:00" }));
    fireEvent.change(screen.getByLabelText(/^Price per slot/), { target: { value: "99.5" } });
    fireEvent.click(screen.getByRole("button", { name: "Add Price Rule" }));

    expect(await screen.findByText("Choose at least one day")).toBeInTheDocument();
    expect(screen.getByText("Must end after it starts")).toBeInTheDocument();
    expect(screen.getByText("Enter whole rupees above 0, such as 4500")).toBeInTheDocument();
    const methods = fetch.mock.calls.map(([request]) => (request as Request).method);
    expect(methods).not.toContain("POST");
  });

  it("addPriceRule_offersOnlyTimesOnTheStartInterval", async () => {
    signInForTesting(PHONE);
    mockApi({
      "GET /v1/me": meAs("MANAGER"),
      "GET /v1/resources/11": { ...court, startIntervalMinutes: 60 },
      "GET /v1/price-rules": page([]),
    });
    renderApp("/resources/11");
    await openAddForm();
    fireEvent.click(screen.getByRole("button", { name: /From$/ }));
    const starts = (await screen.findAllByRole("option")).map((option) => option.textContent);
    expect(starts).toHaveLength(24);
    expect(starts.slice(0, 3)).toEqual(["00:00", "01:00", "02:00"]);
    expect(starts.at(-1)).toBe("23:00");
  });

  it("manager_isToldWhichRuleClashes", async () => {
    signInForTesting(PHONE);
    mockApi({
      "GET /v1/me": meAs("MANAGER"),
      "GET /v1/resources/11": court,
      "GET /v1/price-rules": page([weekend]),
      "POST /v1/price-rules": () =>
        apiError(409, "tt_ven_006", "This overlaps the Price Rule for Sat, Sun 18:00–22:00"),
    });
    renderApp("/resources/11");
    await screen.findByText("Sat, Sun 18:00–22:00");
    await openAddForm();
    fireEvent.click(screen.getByRole("checkbox", { name: "Sat" }));
    fireEvent.change(screen.getByLabelText(/^Price per slot/), { target: { value: "7000" } });
    fireEvent.click(screen.getByRole("button", { name: "Add Price Rule" }));
    expect(
      await screen.findByText("This overlaps the Price Rule for Sat, Sun 18:00–22:00"),
    ).toBeInTheDocument();
  });

  it("manager_deletesAPriceRule", async () => {
    signInForTesting(PHONE);
    let rules: object[] = [weekend];
    mockApi({
      "GET /v1/me": meAs("MANAGER"),
      "GET /v1/resources/11": court,
      "GET /v1/price-rules": () => ok(page(rules)),
      "DELETE /v1/price-rules/21": () => {
        rules = [];
        return ok(null);
      },
    });
    renderApp("/resources/11");
    fireEvent.click(
      await screen.findByRole("button", {
        name: "Delete the Price Rule for Sat, Sun 18:00–22:00",
      }),
    );
    await waitFor(() => expect(screen.queryByText("Sat, Sun 18:00–22:00")).toBeNull());
  });
});
