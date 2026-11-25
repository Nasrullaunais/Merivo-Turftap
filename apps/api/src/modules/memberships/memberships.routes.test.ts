import { beforeAll, describe, expect, it } from "bun:test";

import { WHATSAPP_TEMPLATES } from "../../ports/messaging-channel";
import {
  asAssistant,
  asCustomer,
  asStaff,
  call,
  createTenant,
  imageBytes,
  passMembershipTimeLimit,
  planInput,
  queuedMessagesFor,
  type TestTenant,
  uniquePhone,
  uploadForm,
  venueInput,
} from "../../test/fixtures";
import * as receiptReadingService from "../payments/receipt-reading.service";
import * as membershipExpiryService from "./membership-expiry.service";

const rupees = (amount: number) => ({ amount: amount * 100, currency: "LKR" as const });

type As = Parameters<typeof call>[2];

describe("memberships routes", () => {
  let tenant: TestTenant;
  let venueId: number;
  let planId: number;
  const asFrontDesk = () => asStaff(tenant, tenant.frontDesk);

  beforeAll(async () => {
    tenant = await createTenant();
    venueId = (await call("POST", "/v1/venues", asStaff(tenant), venueInput())).body.data.id;
    planId = (
      await call(
        "POST",
        "/v1/membership-plans",
        asStaff(tenant),
        planInput(venueId, { price: rupees(5_000) }),
      )
    ).body.data.id;
  });

  async function newCustomer() {
    const phone = uniquePhone();
    const reply = await call("POST", "/v1/customers", asCustomer(tenant, phone), {
      name: "Nimal",
      phone,
    });
    return { phone, id: reply.body.data.id as number };
  }

  /** An online membership waiting for payment, for a new customer. */
  async function bought() {
    const customer = await newCustomer();
    const reply = await call("POST", "/v1/memberships", asCustomer(tenant, customer.phone), {
      planId,
    });
    expect(reply.status).toBe(201);
    return { customer, membership: reply.body.data as { id: number; startsOn: string } };
  }

  async function sendReceipt(as: As, membershipId: number) {
    const file = await call("POST", "/v1/files", as, uploadForm(imageBytes(), "RECEIPT"));
    return call("POST", "/v1/payments", as, {
      kind: "TRANSFER",
      membershipId,
      fileId: file.body.data.id,
    });
  }

  const membershipOf = async (id: number) =>
    (await call("GET", `/v1/memberships/${id}`, asStaff(tenant))).body.data;

  it("create_repliesWithTheEnvelope", async () => {
    const { membership } = await bought();
    const reply = await call("GET", `/v1/memberships/${membership.id}`, asStaff(tenant));
    expect(reply).toMatchObject({
      status: 200,
      body: { status: 200, message: "success", data: { status: "AWAITING_PAYMENT", planId } },
    });
    expect(reply.body.data.tenantId).toBeUndefined();
  });

  it("create_refusesABadStartDate", async () => {
    const customer = await newCustomer();
    const reply = await call("POST", "/v1/memberships", asCustomer(tenant, customer.phone), {
      planId,
      startsOn: "31/01/2027",
    });
    expect(reply.status).toBe(400);
    expect(reply.body.errors.map((error: { field: string }) => error.field)).toEqual(["startsOn"]);
  });

  it("assistant_buysForTheCustomerItActsFor", async () => {
    const customer = await newCustomer();
    const reply = await call("POST", "/v1/memberships", asAssistant(tenant, customer.phone), {
      planId,
    });
    expect(reply.body.data).toMatchObject({ customerId: customer.id, status: "AWAITING_PAYMENT" });
  });

  it("customer_listsOnlyTheirOwnMemberships", async () => {
    const mine = await bought();
    await bought();
    const reply = await call("GET", "/v1/memberships", asCustomer(tenant, mine.customer.phone));
    expect(reply.body.data.content.map((row: { id: number }) => row.id)).toEqual([
      mine.membership.id,
    ]);
  });

  it("customer_cannotSeeSomeoneElsesMembership", async () => {
    const theirs = await bought();
    const someone = await newCustomer();
    const reply = await call(
      "GET",
      `/v1/memberships/${theirs.membership.id}`,
      asCustomer(tenant, someone.phone),
    );
    expect(reply).toMatchObject({ status: 404, body: { code: "tt_mem_003" } });
  });

  it("list_filtersByStatusAndPlan", async () => {
    const { membership } = await bought();
    const reply = await call(
      "GET",
      `/v1/memberships?status=AWAITING_PAYMENT&planId=${planId}&size=100`,
      asStaff(tenant),
    );
    const rows = reply.body.data.content as { id: number; status: string }[];
    expect(rows.map((row) => row.id)).toContain(membership.id);
    expect(rows.every((row) => row.status === "AWAITING_PAYMENT")).toBe(true);
  });

  describe("PAY-02, PAY-04, PAY-05 receipts for memberships", () => {
    it("sendReceipt_paysTheAmountDue_andWaitsForACheck", async () => {
      const { customer, membership } = await bought();

      const reply = await sendReceipt(asCustomer(tenant, customer.phone), membership.id);

      expect(reply.body.data).toMatchObject({
        membershipId: membership.id,
        bookingId: null,
        venueId,
        kind: "TRANSFER",
        status: "PENDING_CHECK",
        amount: rupees(5_000),
      });
      expect((await membershipOf(membership.id)).status).toBe("AWAITING_CHECK");
    });

    it("accept_makesTheMembershipActive_andTellsTheCustomer", async () => {
      const { customer, membership } = await bought();
      const payment = await sendReceipt(asCustomer(tenant, customer.phone), membership.id);

      await call("PATCH", `/v1/payments/${payment.body.data.id}`, asFrontDesk(), {
        status: "ACCEPTED",
      });

      expect(await membershipOf(membership.id)).toMatchObject({
        status: "ACTIVE",
        paid: rupees(5_000),
        balance: rupees(0),
      });
      expect(await queuedMessagesFor(customer.id)).toEqual([
        expect.objectContaining({ template: WHATSAPP_TEMPLATES.membershipActive }),
      ]);
    });

    it("reject_reopensTheMembership_andTellsTheReason", async () => {
      const { customer, membership } = await bought();
      const payment = await sendReceipt(asCustomer(tenant, customer.phone), membership.id);

      await call("PATCH", `/v1/payments/${payment.body.data.id}`, asFrontDesk(), {
        status: "REJECTED",
        rejectReason: "The amount is wrong",
      });

      expect(await membershipOf(membership.id)).toMatchObject({
        status: "AWAITING_PAYMENT",
        paid: rupees(0),
      });
      expect(await queuedMessagesFor(customer.id)).toEqual([
        expect.objectContaining({
          template: WHATSAPP_TEMPLATES.membershipReceiptRejected,
          values: [
            expect.any(String),
            expect.any(String),
            expect.any(String),
            "The amount is wrong",
            expect.any(String),
          ],
        }),
      ]);
      const again = await sendReceipt(asCustomer(tenant, customer.phone), membership.id);
      expect(again.status).toBe(201);
    });

    it("sendReceipt_afterTheTimeLimit_isRefused", async () => {
      const { customer, membership } = await bought();
      await passMembershipTimeLimit(membership.id);
      await membershipExpiryService.expire(tenant.id, membership.id);

      const reply = await sendReceipt(asCustomer(tenant, customer.phone), membership.id);

      expect(reply).toMatchObject({ status: 409, body: { code: "tt_pay_009" } });
      expect(reply.body.message).toContain("membership");
    });

    it("sendReceipt_forSomeoneElsesMembership_isNotFound", async () => {
      const { membership } = await bought();
      const someone = await newCustomer();
      const reply = await sendReceipt(asCustomer(tenant, someone.phone), membership.id);
      expect(reply).toMatchObject({ status: 404, body: { code: "tt_mem_003" } });
    });

    it("receiptReading_checksTheDateAgainstTheDayTheMembershipWasBought", async () => {
      const { customer, membership } = await bought();
      const payment = await sendReceipt(asCustomer(tenant, customer.phone), membership.id);

      await receiptReadingService.read(tenant.id, payment.body.data.id);

      const seen = await call("GET", `/v1/payments/${payment.body.data.id}`, asFrontDesk());
      expect(seen.body.data.receiptReading).toMatchObject({ unreadable: false });
      expect(seen.body.data.receiptReading.dateRecent).not.toBeNull();
    });

    it("payment_withBothABookingAndAMembership_isRefused", async () => {
      const { membership } = await bought();
      const reply = await call("POST", "/v1/payments", asFrontDesk(), {
        kind: "CASH",
        bookingId: membership.id,
        membershipId: membership.id,
        amount: rupees(100),
      });
      expect(reply.status).toBe(400);
    });

    it("payments_filterByMembership", async () => {
      const { customer, membership } = await bought();
      const payment = await sendReceipt(asCustomer(tenant, customer.phone), membership.id);
      const reply = await call("GET", `/v1/payments?membershipId=${membership.id}`, asFrontDesk());
      expect(reply.body.data.content.map((row: { id: number }) => row.id)).toEqual([
        payment.body.data.id,
      ]);
    });
  });
});

