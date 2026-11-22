import { NotFound } from "../../lib/errors";

export const fileErrors = {
  notFound: (id: number) => new NotFound("tt_fil_001", `File ${id} was not found`),
};
