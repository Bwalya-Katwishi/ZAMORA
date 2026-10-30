-- Local hashed embeddings for Ask-the-shelf.
-- The column is double precision[] because the embedded PostgreSQL 18
-- binary does not ship pgvector. Cosine similarity is computed in the
-- application from these values. When the vector extension is present
-- it is created, and it is not used for storage in this migration.

DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS vector;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'pgvector extension is not available on this cluster';
END $$;

CREATE TABLE retrieval_chunks (
  id text PRIMARY KEY,
  document_id text NOT NULL REFERENCES documents (id) ON DELETE CASCADE,
  position int NOT NULL,
  source_kind text NOT NULL CHECK (source_kind IN (
    'hansard', 'judgment', 'legislation', 'gazette', 'news', 'report', 'dataset',
    'book', 'paper', 'archive', 'photograph', 'legal'
  )),
  body text NOT NULL,
  metadata_only boolean NOT NULL,
  passage boolean NOT NULL DEFAULT false,
  page int,
  section text,
  year int,
  place_ids text[] NOT NULL DEFAULT '{}',
  sector_ids text[] NOT NULL DEFAULT '{}',
  comparative boolean NOT NULL DEFAULT false,
  embedding double precision[] NOT NULL,
  model_version text NOT NULL,
  indexed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_id, position),
  CONSTRAINT retrieval_chunks_dim CHECK (cardinality(embedding) = 128)
);

CREATE INDEX retrieval_chunks_document_idx ON retrieval_chunks (document_id);
CREATE INDEX retrieval_chunks_kind_idx ON retrieval_chunks (source_kind);

COMMENT ON COLUMN retrieval_chunks.embedding IS
  'zamora-hash-v1. Numeric array, not a pgvector column, until this cluster provides the extension.';

CREATE TABLE ask_log (
  id uuid PRIMARY KEY,
  actor_id uuid REFERENCES users (id),
  question text NOT NULL CHECK (char_length(question) BETWEEN 3 AND 500),
  filters jsonb NOT NULL,
  prompt text NOT NULL,
  chunk_ids text[] NOT NULL,
  model_version text NOT NULL,
  result_type text NOT NULL CHECK (result_type IN ('answer', 'insufficient', 'refused')),
  response jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ask_log_actor_idx ON ask_log (actor_id, created_at DESC);

CREATE TABLE ask_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ask_id uuid NOT NULL REFERENCES ask_log (id) ON DELETE CASCADE,
  actor_id uuid NOT NULL REFERENCES users (id),
  verdict text NOT NULL CHECK (verdict IN ('helpful', 'incomplete', 'wrong_source', 'needs_review')),
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ask_feedback_note CHECK (char_length(note) <= 400)
);

CREATE INDEX ask_feedback_ask_idx ON ask_feedback (ask_id);
