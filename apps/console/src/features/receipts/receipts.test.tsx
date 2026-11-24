import type { Booking, Payment, ReceiptReading } from "@turftap/contract/client";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { signInForTesting } from "../../lib/auth/session";
import { apiError, mockApi } from "../../test/mockApi";
import { renderApp } from "../../test/renderApp";
import { myTenant } from "../../test/tenants";

const PHONE = "+94771234567";
// 08:30 on Friday 25 Dec 2026 in Colombo.
const NOW = "2026-12-25T03:00:00.000Z";

const ok = (data: unknown, status = 200) =>
  Response.json({ status, message: "success", data }, { status });
const lkr = (rupees: number) => ({ amount: rupees * 100, currency: "LKR" as const });
const times = { createdAt: "2026-11-22T04:00:00.000Z", updatedAt: "2026-11-22T04:00:00.000Z" };
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

const bookingFor = (id: number, customerName: string, status: Booking["status"]): Booking => ({
  id,
  venueId: 3,
  resourceId: 12,
  customerId: id,
  customerName,
  customerPhone: "+94770001111",
  repeatSeriesId: null,
  startsAt: "2026-12-25T13:30:00.000Z",
  endsAt: "2026-12-25T14:30:00.000Z",
  status,
  source: "ONLINE",
  price: lkr(4_500),
  amountDue: lkr(2_250),
  paid: lkr(0),
  balance: lkr(4_500),
  expiresAt: null,
  cancellationCutOffHours: 6,
  cancelReason: null,
  bankAccount: null,
  ...times,
});

const readWell: ReceiptReading = {
  unreadable: false,
  amount: lkr(2_250),
  paidOn: "2026-12-25",
  bank: "Bank of Ceylon",
  reference: "FT0042",
  amountMatches: true,
  dateRecent: true,
  referenceNew: true,
  duplicateOf: null,
};

const transfer = (
  id: number,
  bookingId: number,
  createdAt: string,
  receiptReading: ReceiptReading | null = readWell,
): Payment => ({
  id,
  bookingId,
  venueId: 3,
  kind: "TRANSFER",
  status: "PENDING_CHECK",
  amount: lkr(2_250),
  note: null,
  rejectReason: null,
  receiptUrl: `http://storage.local/1/receipts/${id}.jpg?sig=abc`,
  receiptReading,
  createdBy: null,
  createdAt,
  updatedAt: createdAt,
});

type Fake = { patches: { id: number; body: unknown }[] };

/**
 * Lists payments the way the API does: filtered by status and booking, sorted by `sort` (newest first when
 * none is given), cut to `size`, with the full count. `checkedMeanwhile` payments refuse a check.
 */
