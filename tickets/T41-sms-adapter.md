# T41 SMS adapter

Status: blocked (D-15: vendor not chosen) · Stories: `SIG-01` · Depends on: none

## Goal
Login codes resent within 10 minutes really go out by SMS.

## Build
- First: compare Sri Lankan SMS options (local gateways vs international ones) on price per message, sender ID rules in Sri Lanka, API quality and reliability. Write the comparison for the user to pick (D-15).
- Then: `adapters/sms-channel/<vendor>/`, config, a contract test the fake also passes, and a line in `docs/adr/0010-login-codes-fall-back-to-sms.md` naming the vendor.

## Done when
- A real SMS arrives; `bun run check` passes without keys.
