-- Foresight briefs. A row is a draft until an editor reviews it and signs it.
-- There is no published status. Export is an audit event, not a release.

CREATE TABLE foresight_briefs (
  id uuid PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES users (id),
  organization_id uuid REFERENCES organizations (id),
  status text NOT NULL CHECK (status IN ('draft', 'in_review', 'signed')),
  title text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 180),
  body jsonb NOT NULL,
  version int NOT NULL DEFAULT 1 CHECK (version >= 1),
  reviewer_id uuid REFERENCES users (id),
  reviewer_name text,
  reviewer_role text,
  reviewed_at timestamptz,
  review_note text,
  signer_id uuid REFERENCES users (id),
  signer_name text,
  signer_role text,
  signed_at timestamptz,
  signature text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX foresight_briefs_owner_idx ON foresight_briefs (owner_id, updated_at DESC);
CREATE INDEX foresight_briefs_org_idx ON foresight_briefs (organization_id, updated_at DESC);

CREATE TABLE foresight_versions (
  id uuid PRIMARY KEY,
  brief_id uuid NOT NULL REFERENCES foresight_briefs (id) ON DELETE CASCADE,
  version int NOT NULL CHECK (version >= 1),
  editor_id uuid REFERENCES users (id),
  note text NOT NULL CHECK (char_length(note) >= 3),
  body jsonb NOT NULL,
  status text NOT NULL CHECK (status IN ('draft', 'in_review', 'signed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (brief_id, version)
);

CREATE INDEX foresight_versions_brief_idx ON foresight_versions (brief_id, version);
