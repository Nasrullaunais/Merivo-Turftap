import type { PlanLengthUnit } from "@turftap/contract";

const plural = (count: number, one: string) => (count === 1 ? `1 ${one}` : `${count} ${one}s`);

export default {
  /** "1 month", "3 months", "10 days" */
  planLength: (count: number, unit: PlanLengthUnit) =>
    plural(count, unit === "MONTHS" ? "month" : "day"),
  /** "30 days", the days a membership covers, both ends included. */
  days: (count: number) => plural(count, "day"),
  status: {
    AWAITING_PAYMENT: "Waiting for payment",
    AWAITING_CHECK: "Waiting for receipt check",
    ACTIVE: "Active",
    EXPIRED: "Expired",
    CANCELLED: "Cancelled",
    ENDED: "Ended",
  },
  plans: {
    title: "Gym memberships",
    loading: "Loading memberships",
    /** MEM-02, OQ-03: a Pay at Venue venue sells memberships only at the desk for now. */
    atDesk: "Buy at the desk",
    bestValue: "Best value",
    /** "LKR 200 a day", the price shared over the days a plan covers from today. */
    perDay: (price: string) => `${price} a day`,
    /** "From LKR 2,500", on the gym's card. */
    from: (price: string) => `From ${price}`,
    count: (plans: number) => (plans === 1 ? "1 plan" : `${plans} plans`),
  },
  ticket: {
    from: "From",
    to: "To",
    /** "Fri 27 Nov to Sat 26 Dec", read out instead of the two calendar leaves. */
    range: (from: string, to: string) => `${from} to ${to}`,
  },
  buy: {
    title: "Start your membership",
    renewTitle: "Renew your membership",
    when: "When do you want to start?",
    /** Shown instead of the days when renewing (MEM-04). */
    renewStarts: (day: string) => `Starts ${day}`,
    renewWhy: "The day after your current one ends, so there's no gap.",
    price: "Price",
    paidHow: "Paid in full by bank transfer",
    timeLimit: (minutes: string) => `After you buy, you have ${minutes} to send the bank transfer.`,
    submit: "Buy membership",
    renewSubmit: "Renew membership",
    waiting: {
      AWAITING_PAYMENT: {
        title: "This membership is waiting for payment",
        body: "Pay for it or cancel it before you buy it again.",
      },
      AWAITING_CHECK: {
        title: "The venue is checking your receipt",
        body: "You can renew once this membership is active.",
      },
      open: "Open that membership",
    },
    atDesk: {
      title: "Buy this at the desk",
      body: (venue: string) => `${venue} sells memberships at the desk for now.`,
    },
  },
  loading: "Loading your membership",
  done: {
    checking: {
      title: "Receipt sent",
      body: "The venue is checking it. You'll get a WhatsApp message once your membership is active.",
    },
    active: {
      title: "Your membership is active",
      /** "Use the gym from Fri 27 Nov to Sat 26 Dec." */
      body: (from: string, to: string) => `Use the gym from ${from} to ${to}.`,
    },
    expired: {
      title: "The time to pay ran out",
      body: "It wasn't paid in time. Buy it again if you still want it.",
    },
    cancelled: {
      title: "This membership was cancelled",
      reason: (reason: string) => `Reason: ${reason}`,
    },
    ended: {
      title: "This membership has ended",
      body: (day: string) => `Its last day was ${day}.`,
    },
    again: "Buy again",
  },
  notFound: {
    title: "Membership not found",
    body: "It may belong to another phone number.",
    home: "See venues",
  },
  planNotFound: {
    title: "This membership isn't on sale",
    body: "The venue may have stopped selling it.",
    home: "See venues",
  },
};
