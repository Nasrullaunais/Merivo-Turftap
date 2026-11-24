import { beforeAll, describe, expect, it } from "bun:test";

import { WHATSAPP_TEMPLATES } from "../../ports/messaging-channel";
import { addDays, instantAt, todayIn } from "../../lib/time";
import {
  asAssistant,
  asCustomer,
  asStaff,
  call,
  createTenant,
  imageBytes,
  linkWhatsAppNumber,
  messagesTo,
  passTimeLimit,
  resourceInput,
  sendQueuedMessages,
  type TestTenant,
  uniquePhone,
  uploadForm,
  venueInput,
} from "../../test/fixtures";
import * as bookingExpiryService from "../bookings/booking-expiry.service";

const TIME_ZONE = "Asia/Colombo";
const MINUTES_PER_HOUR = 60;
const FIRST_HOUR = 6;
const openAllWeek = [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({
  weekday,
  opens: "06:00",
  closes: "23:00",
}));
const rupees = (amount: number) => ({ amount: amount * 100, currency: "LKR" as const });

describe("PAY-08, BKG-08 payments routes", () => {
  let tenant: TestTenant;
  let resourceId: number;
  let nextHour = FIRST_HOUR;
  const asFrontDesk = () => asStaff(tenant, tenant.frontDesk);
  const asManager = () => asStaff(tenant, tenant.manager);

  beforeAll(async () => {
    tenant = await createTenant();
    const venue = (
      await call(
        "POST",
        "/v1/venues",
        asStaff(tenant),
        venueInput({ openingHours: openAllWeek, payAtVenue: true }),
      )
    ).body.data;
    resourceId = (
      await call(
        "POST",
        "/v1/resources",
        asStaff(tenant),
        resourceInput(venue.id, { price: rupees(3_000) }),
      )
    ).body.data.id;
  });

  /** A confirmed LKR 3,000 booking, an hour later than the last one. */
  async function newBooking() {
    const phone = uniquePhone();
    await call("POST", "/v1/customers", asCustomer(tenant, phone), { name: "Nimal", phone });
    const startsAt = instantAt(
      addDays(todayIn(TIME_ZONE), 2),
      nextHour++ * MINUTES_PER_HOUR,
      TIME_ZONE,
    );
    const reply = await call("POST", "/v1/bookings", asCustomer(tenant, phone), {
      resourceId,
      startsAt: startsAt.toISOString(),
    });
    return { id: reply.body.data.id as number, phone };
  }

  const cancel = (bookingId: number) =>
    call("PATCH", `/v1/bookings/${bookingId}`, asManager(), {
      status: "CANCELLED",
      cancelReason: "Rain",
    });

  it("frontDesk_recordsCash_andTheBookingShowsWhatIsPaidAndLeft", async () => {
    const booking = await newBooking();

    const reply = await call("POST", "/v1/payments", asFrontDesk(), {
      bookingId: booking.id,
      kind: "CASH",
      amount: rupees(1_000),
    });

    expect(reply).toMatchObject({
      status: 201,
      body: {
        status: 201,
        message: "success",
        data: { bookingId: booking.id, kind: "CASH", status: "ACCEPTED", amount: rupees(1_000) },
      },
    });
    const seen = await call("GET", `/v1/bookings/${booking.id}`, asFrontDesk());
    expect(seen.body.data).toMatchObject({ paid: rupees(1_000), balance: rupees(2_000) });
    const own = await call("GET", "/v1/bookings", asCustomer(tenant, booking.phone));
    expect(own.body.data.content).toEqual([
      expect.objectContaining({ paid: rupees(1_000), balance: rupees(2_000) }),
    ]);
  });

  it("frontDesk_recordingARefund_isRefusedWith403", async () => {
    const booking = await newBooking();
    await call("POST", "/v1/payments", asFrontDesk(), {
      bookingId: booking.id,
      kind: "CASH",
      amount: rupees(3_000),
    });
    await cancel(booking.id);

    const reply = await call("POST", "/v1/payments", asFrontDesk(), {
      bookingId: booking.id,
      kind: "REFUND",
      amount: rupees(3_000),
    });

    expect(reply).toMatchObject({ status: 403, body: { code: "tt_pay_007" } });
  });

  it("manager_recordsARefundWithANote", async () => {
    const booking = await newBooking();
    await call("POST", "/v1/payments", asFrontDesk(), {
      bookingId: booking.id,
      kind: "CASH",
      amount: rupees(3_000),
    });
    await cancel(booking.id);

    const reply = await call("POST", "/v1/payments", asManager(), {
      bookingId: booking.id,
      kind: "REFUND",
      amount: rupees(3_000),
      note: "  Paid back to BOC 0071 2345 678  ",
    });

    expect(reply).toMatchObject({
      status: 201,
      body: { data: { amount: rupees(-3_000), note: "Paid back to BOC 0071 2345 678" } },
    });
  });

  it("list_filtersByBookingAndKind_newestFirst", async () => {
    const booking = await newBooking();
    const other = await newBooking();
    for (const [bookingId, amount] of [
      [booking.id, 500],
      [booking.id, 700],
      [other.id, 900],
    ] as const)
      await call("POST", "/v1/payments", asFrontDesk(), {
        bookingId,
        kind: "CASH",
        amount: rupees(amount),
      });

    const reply = await call(
      "GET",
      `/v1/payments?bookingId=${booking.id}&kind=CASH`,
      asFrontDesk(),
    );

    expect(reply.status).toBe(200);
    expect(reply.body.data.content.map((payment: { amount: unknown }) => payment.amount)).toEqual([
      rupees(700),
      rupees(500),
    ]);
    const [newest] = reply.body.data.content;
    const one = await call("GET", `/v1/payments/${newest.id}`, asFrontDesk());
    expect(one.body.data).toEqual(newest);
  });

  it("create_refusesAnAmountOfZero", async () => {
    const booking = await newBooking();
    const reply = await call("POST", "/v1/payments", asFrontDesk(), {
      bookingId: booking.id,
      kind: "CASH",
      amount: rupees(0),
    });
    expect(reply).toMatchObject({
      status: 400,
      body: { errors: [expect.objectContaining({ field: "amount.amount" })] },
    });
  });

  it("create_refusesATransferWithoutAReceipt", async () => {
    const booking = await newBooking();
    const reply = await call("POST", "/v1/payments", asFrontDesk(), {
      bookingId: booking.id,
      kind: "TRANSFER",
      amount: rupees(1_000),
    });
    expect(reply).toMatchObject({ status: 400, body: { code: "tt_htt_400" } });
  });

  it("customer_cannotSeeOrRecordPayments", async () => {
    const booking = await newBooking();
    const asTheCustomer = asCustomer(tenant, booking.phone);
    const list = await call("GET", "/v1/payments", asTheCustomer);
    const create = await call("POST", "/v1/payments", asTheCustomer, {
      bookingId: booking.id,
      kind: "CASH",
      amount: rupees(3_000),
    });
    expect([list.status, create.status]).toEqual([403, 403]);
  });

  it("get_unknownPayment_isNotFound", async () => {
    const reply = await call("GET", "/v1/payments/999999999", asFrontDesk());
    expect(reply).toMatchObject({ status: 404, body: { code: "tt_pay_001" } });
  });
});

