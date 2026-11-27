export default {
  title: "My bookings",
  loading: "Loading your bookings",
  show: {
    label: "Show",
    upcoming: "Upcoming",
    past: "Past",
    memberships: "Memberships",
  },
  empty: {
    upcoming: {
      title: "Nothing booked yet",
      body: "Pick a venue and a time, and your booking shows up here.",
      action: "See venues",
    },
    past: { title: "No past bookings", body: "Bookings you've played move here." },
    memberships: {
      title: "No memberships",
      body: "Memberships you have at a gym show up here.",
    },
  },
  finished: "Cancelled or expired",
  older: "Show older bookings",
  failed: "We couldn't load your bookings.",
  retry: "Try again",
  /** A booking on a resource the venue has since taken off the portal. */
  someResource: "Booking",
  /** "6:00 PM – 8:00 PM · 2 hours" */
  when: (range: string, length: string) => `${range} · ${length}`,
  payLeft: (time: string) => `${time} left to pay`,
  sendReceipt: "Send receipt",
  checking: "The venue is checking your receipt",
  paid: "Paid",
  /** "LKR 4,500 to pay at the venue" */
  balance: (amount: string) => `${amount} to pay at the venue`,
  /** "Free to cancel until 6:00 PM, Fri 27 Nov" */
  cancelUntil: (time: string, day: string) => `Free to cancel until ${time}, ${day}`,
  cancel: "Cancel",
  /** Why the customer can't cancel here, then the venue's number to call. */
  callToCancel: {
    pastCutOff: (hours: string) =>
      `It's less than ${hours} before the start. To cancel, call the venue.`,
    checking: "To cancel, call the venue.",
  },
  /** "Call 011 234 5678" */
  call: (phone: string) => `Call ${phone}`,
  confirmCancel: {
    title: "Cancel this booking?",
    body: "The time goes back on the list for others to book.",
    /** "You've paid LKR 4,500. Any refund is arranged with the venue." */
    paid: (amount: string) => `You've paid ${amount}. Any refund is arranged with the venue.`,
    keep: "Keep it",
    yes: "Yes, cancel",
  },
  cancelled: "Booking cancelled",
  membership: {
    /** "Mon 1 Dec → Wed 31 Dec" */
    dates: (from: string, to: string) => `${from} → ${to}`,
    daysLeft: (days: number) => (days === 1 ? "1 day left" : `${days} days left`),
    lastDay: "Last day today",
    used: "Days used",
    startsIn: (days: number) => (days === 1 ? "Starts tomorrow" : `Starts in ${days} days`),
    renew: "Renew",
    /** "Renew now and the next one starts Tue 15 Dec." */
    renewFrom: (day: string) => `Renew now and the next one starts ${day}.`,
    /** Already renewed: "Next one starts Tue 15 Dec" */
    renewed: (day: string) => `Next one starts ${day}`,
    renewAtDesk: "Renew it at the desk",
    confirmCancel: {
      title: "Cancel this membership?",
      body: "You can buy it again later.",
    },
  },
};
