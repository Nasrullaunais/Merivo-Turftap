import { z } from "zod";

import { Id, PhoneInput, PhoneNumber, Timestamp } from "./common";

const MAX_NAME_LENGTH = 80;
const MAX_SEARCH_LENGTH = 80;

/** One tenant's record of a person who books or buys memberships, linked by phone number. */
export const Customer = z
  .object({
    id: Id,
    phone: PhoneNumber,
    name: z.string(),
    createdAt: Timestamp,
    updatedAt: Timestamp,
  })
  .meta({ id: "Customer" });

const customerFields = {
  phone: PhoneInput,
  name: z.string().trim().min(1).max(MAX_NAME_LENGTH),
};

export const CreateCustomer = z.object(customerFields).meta({ id: "CreateCustomer" });

export const UpdateCustomer = z.object(customerFields).partial().meta({ id: "UpdateCustomer" });

export const CustomerFilters = z.object({
  phone: PhoneInput.optional(),
  /** Part of a name, or part of a phone number as people type it ("077 123"). */
  search: z.string().trim().min(1).max(MAX_SEARCH_LENGTH).optional(),
});

export const CUSTOMER_SORT_FIELDS = ["name", "createdAt"] as const;

export type Customer = z.output<typeof Customer>;
export type CreateCustomer = z.output<typeof CreateCustomer>;
export type UpdateCustomer = z.output<typeof UpdateCustomer>;
export type CustomerFilters = z.output<typeof CustomerFilters>;
