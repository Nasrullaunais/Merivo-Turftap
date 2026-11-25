import type { CheckIn, Membership } from "@turftap/contract/client";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { signInForTesting } from "../../lib/auth/session";
import { apiError, mockApi } from "../../test/mockApi";
import { renderApp } from "../../test/renderApp";
import { myTenant } from "../../test/tenants";

const PHONE = "+94771234567";
// 08:30 on Wednesday 20 Jan 2027 in Colombo.
const NOW = "2027-01-20T03:00:00.000Z";
const TODAY = "2027-01-20";

const ok = (data: unknown, status = 200) =>
  Response.json({ status, message: "success", data }, { status });
const page = (content: object[]) => ({
  content,
  page: 0,
  size: 100,
  totalElements: content.length,
  totalPages: 1,
});
const lkr = (rupees: number) => ({ amount: rupees * 100, currency: "LKR" as const });
const times = { createdAt: "2027-01-15T04:00:00.000Z", updatedAt: "2027-01-15T04:00:00.000Z" };
const gym = {
  id: 4,
  name: "Kandy Fitness",
  description: null,
  address: "5 Peradeniya Road, Kandy",
  phone: "+94812345678",
  timeZone: "Asia/Colombo",
  bankAccount: null,
  advancePercent: 100,
  paymentTimeLimitMinutes: 30,
  cancellationCutOffHours: 6,
  payAtVenue: false,
  seriesPaymentDaysBefore: 2,
  hasGym: true,
  repeatCheckIns: true,
  openingHours: [],
  active: true,
  ...times,
};
const saman = { id: 51, name: "Saman Perera", phone: "+94770001111", ...times };
const nimali = { id: 52, name: "Nimali Silva", phone: "+94770002222", ...times };

const membership = (fields: Partial<Membership> & Pick<Membership, "id">): Membership => ({
  venueId: 4,
  planId: 21,
  planName: "Gym monthly",
  customerId: saman.id,
  customerName: saman.name,
  customerPhone: saman.phone,
  startsOn: "2027-01-15",
  endsOn: "2027-02-14",
  status: "ACTIVE",
  price: lkr(5_000),
  amountDue: lkr(0),
  paid: lkr(5_000),
  balance: lkr(0),
  expiresAt: null,
  cancelReason: null,
  bankAccount: null,
  ...times,
  ...fields,
});

const paidUp = membership({ id: 71 });

const checkInOf = (fields: Partial<CheckIn> & Pick<CheckIn, "id">): CheckIn => ({
  venueId: 4,
  membershipId: paidUp.id,
  planName: paidUp.planName,
  customerId: saman.id,
  customerName: saman.name,
  customerPhone: saman.phone,
  checkedInOn: TODAY,
  checkedInAt: NOW,
  createdBy: 1,
  ...fields,
});

type Setup = {
  memberships: Membership[];
  checkIns?: CheckIn[];
  venue?: Partial<typeof gym>;
  checkIn?: () => Response | undefined;
};

