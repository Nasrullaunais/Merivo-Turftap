import type { Money } from "@turftap/contract";

const CENTS_PER_UNIT = 100;

/** "LKR 2,500". Prices are whole rupees, so no decimals are shown (VEN-05). */
export const formatMoney = ({ amount, currency }: Money) =>
  new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency,
    currencyDisplay: "code",
    maximumFractionDigits: 0,
  }).format(amount / CENTS_PER_UNIT);

/** A price typed in whole rupees, such as "4500", as the API's Money. */
export const lkr = (rupees: number): Money => ({
  amount: rupees * CENTS_PER_UNIT,
  currency: "LKR",
});

export const rupeesOf = (money: Money) => money.amount / CENTS_PER_UNIT;
