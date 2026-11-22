# Version 1 takes payment by bank transfer, checked by staff with AI help

Customers pay by bank transfer and send a Transfer Receipt through the Customer Portal or the Assistant. An AI reads the receipt (amount, date, bank, reference) behind a `ReceiptReader` interface and shows staff whether it matches, but staff always make the final decision. We skipped online card payments for v1 because bank transfer is how Sri Lankan venues are paid today; a `PaymentProvider` interface is designed now so a gateway can be added later without changing booking code.
