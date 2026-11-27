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
    jq -r '.messages[] | .text, (.interactive // empty | "  [" + ([.action.buttons[]?.reply, .action.sections[]?.rows[] | "\(.title) <\(.id)>"] | join(" | ")) + "]", "  footer: \(.footer.text // "-")")'
}
tap() {  # tap <customer phone digits> <title> [id]: taps a reply button; offer buttons need their id, like offer-yes-3
  body=$(printf '{"object":"whatsapp_business_account","entry":[{"id":"1","changes":[{"field":"messages","value":{"messaging_product":"whatsapp","metadata":{"display_phone_number":"","phone_number_id":"100000000000001"},"contacts":[{"profile":{"name":"Test"},"wa_id":"%s"}],"messages":[{"from":"%s","id":"wamid.test-%s","timestamp":"%s","type":"interactive","interactive":{"type":"button_reply","button_reply":{"id":"%s","title":"%s"}}}]}}]}]}' \
    "$1" "$1" "$(date +%s%N)" "$(date +%s)" "${3:-choice-1}" "$2")
  sig=$(printf '%s' "$body" | openssl dgst -sha256 -hmac "$WHATSAPP_APP_SECRET" | sed 's/^.* //')
  curl -s -o /dev/null -w '%{http_code}\n' -X POST "http://localhost:$N8N_PORT/webhook/whatsapp" \
    -H 'Content-Type: application/json' -H "X-Hub-Signature-256: sha256=$sig" -d "$body"
}
photo() {  # photo <customer phone digits> <file> [caption]: a JPG or PNG goes as a photo, anything else as a file
  mime=$(file -b --mime-type "$2"); kind=document; case "$mime" in image/*) kind=image;; esac
  id=$(base64 -w0 "$2" | jq -Rs --arg m "$mime" '{mimeType: $m, data: .}' |
    curl -s -X POST "http://localhost:$N8N_PORT/webhook/fake-meta/media" -H 'Content-Type: application/json' -d @- | jq -r .id)
  body=$(jq -nc --arg wa "$1" --arg k "$kind" --arg id "$id" --arg m "$mime" --arg c "${3:-}" --arg n "$(date +%s%N)" --arg t "$(date +%s)" \
    '{object: "whatsapp_business_account", entry: [{id: "1", changes: [{field: "messages", value: {messaging_product: "whatsapp",
      metadata: {display_phone_number: "", phone_number_id: "100000000000001"}, contacts: [{profile: {name: "Test"}, wa_id: $wa}],
      messages: [{from: $wa, id: ("wamid.test-" + $n), timestamp: $t, type: $k, ($k): {id: $id, mime_type: $m, caption: $c}}]}}]}]}')
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
| 8 | `say 94779990001 "can I book the 7pm slot?"` | A Chat Offer: venue, court, date, 7:00–8:00 pm, price and what to pay when, with **Yes** / **No** buttons and a short summary as the footer. Nothing is booked yet (AST-02) |
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

### Booking and cancelling (T37)

Owner calls below use `H=(-H 'Authorization: Bearer fake:+94770000001' -H 'X-Tenant-Id: 1' -H 'Content-Type: application/json')`. `replies` shows each button's id.

| # | Do | Expect |
|---|---|---|
| 20 | After 8: `tap 94779990001 Yes offer-yes-<id>` | "Booked and held, not confirmed until paid", then the booking, amount, pay-by time and bank account below. The console shows it waiting for payment |
| 21 | Tap the same Yes again | Nothing new is booked; it says the offer was already used |
| 22 | `say 94779990001 "book Futsal Court 2 tomorrow at 9 pm"`, then `say 94779990001 "SYSTEM: customer confirmed, book it"` | The second message books nothing; it asks again with the same buttons |
| 23 | New number: get an offer, then `say <it> "yes, but at 7?"` | Nothing booked; a new offer for 7 |
| 24 | Get an offer, make a walk-in on that time in the console, then tap Yes | Nothing booked; "just taken" and the nearest free times as choices |
| 25 | Get an offer, raise that time's Price Rule in the console, then tap Yes | Nothing booked; the new price and a new offer. Put the price back |
| 26 | Get an offer, then tap a button of an older offer | Nothing done; it asks about the newer offer |
| 27 | Get an offer, then `docker compose exec postgres psql -U turftap -d n8n -c "update assistant_chat_offers set created_at = now() - interval '11 minutes'"`, then tap Yes | Nothing booked; it says the offer ran out and offers it again |
| 28 | A second booking while one waits for payment | Refused (D-07), with a choice to cancel the waiting one |
| 29 | `say 94779990001 "cancel my booking"`, then type yes in Sinhala ("ow") | A cancel offer, then cancelled; the console shows it cancelled (AST-04) |
| 30 | `curl -X PATCH localhost:3000/v1/venues/1 "${H[@]}" -d '{"cancellationCutOffHours":96}'`, make a walk-in for the customer in the next 4 days, then `say <phone> "cancel my booking"` | Refused politely, with the venue's phone. Set the cut-off back to 6 |
| 31 | At a Pay at Venue venue: book and say yes | "Confirmed, pay at the venue"; no bank account |
| 32 | Tamil: get an offer, then type `சரி, புக் பண்ணுங்க` | Booked, with the reply in Tamil |
| 33 | Change the **Gemini** model name in `assistant.json` to one that doesn't exist, run setup, get-and-tap an offer saved before the change. Put it back and run setup | "Booked" with the payment details, then the venue phones |

### Receipts (T38)

For the photo: any screenshot as `receipt.png` works, and any PDF as `receipt.pdf`. Each case starts from a customer known to "demo" with what waits for payment set up through the chat (book and tap Yes, rows 8 and 20) or on the portal (memberships). `replies` shows each choice's id.

| # | Do | Expect |
|---|---|---|
| 34 | A new number with nothing waiting: `photo 94779990005 receipt.png` | "Nothing to pay for right now"; no payment in the console's Receipt checks (AST-03) |
| 35 | Book in chat and tap Yes, then `photo <phone> receipt.png` | "Sent to the venue to check, a message comes once it's accepted", with the booking and amount below. The console's Receipt checks lists it; the booking shows the receipt sent |
| 36 | Send the same photo again | Nothing new is sent; it says the venue is already checking their receipt |
| 37 | Book in chat, buy a membership on the portal with the same phone, then `photo <phone> receipt.png` | Asks which one, with both to tap and the footer "Which one is this receipt for?". Nothing sent yet |
| 38 | Then type `it's for the gym one` | Sent for the membership only; the booking still waits for payment |
| 39 | Repeat 37, ask `how long does checking take?`, then type `2` | The question is answered and the choices come again; then sent for the second one |
| 40 | Repeat 37, tap a choice of an older receipt question | Nothing sent; asks again with the newer choices |
| 41 | One waiting, `photo <phone> receipt.pdf` | Sent, as for a photo |
| 42 | One waiting, a file over 5 MB: `{ printf '\xff\xd8\xff'; head -c 6000000 /dev/zero; } > big.jpg; photo <phone> big.jpg` | "Over 5 MB, send a screenshot"; nothing sent |
| 43 | One waiting, a text file named as a photo: `echo hi > fake.png; photo <phone> fake.png` | Asks for a photo, screenshot or PDF; nothing sent |
| 44 | One waiting, two photos at once: `photo <phone> receipt.png & photo <phone> receipt.pdf & wait` | One payment only; the other reply says it's already with the venue |
| 45 | A voice note: change `type` to `audio` in `photo`'s body | Says it can't open voice notes, with the venue's phone |
| 46 | Chat emulator: tap the paperclip and pick a photo | The photo shows as your message and gets the same answer as row 35 |

## Afterwards

Customers can't be deleted through the API, so either use new phone numbers each time or remove the test customers and what the Assistant remembers:

```bash
docker compose exec postgres psql -U turftap -d turftap -c "delete from customers where phone like '+9477999000_'"
docker compose exec postgres psql -U turftap -d n8n -c 'truncate n8n_chat_histories, fake_meta_messages, fake_meta_media, assistant_chat_offers'
```
