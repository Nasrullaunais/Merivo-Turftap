import { MAX_UPLOAD_BYTES, UploadedFile, UploadFile } from "@turftap/contract";

import { defineResource } from "../../lib/resource";
import * as filesService from "./files.service";

export const filesResource = defineResource({
  name: "files",
  operations: ["create"],
  forCustomers: ["create"],
  schemas: { item: UploadedFile, create: UploadFile },
  upload: { maxBytes: MAX_UPLOAD_BYTES },
  service: filesService,
});
