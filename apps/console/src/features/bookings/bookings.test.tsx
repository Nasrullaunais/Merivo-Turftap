import type { RecordPayment, StaffRole } from "@turftap/contract";
import type { Booking, Payment } from "@turftap/contract/client";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { signInForTesting } from "../../lib/auth/session";
import { apiError, mockApi } from "../../test/mockApi";
import { renderApp } from "../../test/renderApp";
import { myTenant } from "../../test/tenants";

const PHONE = "+94771234567";
// 08:30 on Friday 25 Dec 2026 in Colombo; the tests run in a New York browser.
const NOW = "2026-12-25T03:00:00.000Z";

const ok = (data: unknown, status = 200) =>
  Response.json({ status, message: "success", data }, { status });
const page = (content: object[]) => ({
  content,
  page: 0,
  size: 100,
  totalElements: content.length,
  totalPages: 1,
});
const times = { createdAt: "2026-11-22T04:00:00.000Z", updatedAt: "2026-11-22T04:00:00.000Z" };
const lkr = (rupees: number) => ({ amount: rupees * 100, currency: "LKR" as const });
const arena = {
  id: 3,
  name: "City Arena",
  description: null,
  address: "12 Galle Road, Colombo",
  phone: "+94112345678",
  timeZone: "Asia/Colombo",
  bankAccount: null,
  advancePercent: 50,
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

/** Nimal booked 19:00–20:00 online and paid the 2,250 Advance by transfer; 2,250 is still to pay. */
const nimalsBooking: Booking = {
  id: 21,
  venueId: 3,
  resourceId: 12,
  customerId: 7,
  customerName: "Nimal Perera",
  customerPhone: "+94770001111",
  repeatSeriesId: null,
  startsAt: "2026-12-25T13:30:00.000Z",
  endsAt: "2026-12-25T14:30:00.000Z",
  status: "CONFIRMED",
  source: "ONLINE",
  price: lkr(4_500),
  amountDue: lkr(2_250),
  paid: lkr(2_250),
  balance: lkr(2_250),
  expiresAt: null,
  cancellationCutOffHours: 6,
  cancelReason: null,
  bankAccount: null,
  ...times,
};
const transfer: Payment = {
  id: 31,
  bookingId: 21,
  venueId: 3,
  kind: "TRANSFER",
  status: "ACCEPTED",
  amount: lkr(2_250),
  note: null,
  rejectReason: null,
  receiptUrl: null,
  receiptReading: null,
  createdBy: null,
  ...times,
};

type Fake = {
  patches: unknown[];
  posts: unknown[];
  calendarFetches: () => number;
};

/**
 * Works out paid and Balance the way the API does: accepted payments added up, and no Balance
 * once cancelled. `refuse` answers a payment instead of saving it.
 */
function mockBookingApi(role: StaffRole, refuse?: () => Response): Fake {
  let booking = { ...nimalsBooking };
  const payments = [transfer];
  let calendarFetches = 0;
  const fake: Fake = { patches: [], posts: [], calendarFetches: () => calendarFetches };
  const settle = () => {
    const paid = payments.reduce((sum, payment) => sum + payment.amount.amount, 0);
    const owed = booking.status === "CANCELLED" ? 0 : booking.price.amount - paid;
    booking = {
      ...booking,
      paid: { ...booking.paid, amount: paid },
      balance: { ...booking.balance, amount: owed },
    };
  };

  mockApi({
    "GET /v1/me": {
      id: 1,
      phone: PHONE,
      name: "Staff",
      isPlatformAdmin: false,
      tenants: [myTenant({ id: 1, slug: "demo", name: "Demo Sports", role })],
    },
    "GET /v1/venues": page([arena]),
    "GET /v1/resources": page([court]),
    "GET /v1/blocked-times": page([]),
    "GET /v1/closed-dates": page([]),
    "GET /v1/events": () => new Response(new ReadableStream(), { status: 200 }),
    "GET /v1/bookings": () => {
      calendarFetches++;
      return ok(page(booking.status === "CANCELLED" ? [] : [booking]));
    },
    "GET /v1/bookings/21": () => ok(booking),
    "PATCH /v1/bookings/21": async (request: Request) => {
      const body = (await request.json()) as { cancelReason: string };
      fake.patches.push(body);
      booking = { ...booking, status: "CANCELLED", cancelReason: body.cancelReason };
      settle();
      return ok(booking);
    },
    "GET /v1/payments": () => ok(page(payments)),
    "POST /v1/payments": async (request: Request) => {
      const body = (await request.json()) as RecordPayment;
      fake.posts.push(body);
      if (refuse) return refuse();
      const sign = body.kind === "REFUND" ? -1 : 1;
      const payment: Payment = {
        ...transfer,
        id: 30 + payments.length + 1,
        kind: body.kind,
        amount: { ...body.amount, amount: sign * body.amount.amount },
        note: body.note,
        createdAt: NOW,
      };
      payments.push(payment);
      settle();
      return ok(payment, 201);
    },
  });
  signInForTesting(PHONE);
  return fake;
}

async function openNimalsBooking() {
  renderApp("/calendar");
  fireEvent.click(await screen.findByRole("button", { name: /Nimal Perera/ }));
  const dialog = await screen.findByRole("dialog", { name: "Nimal Perera" });
  await within(dialog).findByText("Bank transfer");
  return within(dialog);
}

const amountOf = (details: ReturnType<typeof within>, label: string) =>
  details.getByText(label, { selector: "dt" }).nextElementSibling;

async function cancelWith(details: ReturnType<typeof within>, reason: string) {
  fireEvent.click(details.getByRole("button", { name: "Cancel booking", expanded: false }));
  await giveReason(details, reason);
}

async function giveReason(details: ReturnType<typeof within>, reason: string) {
  fireEvent.change(details.getByRole("textbox", { name: "Reason" }), {
    target: { value: reason },
  });
  const buttons = details.getAllByRole("button", { name: "Cancel booking" });
  fireEvent.click(buttons.at(-1)!);
  await details.findByText("Cancelled");
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(NOW));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("BKG-07, PAY-08, BKG-08 booking details", () => {
  it("details_showWhoWhenMoneyAndPayments", async () => {
    mockBookingApi("FRONT_DESK");
    const details = await openNimalsBooking();

    expect(details.getByText("Court 2")).toBeInTheDocument();
    expect(details.getByText("Fri 25 Dec, 19:00–20:00")).toBeInTheDocument();
    expect(details.getByText("Confirmed")).toBeInTheDocument();
    expect(details.getByText("+94770001111")).toBeInTheDocument();
    expect(amountOf(details, "Price")).toHaveTextContent("LKR 4,500");
    expect(amountOf(details, "Paid")).toHaveTextContent("LKR 2,250");
    expect(amountOf(details, "Balance")).toHaveTextContent("LKR 2,250");
  });

  it("cancel_needsAReason_thenShowsCancelled_andTheCalendarRefetches", async () => {
    const fake = mockBookingApi("FRONT_DESK");
    const details = await openNimalsBooking();

    fireEvent.click(details.getByRole("button", { name: "Cancel booking", expanded: false }));
    const buttons = details.getAllByRole("button", { name: "Cancel booking" });
    fireEvent.click(buttons.at(-1)!);
    await waitFor(() =>
      expect(details.getByRole("textbox", { name: "Reason" })).toHaveAttribute(
        "aria-invalid",
        "true",
      ),
    );
    expect(fake.patches).toEqual([]);

    const fetchesBefore = fake.calendarFetches();
    await giveReason(details, "Pitch flooded");

    expect(fake.patches).toEqual([{ status: "CANCELLED", cancelReason: "Pitch flooded" }]);
    expect(details.getByText("Pitch flooded")).toBeInTheDocument();
    expect(amountOf(details, "Balance")).toHaveTextContent("LKR 0");
    await waitFor(() => expect(fake.calendarFetches()).toBeGreaterThan(fetchesBefore));
    await waitFor(() => expect(screen.queryByRole("button", { name: /Nimal Perera/ })).toBeNull());
  });

  it("cash_startsAtTheBalance_andLeavesNothingToPay", async () => {
    const fake = mockBookingApi("FRONT_DESK");
    const details = await openNimalsBooking();

    fireEvent.click(details.getByRole("button", { name: "Record cash", expanded: false }));
    expect(details.getByRole("spinbutton", { name: "Amount (LKR)" })).toHaveValue(2_250);
    const buttons = details.getAllByRole("button", { name: "Record cash" });
    fireEvent.click(buttons.at(-1)!);

    await waitFor(() => expect(amountOf(details, "Balance")).toHaveTextContent("LKR 0"));
    expect(fake.posts).toEqual([{ bookingId: 21, kind: "CASH", amount: lkr(2_250), note: null }]);
    expect(amountOf(details, "Paid")).toHaveTextContent("LKR 4,500");
    expect(details.getByText("Cash")).toBeInTheDocument();
    expect(details.queryByRole("button", { name: "Record cash" })).toBeNull();
  });

  it("cash_moreThanTheBalance_showsWhyItWasRefused", async () => {
    mockBookingApi("FRONT_DESK", () =>
      apiError(409, "tt_pay_004", "That is more than the balance left on this booking"),
    );
    const details = await openNimalsBooking();

    fireEvent.click(details.getByRole("button", { name: "Record cash", expanded: false }));
    fireEvent.change(details.getByRole("spinbutton", { name: "Amount (LKR)" }), {
      target: { value: "3000" },
    });
    fireEvent.click(details.getAllByRole("button", { name: "Record cash" }).at(-1)!);

    expect(await details.findByRole("alert")).toHaveTextContent(
      "That is more than the balance left on this booking",
    );
    expect(amountOf(details, "Balance")).toHaveTextContent("LKR 2,250");
  });

  it("refund_managerRecordsAmountAndNote_onTheCancelledBooking", async () => {
    const fake = mockBookingApi("MANAGER");
    const details = await openNimalsBooking();
    expect(details.queryByRole("button", { name: "Record refund" })).toBeNull();

    await cancelWith(details, "Pitch flooded");
    fireEvent.click(await details.findByRole("button", { name: "Record refund", expanded: false }));
    expect(details.getByRole("spinbutton", { name: "Amount (LKR)" })).toHaveValue(2_250);
    fireEvent.change(details.getByRole("textbox", { name: "Note" }), {
      target: { value: "Sent back to BOC account" },
    });
    fireEvent.click(details.getAllByRole("button", { name: "Record refund" }).at(-1)!);

    await waitFor(() => expect(amountOf(details, "Paid")).toHaveTextContent("LKR 0"));
    expect(fake.posts).toEqual([
      { bookingId: 21, kind: "REFUND", amount: lkr(2_250), note: "Sent back to BOC account" },
    ]);
    expect(details.getByText("Sent back to BOC account")).toBeInTheDocument();
    expect(details.getByText("-LKR 2,250")).toBeInTheDocument();
  });

  it("refund_isNotOfferedToFrontDesk", async () => {
    mockBookingApi("FRONT_DESK");
    const details = await openNimalsBooking();

    await cancelWith(details, "Pitch flooded");

    expect(amountOf(details, "Paid")).toHaveTextContent("LKR 2,250");
    expect(details.queryByRole("button", { name: "Record refund" })).toBeNull();
  });
});
