# Assistant: manual test checklist

The Assistant has no automated tests of its own (D-17). The API routes it calls have route tests. This checklist covers the workflow. Run it after every change to `assistant.json`, and add rows when a ticket adds behaviour.

## Before you start

```bash
docker compose up -d
bun run dev                    # the API must be running on :3000
bun run assistant:setup        # tables, credentials and both workflows into local n8n
bun run whatsapp:link demo 100000000000001 +94770000500   # once: gives "demo" a WhatsApp number
```

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
replies() {  # replies <customer phone digits> [business number id]: what the Assistant sent
  curl -s -X POST "http://localhost:$N8N_PORT/webhook/fake-meta/inbox" -H 'Content-Type: application/json' \
    -d "{\"phoneNumberId\":\"${2:-100000000000001}\",\"to\":\"$1\",\"afterId\":0}" | jq -r '.messages[].text'
}
```

To see what each step did, open http://localhost:5679, then **Executions**.

## Checks

| # | Do | Expect |
|---|---|---|
| 1 | `curl "http://localhost:$N8N_PORT/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=$WHATSAPP_VERIFY_TOKEN&hub.challenge=42"` | `42` (Meta's check when the webhook is set up) |
| 2 | The same with `hub.verify_token=wrong` | 403 |
| 3 | `curl -X POST http://localhost:$N8N_PORT/webhook/whatsapp -d '{}' -H 'Content-Type: application/json'` (no signature) | 401, and nothing is sent |
| 4 | New number: `say 94779990001 hello` | 200; `replies 94779990001` gives "Hi! Welcome to Demo Sports. What's your name?" (AST-05) |
| 5 | `say 94779990001 hi` | "Sorry, I didn't get that. Please send just your name." A greeting isn't a name. |
| 6 | `say 94779990001 "I'm Kamal Perera"` | "Thanks, Kamal Perera! For bookings and questions, please call…" with each active venue and its phone. In the console, Customers lists Kamal Perera with +94779990001. |
| 7 | `say 94779990001 "can I book a court?"` | "Sorry, I can't help with that here. Please call…" with the venues (AST-06). Nobody asks for the name again. |
| 8 | A tenant with one active venue | The hand-over names that venue and its phone in one sentence, with no list |
| 9 | Unknown business number: `say 94779990002 hello 999999999999999` | 200, and no reply |
| 10 | Turned-off tenant: link a number to it, then `say 94779990002 hello <its id>` | 200, and no reply |
| 11 | Stop the API, then repeat step 7 | The run fails in n8n at **Find Tenant**, and nothing is sent |

## Afterwards

Customers can't be deleted through the API, so either use a new phone number for step 4 each time or remove the test customer and what the Assistant remembers:

```bash
docker compose exec postgres psql -U turftap -d turftap -c "delete from customers where phone = '+94779990001'"
docker compose exec postgres psql -U turftap -d n8n -c 'truncate assistant_name_asks, fake_meta_messages'
```
