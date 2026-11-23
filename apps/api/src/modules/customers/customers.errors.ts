import { constraintErrors, Conflict, NotFound } from "../../lib/errors";

export const customerErrors = {
  notFound: (id: number) => new NotFound("tt_cus_001", `Customer ${id} was not found`),
  phoneTaken: () => new Conflict("tt_cus_002", "Another customer already has this phone number"),
};

constraintErrors({ customers_tenant_phone_unique: customerErrors.phoneTaken });
