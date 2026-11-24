export default {
  title: "TurfTap Staff Console",
  brand: "TurfTap",
  switchTenant: "Switch tenant",
  signOut: "Sign out",
  platformAdmin: "Platform Admin",
  /** The name of the button at the bottom of the sidebar. */
  whoAndWhere: (tenant: string, role: string) => `${tenant} · ${role}`,
  mainNav: "Main",
  menu: "Menu",
  closeMenu: "Close menu",
  back: "Back",
  nav: {
    calendar: "Calendar",
    receiptChecks: "Receipt checks",
    memberships: "Memberships",
    membershipPlans: "Membership Plans",
    staff: "Staff",
    venues: "Venues",
  },
  /** The chevron that folds a sidebar section's pages open or shut. */
  showPages: (section: string) => `${section} pages`,
  /** A count badge read aloud, such as "3 waiting". */
  waitingCount: (count: number) => `${count} waiting`,
};
