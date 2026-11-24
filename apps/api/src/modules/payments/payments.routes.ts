import {
  CreatePayment,
  Payment,
  PAYMENT_SORT_FIELDS,
  PaymentFilters,
  UpdatePayment,
} from "@turftap/contract";

import { defineResource } from "../../lib/resource";
import * as paymentsService from "./payments.service";

export const paymentsResource = defineResource({
  name: "payments",
  operations: ["list", "get", "create", "update"],
  forCustomers: ["create"],
  schemas: { item: Payment, create: CreatePayment, update: UpdatePayment, filters: PaymentFilters },
  sort: { fields: PAYMENT_SORT_FIELDS, default: "createdAt,desc" },
  service: paymentsService,
});
