-- Tables the Assistant keeps in n8n's own database; n8n never touches the app database (ADR 0006).
-- Applied by `bun run assistant:setup` locally, and by hand on the server.

-- T35's name step, replaced by the agent asking in its reply (D-44).
DROP TABLE IF EXISTS assistant_name_asks;

-- The agent's chat memory, keyed "<tenantId>:<phone>". n8n's Postgres chat memory writes
-- session_id and message; created_at lets the workflow forget a chat after 30 minutes of silence.
CREATE TABLE IF NOT EXISTS n8n_chat_histories (
  id serial PRIMARY KEY,
  session_id varchar(255) NOT NULL,
  message jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS n8n_chat_histories_session ON n8n_chat_histories (session_id, created_at);
