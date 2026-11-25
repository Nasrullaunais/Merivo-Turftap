import { BadRequest, Conflict, constraintErrors, Forbidden, NotFound } from "../../lib/errors";

type PaidThing = "booking" | "membership";

export const paymentErrors = {
  notFound: (id: number) => new NotFound("tt_pay_001", `Payment ${id} was not found`),
  cashNeedsConfirmed: () =>
    new Conflict(
      "tt_pay_002",
      "Cash can only be recorded on a confirmed booking or an active membership",
    ),
  alreadyFullyPaid: (what: PaidThing) =>
    new Conflict("tt_pay_003", `This ${what} is already fully paid`),
  moreThanBalance: (what: PaidThing) =>
    new Conflict("tt_pay_004", `That is more than the balance left on this ${what}`),
  refundNeedsCancelled: (what: PaidThing) =>
    new Conflict("tt_pay_005", `A refund can only be recorded on a cancelled ${what}`),
  refundMoreThanPaid: (what: PaidThing) =>
    new Conflict("tt_pay_006", `That is more than what was paid for this ${what}`),
  refundNeedsManager: () =>
    new Forbidden("tt_pay_007", "Only an Owner or Manager can record a refund"),
  wrongCurrency: (what: PaidThing) =>
    new BadRequest("tt_pay_008", `Use the ${what}'s currency`, [
      { field: "amount.currency", message: `Must match the ${what}'s price` },
    ]),
  paymentTimeLimitPassed: (what: PaidThing) =>
    new Conflict(
      "tt_pay_009",
      what === "booking"
        ? "The time to pay for this booking has passed. Please book again."
        : "The time to pay for this membership has passed. Please buy it again.",
    ),
  notWaitingForPayment: (what: PaidThing) =>
    new Conflict("tt_pay_010", `This ${what} is not waiting for payment`),
  receiptAlreadySent: () => new Conflict("tt_pay_011", "This receipt was already sent"),
  rejectReasonMissing: () =>
    new BadRequest("tt_pay_012", "Please give a reason for rejecting the receipt", [
      { field: "rejectReason", message: "Required when rejecting a receipt" },
    ]),
};

constraintErrors({ payments_file_unique: paymentErrors.receiptAlreadySent });
