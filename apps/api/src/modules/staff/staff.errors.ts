import { constraintErrors, Conflict, NotFound } from "../../lib/errors";

export const staffErrors = {
  notFound: (id: number) => new NotFound("tt_stf_001", `Staff ${id} was not found`),
  alreadyStaff: () => new Conflict("tt_stf_002", "This person is already staff here"),
  lastOwner: () =>
    new Conflict(
      "tt_stf_003",
      "A tenant needs at least one Owner. Make someone else an Owner first.",
    ),
};

constraintErrors({ staff_tenant_user_unique: staffErrors.alreadyStaff });
