CREATE TABLE IF NOT EXISTS bp_local_run_verifications (
  run_id text PRIMARY KEY REFERENCES bp_local_runs(id) ON DELETE CASCADE,
  finding_id uuid NOT NULL REFERENCES bp_local_run_findings(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'passed', 'failed', 'blocked')),
  finding_reproduced boolean,
  outcome_detail text,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  finished_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS bp_local_run_verifications_active_finding_idx
  ON bp_local_run_verifications (finding_id)
  WHERE status IN ('pending', 'running');

CREATE INDEX IF NOT EXISTS bp_local_run_verifications_finding_created_idx
  ON bp_local_run_verifications (finding_id, created_at DESC);