/** The API as the desk uses it, keeping what was created so the lists refetch with it. */
function mockDeskApi({ memberships, checkIns = [], venue = {}, checkIn = () => undefined }: Setup) {
  const sent = { checkIns: [] as unknown[], payments: [] as unknown[], undone: [] as number[] };
  const routes: Record<string, unknown> = {
    "GET /v1/me": {
      id: 1,
      phone: PHONE,
      name: "Desk",
      isPlatformAdmin: false,
      tenants: [myTenant({ id: 1, slug: "demo", name: "Demo Sports", role: "FRONT_DESK" })],
    },
    "GET /v1/events": () => new Response(new ReadableStream(), { status: 200 }),
    "GET /v1/payments": page([]),
    "GET /v1/venues": page([{ ...gym, ...venue }]),
    "GET /v1/customers": (request: Request) => {
      const search = new URL(request.url).searchParams.get("search") ?? "";
      const digits = search.replace(/\D/g, "").replace(/^0/, "");
      return ok(
        page(
          [saman, nimali].filter(
            (customer) =>
              customer.name.toLowerCase().includes(search.toLowerCase()) ||
              (digits.length > 0 && customer.phone.includes(digits)),
          ),
        ),
      );
    },
    "GET /v1/memberships": (request: Request) => {
      const customerId = new URL(request.url).searchParams.get("customerId");
      return ok(page(memberships.filter((each) => String(each.customerId) === customerId)));
    },
    "GET /v1/check-ins": () => ok(page([...checkIns].reverse())),
    "POST /v1/check-ins": async (request: Request) => {
      const body = (await request.json()) as { membershipId: number };
      sent.checkIns.push(body);
      const refused = checkIn();
      if (refused) return refused;
      const made = checkInOf({ id: 90 + checkIns.length, membershipId: body.membershipId });
      checkIns.push(made);
      return ok(made, 201);
    },
    "POST /v1/payments": async (request: Request) => {
      const body = (await request.json()) as { membershipId: number };
      sent.payments.push(body);
      const owed = memberships.find((each) => each.id === body.membershipId)!;
      Object.assign(owed, { paid: owed.price, balance: lkr(0) });
      return ok({ id: 300 }, 201);
    },
  };
  for (const made of checkIns)
    routes[`DELETE /v1/check-ins/${made.id}`] = () => {
      sent.undone.push(made.id);
      checkIns.splice(checkIns.indexOf(made), 1);
      return ok(null);
    };
  mockApi(routes);
  signInForTesting(PHONE);
  return sent;
}

const searchBox = () => screen.findByRole("searchbox", { name: "Phone or name" });

async function findCustomer(typed: string) {
  renderApp("/check-ins");
  fireEvent.change(await searchBox(), { target: { value: typed } });
  return within(await screen.findByRole("list", { name: "Saman Perera's memberships" }));
}

