import type { Membership, MembershipPlan } from "@turftap/contract/client";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { signInForTesting } from "../../lib/auth/session";
import { apiError, mockApi } from "../../test/mockApi";
import { renderApp } from "../../test/renderApp";
import { myTenant } from "../../test/tenants";

const PHONE = "+94771234567";
// 08:30 on Wednesday 20 Jan 2027 in Colombo.
const NOW = "2027-01-20T03:00:00.000Z";

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
  openingHours: [],
  active: true,
  ...times,
};
const monthly: MembershipPlan = {
  id: 21,
  venueId: 4,
  name: "Gym monthly",
  lengthCount: 1,
  lengthUnit: "MONTHS",
  price: lkr(5_000),
  active: true,
  ...times,
};
const tenDays: MembershipPlan = {
  ...monthly,
  id: 22,
  name: "10-day pass",
  lengthCount: 10,
  lengthUnit: "DAYS",
  price: lkr(2_000),
};

const membership = (fields: Partial<Membership> & Pick<Membership, "id">): Membership => ({
  venueId: 4,
  planId: 21,
  planName: "Gym monthly",
  customerId: fields.id,
  customerName: "Saman Perera",
  customerPhone: "+94770001111",
  startsOn: "2027-01-15",
  endsOn: "2027-02-14",
  status: "ACTIVE",
  price: lkr(5_000),
  amountDue: lkr(0),
  paid: lkr(0),
  balance: lkr(5_000),
  expiresAt: null,
  cancelReason: null,
  bankAccount: null,
  ...times,
  ...fields,
});

const saman = membership({ id: 51 });
const nimali = membership({
  id: 52,
  customerName: "Nimali Silva",
  customerPhone: "+94770002222",
  startsOn: "2027-01-21",
  endsOn: "2027-01-30",
  planId: 22,
  planName: "10-day pass",
  status: "AWAITING_CHECK",
  amountDue: lkr(2_000),
  price: lkr(2_000),
  balance: lkr(2_000),
});
const ruwan = membership({
  id: 53,
  customerName: "Ruwan Fernando",
  customerPhone: "+94770003333",
  startsOn: "2026-12-01",
  endsOn: "2026-12-31",
  status: "ENDED",
  paid: lkr(5_000),
  balance: lkr(0),
});

type Fake = { sold: unknown[] };

/** Lists memberships as the API does: by customer, plan and status when asked. */
function mockMembershipApi(
  memberships: Membership[],
  { sell = (): Response | undefined => undefined } = {},
) {
  const fake: Fake = { sold: [] };
  const customers = [{ id: 51, name: "Saman Perera", phone: "+94770001111", ...times }];
  mockApi({
    "GET /v1/me": {
      id: 1,
      phone: PHONE,
      name: "Desk",
      isPlatformAdmin: false,
      tenants: [myTenant({ id: 1, slug: "demo", name: "Demo Sports", role: "FRONT_DESK" })],
    },
    "GET /v1/events": () => new Response(new ReadableStream(), { status: 200 }),
    "GET /v1/payments": page([]),
    "GET /v1/venues": page([gym]),
    "GET /v1/membership-plans": page([monthly, tenDays]),
    "GET /v1/customers": (request: Request) => {
      const phone = new URL(request.url).searchParams.get("phone");
      return ok(page(customers.filter((customer) => customer.phone === phone)));
    },
    "GET /v1/memberships": (request: Request) => {
      const query = new URL(request.url).searchParams;
      const is = (field: "customerId" | "planId" | "status", value: unknown) =>
        !query.has(field) || String(value) === query.get(field);
      return ok(
        page(
          memberships.filter(
            (each) =>
              is("customerId", each.customerId) &&
              is("planId", each.planId) &&
              is("status", each.status),
          ),
        ),
      );
    },
    "POST /v1/memberships": async (request: Request) => {
      const body = (await request.json()) as { planId: number; startsOn: string };
      fake.sold.push(body);
      const refused = sell();
      if (refused) return refused;
      const plan = body.planId === tenDays.id ? tenDays : monthly;
      const sold = membership({
        id: 60,
        customerName: "Kasun Jayawardena",
        customerPhone: "+94771112222",
        planId: plan.id,
        planName: plan.name,
        startsOn: "2027-01-20",
        endsOn: "2027-01-29",
        price: plan.price,
        paid: plan.price,
        balance: lkr(0),
      });
      memberships.push(sold);
      return ok(sold, 201);
    },
  });
  signInForTesting(PHONE);
  return fake;
}

const card = (name: string) => screen.findByRole("article", { name });

