import type { StaffRole } from "@turftap/contract";

export default {
  pickTitle: "Choose a tenant",
  pickHint:
    "You're staff at more than one tenant. You can switch later from the menu at the bottom of the sidebar.",
  noAccessTitle: "You don't have access to any venue yet",
  noAccessHint: "Ask the Owner of your venue to add your phone number as staff.",
  roles: {
    OWNER: "Owner",
    MANAGER: "Manager",
    FRONT_DESK: "Front Desk",
  } satisfies Record<StaffRole, string>,
};
