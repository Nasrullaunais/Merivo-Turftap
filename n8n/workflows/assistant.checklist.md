# Assistant: manual test checklist

The Assistant has no automated tests of its own (D-17). The API routes it calls have route tests. This checklist covers the workflow. Run it after every change to `assistant.json`, and add rows when a ticket adds behaviour.

## Before you start

```bash
docker compose up -d
bun run dev                    # the API must be running on :3000
bun run assistant:setup        # tables, credentials and the workflows into local n8n (needs GEMINI_API_KEY in .env)
bun run whatsapp:link demo 100000000000001 +94770000500   # once: gives "demo" a WhatsApp number
```

If `assistant:setup` fails with `ENOENT ... .credentials.json`, the n8n container lost sight of the `n8n/` folder (it happens after switching branches): `docker compose restart n8n`, then run it again.

Then chat either way:

- **Chat emulator:** `bun run emulator`, open http://localhost:5175, open settings, and set the business number to `100000000000001` and your phone to a number no customer of "demo" has.
- **curl:** the commands below. They sign each message the way Meta does, so they need the app secret from `.env`.

```bash
set -a; . ./.env; set +a
say() {  # say <customer phone digits> <text> [business number id]
  body=$(printf '{"object":"whatsapp_business_account","entry":[{"id":"1","changes":[{"field":"messages","value":{"messaging_product":"whatsapp","metadata":{"display_phone_number":"","phone_number_id":"%s"},"contacts":[{"profile":{"name":"Test"},"wa_id":"%s"}],"messages":[{"from":"%s","id":"wamid.test-%s","timestamp":"%s","type":"text","text":{"body":"%s"}}]}}]}]}' \
    "${3:-100000000000001}" "$1" "$1" "$(date +%s%N)" "$(date +%s)" "$2")
  sig=$(printf '%s' "$body" | openssl dgst -sha256 -hmac "$WHATSAPP_APP_SECRET" | sed 's/^.* //')
  curl -s -o /dev/null -w '%{http_code}\n' -X POST "http://localhost:$N8N_PORT/webhook/whatsapp" \
    -H 'Content-Type: application/json' -H "X-Hub-Signature-256: sha256=$sig" -d "$body"
}
replies() {  # replies <customer phone digits> [business number id]: what the Assistant sent, with its choices
  curl -s -X POST "http://localhost:$N8N_PORT/webhook/fake-meta/inbox" -H 'Content-Type: application/json' \
    -d "{\"phoneNumberId\":\"${2:-100000000000001}\",\"to\":\"$1\",\"afterId\":0}" |
    jq -r '.messages[] | .text, (.interactive // empty | "  [" + ([.action.buttons[]?.reply.title, .action.sections[]?.rows[].title] | join(" | ")) + "]")'
}
tap() {  # tap <customer phone digits> <title>: taps a reply button the Assistant sent
  body=$(printf '{"object":"whatsapp_business_account","entry":[{"id":"1","changes":[{"field":"messages","value":{"messaging_product":"whatsapp","metadata":{"display_phone_number":"","phone_number_id":"100000000000001"},"contacts":[{"profile":{"name":"Test"},"wa_id":"%s"}],"messages":[{"from":"%s","id":"wamid.test-%s","timestamp":"%s","type":"interactive","interactive":{"type":"button_reply","button_reply":{"id":"choice-1","title":"%s"}}}]}}]}]}' \
    "$1" "$1" "$(date +%s%N)" "$(date +%s)" "$2")
  sig=$(printf '%s' "$body" | openssl dgst -sha256 -hmac "$WHATSAPP_APP_SECRET" | sed 's/^.* //')
  curl -s -o /dev/null -w '%{http_code}\n' -X POST "http://localhost:$N8N_PORT/webhook/whatsapp" \
    -H 'Content-Type: application/json' -H "X-Hub-Signature-256: sha256=$sig" -d "$body"
}
```

To see what each step did, open http://localhost:5679, then **Executions**.

## Checks

| # | Do | Expect |
|---|---|---|
| 1 | `curl "http://localhost:$N8N_PORT/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=$WHATSAPP_VERIFY_TOKEN&hub.challenge=42"` | `42` (Meta's check when the webhook is set up) |
| 2 | The same with `hub.verify_token=wrong` | 403 |
| 3 | `curl -X POST http://localhost:$N8N_PORT/webhook/whatsapp -d '{}' -H 'Content-Type: application/json'` (no signature) | 401, and nothing is sent |
| 4 | New number: `say 94779990001 "any court free tomorrow at 7?"` | One reply: tomorrow's 7:00 am and 7:00 pm futsal start times with their prices as on the portal for that date, the name question in the same reply, and **7:00 am** / **7:00 pm** buttons (AST-01, AST-05) |
| 5 | `tap 94779990001 "7:00 pm"` | Read as if typed: the answer is about 7:00 pm. Nobody asks for the name again |
| 6 | `say 94779990001 "I'm Kamal Perera"` | "Thank you, Kamal Perera!" In the console, Customers lists Kamal Perera with +94779990001 |
| 7 | `say 94779990001 "do you have parking?"` | Says it doesn't know, with the venue's phone (AST-06) |
| 8 | `say 94779990001 "can I book the 7pm slot?"` | Says booking in chat isn't possible yet, with the venue's phone |
| 9 | Sinhala script: `say 94779990002 "හෙට හවස 7ට court එකක් තියෙනවද?"` | Answer and name question in Sinhala script |
| 10 | Tamil script: `say 94779990003 "நாளை மாலை 7 மணிக்கு கோர்ட் இருக்கிறதா?"` | Answer and name question in Tamil script |
| 11 | Sinhala in English letters: `say 94779990004 "heta haweh 7ta court ekak thiyenawada?"` | Answer in Sinhala written in English letters |
| 12 | In the console, make a walk-in booking for Kamal Perera (+94779990001), then `say 94779990001 "what have I booked?"` | That booking with its Sri Lankan time, "LKR" price and payment state, as in the console |
| 13 | A seeded gym member: `say 94771230003 "is my membership still active?"` | Kasun Jayawardena's Gym monthly, active, with its dates |
| 14 | Chat emulator: ask something with a choice, then tap a button, and open a list and tap a row | The tap shows as your message and gets an answer like a typed one |
| 15 | Fresh start: `docker compose exec postgres psql -U turftap -d n8n -c "update n8n_chat_histories set created_at = created_at - interval '31 minutes' where session_id = '1:+94779990001'"`, then `say 94779990001 "which time did I pick?"` | It doesn't remember the earlier chat |
| 16 | Put a wrong `GEMINI_API_KEY` in `.env`, run `bun run assistant:setup`, then `say 94779990001 hi`. Put the right key back and run setup again | "Sorry, something went wrong on our side. Please call…" with the venue phone |
| 17 | Unknown business number: `say 94779990002 hello 999999999999999` | 200, and no reply |
| 18 | Turned-off tenant: link a number to it, then `say 94779990002 hello <its id>` | 200, and no reply |
| 19 | Stop the API, then repeat step 7 | The run fails in n8n at **Find Tenant**, and nothing is sent |

## Afterwards

Customers can't be deleted through the API, so either use new phone numbers each time or remove the test customers and what the Assistant remembers:

```bash
docker compose exec postgres psql -U turftap -d turftap -c "delete from customers where phone like '+9477999000_'"
docker compose exec postgres psql -U turftap -d n8n -c 'truncate n8n_chat_histories, fake_meta_messages'
```
