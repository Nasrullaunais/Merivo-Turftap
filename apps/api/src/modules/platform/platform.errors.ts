import { BadRequest, Forbidden, NotFound, Unauthorized } from "../../lib/errors";

export const platformErrors = {
  tenantNotFound: () => new NotFound("tt_plt_001", "This venue address was not found"),
  notStaffHere: () => new Forbidden("tt_plt_002", "You are not staff at this tenant"),
  customerSignInNotBuilt: () =>
    new Unauthorized("tt_plt_003", "Customer sign-in is not available yet"),
  badTenantId: () => new BadRequest("tt_plt_004", "X-Tenant-Id must be a whole number"),
};
