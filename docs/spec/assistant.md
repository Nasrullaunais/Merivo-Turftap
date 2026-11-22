# Assistant

## AST-01 Ask about free slots and prices
As a **Customer**, I want to ask in my own words ("any court free tomorrow at 7?"), so that I can book without a website.
- The Assistant replies in the language I write in (English, Sinhala or Tamil).
- It only answers from TurfTap data. If it doesn't know, it says so.

## AST-02 Book through chat
As a **Customer**, I want the Assistant to book for me after I confirm, so that booking takes a few messages.
- The Assistant repeats the venue, resource, date, time and price, then waits for "yes". Only then is the booking made.
- After booking it sends the bank details, amount and time limit.

## AST-03 Send a receipt in chat
As a **Customer**, I want to send my transfer photo in the chat, so that I don't have to open a website.
- Given I have exactly one booking or membership waiting for payment, when I send a photo, then it's attached to that one.
- Given I have several, when I send a photo, then the Assistant asks which one it's for.

## AST-04 My bookings in chat
As a **Customer**, I want to ask "what have I booked?" and cancel before the cut-off, so that I can manage bookings from WhatsApp.
- Cancelling needs a "yes" confirmation, like booking.

## AST-05 First message from a new number
As a **Customer** messaging for the first time, I want the Assistant to ask my name once, so that the venue knows who I am.

## AST-06 Hand over to a person
As a **Customer**, I want to be told how to reach the venue when the Assistant can't help, so that I'm not stuck.
- The Assistant gives the venue's phone number. Staff can't see the chat in v1.

## AST-07 Messages from the venue
As a **Customer**, I want booking confirmations, rejections, cancellations and reminders on the same WhatsApp chat, so that everything is in one place.
