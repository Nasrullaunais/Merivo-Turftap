# T36 Ask about free slots and prices

Status: todo · Stories: `AST-01` · Depends on: T35, T05

## Goal
A customer asks in their own words ("any court free tomorrow at 7?") in English, Sinhala or Tamil, and the Assistant answers only from TurfTap data.

## Build
- AI agent node (Gemini, n8n credentials) with Postgres chat memory in the **n8n** database, keyed `tenantId:phone`, reset after 30 minutes of silence.
- Read-only tools: venues, resources, prices, availability, my bookings, my memberships (all `GET`).
- Prompt: reply in the customer's language; answer only from tool results; say so when unsure and give the venue's phone number. Keep the prompt in the exported workflow, and a copy in `n8n/prompts/` so it can be reviewed in pull requests.

## Done when
- Checklist cases in all three languages pass, including a question with no answer in the data.
- `bun run check` passes.
