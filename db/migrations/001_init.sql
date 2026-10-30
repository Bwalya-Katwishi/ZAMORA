CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS schema_migrations (
  id text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  kind text NOT NULL DEFAULT 'desk'
);

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations (id),
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL CHECK (role IN ('reader', 'researcher', 'editor', 'admin')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE audit_log (
  id bigserial PRIMARY KEY,
  actor_id uuid REFERENCES users (id),
  action text NOT NULL,
  entity_type text,
  entity_id text,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE places (
  id text PRIMARY KEY,
  name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('country', 'province', 'town', 'historical_region', 'water', 'landmark')),
  parent_id text REFERENCES places (id),
  latitude double precision,
  longitude double precision,
  valid_from int,
  valid_to int,
  note text NOT NULL DEFAULT ''
);

CREATE TABLE place_names (
  place_id text NOT NULL REFERENCES places (id) ON DELETE CASCADE,
  name text NOT NULL,
  kind text NOT NULL DEFAULT 'alias',
  PRIMARY KEY (place_id, name)
);

CREATE TABLE categories (
  id text PRIMARY KEY,
  name text NOT NULL,
  parent_id text REFERENCES categories (id),
  description text NOT NULL DEFAULT '',
  layout text NOT NULL DEFAULT 'index',
  position int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true
);

CREATE TABLE people (
  id text PRIMARY KEY,
  name text NOT NULL,
  sort_name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('person', 'institution'))
);

CREATE TABLE documents (
  id text PRIMARY KEY,
  title text NOT NULL,
  document_type text NOT NULL CHECK (document_type IN (
    'book', 'paper', 'report', 'photograph', 'archive', 'legal', 'gazette', 'newspaper', 'dataset'
  )),
  published_year int,
  published_on date,
  about_year_start int,
  about_year_end int,
  publisher text,
  publication_place text,
  container_title text,
  source_url text,
  accession text UNIQUE NOT NULL,
  summary text NOT NULL,
  rights_status text NOT NULL,
  verification_status text NOT NULL DEFAULT 'catalogued',
  comparative boolean NOT NULL DEFAULT false,
  comparative_label text,
  zambia_relevance text NOT NULL,
  language text NOT NULL DEFAULT 'en',
  search_text text NOT NULL DEFAULT '',
  search_vector tsvector GENERATED ALWAYS AS (to_tsvector('english', coalesce(search_text, ''))) STORED,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT documents_comparative_label CHECK (comparative = false OR comparative_label IS NOT NULL),
  CONSTRAINT documents_relevance CHECK (char_length(zambia_relevance) >= 40)
);

CREATE INDEX documents_search_idx ON documents USING gin (search_vector);
CREATE INDEX documents_year_idx ON documents (published_year);

CREATE TABLE document_people (
  document_id text NOT NULL REFERENCES documents (id) ON DELETE CASCADE,
  person_id text NOT NULL REFERENCES people (id),
  role text NOT NULL DEFAULT 'author',
  position int NOT NULL DEFAULT 0,
  PRIMARY KEY (document_id, person_id, role)
);

CREATE TABLE document_places (
  document_id text NOT NULL REFERENCES documents (id) ON DELETE CASCADE,
  place_id text NOT NULL REFERENCES places (id),
  PRIMARY KEY (document_id, place_id)
);

CREATE TABLE document_categories (
  document_id text NOT NULL REFERENCES documents (id) ON DELETE CASCADE,
  category_id text NOT NULL REFERENCES categories (id),
  PRIMARY KEY (document_id, category_id)
);

CREATE TABLE events (
  id text PRIMARY KEY,
  title text NOT NULL,
  summary text NOT NULL,
  start_year int,
  end_year int,
  start_on date,
  end_on date,
  date_note text NOT NULL DEFAULT '',
  place_id text REFERENCES places (id)
);

CREATE TABLE document_events (
  document_id text NOT NULL REFERENCES documents (id) ON DELETE CASCADE,
  event_id text NOT NULL REFERENCES events (id) ON DELETE CASCADE,
  relation text NOT NULL CHECK (relation IN ('contemporary', 'retrospective', 'study_of', 'depiction')),
  PRIMARY KEY (document_id, event_id)
);

CREATE TABLE scenarios (
  id text PRIMARY KEY,
  question text NOT NULL,
  category_id text REFERENCES categories (id),
  status text NOT NULL DEFAULT 'no_forecast' CHECK (status IN ('no_forecast', 'baseline_only')),
  assumptions text NOT NULL,
  not_claimed text NOT NULL,
  method_note text NOT NULL
);

CREATE TABLE scenario_events (
  scenario_id text NOT NULL REFERENCES scenarios (id) ON DELETE CASCADE,
  event_id text NOT NULL REFERENCES events (id) ON DELETE CASCADE,
  PRIMARY KEY (scenario_id, event_id)
);

CREATE TABLE scenario_documents (
  scenario_id text NOT NULL REFERENCES scenarios (id) ON DELETE CASCADE,
  document_id text NOT NULL REFERENCES documents (id) ON DELETE CASCADE,
  PRIMARY KEY (scenario_id, document_id)
);

CREATE TABLE indicators (
  code text PRIMARY KEY,
  name text NOT NULL,
  unit text NOT NULL,
  caveat text NOT NULL,
  source_name text NOT NULL,
  source_url text,
  retrieved_on date NOT NULL,
  scenario_id text REFERENCES scenarios (id)
);

CREATE TABLE indicator_observations (
  indicator_code text NOT NULL REFERENCES indicators (code) ON DELETE CASCADE,
  year int NOT NULL,
  value double precision NOT NULL,
  PRIMARY KEY (indicator_code, year)
);

CREATE TABLE investigations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES users (id),
  organization_id uuid REFERENCES organizations (id),
  title text NOT NULL,
  question text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'active', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE investigation_members (
  investigation_id uuid NOT NULL REFERENCES investigations (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'researcher' CHECK (role IN ('researcher', 'editor')),
  PRIMARY KEY (investigation_id, user_id)
);

CREATE TABLE investigation_sources (
  investigation_id uuid NOT NULL REFERENCES investigations (id) ON DELETE CASCADE,
  document_id text NOT NULL REFERENCES documents (id),
  note text NOT NULL DEFAULT '',
  added_by uuid REFERENCES users (id),
  added_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (investigation_id, document_id)
);

CREATE TABLE notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investigation_id uuid NOT NULL REFERENCES investigations (id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES users (id),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investigation_id uuid NOT NULL REFERENCES investigations (id) ON DELETE CASCADE,
  statement text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'supported', 'contested', 'unresolved')),
  created_by uuid REFERENCES users (id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE claim_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id uuid NOT NULL REFERENCES claims (id) ON DELETE CASCADE,
  document_id text REFERENCES documents (id),
  stance text NOT NULL CHECK (stance IN ('supports', 'contradicts', 'context')),
  note text NOT NULL DEFAULT '',
  created_by uuid REFERENCES users (id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE corrections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id text NOT NULL REFERENCES documents (id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES users (id),
  note text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE ingestion_jobs (
  id text PRIMARY KEY,
  source_name text NOT NULL,
  status text NOT NULL,
  message text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
