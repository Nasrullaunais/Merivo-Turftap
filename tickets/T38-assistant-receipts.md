# T38 Send a receipt in chat

Status: done · Stories: `AST-03` · Depends on: T37, T11, T23

## Goal
A customer sends a transfer photo in the chat and it's attached to the booking or membership waiting for payment. With several waiting, the Assistant asks which one.

## Build
- Photo branch: fetch the media from Meta, `POST /v1/files` (purpose `RECEIPT`), then `POST /v1/payments`.
- Exactly one waiting → attach and confirm. Several → the agent asks which, then the fixed step attaches. None → say there's nothing waiting.
- A PDF or image sent as a file counts too (D-50). With one waiting, the photo is attached with no extra question (D-49).
- Several waiting: a `receipt` Chat Offer keeps the photo's Meta id; its choices are what it may pay for, picked by a tap or in words.
- Pretend Meta serves media like Meta, and the chat emulator can send a photo or file.

## Done when
- Checklist cases for none, one and several waiting.
- `bun run check` passes.
