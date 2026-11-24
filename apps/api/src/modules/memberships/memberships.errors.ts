import { constraintErrors, Conflict, NotFound } from "../../lib/errors";

export const membershipErrors = {
  planNotFound: (id: number) => new NotFound("tt_mem_001", `Membership Plan ${id} was not found`),
  planNameTaken: () =>
    new Conflict("tt_mem_002", "Another Membership Plan at this venue already has this name"),
};

constraintErrors({ membership_plans_venue_name_unique: membershipErrors.planNameTaken });