describe("PAY-02 send a Transfer Receipt", () => {
  const PRICE_RUPEES = 3_000;
  const ADVANCE_PERCENT = 50;
  let tenant: TestTenant;
  let resourceId: number;
  let nextHour = FIRST_HOUR;

  beforeAll(async () => {
    tenant = await createTenant();
    await linkWhatsAppNumber(tenant);
    const venue = (
      await call(
        "POST",
        "/v1/venues",
        asStaff(tenant),
        venueInput({ openingHours: openAllWeek, advancePercent: ADVANCE_PERCENT }),
      )
    ).body.data;
    resourceId = (
      await call(
        "POST",
        "/v1/resources",
        asStaff(tenant),
        resourceInput(venue.id, { price: rupees(PRICE_RUPEES) }),
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

  /** An online booking waiting for payment, an hour later than the last one. */
  async function newBooking(phone: string) {
    const startsAt = instantAt(
      addDays(todayIn(TIME_ZONE), 2),
      nextHour++ * MINUTES_PER_HOUR,
      TIME_ZONE,
    );
    const reply = await call("POST", "/v1/bookings", asCustomer(tenant, phone), {
      resourceId,
      startsAt: startsAt.toISOString(),
    });
    expect(reply.body.data.status).toBe("AWAITING_PAYMENT");
    return reply.body.data as { id: number; amountDue: { amount: number } };
  }

  async function uploadReceipt(as: Parameters<typeof call>[2]) {
    const reply = await call("POST", "/v1/files", as, uploadForm(imageBytes(), "RECEIPT"));
    expect(reply.status).toBe(201);
    return reply.body.data.id as number;
  }

  const send = (as: Parameters<typeof call>[2], bookingId: number, fileId: number) =>
    call("POST", "/v1/payments", as, { kind: "TRANSFER", bookingId, fileId });

  const statusOf = async (bookingId: number) =>
    (await call("GET", `/v1/bookings/${bookingId}`, asStaff(tenant))).body.data.status;

  it("transfer_paysTheAmountDue_andTheBookingWaitsForACheck", async () => {
    const { phone } = await newCustomer();
    const booking = await newBooking(phone);
    const as = asCustomer(tenant, phone);

    const reply = await send(as, booking.id, await uploadReceipt(as));

    expect(reply.status).toBe(201);
    expect(reply.body.data).toMatchObject({
      bookingId: booking.id,
      kind: "TRANSFER",
      status: "PENDING_CHECK",
      amount: rupees((PRICE_RUPEES * ADVANCE_PERCENT) / 100),
      receiptUrl: expect.stringContaining(`/${tenant.id}/receipts/`),
    });
    expect(await statusOf(booking.id)).toBe("AWAITING_CHECK");
  });

  it("transfer_staffSeeTheReceiptLinkOnThePayment", async () => {
    const { phone } = await newCustomer();
    const booking = await newBooking(phone);
    const as = asCustomer(tenant, phone);
    const sent = await send(as, booking.id, await uploadReceipt(as));

    const reply = await call("GET", `/v1/payments/${sent.body.data.id}`, asStaff(tenant));

    expect(reply.body.data.receiptUrl).toStartWith(
      sent.body.data.receiptUrl.split("?")[0] as string,
    );
  });

  it("transfer_thenTheExpiryJobDoesNothing", async () => {
    const { phone, id: customerId } = await newCustomer();
    const booking = await newBooking(phone);
    const as = asCustomer(tenant, phone);
    await send(as, booking.id, await uploadReceipt(as));

    await bookingExpiryService.expire(tenant.id, booking.id);

    expect(await statusOf(booking.id)).toBe("AWAITING_CHECK");
    await sendQueuedMessages(customerId);
    const expired = messagesTo(phone).filter(
      (m) => m.kind === "template" && m.template === WHATSAPP_TEMPLATES.bookingExpired,
    );
    expect(expired).toEqual([]);
  });

  it("transfer_afterTheBookingExpired_isRefused", async () => {
    const { phone } = await newCustomer();
    const booking = await newBooking(phone);
    await passTimeLimit(booking.id);
    await bookingExpiryService.expire(tenant.id, booking.id);
    const as = asCustomer(tenant, phone);

    const reply = await send(as, booking.id, await uploadReceipt(as));

    expect(reply).toMatchObject({ status: 409, body: { code: "tt_pay_009" } });
    expect(await statusOf(booking.id)).toBe("EXPIRED");
  });

  it("transfer_pastTheTimeLimitBeforeTheJobRan_isRefused", async () => {
    const { phone } = await newCustomer();
    const booking = await newBooking(phone);
    await passTimeLimit(booking.id);
    const as = asCustomer(tenant, phone);

    const reply = await send(as, booking.id, await uploadReceipt(as));

    expect(reply).toMatchObject({ status: 409, body: { code: "tt_pay_009" } });
    expect(await statusOf(booking.id)).toBe("AWAITING_PAYMENT");
  });

  it("transfer_twiceForOneBooking_isRefused", async () => {
    const { phone } = await newCustomer();
    const booking = await newBooking(phone);
    const as = asCustomer(tenant, phone);
    await send(as, booking.id, await uploadReceipt(as));

    const reply = await send(as, booking.id, await uploadReceipt(as));

    expect(reply).toMatchObject({ status: 409, body: { code: "tt_pay_010" } });
  });

  it("transfer_oneReceiptFileForTwoBookings_isRefused", async () => {
    const { phone } = await newCustomer();
    const as = asCustomer(tenant, phone);
    const fileId = await uploadReceipt(as);
    await send(as, (await newBooking(phone)).id, fileId);

    const reply = await send(as, (await newBooking(phone)).id, fileId);

    expect(reply).toMatchObject({ status: 409, body: { code: "tt_pay_011" } });
  });

  it("transfer_forAnotherCustomersBooking_isNotFound", async () => {
    const owner = await newCustomer();
    const booking = await newBooking(owner.phone);
    const other = asCustomer(tenant, (await newCustomer()).phone);

    const reply = await send(other, booking.id, await uploadReceipt(other));

    expect(reply).toMatchObject({ status: 404, body: { code: "tt_bkg_001" } });
    expect(await statusOf(booking.id)).toBe("AWAITING_PAYMENT");
  });

  it("transfer_withAnotherCustomersReceiptFile_isNotFound", async () => {
    const stranger = asCustomer(tenant, (await newCustomer()).phone);
    const strangersFile = await uploadReceipt(stranger);
    const { phone } = await newCustomer();
    const booking = await newBooking(phone);

    const reply = await send(asCustomer(tenant, phone), booking.id, strangersFile);

    expect(reply).toMatchObject({ status: 404, body: { code: "tt_fil_001" } });
    expect(await statusOf(booking.id)).toBe("AWAITING_PAYMENT");
  });

  it("transfer_withAPhotoFile_isNotFound", async () => {
    const { phone } = await newCustomer();
    const booking = await newBooking(phone);
    const photo = await call("POST", "/v1/files", asStaff(tenant), uploadForm(imageBytes()));

    const reply = await send(asStaff(tenant), booking.id, photo.body.data.id);

    expect(reply).toMatchObject({ status: 404, body: { code: "tt_fil_001" } });
  });

  it("transfer_byTheAssistantForItsCustomer", async () => {
    const { phone } = await newCustomer();
    const booking = await newBooking(phone);
    const as = asAssistant(tenant, phone);

    const reply = await send(as, booking.id, await uploadReceipt(as));

    expect(reply.status).toBe(201);
    expect(await statusOf(booking.id)).toBe("AWAITING_CHECK");
  });

  it("transfer_byFrontDeskForACustomer", async () => {
    const { phone } = await newCustomer();
    const booking = await newBooking(phone);
    const as = asStaff(tenant, tenant.frontDesk);

    const reply = await send(as, booking.id, await uploadReceipt(as));

    expect(reply.body.data).toMatchObject({
      status: "PENDING_CHECK",
      createdBy: tenant.frontDesk.userId,
    });
  });

  it("cashOrRefund_byACustomerOrTheAssistant_isRefused", async () => {
    const { phone } = await newCustomer();
    const booking = await newBooking(phone);
    for (const as of [asCustomer(tenant, phone), asAssistant(tenant, phone)]) {
      for (const kind of ["CASH", "REFUND"]) {
        const reply = await call("POST", "/v1/payments", as, {
          bookingId: booking.id,
          kind,
          amount: rupees(100),
        });
        expect(reply).toMatchObject({ status: 403, body: { code: "tt_htt_403" } });
      }
    }
  });

  it("transfer_withoutAFile_namesTheMissingField", async () => {
    const reply = await call("POST", "/v1/payments", asStaff(tenant), {
      kind: "TRANSFER",
      bookingId: 1,
    });
    expect(reply.status).toBe(400);
    expect(reply.body.errors.map((e: { field: string }) => e.field)).toEqual(["fileId"]);
  });
});
