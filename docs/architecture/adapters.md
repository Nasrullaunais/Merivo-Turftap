# Ports and adapters

Every outside **service** (anything reached over the network that we don't run as our own code) sits behind a port we own ([ADR 0003](../adr/0003-third-parties-behind-adapters.md)). Libraries that form the app's foundation (Hono, Drizzle, Zod, pg-boss, TanStack, HeroUI) are used directly.

## Layout

```
apps/api/src/
├── ports/                      # one file per port: the interface, written in our words
│   └── object-storage.ts
├── adapters/
│   └── object-storage/
│       ├── s3/                 # real vendor: the only place @aws-sdk is imported
│       └── fake/               # in-memory version for tests and local dev
└── wiring.ts                   # picks one adapter per port from config
```

## v1 ports

| Port | What it does | v1 adapter | Fake for tests |
|---|---|---|---|
| `AuthProvider` | Checks a sign-in token and returns the phone number | `auth0` | Yes |
| `ObjectStorage` | Saves, reads and deletes files; makes short-lived download links | `s3`: Cloudflare R2 in production, SeaweedFS locally ([ADR 0012](../adr/0012-files-in-cloudflare-r2.md)) | Yes |
| `MessagingChannel` | Sends a WhatsApp message (text, template or login code) from a given number | `whatsapp-cloud` (Meta) | Yes, records sent messages |
| `SmsChannel` | Sends an SMS (login codes when WhatsApp didn't work) | not chosen yet | Yes, records sent messages |
| `ReceiptReader` | Reads amount, date, bank and reference from a receipt image | `gemini` | Yes, returns set answers |
| `PaymentProvider` | Online payments | none in v1 (interface only) | n/a |

The frontends have the same rule: only `lib/auth` imports `oidc-client-ts`.

## Rules

- A port's types use **our** words (`phone`, `ReceiptReading`), never the vendor's field names.
- Only `adapters/<port>/<vendor>/` may import that vendor's library. An architecture test checks this.
- Services reach ports through `ports()` from `src/ports`: `await ports().storage.save(key, file)`. They never import an adapter. `wiring.ts` installs the real choice at start-up; the test setup installs the fakes.
- Every port has a `fake` adapter. Tests and `bun run dev` without keys use the fakes. The fake `AuthProvider` accepts `Bearer fake:+94771234567` as a sign-in for that phone.
- Adapter settings come from the typed config (`config.storage.s3.endpoint`). A missing secret stops the app from starting.
- Errors from a vendor are caught in the adapter and turned into our error types. Only timeouts and 5xx errors are retried.

## Switching vendor

Write a new folder under `adapters/<port>/<vendor>/`, make it pass the port's shared test suite (`ports/<port>.contract-test.ts`), and change one line in `wiring.ts` or one setting.