function mockReceiptApi(payments: Payment[], { checkedMeanwhile = [] as number[] } = {}): Fake {
  const fake: Fake = { patches: [] };
  const bookings = new Map(
    [
      bookingFor(21, "Nimal Perera", "AWAITING_CHECK"),
      bookingFor(22, "Kamal Silva", "AWAITING_CHECK"),
      bookingFor(23, "Sunil Fernando", "AWAITING_CHECK"),
      bookingFor(9, "Ruwan Jayasuriya", "CONFIRMED"),
    ].map((booking) => [booking.id, booking]),
  );

  mockApi({
    "GET /v1/me": {
      id: 1,
      phone: PHONE,
      name: "Staff",
      isPlatformAdmin: false,
      tenants: [myTenant({ id: 1, slug: "demo", name: "Demo Sports", role: "FRONT_DESK" })],
    },
    "GET /v1/events": () => new Response(new ReadableStream(), { status: 200 }),
    "GET /v1/venues/3": arena,
    "GET /v1/resources/12": court,
    "GET /v1/payments": (request: Request) => {
      const query = new URL(request.url).searchParams;
      const ascending = query.get("sort") === "createdAt,asc";
      const status = query.get("status");
      const bookingId = query.get("bookingId");
      const size = Number(query.get("size") ?? 20);
      const matching = payments
        .filter((payment) => !status || payment.status === status)
        .filter((payment) => !bookingId || payment.bookingId === Number(bookingId))
        .sort((a, b) => (ascending ? 1 : -1) * a.createdAt.localeCompare(b.createdAt));
      return ok({
        content: matching.slice(0, size),
        page: 0,
        size,
        totalElements: matching.length,
        totalPages: Math.ceil(matching.length / size),
      });
    },
    ...Object.fromEntries(
      [...bookings.keys()].map((id) => [`GET /v1/bookings/${id}`, () => ok(bookings.get(id))]),
    ),
    ...Object.fromEntries(
      payments.map((payment) => [
        `PATCH /v1/payments/${payment.id}`,
        async (request: Request) => {
          const body = (await request.json()) as { status: Payment["status"] };
          fake.patches.push({ id: payment.id, body });
          if (checkedMeanwhile.includes(payment.id)) {
            payment.status = "ACCEPTED";
            return apiError(
              409,
              "tt_sts_002",
              "This was changed by someone else. Reload and try again.",
            );
          }
          payment.status = body.status;
          return ok(payment);
        },
      ]),
    ),
  });
  signInForTesting(PHONE);
  return fake;
}

const OLDEST = "2026-12-25T02:00:00.000Z";
const MIDDLE = "2026-12-25T02:30:00.000Z";
const NEWEST = "2026-12-25T02:50:00.000Z";

async function openQueue() {
  renderApp("/receipt-checks");
  const check = await screen.findByRole("article", { name: "Transfer Receipt" });
  return within(check);
}

