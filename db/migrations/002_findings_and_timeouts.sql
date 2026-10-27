ALTER TABLE bp_local_runs
  DROP CONSTRAINT IF EXISTS bp_local_runs_status_check;

ALTER TABLE bp_local_runs
  ADD CONSTRAINT bp_local_runs_status_check
  CHECK (status IN (
    'queued', 'running', 'cancel_requested', 'completed', 'failed', 'cancelled', 'timed_out'
  ));

CREATE TABLE IF NOT EXISTS bp_local_run_findings (
  id uuid PRIMARY KEY,
  run_id text NOT NULL REFERENCES bp_local_runs(id) ON DELETE CASCADE,
  fingerprint text NOT NULL,
  source_event_seq integer NOT NULL,
  category text NOT NULL CHECK (category IN ('console', 'network')),
  severity text NOT NULL CHECK (severity IN ('high', 'medium', 'low')),
  status text NOT NULL DEFAULT 'needs_review'
    CHECK (status IN ('new', 'confirmed', 'needs_review', 'duplicate', 'resolved')),
  title text NOT NULL,
  observed text NOT NULL,
  source_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (run_id, fingerprint),
  FOREIGN KEY (run_id, source_event_seq)
    REFERENCES bp_local_run_events (run_id, seq) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS bp_local_run_findings_run_created_idx
  ON bp_local_run_findings (run_id, created_at DESC);
