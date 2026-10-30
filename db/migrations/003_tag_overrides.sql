CREATE TABLE tag_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id text NOT NULL REFERENCES documents (id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('place', 'sector', 'entity')),
  action text NOT NULL CHECK (action IN ('add', 'remove')),
  target_id text NOT NULL,
  note text NOT NULL CHECK (char_length(note) >= 12),
  author_id uuid NOT NULL REFERENCES users (id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_id, kind, target_id)
);
