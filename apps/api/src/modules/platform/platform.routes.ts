import { Me } from "@turftap/contract";

import { defineSingleton } from "../../lib/resource";
import * as platformService from "./platform.service";

export const meResource = defineSingleton({
  name: "me",
  schemas: { item: Me },
  service: { get: platformService.me },
});
