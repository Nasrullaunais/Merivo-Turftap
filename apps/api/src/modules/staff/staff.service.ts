import type { StaffRole } from "../../lib/auth/context";
import * as staffRepository from "./staff.repository";

export async function roleOf(tenantId: number, userId: number): Promise<StaffRole | undefined> {
  return (await staffRepository.findByUser(tenantId, userId))?.role;
}
