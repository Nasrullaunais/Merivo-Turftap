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

/** Customers and the Assistant only ever reach the record with the caller's own phone. */
function ownPhoneOf(auth: AuthContext) {
  if (auth.actor !== "customer" && auth.actor !== "assistant") return undefined;
  if (!auth.phone) throw new Error(`A ${auth.actor} caller arrived without a phone`);
  return auth.phone;
}

export function list(
  auth: AuthContext,
  { filters, page }: ListQuery<CustomerFilters, CustomerSort>,
) {
  const search = filters.search
    ? { name: filters.search, phoneDigits: phoneDigitsOf(filters.search) }
    : undefined;
  const query = { phone: filters.phone, ownPhone: ownPhoneOf(auth), search };
  return customersRepository.list(auth.tenantId, query, page);
}

export async function get(auth: AuthContext, id: number) {
  const customer = await customersRepository.findById(auth.tenantId, id, ownPhoneOf(auth));
  if (!customer) throw customerErrors.notFound(id);
  return customer;
}

export function create(auth: AuthContext, input: CreateCustomer) {
  const ownPhone = ownPhoneOf(auth);
  if (ownPhone !== undefined && input.phone !== ownPhone) throw customerErrors.notYourPhone();
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

/** Name and phone of each customer, for showing who a booking belongs to. */
export async function contactsOf(tenantId: number, ids: number[]) {
  const found = ids.length ? await customersRepository.findByIds(tenantId, [...new Set(ids)]) : [];
  return new Map(found.map(({ id, name, phone }) => [id, { name, phone }]));
}

export async function findIdByPhone(tenantId: number, phone: string) {
  return (await customersRepository.findByPhone(tenantId, phone))?.id;
}

/** BKG-04: a walk-in with a known phone reuses that customer and keeps the name on record. */
export function findOrCreateByPhone(auth: AuthContext, phone: string, name: string) {
  return transaction(async () => {
    const created = await customersRepository.insertIfPhoneIsNew(auth.tenantId, { phone, name });
    return created ?? (await customersRepository.findByPhone(auth.tenantId, phone))!;
  });
}
