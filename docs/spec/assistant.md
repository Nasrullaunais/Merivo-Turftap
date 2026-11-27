# Assistant

## AST-01 Ask about free slots and prices
As a **Customer**, I want to ask in my own words ("any court free tomorrow at 7?"), so that I can book without a website.
- The Assistant replies in the language I write in (English, Sinhala or Tamil), and in English letters when I type Sinhala or Tamil in English letters.
- It only answers from TurfTap data. If it doesn't know, it says so and gives the venue's phone.
- When I have to pick one of a few things, such as a time, I can tap a choice instead of typing.

## AST-02 Book through chat
As a **Customer**, I want the Assistant to book for me after I confirm, so that booking takes a few messages.
- The Assistant repeats the venue, resource, date, time and price, then waits for "yes". Only then is the booking made.
- I can say yes by tapping Yes or by typing it in my language. A question or a change ("yes, but at 7?") isn't a yes.
- If the time was just taken or the price has changed, nothing is booked: I'm told, and offered the free times or the new price.
- After booking it sends the bank details, amount and time limit. At a Pay at Venue venue, it says the booking is confirmed and I pay there.

## AST-03 Send a receipt in chat
As a **Customer**, I want to send my transfer photo in the chat, so that I don't have to open a website.
- A photo, a screenshot or a PDF (JPG, PNG or PDF, up to 5 MB) counts as the receipt, like on the portal.
- Given I have exactly one booking or membership waiting for payment, when I send a photo, then the Assistant asks if it's the receipt for that one, with Yes and No to tap. Nothing is attached until I say yes.
- Given I have several, when I send a photo, then the Assistant asks which one it's for, with each to tap. I can also say which in my own words.
- Given I have none, when I send a photo, then nothing is attached and the Assistant tells me, for example that the venue is already checking my receipt.
- After it's attached, the Assistant says the venue will check it and I'll get a message once it's accepted.

## AST-04 My bookings in chat
As a **Customer**, I want to ask "what have I booked?" and cancel before the cut-off, so that I can manage bookings from WhatsApp.
- Cancelling needs a "yes" confirmation, like booking.

## AST-05 First message from a new number
As a **Customer** messaging for the first time, I want the Assistant to ask my name once, so that the venue knows who I am.
- The Assistant answers my first question and asks my name in the same reply, in my language.
- When I give my name in a later message, it's saved. If I don't, the Assistant keeps helping without asking again.

## AST-06 Hand over to a person
As a **Customer**, I want to be told how to reach the venue when the Assistant can't help, so that I'm not stuck.
- The Assistant gives the venue's phone number. Staff can't see the chat in v1.

## AST-07 Messages from the venue
As a **Customer**, I want booking confirmations, rejections, cancellations and reminders on the same WhatsApp chat, so that everything is in one place.
