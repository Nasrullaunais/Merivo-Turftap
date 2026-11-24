import type { StaffRole } from "@turftap/contract";

export default {
  pickTitle: "Choose a tenant",
  noAccessTitle: "You don't have access to any venue yet",
  noAccessHint: "Ask the Owner of your venue to add your phone number as staff.",
  roles: {
    OWNER: "Owner",
    MANAGER: "Manager",
    FRONT_DESK: "Front Desk",
  } satisfies Record<StaffRole, string>,
};
