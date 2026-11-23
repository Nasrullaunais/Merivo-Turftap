import { CreatePayment, Payment, PAYMENT_SORT_FIELDS, PaymentFilters } from "@turftap/contract";

import { defineResource } from "../../lib/resource";
import * as paymentsService from "./payments.service";

export const paymentsResource = defineResource({
  name: "payments",
  operations: ["list", "get", "create"],
  forCustomers: ["create"],
  schemas: { item: Payment, create: CreatePayment, filters: PaymentFilters },
  sort: { fields: PAYMENT_SORT_FIELDS, default: "createdAt,desc" },
  service: paymentsService,
});
