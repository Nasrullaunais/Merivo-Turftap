import { z } from "zod";

import { Id, Money, PriceInput, QueryBoolean, Timestamp } from "./common";

const MAX_NAME_LENGTH = 80;

export const PLAN_LENGTH_UNITS = ["DAYS", "MONTHS"] as const;
export const PlanLengthUnit = z.enum(PLAN_LENGTH_UNITS).meta({ id: "PlanLengthUnit" });
export type PlanLengthUnit = z.output<typeof PlanLengthUnit>;

/** The longest plan staff may set up, per unit: a year in days, two years in months. */
export const MAX_PLAN_LENGTH: Record<PlanLengthUnit, number> = { DAYS: 365, MONTHS: 24 };

export const MembershipPlan = z
  .object({
    id: Id,
    venueId: Id,
    name: z.string(),
    lengthCount: z.number().int(),
    lengthUnit: PlanLengthUnit,
    price: Money,
    active: z.boolean(),
    createdAt: Timestamp,
    updatedAt: Timestamp,
  })
  .meta({ id: "MembershipPlan" });

const planFields = {
  name: z.string().trim().min(1).max(MAX_NAME_LENGTH),
  lengthCount: z.number().int().positive(),
  lengthUnit: PlanLengthUnit,
  price: PriceInput,
};

type Length = { lengthCount?: number; lengthUnit?: PlanLengthUnit };

const lengthFits = ({ lengthCount, lengthUnit }: Length) =>
  lengthCount === undefined ||
  lengthUnit === undefined ||
  lengthCount <= MAX_PLAN_LENGTH[lengthUnit];

const tooLong = {
  message: `Must be at most ${MAX_PLAN_LENGTH.DAYS} days or ${MAX_PLAN_LENGTH.MONTHS} months`,
  path: ["lengthCount"],
};

export const CreateMembershipPlan = z
  .object({ venueId: Id, ...planFields })
  .refine(lengthFits, tooLong)
  .meta({ id: "CreateMembershipPlan" });

// A plan never moves to another venue. The length is changed as a pair, so its limit can be checked.
export const UpdateMembershipPlan = z
  .object(planFields)
  .partial()
  .refine((plan) => (plan.lengthCount === undefined) === (plan.lengthUnit === undefined), {
    message: "Send lengthCount and lengthUnit together",
    path: ["lengthUnit"],
  })
  .refine(lengthFits, tooLong)
  .meta({ id: "UpdateMembershipPlan" });

export const MembershipPlanFilters = z.object({
  venueId: z.coerce.number().pipe(Id).optional(),
  active: QueryBoolean.optional(),
});

export const MEMBERSHIP_PLAN_SORT_FIELDS = ["name", "createdAt"] as const;

export type MembershipPlan = z.output<typeof MembershipPlan>;
export type CreateMembershipPlan = z.output<typeof CreateMembershipPlan>;
export type UpdateMembershipPlan = z.output<typeof UpdateMembershipPlan>;
export type MembershipPlanFilters = z.output<typeof MembershipPlanFilters>;
