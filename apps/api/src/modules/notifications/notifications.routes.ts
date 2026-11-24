import { LiveEvent } from "@turftap/contract";

import { defineStream } from "../../lib/resource";
import * as eventsService from "./events.service";

export const eventsResource = defineStream({
  name: "events",
  schemas: { item: LiveEvent },
  service: eventsService,
});
