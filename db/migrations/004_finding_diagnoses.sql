CREATE TABLE IF NOT EXISTS bp_local_finding_diagnoses (
  id uuid PRIMARY KEY,
  finding_id uuid NOT NULL REFERENCES bp_local_run_findings(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  summary text,
  hypotheses jsonb NOT NULL DEFAULT '[]'::jsonb,
  next_checks jsonb NOT NULL DEFAULT '[]'::jsonb,
  limitations jsonb NOT NULL DEFAULT '[]'::jsonb,
  model text,
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  finished_at timestamptz,
  CHECK (
    (status = 'completed' AND summary IS NOT NULL AND model IS NOT NULL)
    OR status <> 'completed'
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS bp_local_finding_diagnoses_active_finding_idx
  ON bp_local_finding_diagnoses (finding_id)
  WHERE status IN ('pending', 'running');

CREATE INDEX IF NOT EXISTS bp_local_finding_diagnoses_finding_created_idx
  ON bp_local_finding_diagnoses (finding_id, created_at DESC);
