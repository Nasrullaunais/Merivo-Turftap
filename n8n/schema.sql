-- Tables the Assistant keeps in n8n's own database; n8n never touches the app database (ADR 0006).
-- Applied by `bun run assistant:setup` locally, and by hand on the server.

-- AST-05: when the Assistant last asked this number its name ("<tenantId>:<phone>").
CREATE TABLE IF NOT EXISTS assistant_name_asks (
  session_id text PRIMARY KEY,
  asked_at timestamptz NOT NULL
);
