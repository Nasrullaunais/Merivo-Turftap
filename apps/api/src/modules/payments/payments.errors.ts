import { BadRequest, Conflict, constraintErrors, Forbidden, NotFound } from "../../lib/errors";

export const paymentErrors = {
  notFound: (id: number) => new NotFound("tt_pay_001", `Payment ${id} was not found`),
  cashNeedsConfirmedBooking: () =>
    new Conflict("tt_pay_002", "Cash can only be recorded on a confirmed booking"),
  alreadyFullyPaid: () => new Conflict("tt_pay_003", "This booking is already fully paid"),
  moreThanBalance: () =>
    new Conflict("tt_pay_004", "That is more than the balance left on this booking"),
  refundNeedsCancelledBooking: () =>
    new Conflict("tt_pay_005", "A refund can only be recorded on a cancelled booking"),
  refundMoreThanPaid: () =>
    new Conflict("tt_pay_006", "That is more than what was paid for this booking"),
  refundNeedsManager: () =>
    new Forbidden("tt_pay_007", "Only an Owner or Manager can record a refund"),
  wrongCurrency: () =>
    new BadRequest("tt_pay_008", "Use the booking's currency", [
      { field: "amount.currency", message: "Must match the booking's price" },
    ]),
  paymentTimeLimitPassed: () =>
    new Conflict("tt_pay_009", "The time to pay for this booking has passed. Please book again."),
  notWaitingForPayment: () => new Conflict("tt_pay_010", "This booking is not waiting for payment"),
  receiptAlreadySent: () => new Conflict("tt_pay_011", "This receipt was already sent"),
};

constraintErrors({ payments_file_unique: paymentErrors.receiptAlreadySent });
