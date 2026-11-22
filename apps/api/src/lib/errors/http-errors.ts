import type { FieldError } from "@turftap/contract";

import { AppError, BadRequest, Conflict, Forbidden, NotFound, Unauthorized } from "./app-error";

/** Errors that belong to no business area: bad input, sign-in, routing and database rules. */
export const httpErrors = {
  invalidRequest: (fieldErrors: FieldError[]) =>
    new BadRequest("tt_htt_400", "The request was invalid", fieldErrors),
  invalidJson: () => new BadRequest("tt_htt_400", "The request body is not valid JSON"),
  tenantMissing: () =>
    new BadRequest("tt_htt_400", "Send an X-Tenant-Id or X-Tenant-Slug header to choose a tenant"),
  notSignedIn: () => new Unauthorized("tt_htt_401", "Please sign in"),
  invalidToken: () => new Unauthorized("tt_htt_401", "Your sign-in is invalid or has expired"),
  notAllowed: () => new Forbidden("tt_htt_403", "You are not allowed to do this"),
  routeNotFound: (path: string) => new NotFound("tt_htt_404", `There is no route ${path}`),
  internal: () => new AppError(500, "tt_htt_500", "Something went wrong on our side"),

  alreadyExists: () => new Conflict("tt_dat_001", "This already exists"),
  stillInUse: () => new Conflict("tt_dat_002", "This is still in use"),
  timeTaken: () => new Conflict("tt_dat_003", "That time is already booked"),
  missingReference: () =>
    new BadRequest("tt_dat_004", "This refers to something that does not exist"),
};
