import { defineJob } from "../../lib/jobs";
import * as receiptReadingService from "./receipt-reading.service";

type ReadData = { tenantId: number; paymentId: number };

export const readReceiptJob = defineJob<ReadData>("read-receipt", ({ tenantId, paymentId }) =>
  receiptReadingService.read(tenantId, paymentId),
);