describe("SIG-05 membership permissions", () => {
  let tenant: TestTenant;
  let planId: number;

  beforeAll(async () => {
    tenant = await createTenant();
    const venueId = (await call("POST", "/v1/venues", asStaff(tenant), venueInput())).body.data.id;
    planId = (await call("POST", "/v1/membership-plans", asStaff(tenant), planInput(venueId))).body
      .data.id;
  });

  const sale = () => ({
    planId,
    walkIn: { customerName: "Kamala", customerPhone: uniquePhone(), payment: "CASH" },
  });

  it("frontDesk_sellsListsAndCancels", async () => {
    const as = asStaff(tenant, tenant.frontDesk);
    const sold = await call("POST", "/v1/memberships", as, sale());
    expect(sold).toMatchObject({ status: 201, body: { data: { status: "ACTIVE" } } });
    expect((await call("GET", "/v1/memberships", as)).status).toBe(200);
    const cancelled = await call("PATCH", `/v1/memberships/${sold.body.data.id}`, as, {
      status: "CANCELLED",
      cancelReason: "Wrong plan",
    });
    expect(cancelled.body.data.status).toBe("CANCELLED");
  });

  it("manager_sells", async () => {
    const reply = await call("POST", "/v1/memberships", asStaff(tenant, tenant.manager), sale());
    expect(reply.status).toBe(201);
  });

  it("public_cannotListOrBuy", async () => {
    const asPublic = { tenantSlug: tenant.slug };
    expect((await call("GET", "/v1/memberships", asPublic)).status).toBe(401);
    expect((await call("POST", "/v1/memberships", asPublic, { planId })).status).toBe(401);
  });

  it("delete_isNotARoute", async () => {
    const sold = await call("POST", "/v1/memberships", asStaff(tenant), sale());
    const reply = await call("DELETE", `/v1/memberships/${sold.body.data.id}`, asStaff(tenant));
    expect(reply.status).toBe(404);
  });
});
