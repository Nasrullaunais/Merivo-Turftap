import { z } from "zod";

/** The business whose portal is open: its name for the top bar (POR-01). */
export const Tenant = z
  .object({
    slug: z.string(),
    name: z.string(),
  })
  .meta({ id: "Tenant" });
export type Tenant = z.infer<typeof Tenant>;
