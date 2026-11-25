import { beforeAll, describe, expect, it } from "bun:test";

import type { CreateMembershipPlan, WalkIn } from "@turftap/contract";
import { sql } from "drizzle-orm";

import type { AuthContext } from "../../lib/auth/context";
import { db } from "../../lib/db";
import { addDays, todayIn } from "../../lib/time";
import { WHATSAPP_TEMPLATES } from "../../ports/messaging-channel";
import {
  createTenant,
  passMembershipTimeLimit,
  planInput,
  queuedMessagesFor,
  type TestTenant,
  uniquePhone,
  gymInput,
} from "../../test/fixtures";
import * as customersService from "../customers/customers.service";
import * as paymentsService from "../payments/payments.service";
import * as venuesService from "../venues/venues.service";
import * as membershipExpiryService from "./membership-expiry.service";
import * as membershipPlansService from "./membership-plans.service";
import * as membershipsService from "./memberships.service";

const TIME_ZONE = "Asia/Colombo";
const MS_PER_MINUTE = 60 * 1000;
const PAYMENT_TIME_LIMIT_MINUTES = 30;
const rupees = (amount: number) => ({ amount: amount * 100, currency: "LKR" as const });
const inDays = (days: number) => addDays(todayIn(TIME_ZONE), days);
const bankAccount = {
  bankName: "Bank of Ceylon",
  branch: null,
  accountName: "Iron Gym (Pvt) Ltd",
  accountNumber: "0071 2345 678",
};

const expireJobsFor = async (membershipId: number) => {
  const { rows } = await db().execute(
    sql`select start_after from pgboss.job where name = 'expire-membership' and (data->>'membershipId')::int = ${membershipId}`,
  );
  return rows.map((row) => new Date(row.start_after as string).getTime());
};

