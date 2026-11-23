import { Forbidden, NotFound } from "../../lib/errors";

export const fileErrors = {
  notFound: (id: number) => new NotFound("tt_fil_001", `File ${id} was not found`),
  receiptsOnly: () => new Forbidden("tt_fil_002", "Customers can only upload Transfer Receipts"),
};
