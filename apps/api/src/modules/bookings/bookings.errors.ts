import { BadRequest, constraintErrors, Conflict, NotFound } from "../../lib/errors";

export const bookingErrors = {
  notFound: (id: number) => new NotFound("tt_bkg_001", `Booking ${id} was not found`),
  slotTaken: () => new Conflict("tt_bkg_002", "That slot was just taken. Please pick another time"),
  alreadyAwaitingPayment: () =>
    new Conflict(
      "tt_bkg_003",
      "You already have a booking waiting for payment. Pay for it or cancel it first",
    ),
  notBookable: () =>
    new Conflict("tt_bkg_004", "That time can't be booked. Please pick a free slot"),
  noCustomerRecord: () =>
    new Conflict("tt_bkg_005", "Please add your name before your first booking"),
  pastCancellationCutOff: (venueName: string, venuePhone: string) =>
    new Conflict(
      "tt_bkg_006",
      `It's too late to cancel online. Please call ${venueName} on ${venuePhone}`,
    ),
  cancelReasonMissing: () =>
    new BadRequest("tt_bkg_007", "Please give a reason for cancelling", [
      { field: "cancelReason", message: "Required when staff cancel a booking" },
    ]),
};

constraintErrors({
  bookings_no_overlap: bookingErrors.slotTaken,
  bookings_one_awaiting_payment: bookingErrors.alreadyAwaitingPayment,
});
