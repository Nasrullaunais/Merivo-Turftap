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
  nav: { calendar: "Calendar", staff: "Staff", venues: "Venues" },
};
