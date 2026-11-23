# T44 Backups and restore drill

Status: todo · Stories: none · Depends on: T43 · Decision: **D-16**

## Goal
Nightly backups of both databases leave the server, and a restore has been tested once.

## Build
- Nightly `pg_dump` of `turftap` and `n8n` to its own R2 bucket, keeping 30 days.
- A written restore drill in `docs/architecture/deployment.md`, done once and dated.
- Launch checklist (**D-16**): how receipts in R2 are backed up, and whether storing receipts outside Sri Lanka is allowed.

## Done when
- A restore from last night's backup into a fresh database works.
