import { constraintErrors, Conflict, Forbidden, NotFound } from "../../lib/errors";

export const customerErrors = {
  notFound: (id: number) => new NotFound("tt_cus_001", `Customer ${id} was not found`),
  phoneTaken: () => new Conflict("tt_cus_002", "Another customer already has this phone number"),
  notYourPhone: () =>
    new Forbidden("tt_cus_003", "You can only create a customer record for your own phone number"),
};

constraintErrors({ customers_tenant_phone_unique: customerErrors.phoneTaken });
