import {
  BadRequest,
  Conflict,
  constraintErrors,
  Forbidden,
  NotFound,
  Unauthorized,
} from "../../lib/errors";

export const platformErrors = {
  tenantNotFound: () => new NotFound("tt_plt_001", "This venue address was not found"),
  notStaffHere: () => new Forbidden("tt_plt_002", "You are not staff at this tenant"),
  badTenantId: () => new BadRequest("tt_plt_004", "X-Tenant-Id must be a whole number"),
  wrongAssistantKey: () => new Unauthorized("tt_plt_005", "The assistant key is wrong"),
  badCustomerPhone: () =>
    new BadRequest("tt_plt_006", "X-Customer-Phone must be a phone number like +94771234567"),
  numberTaken: () =>
    new Conflict("tt_plt_007", "This WhatsApp number is already linked to a tenant"),
  tenantHasNumber: () =>
    new Conflict("tt_plt_008", "This tenant already has a WhatsApp number. Unlink it first"),
  noNumber: () => new NotFound("tt_plt_009", "This tenant has no WhatsApp number"),
};

constraintErrors({
  whatsapp_numbers_phone_number_id_unique: platformErrors.numberTaken,
  whatsapp_numbers_phone_unique: platformErrors.numberTaken,
  whatsapp_numbers_tenant_unique: platformErrors.tenantHasNumber,
});
