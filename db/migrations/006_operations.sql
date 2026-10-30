ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (
  role IN ('reader', 'viewer', 'researcher', 'analyst', 'journalist', 'editor', 'org_admin', 'admin', 'api_user')
);

CREATE TABLE forecasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  indicator_code text,
  use_case text,
  status text NOT NULL CHECK (status IN ('insufficient', 'withheld', 'candidate', 'approved', 'rejected')),
  model_version text NOT NULL,
  evaluation jsonb NOT NULL,
  brief_id uuid,
  decided_by uuid REFERENCES users (id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE data_sources (
  id text PRIMARY KEY,
  name text NOT NULL,
  license_state text NOT NULL CHECK (
    license_state IN ('public_domain', 'open', 'metadata_only', 'request', 'partnership', 'restricted', 'expired')
  ),
  access_method text NOT NULL,
  permitted text NOT NULL,
  prohibited text NOT NULL,
  refresh_schedule text NOT NULL,
  steward text NOT NULL,
  last_checked date,
  review_on date,
  ingestion text NOT NULL CHECK (ingestion IN ('not_started', 'metadata', 'blocked')),
  ocr_status text NOT NULL,
  notes text NOT NULL DEFAULT ''
);

CREATE TABLE takedowns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id text NOT NULL REFERENCES data_sources (id),
  reason text NOT NULL CHECK (char_length(reason) >= 12),
  actor_id uuid REFERENCES users (id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations (id),
  name text NOT NULL CHECK (char_length(name) >= 3),
  private boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE workspace_members (
  workspace_id uuid NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  role text NOT NULL,
  PRIMARY KEY (workspace_id, user_id)
);

CREATE TABLE invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations (id),
  email text NOT NULL,
  role text NOT NULL,
  invited_by uuid REFERENCES users (id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE saved_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations (id),
  user_id uuid NOT NULL REFERENCES users (id),
  name text NOT NULL CHECK (char_length(name) >= 3),
  query jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations (id),
  user_id uuid NOT NULL REFERENCES users (id),
  search_id uuid REFERENCES saved_searches (id),
  cadence text NOT NULL CHECK (cadence IN ('weekly', 'monthly')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations (id),
  user_id uuid NOT NULL REFERENCES users (id),
  name text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  scopes text[] NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE usage_events (
  id bigserial PRIMARY KEY,
  organization_id uuid,
  user_id uuid,
  action text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE onboarding_checks (
  organization_id uuid NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  step text NOT NULL,
  done boolean NOT NULL DEFAULT false,
  PRIMARY KEY (organization_id, step)
);

CREATE TABLE subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations (id),
  plan_id text NOT NULL,
  status text NOT NULL CHECK (status IN ('trial', 'active', 'cancelled')),
  seats int NOT NULL CHECK (seats >= 1),
  trial_ends date,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES subscriptions (id),
  amount_zmw int NOT NULL,
  currency text NOT NULL DEFAULT 'ZMW',
  planning boolean NOT NULL DEFAULT true,
  status text NOT NULL CHECK (status IN ('draft', 'issued', 'cancelled')),
  provider text NOT NULL DEFAULT 'manual',
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE webhook_events (
  id text PRIMARY KEY,
  provider text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO data_sources (
  id, name, license_state, access_method, permitted, prohibited, refresh_schedule, steward, last_checked, review_on, ingestion, ocr_status, notes
) VALUES
  (
    'world-bank',
    'World Bank Open Data, Zambia',
    'open',
    'Indicator API, country code ZMB only',
    'Store the published annual values with attribution',
    'Do not fill a missing year or present the series as a ZAMORA survey',
    'Recheck before a proposal',
    'ZAMORA reading room',
    '2026-10-14',
    '2027-10-14',
    'metadata',
    'not_applicable',
    'Four annual series. The values are the licensed numbers, not a book text.'
  ),
  (
    'geoboundaries',
    'geoBoundaries ZMB ADM1 and ADM2',
    'open',
    'Simplified geometry, release commit 9469f09',
    'Draw ADM1 and cite ADM2. License CC BY 4.0, boundary year 2020',
    'Do not invent a district polygon that is not in the file',
    'Recheck before the next boundary year',
    'ZAMORA reading room',
    '2026-10-15',
    '2027-10-15',
    'metadata',
    'not_applicable',
    'Source named by geoBoundaries: GRID3 and the Office of the Surveyor General. District outlines are not drawn.'
  ),
  (
    'parliament',
    'National Assembly Hansard index',
    'metadata_only',
    'Saved index page, then a publisher link',
    'Store the title, date, and link',
    'Do not copy the speech',
    'Recheck the page before another capture',
    'ZAMORA reading room',
    '2026-10-15',
    '2027-04-15',
    'metadata',
    'not_applicable',
    'Index entries only. The sitting text is not stored.'
  ),
  (
    'zambialii',
    'ZambiaLII judgments and legislation',
    'metadata_only',
    'Titles from a fetched homepage. Document URLs that returned HTTP 403 were not fetched',
    'Store the title and the publisher link',
    'Do not copy a judgment, a flynote, or an Act',
    'Recheck before another capture',
    'ZAMORA reading room',
    '2026-10-15',
    '2027-04-15',
    'metadata',
    'not_applicable',
    'Metadata only. Criminal sedition rows dated 1 January 9999 were skipped.'
  ),
  (
    'gazette',
    'Government Gazette, issue index',
    'metadata_only',
    'Issue line from a fetched index. The issue file returned HTTP 403',
    'Store the issue number and the link',
    'Do not copy the gazette text',
    'Recheck before another capture',
    'ZAMORA reading room',
    '2026-10-15',
    '2027-04-15',
    'metadata',
    'stopped',
    'No scanned gazette page is in the OCR sample.'
  );
