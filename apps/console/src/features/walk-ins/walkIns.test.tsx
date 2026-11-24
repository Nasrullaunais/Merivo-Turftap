import type { CreateRepeatSeries, StaffRole } from "@turftap/contract";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { signInForTesting } from "../../lib/auth/session";
import { apiError, mockApi } from "../../test/mockApi";
import { renderApp } from "../../test/renderApp";
import { myTenant } from "../../test/tenants";

const PHONE = "+94771234567";
// 08:30 on Friday 25 Dec 2026 in Colombo; the tests run in a New York browser.
const NOW = "2026-12-25T03:00:00.000Z";
const AT_SEVEN_PM = "2026-12-25T13:30:00.000Z";

const ok = (data: unknown) => Response.json({ status: 200, message: "success", data });
const page = (content: object[]) => ({
  content,
  page: 0,
  size: 100,
  totalElements: content.length,
  totalPages: 1,
});
const times = { createdAt: "2026-11-22T04:00:00.000Z", updatedAt: "2026-11-22T04:00:00.000Z" };
const lkr = (rupees: number) => ({ amount: rupees * 100, currency: "LKR" });
const arena = {
  id: 3,
  name: "City Arena",
  description: null,
  address: "12 Galle Road, Colombo",
  phone: "+94112345678",
  timeZone: "Asia/Colombo",
  bankAccount: null,
  advancePercent: 100,
  paymentTimeLimitMinutes: 30,
  cancellationCutOffHours: 6,
  payAtVenue: false,
  seriesPaymentDaysBefore: 2,
  openingHours: [5].map((weekday) => ({ weekday, opens: "06:00", closes: "23:00" })),
  active: true,
  ...times,
};
const court = {
  id: 12,
  venueId: 3,
  name: "Court 2",
  type: "FUTSAL_COURT",
  slotMinutes: 60,
  startIntervalMinutes: 30,
  price: lkr(4_500),
  active: true,
  ...times,
};
const nimal = { id: 7, phone: "+94770001111", name: "Nimal Perera", ...times };
const slot = (startsAt: string, hours: number, rupees: number, free: boolean) => ({
  startsAt,
  endsAt: new Date(Date.parse(startsAt) + hours * 3_600_000).toISOString(),
  price: lkr(rupees),
  free,
});

/**
 * Court 2 is free at 19:00 and 20:00 and taken at 21:00, so two slots fit from 19:00.
 * Two slots cost 9,500 because the evening Price Rule starts at 20:00. Booking takes 19:00.
 */
function mockWalkInApi(book: (request: Request) => Response, role: StaffRole = "FRONT_DESK") {
  const created: unknown[] = [];
  let isSevenPmTaken = false;
  mockApi({
    "GET /v1/me": {
      id: 1,
      phone: PHONE,
      name: "Desk",
      isPlatformAdmin: false,
      tenants: [myTenant({ id: 1, slug: "demo", name: "Demo Sports", role })],
    },
    "GET /v1/venues": page([arena]),
    "GET /v1/resources": page([court]),
    "GET /v1/bookings": page([]),
    "GET /v1/blocked-times": page([]),
    "GET /v1/closed-dates": page([]),
    "GET /v1/events": () => new Response(new ReadableStream(), { status: 200 }),
    "GET /v1/availability": (request: Request) => {
      const slots = Number(new URL(request.url).searchParams.get("slots"));
      if (slots === 1)
        return ok(
          page([
            slot(AT_SEVEN_PM, 1, 4_500, !isSevenPmTaken),
            slot("2026-12-25T14:30:00.000Z", 1, 5_000, true),
            slot("2026-12-25T15:30:00.000Z", 1, 5_000, false),
          ]),
        );
      return ok(page([slot(AT_SEVEN_PM, slots, slots === 2 ? 9_500 : 0, slots === 2)]));
    },
    "GET /v1/customers": (request: Request) => {
      const phone = new URL(request.url).searchParams.get("phone");
      return ok(page(phone === nimal.phone ? [nimal] : []));
    },
    "POST /v1/bookings": async (request: Request) => {
      created.push(await request.json());
      const reply = book(request);
      isSevenPmTaken ||= reply.ok;
      return reply;
    },
  });
  signInForTesting(PHONE);
  return created;
}

