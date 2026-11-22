import { z } from "zod";

import { Id, LocalTime, Money, PriceInput, Timestamp } from "./common";
import { Weekday } from "./venues";

const DAYS_IN_WEEK = 7;

export const PriceRule = z
  .object({
    id: Id,
    resourceId: Id,
    weekdays: z.array(Weekday),
    startTime: LocalTime,
    endTime: LocalTime,
    price: Money,
    createdAt: Timestamp,
    updatedAt: Timestamp,
  })
  .meta({ id: "PriceRule" });

const Weekdays = z
  .array(Weekday)
  .min(1)
  .max(DAYS_IN_WEEK)
  .refine((days) => new Set(days).size === days.length, {
    message: "Each weekday may appear once",
  });

const priceRuleFields = {
  weekdays: Weekdays,
  startTime: LocalTime,
  endTime: LocalTime,
  price: PriceInput,
};

const endsAfterStart = (rule: { startTime?: string; endTime?: string }) =>
  rule.startTime === undefined || rule.endTime === undefined || rule.startTime < rule.endTime;
const END_AFTER_START = { message: "Must end after it starts", path: ["endTime"] };

export const CreatePriceRule = z
  .object({ resourceId: Id, ...priceRuleFields })
  .refine(endsAfterStart, END_AFTER_START)
  .meta({ id: "CreatePriceRule" });

// A Price Rule never moves to another resource, so resourceId can't be changed.
export const UpdatePriceRule = z
  .object(priceRuleFields)
  .partial()
  .refine(endsAfterStart, END_AFTER_START)
  .meta({ id: "UpdatePriceRule" });

export const PriceRuleFilters = z.object({
  resourceId: z.coerce.number().pipe(Id).optional(),
});

export const PRICE_RULE_SORT_FIELDS = ["startTime", "createdAt"] as const;

export type PriceRule = z.output<typeof PriceRule>;
export type CreatePriceRule = z.output<typeof CreatePriceRule>;
export type UpdatePriceRule = z.output<typeof UpdatePriceRule>;
export type PriceRuleFilters = z.output<typeof PriceRuleFilters>;
