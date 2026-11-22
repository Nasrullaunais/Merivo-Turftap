import { constraintErrors, Conflict, NotFound } from "../../lib/errors";

export const venueErrors = {
  notFound: (id: number) => new NotFound("tt_ven_001", `Venue ${id} was not found`),
  nameTaken: () => new Conflict("tt_ven_002", "Another venue already has this name"),
  resourceNotFound: (id: number) => new NotFound("tt_ven_003", `Resource ${id} was not found`),
  resourceNameTaken: () =>
    new Conflict("tt_ven_004", "Another resource at this venue already has this name"),
};

constraintErrors({
  venues_tenant_name_unique: venueErrors.nameTaken,
  resources_venue_name_unique: venueErrors.resourceNameTaken,
});