const today = () => within(screen.getByRole("list", { name: "Today" }));

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(NOW));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("MEM-05 check-ins at the desk", () => {
  it("noVenueWithAGym_saysHowToTurnOneOn", async () => {
    mockDeskApi({ memberships: [], venue: { hasGym: false } });
    renderApp("/check-ins");

    expect(await screen.findByText(/No venue has a gym yet/)).toBeInTheDocument();
    expect(screen.queryByRole("searchbox")).toBeNull();
  });

  it("search_aWholePhoneNumberOpensTheCustomer_andCheckInAddsThemToToday", async () => {
    const sent = mockDeskApi({ memberships: [paidUp] });

    const card = await findCustomer("077 000 1111");
    fireEvent.click(card.getByRole("button", { name: "Check in" }));

    expect(await card.findByText("In at 08:30")).toBeInTheDocument();
    expect(sent.checkIns).toEqual([{ membershipId: paidUp.id }]);
    await waitFor(() => expect(today().getByText("Saman Perera")).toBeInTheDocument());
    expect(today().getByText("Gym monthly")).toBeInTheDocument();
  });

  it("search_partOfANumberListsMatches_andPickingOneOpensThem", async () => {
    mockDeskApi({ memberships: [paidUp] });
    renderApp("/check-ins");

    fireEvent.change(await searchBox(), { target: { value: "0770" } });
    const matches = within(await screen.findByRole("list", { name: "Customers found" }));
    fireEvent.click(matches.getByRole("button", { name: /Saman Perera/ }));

    expect(
      await screen.findByRole("list", { name: "Saman Perera's memberships" }),
    ).toBeInTheDocument();
  });

  it("refusal_notPaidYet_showsWhyAndNoCheckInButton", async () => {
    mockDeskApi({
      memberships: [
        membership({ id: 72, status: "AWAITING_CHECK", paid: lkr(0), balance: lkr(5_000) }),
      ],
    });

    const card = await findCustomer("077 000 1111");

    expect(card.getByText("Not paid yet")).toBeInTheDocument();
    expect(card.getByRole("link", { name: "Receipt waiting for a check" })).toBeInTheDocument();
    expect(card.queryByRole("button", { name: "Check in" })).toBeNull();
  });

  it("refusal_endedAndNotStarted_sayWhen", async () => {
    mockDeskApi({
      memberships: [
        membership({ id: 73, startsOn: "2026-12-01", endsOn: "2026-12-31", status: "ENDED" }),
        membership({ id: 74, planId: 22, planName: "10-day pass", startsOn: "2027-01-25" }),
      ],
    });

    const card = await findCustomer("077 000 1111");

    expect(card.getByText("Not started yet")).toBeInTheDocument();
    expect(card.getByText("Starts Mon 25 Jan")).toBeInTheDocument();
    // Only the current one shows; the ended one would explain nothing more.
    expect(card.queryByText("Ended")).toBeNull();
  });

  it("refusal_balanceOwed_takeCashThenCheckIn", async () => {
    const owing = membership({ id: 75, paid: lkr(3_000), balance: lkr(2_000) });
    const sent = mockDeskApi({ memberships: [owing] });

    const card = await findCustomer("077 000 1111");
    expect(card.getByText("Owes LKR 2,000")).toBeInTheDocument();
    expect(card.queryByRole("button", { name: "Check in" })).toBeNull();

    fireEvent.click(card.getByRole("button", { name: "Take cash" }));
    expect(card.getByRole("spinbutton", { name: "Amount (LKR)" })).toHaveValue(2_000);
    fireEvent.click(card.getByRole("button", { name: "Record cash" }));

    fireEvent.click(await card.findByRole("button", { name: "Check in" }));
    expect(sent.payments).toEqual([
      { kind: "CASH", membershipId: owing.id, amount: lkr(2_000), note: null },
    ]);
    expect(await card.findByText("In at 08:30")).toBeInTheDocument();
  });

  it("checkIn_refusedByTheApi_showsItsMessage", async () => {
    mockDeskApi({
      memberships: [paidUp],
      checkIn: () =>
        apiError(
          409,
          "tt_mem_016",
          "Already checked in today at 07:10. This venue allows one a day",
        ),
    });

    const card = await findCustomer("077 000 1111");
    fireEvent.click(card.getByRole("button", { name: "Check in" }));

    expect(await card.findByRole("alert")).toHaveTextContent("Already checked in today at 07:10");
  });

  it("onceADay_alreadyInToday_showsWhenInsteadOfTheButton", async () => {
    mockDeskApi({
      memberships: [paidUp],
      venue: { repeatCheckIns: false },
      checkIns: [checkInOf({ id: 81, checkedInAt: "2027-01-20T01:40:00.000Z" })],
    });

    const card = await findCustomer("077 000 1111");

    expect(await card.findByText("In today at 07:10")).toBeInTheDocument();
    expect(card.queryByRole("button", { name: "Check in" })).toBeNull();
  });

  it("undo_removesARecentCheckInFromToday", async () => {
    const sent = mockDeskApi({ memberships: [paidUp], checkIns: [checkInOf({ id: 82 })] });
    renderApp("/check-ins");

    fireEvent.click(await screen.findByRole("button", { name: "Undo Saman Perera's check-in" }));

    await waitFor(() => expect(sent.undone).toEqual([82]));
    expect(await screen.findByText("No check-ins yet today.")).toBeInTheDocument();
  });

  it("undo_isGoneOnceItsTimeHasPassed", async () => {
    mockDeskApi({
      memberships: [paidUp],
      checkIns: [checkInOf({ id: 83, checkedInAt: "2027-01-20T02:50:00.000Z" })],
    });
    renderApp("/check-ins");

    expect(await screen.findByText("08:20")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Undo/ })).toBeNull();
  });
});
