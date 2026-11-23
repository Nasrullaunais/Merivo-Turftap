import { afterEach, beforeAll, describe, expect, it } from "bun:test";

import { addDays, instantAt, todayIn } from "../../lib/time";
import {
  asCustomer,
  asStaff,
  call,
  createTenant,
  imageBytes,
  resourceInput,
  type TestTenant,
  uniquePhone,
  uploadForm,
  venueInput,
} from "../../test/fixtures";
import { testPorts } from "../../test/ports";
import * as receiptReadingService from "./receipt-reading.service";

const TEN_O_CLOCK = 10 * 60;
const openAllWeek = [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({
  weekday,
  opens: "06:00",
  closes: "23:00",
}));
const cash = { amount: 50_000, currency: "LKR" };
const defaultAnswer = testPorts.receiptReader.reading;

describe("payments tenant isolation", () => {
  let tenantA: TestTenant;
  let tenantB: TestTenant;
  let bookingOfB: number;
  let paymentOfB: number;

  afterEach(() => {
    testPorts.receiptReader.reading = defaultAnswer;
  });

  beforeAll(async () => {
    tenantA = await createTenant();
    tenantB = await createTenant();
    const venue = (
      await call(
        "POST",
        "/v1/venues",
        asStaff(tenantB),
        venueInput({ openingHours: openAllWeek, payAtVenue: true }),
      )
    ).body.data;
    const resourceId = (
      await call("POST", "/v1/resources", asStaff(tenantB), resourceInput(venue.id))
    ).body.data.id;
    const phone = uniquePhone();
    await call("POST", "/v1/customers", asCustomer(tenantB, phone), { name: "Nimal", phone });
    bookingOfB = (
      await call("POST", "/v1/bookings", asCustomer(tenantB, phone), {
        resourceId,
        startsAt: instantAt(addDays(todayIn("Asia/Colombo"), 2), TEN_O_CLOCK, "Asia/Colombo"),
      })
    ).body.data.id;
    paymentOfB = (
      await call("POST", "/v1/payments", asStaff(tenantB), {
        bookingId: bookingOfB,
        kind: "CASH",
        amount: cash,
      })
    ).body.data.id;
  });

  it("payments_anotherTenantsPaymentIsNeverSeen", async () => {
    const list = await call("GET", "/v1/payments", asStaff(tenantA));
    expect(list.body.data.totalElements).toBe(0);
    const filtered = await call("GET", `/v1/payments?bookingId=${bookingOfB}`, asStaff(tenantA));
    expect(filtered.body.data.totalElements).toBe(0);
    const one = await call("GET", `/v1/payments/${paymentOfB}`, asStaff(tenantA));
    expect(one).toMatchObject({ status: 404, body: { code: "tt_pay_001" } });
  });

  it("payments_cannotBeRecordedOnAnotherTenantsBooking", async () => {
    const reply = await call("POST", "/v1/payments", asStaff(tenantA), {
      bookingId: bookingOfB,
      kind: "CASH",
      amount: cash,
    });
    expect(reply).toMatchObject({ status: 404, body: { code: "tt_bkg_001" } });
    const own = await call("GET", `/v1/bookings/${bookingOfB}`, asStaff(tenantB));
    expect(own.body.data.paid).toEqual(cash);
  });

  const uploadReceipt = async (as: Parameters<typeof call>[2]) =>
    (await call("POST", "/v1/files", as, uploadForm(imageBytes(), "RECEIPT"))).body.data
      .id as number;

  it("transfer_cannotBeSentForAnotherTenantsBooking", async () => {
    const as = asStaff(tenantA);
    const reply = await call("POST", "/v1/payments", as, {
      kind: "TRANSFER",
      bookingId: bookingOfB,
      fileId: await uploadReceipt(as),
    });
    expect(reply).toMatchObject({ status: 404, body: { code: "tt_bkg_001" } });
  });

  it("transfer_cannotUseAReceiptFileFromAnotherTenant", async () => {
    const phone = uniquePhone();
    for (const tenant of [tenantA, tenantB])
      await call("POST", "/v1/customers", asCustomer(tenant, phone), { name: "Nimal", phone });
    const fileOfB = await uploadReceipt(asCustomer(tenantB, phone));
    const venueOfA = (
      await call("POST", "/v1/venues", asStaff(tenantA), venueInput({ openingHours: openAllWeek }))
    ).body.data.id;
    const resourceOfA = (
      await call("POST", "/v1/resources", asStaff(tenantA), resourceInput(venueOfA))
    ).body.data.id;
    const bookingOfA = (
      await call("POST", "/v1/bookings", asCustomer(tenantA, phone), {
        resourceId: resourceOfA,
        startsAt: instantAt(addDays(todayIn("Asia/Colombo"), 2), TEN_O_CLOCK, "Asia/Colombo"),
      })
    ).body.data.id;

    const reply = await call("POST", "/v1/payments", asCustomer(tenantA, phone), {
      kind: "TRANSFER",
      bookingId: bookingOfA,
      fileId: fileOfB,
    });

    expect(reply).toMatchObject({ status: 404, body: { code: "tt_fil_001" } });
    const booking = await call("GET", `/v1/bookings/${bookingOfA}`, asStaff(tenantA));
    expect(booking.body.data.status).toBe("AWAITING_PAYMENT");
  });

  /** A new venue and customer in `tenant`, an online booking, and a receipt with `bytes`. */
  async function sendReceiptIn(tenant: TestTenant, bytes: Uint8Array) {
    const venueId = (
      await call("POST", "/v1/venues", asStaff(tenant), venueInput({ openingHours: openAllWeek }))
    ).body.data.id;
    const resourceId = (
      await call("POST", "/v1/resources", asStaff(tenant), resourceInput(venueId))
    ).body.data.id;
    const phone = uniquePhone();
    const as = asCustomer(tenant, phone);
    await call("POST", "/v1/customers", as, { name: "Nimal", phone });
    const bookingId = (
      await call("POST", "/v1/bookings", as, {
        resourceId,
        startsAt: instantAt(addDays(todayIn("Asia/Colombo"), 2), TEN_O_CLOCK, "Asia/Colombo"),
      })
    ).body.data.id;
    const fileId = (await call("POST", "/v1/files", as, uploadForm(bytes, "RECEIPT"))).body.data.id;
    const payment = await call("POST", "/v1/payments", as, { kind: "TRANSFER", bookingId, fileId });
    return payment.body.data.id as number;
  }

  it("receiptReading_aReceiptUsedInAnotherTenant_isNotADuplicate", async () => {
    const bytes = imageBytes();
    bytes.set(new TextEncoder().encode("tenancy"), bytes.length - "tenancy".length);
    const reference = `TEN${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    testPorts.receiptReader.reading = { amount: null, paidOn: null, bank: null, reference };
    const paymentOfB = await sendReceiptIn(tenantB, bytes);
    await receiptReadingService.read(tenantB.id, paymentOfB);
    const paymentOfA = await sendReceiptIn(tenantA, bytes);

    await receiptReadingService.read(tenantA.id, paymentOfA);

    const reply = await call("GET", `/v1/payments/${paymentOfA}`, asStaff(tenantA));
    expect(reply.body.data.receiptReading).toMatchObject({
      reference,
      referenceNew: true,
      duplicateOf: null,
    });
  });
});
