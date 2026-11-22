import { constraintErrors, Conflict, NotFound } from "../../lib/errors";

export const staffErrors = {
  notFound: (id: number) => new NotFound("tt_stf_001", `Staff ${id} was not found`),
  alreadyStaff: () => new Conflict("tt_stf_002", "This person is already staff here"),
};

constraintErrors({ staff_tenant_user_unique: staffErrors.alreadyStaff });
