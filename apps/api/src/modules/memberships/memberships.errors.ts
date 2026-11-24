import { BadRequest, constraintErrors, Conflict, NotFound } from "../../lib/errors";

export const membershipErrors = {
  planNotFound: (id: number) => new NotFound("tt_mem_001", `Membership Plan ${id} was not found`),
  planNameTaken: () =>
    new Conflict("tt_mem_002", "Another Membership Plan at this venue already has this name"),
  notFound: (id: number) => new NotFound("tt_mem_003", `Membership ${id} was not found`),
  planNotOnSale: () => new Conflict("tt_mem_004", "This Membership Plan is no longer on sale"),
  startsInThePast: () =>
    new BadRequest("tt_mem_005", "A membership can't start before today", [
      { field: "startsOn", message: "Must be today or later" },
    ]),
  // OQ-03: until venue owners answer, Pay at Venue venues sell memberships only at the desk.
  soldAtTheDesk: (venueName: string) =>
    new Conflict("tt_mem_006", `${venueName} sells memberships at the desk. Please buy it there`),
  alreadyHeld: () =>
    new Conflict(
      "tt_mem_007",
      "This customer already has this plan for some of those days. Cancel that one first",
    ),
  noCustomerRecord: () =>
    new Conflict("tt_mem_008", "Please add your name before buying a membership"),
  walkInMissing: () =>
    new BadRequest("tt_mem_009", "Please give the customer's name, phone and how they pay", [
      { field: "walkIn", message: "Required when staff sell a membership" },
    ]),
  cancelReasonMissing: () =>
    new BadRequest("tt_mem_010", "Please give a reason for cancelling", [
      { field: "cancelReason", message: "Required when staff cancel a membership" },
    ]),
};

constraintErrors({
  membership_plans_venue_name_unique: membershipErrors.planNameTaken,
  memberships_no_overlap: membershipErrors.alreadyHeld,
});
