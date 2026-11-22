import { z } from "zod";

import { Id, PhoneNumber } from "./common";
import { StaffRole } from "./staff";

export const MyTenant = z
  .object({ id: Id, slug: z.string(), name: z.string(), role: StaffRole })
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