async function openSellForm() {
  renderApp("/memberships");
  await card("Saman Perera");
  fireEvent.click(screen.getByRole("button", { name: "Sell a membership" }));
  return within(await screen.findByRole("dialog", { name: "Sell a membership" }));
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(NOW));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("MEM-03 memberships in the console", () => {
  it("list_showsEachMembershipsPlanDatesStateAndWhatIsOwed", async () => {
    mockMembershipApi([saman, nimali, ruwan]);
    renderApp("/memberships");

    const active = within(await card("Saman Perera"));
    expect(active.getByText("Gym monthly")).toBeInTheDocument();
    expect(active.getByText("15 Jan – 14 Feb 2027")).toBeInTheDocument();
    expect(active.getByText("Active")).toBeInTheDocument();
    expect(active.getByText("25 days left")).toBeInTheDocument();
    expect(active.getByText("Balance LKR 5,000")).toBeInTheDocument();

    const waiting = within(await card("Nimali Silva"));
    expect(waiting.getByText("Waiting for receipt check")).toBeInTheDocument();
    expect(waiting.queryByRole("meter")).toBeNull();
    expect(waiting.queryByText(/^Balance/)).toBeNull();

    const ended = within(await card("Ruwan Fernando"));
    expect(ended.getByText("Ended")).toBeInTheDocument();
    expect(ended.getByText("Paid")).toBeInTheDocument();
  });

  it("list_putsReceiptsToCheckFirst_andFinishedOnesLast", async () => {
    mockMembershipApi([ruwan, saman, nimali]);
    renderApp("/memberships");
    await card("Saman Perera");

    const names = within(screen.getByRole("list", { name: "Memberships" }))
      .getAllByRole("article")
      .map((each) => each.getAttribute("aria-label"));
    expect(names).toEqual(["Nimali Silva", "Saman Perera", "Ruwan Fernando"]);
  });

  it("waitingTile_showsOnlyMembershipsWaitingForPayment", async () => {
    mockMembershipApi([saman, nimali, ruwan]);
    renderApp("/memberships");
    await card("Saman Perera");

    const tile = screen.getByRole("button", { name: /^Waiting for payment/ });
    expect(tile).toHaveTextContent("1 with a receipt to check");
    fireEvent.click(tile);

    await waitFor(() => expect(screen.queryByRole("article", { name: "Saman Perera" })).toBeNull());
    expect(screen.getByRole("article", { name: "Nimali Silva" })).toBeInTheDocument();
    expect(screen.queryByRole("article", { name: "Ruwan Fernando" })).toBeNull();
  });

  it("search_findsAMembershipByPhoneNumberAsTyped", async () => {
    mockMembershipApi([saman, nimali, ruwan]);
    renderApp("/memberships");
    await card("Saman Perera");

    fireEvent.change(screen.getByPlaceholderText("Search"), {
      target: { value: "077 000 2222" },
    });

    await waitFor(() => expect(screen.queryByRole("article", { name: "Saman Perera" })).toBeNull());
    expect(screen.getByRole("article", { name: "Nimali Silva" })).toBeInTheDocument();
    expect(screen.getByText("1 of 3 memberships")).toBeInTheDocument();
  });

  it("deskSale_newCustomerPaysCash_andTheMembershipLandsInTheList", async () => {
    const fake = mockMembershipApi([saman]);
    const form = await openSellForm();

    fireEvent.change(form.getByRole("textbox", { name: "Phone number" }), {
      target: { value: "077 111 2222" },
    });
    fireEvent.change(form.getByRole("textbox", { name: "Name" }), {
      target: { value: "Kasun Jayawardena" },
    });
    fireEvent.click(form.getByRole("radio", { name: /10-day pass/ }));
    fireEvent.click(form.getByRole("radio", { name: "Paid in cash" }));

    const summary = within(form.getByRole("region", { name: "10-day pass" }));
    expect(summary.getByText("Wed 20 Jan → Fri 29 Jan")).toBeInTheDocument();
    expect(summary.getByText("Balance").nextElementSibling).toHaveTextContent("LKR 0");
    fireEvent.click(form.getByRole("button", { name: "Sell membership" }));

    expect(await card("Kasun Jayawardena")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(fake.sold).toEqual([
      {
        planId: 22,
        startsOn: "2027-01-20",
        walkIn: {
          customerName: "Kasun Jayawardena",
          customerPhone: "077 111 2222",
          payment: "CASH",
        },
      },
    ]);
  });

  it("deskSale_renewal_showsItStartsTheDayAfterTheCurrentOneEnds", async () => {
    const fake = mockMembershipApi([saman]);
    const form = await openSellForm();

    fireEvent.change(form.getByRole("textbox", { name: "Phone number" }), {
      target: { value: "077 000 1111" },
    });

    expect(await form.findByDisplayValue("Saman Perera")).toBeInTheDocument();
    expect(await form.findByText("Mon 15 Feb → Sun 14 Mar")).toBeInTheDocument();
    expect(form.getByText("Renewal: the current one ends Sun 14 Feb")).toBeInTheDocument();
    expect(form.getByText("Balance").nextElementSibling).toHaveTextContent("LKR 5,000");
    fireEvent.click(form.getByRole("button", { name: "Sell membership" }));

    await waitFor(() => expect(fake.sold).toHaveLength(1));
    expect(fake.sold[0]).toMatchObject({
      planId: 21,
      walkIn: { customerName: "Saman Perera", payment: "PAY_LATER" },
    });
  });

  it("deskSale_refused_saysWhyAndKeepsTheForm", async () => {
    mockMembershipApi([saman], {
      sell: () =>
        apiError(
          409,
          "tt_mem_007",
          "This customer already has this plan for some of those days. Cancel that one first",
        ),
    });
    const form = await openSellForm();

    fireEvent.change(form.getByRole("textbox", { name: "Phone number" }), {
      target: { value: "077 111 2222" },
    });
    fireEvent.change(form.getByRole("textbox", { name: "Name" }), {
      target: { value: "Kasun Jayawardena" },
    });
    fireEvent.click(form.getByRole("button", { name: "Sell membership" }));

    expect(
      await form.findByText(
        "This customer already has this plan for some of those days. Cancel that one first",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Sell a membership" })).toBeInTheDocument();
  });

  it("noMemberships_offersTheSale", async () => {
    mockMembershipApi([]);
    renderApp("/memberships");

    expect(await screen.findByText("No memberships yet.")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Sell a membership" })).toHaveLength(2);
  });
});
