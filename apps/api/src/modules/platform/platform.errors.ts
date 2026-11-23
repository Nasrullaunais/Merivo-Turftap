import { BadRequest, Forbidden, NotFound, Unauthorized } from "../../lib/errors";

export const platformErrors = {
  tenantNotFound: () => new NotFound("tt_plt_001", "This venue address was not found"),
  notStaffHere: () => new Forbidden("tt_plt_002", "You are not staff at this tenant"),
  badTenantId: () => new BadRequest("tt_plt_004", "X-Tenant-Id must be a whole number"),
  wrongAssistantKey: () => new Unauthorized("tt_plt_005", "The assistant key is wrong"),
  badCustomerPhone: () =>
    new BadRequest("tt_plt_006", "X-Customer-Phone must be a phone number like +94771234567"),
};
