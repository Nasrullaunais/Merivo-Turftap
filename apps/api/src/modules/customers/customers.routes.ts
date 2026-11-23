import {
  CreateCustomer,
  Customer,
  CUSTOMER_SORT_FIELDS,
  CustomerFilters,
  UpdateCustomer,
} from "@turftap/contract";

import { defineResource } from "../../lib/resource";
import * as customersService from "./customers.service";

export const customersResource = defineResource({
  name: "customers",
  operations: ["list", "get", "create", "update"],
  forCustomers: ["list", "get", "create"],
  schemas: {
    item: Customer,
    create: CreateCustomer,
    update: UpdateCustomer,
    filters: CustomerFilters,
  },
  sort: { fields: CUSTOMER_SORT_FIELDS, default: "name,asc" },
  service: customersService,
});
