import type { Currency, Money } from "@turftap/contract";
import { bigint, text, timestamp } from "drizzle-orm/pg-core";

export const idColumn = () =>
  bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity();

export const timestampColumns = () => ({
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

/** A price stored as two columns: `price_amount` in cents and `price_currency`. */
export const priceColumns = () => ({
  priceAmount: bigint("price_amount", { mode: "number" }).notNull(),
  priceCurrency: text("price_currency").$type<Currency>().notNull(),
});

type PriceFields = { priceAmount: number; priceCurrency: Currency };

export const priceOf = (row: PriceFields): Money => ({
  amount: row.priceAmount,
  currency: row.priceCurrency,
});

export const priceFields = (price: Money): PriceFields => ({
  priceAmount: price.amount,
  priceCurrency: price.currency,
});
