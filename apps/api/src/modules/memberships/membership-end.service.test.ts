import { beforeAll, describe, expect, it } from "bun:test";

import type { CreateMembershipPlan } from "@turftap/contract";

import type { AuthContext } from "../../lib/auth/context";
import { addDays, describeDate, todayIn } from "../../lib/time";
import { WHATSAPP_TEMPLATES } from "../../ports/messaging-channel";
import {
  createTenant,
  gymInput,
  moveMembershipDays,
  planInput,
  queuedMessagesFor,
  type TestTenant,
  turnOff,
  uniquePhone,
} from "../../test/fixtures";
import * as customersService from "../customers/customers.service";
import * as venuesService from "../venues/venues.service";
import * as membershipEndService from "./membership-end.service";
import * as membershipPlansService from "./membership-plans.service";
import * as membershipsService from "./memberships.service";

const TIME_ZONE = "Asia/Colombo";
const inDays = (days: number) => addDays(todayIn(TIME_ZONE), days);
const VENUE_NAME = "Iron Gym Colombo";

describe("MEM-06 memberships end, and reminders", () => {
  let tenant: TestTenant;
  let venueId: number;
  const frontDesk = () => tenant.frontDesk.auth;

  beforeAll(async () => {
    tenant = await createTenant();
    venueId = (await venuesService.create(tenant.owner.auth, gymInput({ name: VENUE_NAME }))).id;
  });

  async function newGym(on: TestTenant) {
    const venue = await venuesService.create(on.owner.auth, gymInput());
    return venue.id;
  }

  /** A plan of `days` days, so one sold today ends `days - 1` days from now. */
  const planOfDays = (days: number, at = venueId, by = tenant) =>
    membershipPlansService.create(
      by.manager.auth,
      planInput(at, {
        lengthCount: days,
        lengthUnit: "DAYS",
      } satisfies Partial<CreateMembershipPlan>),
    );

  async function newCustomer(on = tenant): Promise<AuthContext> {
    const phone = uniquePhone();
    const customer = await customersService.create(on.manager.auth, {
      name: "Nimal Perera",
      phone,
    });
    return { actor: "customer", tenantId: on.id, phone, customerId: customer.id };
  }

  const sell = (planId: number, customer: AuthContext, by = frontDesk()) =>
    membershipsService.create(by, {
      planId,
      walkIn: { customerName: "Nimal Perera", customerPhone: customer.phone!, payment: "CASH" },
    });

  const endingSoonMessages = async (customerId: number) =>
    (await queuedMessagesFor(customerId)).filter(
      (message) => message.template === WHATSAPP_TEMPLATES.membershipEndingSoon,
    );

  describe("end", () => {
    it("endPast_endsOnePastItsLastDay_andKeepsOneEndingToday", async () => {
      const plan = await planOfDays(10);
      const past = await sell(plan.id, await newCustomer());
      await moveMembershipDays(past.id, inDays(-10), inDays(-1));
      const lastDayToday = await sell(plan.id, await newCustomer());
      await moveMembershipDays(lastDayToday.id, inDays(-9), inDays(0));

      await membershipEndService.endPast();

      expect((await membershipsService.get(frontDesk(), past.id)).status).toBe("ENDED");
      expect((await membershipsService.get(frontDesk(), lastDayToday.id)).status).toBe("ACTIVE");
    });

    it("endPast_leavesMembershipsWaitingForPayment", async () => {
      const plan = await planOfDays(10);
      const unpaid = await membershipsService.create(await newCustomer(), { planId: plan.id });
      await moveMembershipDays(unpaid.id, inDays(-10), inDays(-1));

      await membershipEndService.endPast();

      expect((await membershipsService.get(frontDesk(), unpaid.id)).status).toBe(
        "AWAITING_PAYMENT",
      );
    });
  });

  describe("remind", () => {
    it("remind_endingInThreeDays_sendsOneMessage_evenWhenRunTwice", async () => {
      const plan = await planOfDays(4);
      const membership = await sell(plan.id, await newCustomer());
      expect(membership.endsOn).toBe(inDays(3));

      await membershipEndService.remindEndingSoon();
      await membershipEndService.remindEndingSoon();

      expect(await endingSoonMessages(membership.customerId)).toEqual([
        expect.objectContaining({
          tenantId: tenant.id,
          values: [VENUE_NAME, plan.name, describeDate(inDays(3))],
        }),
      ]);
    });

    it("remind_aDayMissed_stillSendsWhileTheLastDayIsAhead", async () => {
      const plan = await planOfDays(30);
      const membership = await sell(plan.id, await newCustomer());
      await moveMembershipDays(membership.id, inDays(-28), inDays(1));

      await membershipEndService.remindEndingSoon();

      expect(await endingSoonMessages(membership.customerId)).toHaveLength(1);
    });

    it("remind_endingLaterOrToday_sendsNothing", async () => {
      const plan = await planOfDays(30);
      const later = await sell(plan.id, await newCustomer());
      await moveMembershipDays(later.id, inDays(-25), inDays(4));
      const today = await sell(plan.id, await newCustomer());
      await moveMembershipDays(today.id, inDays(-29), inDays(0));

      await membershipEndService.remindEndingSoon();

      expect(await endingSoonMessages(later.customerId)).toEqual([]);
      expect(await endingSoonMessages(today.customerId)).toEqual([]);
    });

    it("remind_passOfThreeDaysOrLess_sendsNothing", async () => {
      const plan = await planOfDays(3);
      const membership = await sell(plan.id, await newCustomer());

      await membershipEndService.remindEndingSoon();

      expect(await endingSoonMessages(membership.customerId)).toEqual([]);
    });

    it("remind_alreadyRenewed_sendsNothing", async () => {
      const plan = await planOfDays(4);
      const customer = await newCustomer();
      const current = await sell(plan.id, customer);
      const longer = await planOfDays(30);
      const renewal = await sell(longer.id, customer);
      expect(renewal.startsOn).toBe(inDays(0));

      await membershipEndService.remindEndingSoon();

      expect(await endingSoonMessages(current.customerId)).toEqual([]);
    });

    it("remind_renewalWaitingForReceiptCheck_countsAsRenewed", async () => {
      const plan = await planOfDays(4);
      const customer = await newCustomer();
      const current = await sell(plan.id, customer);
      const renewal = await membershipsService.create(customer, { planId: plan.id });
      await membershipsService.receiptSent(customer, renewal.id);

      await membershipEndService.remindEndingSoon();

      expect(await endingSoonMessages(current.customerId)).toEqual([]);
    });

    it("remind_renewalNotPaidYet_stillSends", async () => {
      const plan = await planOfDays(4);
      const customer = await newCustomer();
      const current = await sell(plan.id, customer);
      await membershipsService.create(customer, { planId: plan.id });

      await membershipEndService.remindEndingSoon();

      expect(await endingSoonMessages(current.customerId)).toHaveLength(1);
    });

    it("remind_anotherCustomersLongerMembership_doesNotCountAsRenewed", async () => {
      const plan = await planOfDays(4);
      const current = await sell(plan.id, await newCustomer());
      await sell((await planOfDays(30)).id, await newCustomer());

      await membershipEndService.remindEndingSoon();

      expect(await endingSoonMessages(current.customerId)).toHaveLength(1);
    });

    it("remind_tenantTurnedOff_sendsNothing", async () => {
      const off = await createTenant();
      const plan = await planOfDays(4, await newGym(off), off);
      const membership = await sell(plan.id, await newCustomer(off), off.frontDesk.auth);
      await turnOff(off);

      await membershipEndService.remindEndingSoon();

      expect(await endingSoonMessages(membership.customerId)).toEqual([]);
    });

    it("remind_venueTurnedOff_sendsNothing", async () => {
      const closing = await newGym(tenant);
      const plan = await planOfDays(4, closing);
      const membership = await sell(plan.id, await newCustomer());
      await venuesService.remove(tenant.owner.auth, closing);

      await membershipEndService.remindEndingSoon();

      expect(await endingSoonMessages(membership.customerId)).toEqual([]);
    });
  });
});
