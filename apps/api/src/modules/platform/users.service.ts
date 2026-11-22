import * as platformRepository from "./platform.repository";

// Apart from platform.service.ts, which imports the staff module: the staff module
// needs these, and one file would make the two import each other in a circle.

/** The user with this phone, created on first use so staff can be added before they ever sign in. */
export function findOrCreateUser(phone: string) {
  return platformRepository.findOrCreateUser(phone);
}

export function usersByIds(ids: number[]) {
  return platformRepository.findUsersByIds(ids);
}

export function tenantById(id: number) {
  return platformRepository.findTenantById(id);
}
