# n8n receives WhatsApp chats; the backend sends notifications

The WhatsApp Assistant is an n8n workflow that receives customer messages straight from Meta, keeps chat history in its own database, and calls our API like any outside app (one assistant key plus a tenant header). We chose this over routing every message through the backend because it has fewer moving parts. Messages that start in the backend (confirmations, reminders, login codes) go out through the backend's `MessagingChannel` interface, so Meta-specific code exists only in that adapter and in n8n.

## Consequences

- The AI may only use read tools (free slots, prices). Creating or cancelling a booking is a fixed step that runs after the customer confirms.
- n8n never connects to the app database.
- Staff can't read or take over chats in v1; when stuck, the Assistant gives the venue's phone number.
