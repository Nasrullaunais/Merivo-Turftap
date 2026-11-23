import type { CreateCustomer, CustomerFilters, UpdateCustomer } from "@turftap/contract";

import type { AuthContext } from "../../lib/auth/context";
import { transaction } from "../../lib/db";
import type { ListQuery } from "../../lib/resource";
import { customerErrors } from "./customers.errors";
import * as customersRepository from "./customers.repository";

type CustomerSort = "name" | "createdAt";

const SRI_LANKA_CALLING_CODE = "94";
const PHONE_PUNCTUATION = /[\s\-()+]/g;

/** "077 123" → "9477123", so a number typed the local way still finds `+94771234567`. */
function phoneDigitsOf(search: string) {
  const digits = search.replace(PHONE_PUNCTUATION, "");
  if (!/^\d+$/.test(digits)) return undefined;
  return digits.startsWith("0") ? SRI_LANKA_CALLING_CODE + digits.slice(1) : digits;
}

export function list(
  auth: AuthContext,
  { filters, page }: ListQuery<CustomerFilters, CustomerSort>,
) {
  const search = filters.search
    ? { name: filters.search, phoneDigits: phoneDigitsOf(filters.search) }
    : undefined;
  return customersRepository.list(auth.tenantId, { phone: filters.phone, search }, page);
}

export async function get(auth: AuthContext, id: number) {
  const customer = await customersRepository.findById(auth.tenantId, id);
  if (!customer) throw customerErrors.notFound(id);
  return customer;
}

export function create(auth: AuthContext, input: CreateCustomer) {
  return transaction(() => customersRepository.insert(auth.tenantId, input));
}

export function update(auth: AuthContext, id: number, input: UpdateCustomer) {
  if (Object.keys(input).length === 0) return get(auth, id);
  return transaction(async () => {
    const customer = await customersRepository.update(auth.tenantId, id, input);
    if (!customer) throw customerErrors.notFound(id);
    return customer;
  });
}

/** BKG-04: a walk-in with a known phone reuses that customer and keeps the name on record. */
export function findOrCreateByPhone(auth: AuthContext, phone: string, name: string) {
  return transaction(async () => {
    const created = await customersRepository.insertIfPhoneIsNew(auth.tenantId, { phone, name });
    return created ?? (await customersRepository.findByPhone(auth.tenantId, phone))!;
  });
}