describe("MEM-02, MEM-03, MEM-04 memberships", () => {
  let tenant: TestTenant;
  let venueId: number;
  const manager = () => tenant.manager.auth;
  const frontDesk = () => tenant.frontDesk.auth;

  beforeAll(async () => {
    tenant = await createTenant();
    venueId = (
      await venuesService.create(
        tenant.owner.auth,
        gymInput({ bankAccount, paymentTimeLimitMinutes: PAYMENT_TIME_LIMIT_MINUTES }),
      )
    ).id;
  });

  const newPlan = (overrides: Partial<CreateMembershipPlan> = {}) =>
    membershipPlansService.create(
      manager(),
      planInput(venueId, { price: rupees(5_000), ...overrides }),
    );

  async function newCustomer(): Promise<AuthContext> {
    const phone = uniquePhone();
    const customer = await customersService.create(manager(), { name: "Nimal Perera", phone });
    return { actor: "customer", tenantId: tenant.id, phone, customerId: customer.id };
  }

  const walkIn = (customer: AuthContext, payment: WalkIn["payment"] = "CASH"): WalkIn => ({
    customerName: "Nimal Perera",
    customerPhone: customer.phone!,
    payment,
  });

  describe("MEM-02 buy online", () => {
    it("create_waitsForPaymentForTheTimeLimit_andShowsWhereToPay", async () => {
      const plan = await newPlan();
      const customer = await newCustomer();
      const before = Date.now();

      const membership = await membershipsService.create(customer, {
        planId: plan.id,
        startsOn: inDays(3),
      });

      expect(membership).toMatchObject({
        venueId,
        planId: plan.id,
        planName: plan.name,
        customerId: customer.customerId,
        customerName: "Nimal Perera",
        status: "AWAITING_PAYMENT",
        startsOn: inDays(3),
        price: rupees(5_000),
        amountDue: rupees(5_000),
        paid: rupees(0),
        balance: rupees(5_000),
        bankAccount,
      });
      const expiresAt = membership.expiresAt!.getTime();
      expect(expiresAt).toBeGreaterThanOrEqual(before + PAYMENT_TIME_LIMIT_MINUTES * MS_PER_MINUTE);
      expect(await expireJobsFor(membership.id)).toEqual([expiresAt]);
    });

    it("create_withoutAStartDate_startsToday", async () => {
      const plan = await newPlan();
      const membership = await membershipsService.create(await newCustomer(), { planId: plan.id });
      expect(membership.startsOn).toBe(inDays(0));
    });

    it("create_endsAfterTheNumberOfDays_countingTheFirstDay", async () => {
      const plan = await newPlan({ lengthCount: 10, lengthUnit: "DAYS" });
      const membership = await membershipsService.create(await newCustomer(), {
        planId: plan.id,
        startsOn: inDays(2),
      });
      expect(membership).toMatchObject({ startsOn: inDays(2), endsOn: inDays(11) });
    });

    it("create_endsTheDayBeforeTheSameDateNextMonth", async () => {
      const year = Number(inDays(0).slice(0, 4)) + 1;
      const plan = await newPlan({ lengthCount: 1, lengthUnit: "MONTHS" });
      const membership = await membershipsService.create(await newCustomer(), {
        planId: plan.id,
        startsOn: `${year}-01-15`,
      });
      expect(membership.endsOn).toBe(`${year}-02-14`);
    });

    it("create_fromThe31stOfJanuary_endsOnTheLastDayOfFebruary", async () => {
      const year = Number(inDays(0).slice(0, 4)) + 1;
      const lastOfFebruary = new Date(Date.UTC(year, 2, 0)).toISOString().slice(0, 10);
      const plan = await newPlan({ lengthCount: 1, lengthUnit: "MONTHS" });
      const membership = await membershipsService.create(await newCustomer(), {
        planId: plan.id,
        startsOn: `${year}-01-31`,
      });
      expect(membership.endsOn).toBe(lastOfFebruary);
    });

    it("create_refusesAStartBeforeToday", async () => {
      const plan = await newPlan();
      const created = membershipsService.create(await newCustomer(), {
        planId: plan.id,
        startsOn: inDays(-1),
      });
      await expect(created).rejects.toMatchObject({ status: 400, code: "tt_mem_005" });
    });

    it("create_atAPayAtVenueVenue_isRefusedUntilOQ03IsAnswered", async () => {
      const payAtVenue = await venuesService.create(
        tenant.owner.auth,
        gymInput({ payAtVenue: true }),
      );
      const plan = await membershipPlansService.create(manager(), planInput(payAtVenue.id));
      const created = membershipsService.create(await newCustomer(), { planId: plan.id });
      await expect(created).rejects.toMatchObject({ status: 409, code: "tt_mem_006" });
      const sold = await membershipsService.create(frontDesk(), {
        planId: plan.id,
        walkIn: walkIn(await newCustomer()),
      });
      expect(sold.status).toBe("ACTIVE");
    });

    it("create_refusesAPlanThatWasTurnedOff", async () => {
      const plan = await newPlan();
      await membershipPlansService.remove(manager(), plan.id);
      const customer = await newCustomer();
      const bought = membershipsService.create(customer, { planId: plan.id });
      await expect(bought).rejects.toMatchObject({ status: 404, code: "tt_mem_001" });
      const sold = membershipsService.create(frontDesk(), {
        planId: plan.id,
        walkIn: walkIn(customer),
      });
      await expect(sold).rejects.toMatchObject({ status: 409, code: "tt_mem_004" });
    });

    it("create_withoutACustomerRecord_asksForTheName", async () => {
      const plan = await newPlan();
      const stranger: AuthContext = {
        actor: "customer",
        tenantId: tenant.id,
        phone: uniquePhone(),
      };
      const created = membershipsService.create(stranger, { planId: plan.id });
      await expect(created).rejects.toMatchObject({ status: 409, code: "tt_mem_008" });
    });

    it("unpaid_expiresAfterTheTimeLimit_andTheCustomerIsTold", async () => {
      const plan = await newPlan();
      const customer = await newCustomer();
      const membership = await membershipsService.create(customer, { planId: plan.id });

      await passMembershipTimeLimit(membership.id);
      await membershipExpiryService.expire(tenant.id, membership.id);

      expect(await membershipsService.get(manager(), membership.id)).toMatchObject({
        status: "EXPIRED",
        balance: rupees(0),
        bankAccount: null,
      });
      expect(await queuedMessagesFor(customer.customerId!)).toEqual([
        {
          tenantId: tenant.id,
          customerId: customer.customerId!,
          template: WHATSAPP_TEMPLATES.membershipExpired,
          values: [expect.any(String), plan.name, expect.any(String)],
        },
      ]);
    });

    it("expiry_beforeTheTimeLimit_changesNothing", async () => {
      const plan = await newPlan();
      const membership = await membershipsService.create(await newCustomer(), { planId: plan.id });
      await membershipExpiryService.expire(tenant.id, membership.id);
      expect((await membershipsService.get(manager(), membership.id)).status).toBe(
        "AWAITING_PAYMENT",
      );
    });

    it("expired_letsTheCustomerBuyTheSameDaysAgain", async () => {
      const plan = await newPlan();
      const customer = await newCustomer();
      const first = await membershipsService.create(customer, { planId: plan.id });
      await passMembershipTimeLimit(first.id);
      await membershipExpiryService.expire(tenant.id, first.id);

      const again = await membershipsService.create(customer, { planId: plan.id });

      expect(again).toMatchObject({ status: "AWAITING_PAYMENT", startsOn: first.startsOn });
    });
  });

  describe("MEM-03 sell at the desk", () => {
    it("sell_forCash_isActiveAndFullyPaid_andTheCustomerIsTold", async () => {
      const plan = await newPlan();
      const phone = uniquePhone();

      const membership = await membershipsService.create(frontDesk(), {
        planId: plan.id,
        walkIn: { customerName: "Kamala Silva", customerPhone: phone, payment: "CASH" },
      });

      expect(membership).toMatchObject({
        status: "ACTIVE",
        startsOn: inDays(0),
        customerName: "Kamala Silva",
        customerPhone: phone,
        amountDue: rupees(0),
        expiresAt: null,
        paid: rupees(5_000),
        balance: rupees(0),
      });
      expect(await expireJobsFor(membership.id)).toEqual([]);
      expect(await queuedMessagesFor(membership.customerId)).toEqual([
        expect.objectContaining({
          template: WHATSAPP_TEMPLATES.membershipActive,
          values: [expect.any(String), plan.name, expect.any(String), expect.any(String)],
        }),
      ]);
    });

    it("sell_payLater_leavesThePriceToPay_andCashPaysItLater", async () => {
      const plan = await newPlan();
      const customer = await newCustomer();
      const membership = await membershipsService.create(frontDesk(), {
        planId: plan.id,
        walkIn: walkIn(customer, "PAY_LATER"),
      });
      expect(membership).toMatchObject({ status: "ACTIVE", balance: rupees(5_000) });

      await paymentsService.create(frontDesk(), {
        membershipId: membership.id,
        kind: "CASH",
        amount: rupees(5_000),
        note: null,
      });

      expect(await membershipsService.get(frontDesk(), membership.id)).toMatchObject({
        paid: rupees(5_000),
        balance: rupees(0),
      });
    });

    it("sell_toAKnownPhone_usesThatCustomer", async () => {
      const plan = await newPlan();
      const customer = await newCustomer();
      const membership = await membershipsService.create(frontDesk(), {
        planId: plan.id,
        walkIn: walkIn(customer),
      });
      expect(membership.customerId).toBe(customer.customerId!);
    });

    it("create_byStaffWithoutWalkIn_isRefused", async () => {
      const plan = await newPlan();
      const created = membershipsService.create(frontDesk(), { planId: plan.id });
      await expect(created).rejects.toMatchObject({ status: 400, code: "tt_mem_009" });
    });

    it("create_byACustomerWithWalkIn_isRefused", async () => {
      const plan = await newPlan();
      const customer = await newCustomer();
      const created = membershipsService.create(customer, {
        planId: plan.id,
        walkIn: walkIn(customer),
      });
      await expect(created).rejects.toMatchObject({ status: 403 });
    });
  });

  describe("MEM-04 renew", () => {
    it("renew_startsTheDayAfterTheActiveOneEnds", async () => {
      const plan = await newPlan({ lengthCount: 10, lengthUnit: "DAYS" });
      const customer = await newCustomer();
      const current = await membershipsService.create(frontDesk(), {
        planId: plan.id,
        walkIn: walkIn(customer),
      });

      const renewal = await membershipsService.create(customer, { planId: plan.id });

      expect(current.endsOn).toBe(inDays(9));
      expect(renewal).toMatchObject({ startsOn: inDays(10), endsOn: inDays(19) });
    });

    it("renew_keepsALaterStartTheCustomerAskedFor", async () => {
      const plan = await newPlan({ lengthCount: 10, lengthUnit: "DAYS" });
      const customer = await newCustomer();
      await membershipsService.create(frontDesk(), { planId: plan.id, walkIn: walkIn(customer) });

      const renewal = await membershipsService.create(customer, {
        planId: plan.id,
        startsOn: inDays(20),
      });

      expect(renewal.startsOn).toBe(inDays(20));
    });

    it("renew_followsTheLatestOfSeveralActiveOnes", async () => {
      const plan = await newPlan({ lengthCount: 10, lengthUnit: "DAYS" });
      const customer = await newCustomer();
      await membershipsService.create(frontDesk(), { planId: plan.id, walkIn: walkIn(customer) });
      await membershipsService.create(frontDesk(), { planId: plan.id, walkIn: walkIn(customer) });

      const third = await membershipsService.create(customer, { planId: plan.id });

      expect(third.startsOn).toBe(inDays(20));
    });

    it("anotherPlan_startsWhenAsked", async () => {
      const plan = await newPlan({ lengthCount: 10, lengthUnit: "DAYS" });
      const other = await newPlan();
      const customer = await newCustomer();
      await membershipsService.create(frontDesk(), { planId: plan.id, walkIn: walkIn(customer) });

      const membership = await membershipsService.create(customer, { planId: other.id });

      expect(membership.startsOn).toBe(inDays(0));
    });

    it("create_overlappingOneStillWaitingForPayment_isRefused", async () => {
      const plan = await newPlan();
      const customer = await newCustomer();
      await membershipsService.create(customer, { planId: plan.id });

      const again = membershipsService.create(customer, { planId: plan.id, startsOn: inDays(5) });

      await expect(again).rejects.toMatchObject({ status: 409, code: "tt_mem_007" });
    });
  });

  describe("cancel", () => {
    it("customer_cancelsTheirOwnUnpaidMembership", async () => {
      const plan = await newPlan();
      const customer = await newCustomer();
      const membership = await membershipsService.create(customer, { planId: plan.id });

      const cancelled = await membershipsService.update(customer, membership.id, {
        status: "CANCELLED",
      });

      expect(cancelled).toMatchObject({ status: "CANCELLED", balance: rupees(0) });
    });

    it("customer_cannotCancelAnActiveMembership", async () => {
      const plan = await newPlan();
      const customer = await newCustomer();
      const membership = await membershipsService.create(frontDesk(), {
        planId: plan.id,
        walkIn: walkIn(customer),
      });

      const cancelled = membershipsService.update(customer, membership.id, { status: "CANCELLED" });

      await expect(cancelled).rejects.toMatchObject({ status: 403 });
    });

    it("staff_cancelWithAReason_andTheCustomerIsTold", async () => {
      const plan = await newPlan();
      const customer = await newCustomer();
      const membership = await membershipsService.create(frontDesk(), {
        planId: plan.id,
        walkIn: walkIn(customer, "PAY_LATER"),
      });
      const noReason = membershipsService.update(manager(), membership.id, {
        status: "CANCELLED",
      });
      await expect(noReason).rejects.toMatchObject({ status: 400, code: "tt_mem_010" });

      await membershipsService.update(manager(), membership.id, {
        status: "CANCELLED",
        cancelReason: "Sold by mistake",
      });

      expect(await queuedMessagesFor(customer.customerId!)).toContainEqual(
        expect.objectContaining({
          template: WHATSAPP_TEMPLATES.membershipCancelled,
          values: [expect.any(String), plan.name, expect.any(String), "Sold by mistake"],
        }),
      );
    });

    it("cancelled_freesTheDaysForTheSamePlan", async () => {
      const plan = await newPlan();
      const customer = await newCustomer();
      const first = await membershipsService.create(customer, { planId: plan.id });
      await membershipsService.update(customer, first.id, { status: "CANCELLED" });

      const again = await membershipsService.create(customer, { planId: plan.id });

      expect(again.startsOn).toBe(first.startsOn);
    });
  });
});
