import {
  Me,
  WHATSAPP_NUMBER_SORT_FIELDS,
  WhatsAppNumber,
  WhatsAppNumberFilters,
} from "@turftap/contract";

import { defineResource, defineSingleton } from "../../lib/resource";
import * as platformService from "./platform.service";
import * as whatsappNumbersService from "./whatsapp-numbers.service";

export const meResource = defineSingleton({
  name: "me",
  schemas: { item: Me },
  service: { get: platformService.me },
});

export const whatsappNumbersResource = defineResource({
  name: "whatsapp-numbers",
  operations: ["list"],
  forAssistantWithoutTenant: ["list"],
  schemas: { item: WhatsAppNumber, filters: WhatsAppNumberFilters },
  sort: { fields: WHATSAPP_NUMBER_SORT_FIELDS, default: "createdAt,asc" },
  service: whatsappNumbersService,
});
