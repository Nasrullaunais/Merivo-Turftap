-- Local only: every message the Assistant sent to pretend Meta (n8n/workflows/fake-meta.json).
CREATE TABLE IF NOT EXISTS fake_meta_messages (
  id bigserial PRIMARY KEY,
  message_id text NOT NULL UNIQUE,
  phone_number_id text NOT NULL,
  to_wa_id text NOT NULL,
  body text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS fake_meta_messages_chat ON fake_meta_messages (phone_number_id, to_wa_id, id);
