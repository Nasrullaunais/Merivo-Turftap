import { z } from "zod";

import { Id, PhoneNumber } from "./common";
import { Permission } from "./permissions";
import { StaffRole } from "./staff";

export const MyTenant = z
  .object({
    id: Id,
    slug: z.string(),
    name: z.string(),
    /** False once a Platform Admin turns the tenant off (PLA-03): staff can look but not change. */
    active: z.boolean(),
    role: StaffRole,
    /** What this role may do here, so the console can hide what the API would refuse. */
    permissions: z.array(Permission),
  })
  .meta({ id: "MyTenant" });
export type MyTenant = z.infer<typeof MyTenant>;

export const Me = z
  .object({
    id: Id,
    phone: PhoneNumber,
    name: z.string().nullable(),
    isPlatformAdmin: z.boolean(),
    tenants: z.array(MyTenant),
  })
  .meta({ id: "Me" });
export type Me = z.infer<typeof Me>;