const booked = () => Response.json({ status: 201, message: "success", data: {} }, { status: 201 });

async function openSevenPm() {
  renderApp("/calendar");
  fireEvent.click(await screen.findByRole("button", { name: "Free: Court 2, Fri 25 Dec, 19:00" }));
  const dialog = await screen.findByRole("dialog", { name: "Walk-in booking" });
  await within(dialog).findByText("LKR 4,500", { selector: ".text-lg" });
  return within(dialog);
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(NOW));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("BKG-04 walk-in booking", () => {
  it("existingCustomer_isFoundByPhone_andBookedUnderTheirNameToPayLater", async () => {
    const created = mockWalkInApi(booked);
    const form = await openSevenPm();

    fireEvent.change(form.getByRole("textbox", { name: "Phone number" }), {
      target: { value: "077 000 1111" },
    });

    const name = () => form.getByRole("textbox", { name: "Name" });
    await waitFor(() => expect(name()).toHaveValue("Nimal Perera"));
    expect(name()).toHaveAttribute("readonly");
    expect(form.getByText("Already a customer")).toBeInTheDocument();
    expect(form.getByRole("radio", { name: "Pay later" })).toBeChecked();
    expect(form.getByText("Balance").nextElementSibling).toHaveTextContent("LKR 4,500");

    fireEvent.click(form.getByRole("button", { name: "Book" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(created).toEqual([
      {
        resourceId: 12,
        startsAt: AT_SEVEN_PM,
        slots: 1,
        walkIn: {
          customerName: "Nimal Perera",
          customerPhone: "077 000 1111",
          payment: "PAY_LATER",
        },
      },
    ]);
  });

  it("newCustomer_twoSlotsPaidInCash_showsTheQuotedPriceAndNoBalance", async () => {
    const created = mockWalkInApi(booked);
    const form = await openSevenPm();

    fireEvent.change(form.getByRole("textbox", { name: "Phone number" }), {
      target: { value: "077 555 1234" },
    });
    fireEvent.change(form.getByRole("textbox", { name: "Name" }), {
      target: { value: "Sunil Silva" },
    });
    const more = form.getByRole("button", { name: /increase/i });
    fireEvent.click(more);
    fireEvent.click(form.getByRole("radio", { name: "Paid in cash" }));

    expect(await form.findByText("LKR 9,500")).toBeInTheDocument();
    expect(form.getByText("Fri 25 Dec, 19:00–21:00")).toBeInTheDocument();
    expect(more).toBeDisabled();
    expect(form.getByText("Balance").nextElementSibling).toHaveTextContent("LKR 0");

    fireEvent.click(form.getByRole("button", { name: "Book" }));

    await waitFor(() => expect(created).toHaveLength(1));
    expect(created[0]).toEqual({
      resourceId: 12,
      startsAt: AT_SEVEN_PM,
      slots: 2,
      walkIn: { customerName: "Sunil Silva", customerPhone: "077 555 1234", payment: "CASH" },
    });
  });

  it("slotJustTaken_saysSoInTheFormAndKeepsItOpen", async () => {
    mockWalkInApi(() =>
      apiError(409, "tt_bkg_002", "That slot was just taken. Please pick another time"),
    );
    const form = await openSevenPm();

    fireEvent.change(form.getByRole("textbox", { name: "Phone number" }), {
      target: { value: "077 555 1234" },
    });
    fireEvent.change(form.getByRole("textbox", { name: "Name" }), {
      target: { value: "Sunil Silva" },
    });
    fireEvent.click(form.getByRole("button", { name: "Book" }));

    expect(await form.findByRole("alert")).toHaveTextContent(
      "That slot was just taken. Please pick another time",
    );
    expect(screen.getByRole("dialog", { name: "Walk-in booking" })).toBeInTheDocument();
  });
});

// Court 2 is taken at 19:00 on Fri 8 Jan, the third of the series' weeks.
const TAKEN_WEEK = "2027-01-08";

/** As the API answers (D-10): any week that isn't free refuses the whole series with its dates. */
function mockSeriesApi() {
  const sent: CreateRepeatSeries[] = [];
  mockWalkInApi(booked, "MANAGER");
  const fetch = globalThis.fetch;
  vi.stubGlobal("fetch", async (request: Request) => {
    if (request.method !== "POST" || !request.url.endsWith("/v1/repeat-series"))
      return fetch(request);
    const body = (await request.json()) as CreateRepeatSeries;
    sent.push(body);
    const clashing = [TAKEN_WEEK].filter((date) => !body.skipDates.includes(date));
    if (clashing.length > 0)
      return Response.json(
        {
          status: 409,
          code: "tt_bkg_009",
          message: `These weeks aren't free: ${clashing.join(", ")}. Skip them or pick another time`,
          traceId: "test",
          clashingDates: clashing,
        },
        { status: 409 },
      );
    return Response.json({ status: 201, message: "success", data: {} }, { status: 201 });
  });
  return sent;
}

async function askForFiveWeeks(form: ReturnType<typeof within>) {
  fireEvent.change(form.getByRole("textbox", { name: "Phone number" }), {
    target: { value: "077 000 1111" },
  });
  await waitFor(() =>
    expect(form.getByRole("textbox", { name: "Name" })).toHaveValue("Nimal Perera"),
  );
  fireEvent.click(form.getByRole("switch", { name: "Repeat every week" }));
  // The second Increase belongs to Weeks; the first to Slots.
  fireEvent.click(form.getAllByRole("button", { name: /increase/i }).at(-1)!);
  expect(form.getByText("Fri 25 Dec – Fri 22 Jan")).toBeInTheDocument();
  fireEvent.click(form.getByRole("button", { name: "Book 5 weeks" }));
}

describe("BKG-09 repeat series from the walk-in form", () => {
  it("clashingWeek_isListed_thenSkippedAndTheRestBooked", async () => {
    const sent = mockSeriesApi();
    const form = await openSevenPm();

    await askForFiveWeeks(form);

    const clashes = await form.findByRole("list", { name: "Weeks that aren't free" });
    expect(within(clashes).getAllByRole("listitem")).toHaveLength(1);
    expect(within(clashes).getByText("Friday, 8 January 2027")).toBeInTheDocument();
    expect(form.getByText("1 week isn't free")).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Walk-in booking" })).toBeInTheDocument();

    expect(form.getByText("4 of 5 weeks are free")).toBeInTheDocument();
    fireEvent.click(form.getByRole("button", { name: "Skip and book 4 weeks" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    const asked = {
      resourceId: 12,
      startsAt: AT_SEVEN_PM,
      slots: 1,
      weeks: 5,
      customerName: "Nimal Perera",
      customerPhone: "077 000 1111",
    };
    expect(sent).toEqual([
      { ...asked, skipDates: [] },
      { ...asked, skipDates: [TAKEN_WEEK] },
    ]);
  });

  it("cancelOnClashes_booksNothing_andGoesBackToTheForm", async () => {
    const sent = mockSeriesApi();
    const form = await openSevenPm();

    await askForFiveWeeks(form);
    await form.findByRole("list", { name: "Weeks that aren't free" });
    fireEvent.click(form.getByRole("button", { name: "Cancel" }));

    await waitFor(() =>
      expect(form.queryByRole("list", { name: "Weeks that aren't free" })).toBeNull(),
    );
    expect(form.getByRole("button", { name: "Book 5 weeks" })).toBeInTheDocument();
    expect(form.getByRole("textbox", { name: "Name" })).toHaveValue("Nimal Perera");
    expect(sent).toHaveLength(1);
  });

  it("repeat_isNotOfferedToFrontDesk", async () => {
    mockWalkInApi(booked);
    const form = await openSevenPm();

    expect(form.getByRole("textbox", { name: "Phone number" })).toBeInTheDocument();
    expect(form.queryByRole("switch", { name: "Repeat every week" })).toBeNull();
  });
});
