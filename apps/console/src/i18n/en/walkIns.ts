const clock = (instant: string, timeZone: string) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(instant));
const shortDate = (instant: string, timeZone: string) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(instant));

export default {
  title: "Walk-in booking",
  loading: "Loading the slot",
  /** "Fri 25 Dec, 19:00–21:00" on the venue's clock. */
  when: (startsAt: string, endsAt: string, timeZone: string) =>
    `${shortDate(startsAt, timeZone)}, ${clock(startsAt, timeZone)}–${clock(endsAt, timeZone)}`,
  phoneLabel: "Phone number",
  phoneInvalid: "Enter a phone number like 077 123 4567",
  nameLabel: "Name",
  existingCustomer: "Already a customer",
  slotsLabel: "Slots",
  paymentLabel: "Payment",
  payments: { CASH: "Paid in cash", PAY_LATER: "Pay later" },
  price: "Price",
  balance: "Balance",
  notBookable: "This time can't be booked. Pick a free slot.",
  submit: "Book",
};
