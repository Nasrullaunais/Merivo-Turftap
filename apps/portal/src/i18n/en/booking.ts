const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const BYTES_PER_MB = 1024 * 1024;

export default {
  day: "Day",
  loading: "Loading your booking",
  confirm: {
    title: "Check your booking",
    changeTime: "Change time",
    price: "Price",
    payNow: "Pay now",
    /** "50%", on the "pay now" part of the price bar. */
    share: (percent: number) => `${percent}%`,
    atVenueLater: "At the venue",
    /** Read out with the price bar, which shows it only as two lengths. */
    split: (now: string, later: string) => `${now} now, ${later} at the venue`,
    timeLimit: (minutes: string) =>
      `After you confirm, you have ${minutes} to send the bank transfer.`,
    submit: "Confirm booking",
  },
  /** Shown back on the time list when the chosen time went to someone else. */
  justTaken: {
    title: "That time isn't free any more",
    body: "Someone booked it a moment ago. Pick another time.",
  },
  /** The steps from confirming to booked (components/Journey.tsx). */
  journey: {
    title: "Your steps",
    confirm: "Confirm",
    transfer: "Transfer",
    receipt: "Receipt",
    booked: "Booked",
    payThere: "Pay there",
    checking: "Checking",
    done: "done",
    membership: { confirm: "Buy", booked: "Active" },
  },
  waiting: {
    title: "You have a booking waiting for payment",
    body: "Pay for it or cancel it before you book again.",
    open: "Open that booking",
  },
  status: {
    AWAITING_PAYMENT: "Waiting for payment",
    AWAITING_CHECK: "Waiting for receipt check",
    CONFIRMED: "Confirmed",
    EXPIRED: "Expired",
    CANCELLED: "Cancelled",
  },
  pay: {
    title: (amount: string) => `Send ${amount} to confirm`,
    /** "By 4:34 PM, Fri 27 Nov", on the venue's clock. */
    by: (time: string, day: string) => `By ${time}, ${day}`,
    /** "18:42" under an hour, "23h 59m" above it. */
    timeLeft: (ms: number) => {
      const seconds = Math.max(0, Math.ceil(ms / 1000));
      const minutes = Math.floor(seconds / SECONDS_PER_MINUTE);
      if (minutes >= MINUTES_PER_HOUR) {
        return `${Math.floor(minutes / MINUTES_PER_HOUR)}h ${minutes % MINUTES_PER_HOUR}m`;
      }
      return `${minutes}:${String(seconds % SECONDS_PER_MINUTE).padStart(2, "0")}`;
    },
    timeLeftLabel: (time: string) => `${time} left to pay`,
    transferStep: "Transfer the money",
    receiptStep: "Send the receipt",
    amount: "Amount",
    bank: "Bank",
    branch: "Branch",
    accountName: "Account name",
    accountNumber: "Account number",
    copy: (what: string) => `Copy ${what.toLowerCase()}`,
    copied: "Copied",
    restAtVenue: (amount: string) => `The other ${amount} is paid at the venue.`,
    tapToCopy: "Tap any line to copy it",
    noBankAccount: (phone: string) =>
      `This venue hasn't added its bank details yet. Call ${phone} to ask how to pay.`,
  },
  receipt: {
    choose: "Choose your receipt",
    chooseBody: "A photo or screenshot of the transfer",
    rules: "JPG, PNG or PDF, up to 5 MB",
    drop: "Drop it here",
    wrongType: "That file isn't a JPG, PNG or PDF. Choose another one.",
    /** "That file is 6.2 MB. …" */
    tooBig: (size: string) => `That file is ${size}. Choose one of 5 MB or less.`,
    /** Rounded up, so a file just over the limit never reads as "5.0 MB". */
    size: (bytes: number) => `${(Math.ceil((bytes / BYTES_PER_MB) * 10) / 10).toFixed(1)} MB`,
    remove: "Choose another file",
    send: "Send receipt",
    preview: "Your receipt",
  },
  done: {
    checking: {
      title: "Receipt sent",
      body: "The venue is checking it. You'll get a WhatsApp message once it's confirmed.",
    },
    booked: {
      title: "You're booked",
      paid: "See you at the venue.",
      /** "Pay LKR 4,500 at the venue." */
      balance: (amount: string) => `Pay ${amount} at the venue.`,
    },
    expired: {
      title: "The time to pay ran out",
      body: "The time is free for others again. Book again if you still want it.",
      again: "Book again",
    },
    cancelled: {
      title: "This booking was cancelled",
      reason: (reason: string) => `Reason: ${reason}`,
    },
  },
  notFound: {
    title: "Booking not found",
    body: "It may belong to another phone number.",
    home: "See venues",
  },
};