const waitingRows = () =>
  within(screen.getByRole("list", { name: "Waiting for a check" })).getAllByRole("listitem");

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(NOW));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("PAY-03 to PAY-07 receipt checks", () => {
  it("queue_listsOldestFirst_andOpensTheOldest", async () => {
    mockReceiptApi([transfer(31, 21, MIDDLE), transfer(32, 22, NEWEST), transfer(33, 23, OLDEST)]);
    const check = await openQueue();

    expect(await check.findByRole("heading", { name: "Sunil Fernando" })).toBeInTheDocument();
    await waitFor(() =>
      expect(waitingRows().map((row) => row.textContent)).toEqual([
        expect.stringContaining("Sunil Fernando"),
        expect.stringContaining("Nimal Perera"),
        expect.stringContaining("Kamal Silva"),
      ]),
    );
    expect(waitingRows()[0]).toHaveTextContent("Waiting 1 h");
  });

  it("sidebar_showsHowManyWait_andDropsAfterAnAccept", async () => {
    const fake = mockReceiptApi([transfer(31, 21, OLDEST), transfer(32, 22, NEWEST)]);
    const check = await openQueue();
    const nav = screen.getByRole("link", { name: /Receipt checks/ });
    await waitFor(() => expect(within(nav).getByLabelText("2 waiting")).toBeInTheDocument());

    fireEvent.click(check.getByRole("button", { name: "Accept" }));

    await waitFor(() => expect(within(nav).getByLabelText("1 waiting")).toBeInTheDocument());
    expect(fake.patches).toEqual([{ id: 31, body: { status: "ACCEPTED" } }]);
    expect(
      await screen.findByRole("heading", { name: "Kamal Silva", level: 2 }),
    ).toBeInTheDocument();
  });

  it("check_showsAmountsAndWhatTheAiRead", async () => {
    mockReceiptApi([transfer(31, 21, OLDEST)]);
    const check = await openQueue();

    expect(check.getByRole("img", { name: "Transfer Receipt" })).toHaveAttribute(
      "src",
      "http://storage.local/1/receipts/31.jpg?sig=abc",
    );
    expect(check.getByText("Amount due").nextElementSibling).toHaveTextContent("LKR 2,250");
    expect(check.getByText("Amount read").nextElementSibling).toHaveTextContent("LKR 2,250");
    expect(check.getByText("Fri, 25 Dec 2026")).toBeInTheDocument();
    expect(check.getByText("Bank of Ceylon")).toBeInTheDocument();
    expect(check.getByText("FT0042")).toBeInTheDocument();
    expect(check.getByText("Matches the amount due")).toBeInTheDocument();
    expect(check.getByText("New reference")).toBeInTheDocument();
    expect(await check.findByText("Court 2")).toBeInTheDocument();
  });

  it("check_unreadable_saysSo", async () => {
    const unreadable: ReceiptReading = {
      ...readWell,
      unreadable: true,
      amount: null,
      paidOn: null,
      bank: null,
      reference: null,
      amountMatches: null,
      dateRecent: null,
      referenceNew: null,
    };
    mockReceiptApi([transfer(31, 21, OLDEST, unreadable)]);
    const check = await openQueue();

    expect(check.getByText("Couldn't read this receipt")).toBeInTheDocument();
    expect(check.queryByText("Matches the amount due")).toBeNull();
  });

  it("check_reusedReceipt_warnsAndOpensTheEarlierBooking", async () => {
    const reused: ReceiptReading = {
      ...readWell,
      referenceNew: false,
      duplicateOf: { paymentId: 7, bookingId: 9 },
    };
    mockReceiptApi([transfer(31, 21, OLDEST, reused)]);
    const check = await openQueue();

    expect(check.getByText("This receipt was used before")).toBeInTheDocument();
    expect(check.getByText("Reference used before")).toBeInTheDocument();
    fireEvent.click(check.getByRole("button", { name: "Open the earlier booking" }));

    const earlier = within(await screen.findByRole("dialog", { name: "Earlier booking" }));
    expect(await earlier.findByText("Ruwan Jayasuriya", { exact: false })).toBeInTheDocument();
    expect(earlier.getByText("Confirmed")).toBeInTheDocument();
  });

  it("reject_needsAReason_thenTheNextReceiptComesUp", async () => {
    const fake = mockReceiptApi([transfer(31, 21, OLDEST), transfer(32, 22, NEWEST)]);
    const check = await openQueue();
    await check.findByRole("heading", { name: "Nimal Perera" });

    fireEvent.click(check.getByRole("button", { name: "Reject", expanded: false }));
    fireEvent.click(check.getByRole("button", { name: "Reject receipt" }));
    await waitFor(() =>
      expect(check.getByRole("textbox", { name: "Reason" })).toHaveAttribute(
        "aria-invalid",
        "true",
      ),
    );
    expect(fake.patches).toEqual([]);

    fireEvent.change(check.getByRole("textbox", { name: "Reason" }), {
      target: { value: "The amount is wrong" },
    });
    fireEvent.click(check.getByRole("button", { name: "Reject receipt" }));

    expect(
      await screen.findByRole("heading", { name: "Kamal Silva", level: 2 }),
    ).toBeInTheDocument();
    expect(fake.patches).toEqual([
      { id: 31, body: { status: "REJECTED", rejectReason: "The amount is wrong" } },
    ]);
  });

  it("accept_checkedMeanwhile_saysSo_andMovesOn", async () => {
    mockReceiptApi([transfer(31, 21, OLDEST), transfer(32, 22, NEWEST)], {
      checkedMeanwhile: [31],
    });
    const check = await openQueue();
    await check.findByRole("heading", { name: "Nimal Perera" });

    fireEvent.click(check.getByRole("button", { name: "Accept" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("changed by someone else");
    expect(
      await screen.findByRole("heading", { name: "Kamal Silva", level: 2 }),
    ).toBeInTheDocument();
  });

  it("queue_empty_saysNothingWaits", async () => {
    mockReceiptApi([]);
    renderApp("/receipt-checks");

    expect(await screen.findByText("No receipts waiting.")).toBeInTheDocument();
    expect(screen.queryByLabelText(/waiting$/)).toBeNull();
  });
});
