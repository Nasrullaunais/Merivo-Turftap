# Payments

## PAY-01 See how to pay
As a **Customer**, I want to see the venue's bank details and the exact amount after booking, so that I can transfer the right money.
- Shown on the Customer Portal and sent by the Assistant, with the time limit.

## PAY-02 Send a Transfer Receipt
As a **Customer**, I want to send a photo or screenshot of my bank transfer, so that the venue can confirm my booking.
- On the portal: upload JPG, PNG or PDF up to 5 MB. Through the Assistant: send the photo in the chat.
- Given a receipt arrives in time, when it's saved, then the booking waits for a receipt check and no longer expires.

## PAY-03 AI reads the receipt
As **Staff**, I want the AI to read each receipt and compare it with the booking, so that checking is quick.
- The AI pulls out amount, date, bank and reference number.
- Staff see a summary: amount matches or not, date is recent or not, reference is new or already used.
- Given the AI can't read the image, when staff open it, then they see "Couldn't read this receipt" and check by hand.

## PAY-04 Accept a receipt
As **Staff**, I want to accept a receipt, so that the booking or membership is confirmed.
- Given I accept, when it's saved, then the booking or membership is confirmed and the customer gets a WhatsApp message.

## PAY-05 Reject a receipt
As **Staff**, I want to reject a receipt with a reason, so that the customer can send a correct one.
- Given I reject, when it's saved, then the booking goes back to waiting for payment with a fresh time limit, and the customer gets the reason on WhatsApp.

## PAY-06 Catch reused receipts
As **Staff**, I want to be warned when a receipt was already used, so that one transfer can't pay for two bookings.
- Given the same reference number or the same image was sent before in my tenant, when I check it, then I see a warning with a link to the earlier booking.

## PAY-07 Receipt check queue
As **Staff**, I want one list of receipts waiting for a check, oldest first, so that nobody waits long.
- The list shows the waiting count in the sidebar and updates without refreshing.

## PAY-08 Pay the rest at the venue
As **Front Desk**, I want to mark the remaining balance as paid in cash, so that the booking shows fully paid.
- Every booking shows what is paid and its balance. Once a booking is cancelled or expired, its balance is zero.
- Cash is recorded only on a confirmed booking, for any amount up to its balance.
- Given two staff record cash at once, when both save, then only what fits in the balance is saved and the other is told it is more than the balance.
