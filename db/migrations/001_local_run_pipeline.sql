CREATE TABLE IF NOT EXISTS bp_local_runs (
  id text PRIMARY KEY,
  owner_uid text,
  project_id text NOT NULL,
  status text NOT NULL CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
  target_url text NOT NULL,
  goal text NOT NULL,
  viewport text NOT NULL CHECK (viewport IN ('desktop', 'tablet', 'mobile')),
  browser text NOT NULL CHECK (browser = 'chromium'),
  max_duration_seconds integer NOT NULL CHECK (max_duration_seconds BETWEEN 60 AND 1800),
  max_pages integer NOT NULL CHECK (max_pages BETWEEN 1 AND 50),
  started_at timestamptz,
  finished_at timestamptz,
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE bp_local_runs
  ADD COLUMN IF NOT EXISTS owner_uid text;

CREATE INDEX IF NOT EXISTS bp_local_runs_project_created_idx
  ON bp_local_runs (project_id, created_at DESC);

CREATE INDEX IF NOT EXISTS bp_local_runs_owner_project_created_idx
  ON bp_local_runs (owner_uid, project_id, created_at DESC);

CREATE TABLE IF NOT EXISTS bp_local_run_events (
  id uuid NOT NULL UNIQUE,
  run_id text NOT NULL REFERENCES bp_local_runs(id) ON DELETE CASCADE,
  seq integer NOT NULL CHECK (seq > 0),
  type text NOT NULL,
  actor text NOT NULL,
  summary text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (run_id, seq)
);

CREATE TABLE IF NOT EXISTS bp_local_run_artifacts (
  id uuid PRIMARY KEY,
  run_id text NOT NULL REFERENCES bp_local_runs(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('screenshot')),
  mime_type text NOT NULL,
  content bytea NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (octet_length(content) <= 5242880)
);

CREATE INDEX IF NOT EXISTS bp_local_run_artifacts_run_created_idx
  ON bp_local_run_artifacts (run_id, created_at DESC);
