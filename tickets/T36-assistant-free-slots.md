# T36 Ask about free slots and prices

Status: todo · Stories: `AST-01`, `AST-05` (changed) · Depends on: T35, T49 · Decisions: **D-44**, **D-45**, **D-46**

## Goal
A customer asks in their own words ("any court free tomorrow at 7?", "heta 7ta court ekak thiyenawada?") in English, Sinhala or Tamil, and the Assistant answers only from TurfTap data, with tappable choices where they save typing.

## Read first
- `docs/architecture/assistant.md`, `n8n/workflows/assistant.checklist.md`, the T35 workflow `n8n/workflows/assistant.json`, `n8n/setup.ts`.
- GenexoAI's bot for the agent pattern (Gemini there is DeepSeek, same shape): `/home/nasrulla/Files/Projects/genexoai/dkh-service/n8n-setup/n8n/workflows/whatsapp-ticket-bot.workflow.json` (`Issue Agent`, `Session Memory`, `Parse Agent`) and its doc beside it.
- T49's free-times filters on `GET /v1/availability`.

## Build
- **Agent**: n8n AI agent node with the Gemini chat model (n8n credential made by `setup.ts` from `GEMINI_API_KEY` in `.env`; add it to `.env.example`). Use the latest stable Flash model the key lists (not a `preview` one); the model name lives only in the workflow.
- **Memory**: n8n Postgres chat memory in the **n8n** database, keyed `tenantId:phone` (`Gather` already builds `sessionId`). It has no timestamp, so create `n8n_chat_histories` in `n8n/schema.sql` with a `created_at timestamptz default now()` column, and before the agent delete a session's history when its newest message is over 30 minutes old.
- **What the agent knows without a tool**, written into its instructions each message: tenant name, each active venue (name, address, phone, opening hours, Pay at Venue), its resources (name, type, slot length, default price, Price Rules) and gym Membership Plans; today's date, weekday and time in `Asia/Colombo` plus the next 7 dates with weekday names; the 30-day booking limit (D-06); whether the customer is known and their name.
- **Read-only tools** (all `GET`, assistant key plus `X-Tenant-Id` and `X-Customer-Phone`): `find_free_times` (T49's availability with `date`, optional `venueId`, `type`, `from`, `to`, `free=true`), `my_bookings`, `my_memberships`. Each tool's answer is turned into Sri Lankan times ("7:00 pm") and "LKR 2,500" before the agent sees it, never UTC or cents.
- **Answer shape**: the agent returns JSON `{ reply, choices, customerName }`, parsed leniently like GenexoAI's `Parse Agent`. `choices` (0 to 10 short labels in the customer's language) go out as WhatsApp reply buttons when 1 to 3 (title ≤ 20 characters), a list message when 4 to 10 (row title ≤ 24 characters), plain text when none. A tapped button or list row comes back as Meta's `interactive.button_reply` / `list_reply`; `Read Messages` reads its title as the customer's text.
- **New number (D-44)**: no fixed "What's your name?" step any more. The agent answers the question and, in the same reply, asks the name in the customer's language. When a later message gives it, the agent returns `customerName` and a fixed step saves it with `POST /v1/customers`. Remove T35's `Note Name Ask`, `Read Name`, `Name Step` and the `assistant_name_asks` table.
- **Language (D-45)**: reply the way the customer wrote: English, Sinhala or Tamil, and in English letters when they typed Sinhala or Tamil in English letters.
- **Prompt**: answer only from the instructions and tool results; when unsure, say so and give the venue phone (`callVenue` from `Gather`, AST-06); short WhatsApp-style replies. The prompt lives in `n8n/prompts/assistant.md` and in the exported workflow; add a check to `bun run check` that the two match.
- **Errors**: a Gemini or API failure sends the `Sorry` reply with the venue phone; nothing is left half-saved.
- **Pretend Meta and chat emulator (D-46)**: pretend Meta keeps interactive messages (buttons and list rows); the emulator shows them and sends a tap as Meta does.
- Update `docs/architecture/assistant.md` (flow, memory reset, answer shape, name step) and `docs/spec/assistant.md` (`AST-05`: asked in the same reply, in their language).

## Done when
- Checklist rows pass: English, Sinhala script, Tamil script, Sinhala in English letters; "any court free tomorrow at 7?" lists the right times and prices; a question with no answer in the data gets "I don't know" plus the venue phone; a new number gets its answer and the name question in one reply, and the name is saved after the next message; a button tap works; after 30 minutes of silence the chat starts fresh.
- `bun run check` passes.
