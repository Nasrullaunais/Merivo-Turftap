/** Online payments. Version 1 has no adapter (ADR 0007); this marks where a gateway plugs in. */
export interface PaymentProvider {
  startPayment(input: {
    tenantId: number;
    paymentId: number;
    amount: { amount: number; currency: "LKR" };
    idempotencyKey: string;
  }): Promise<{ redirectUrl: string }>;
}
