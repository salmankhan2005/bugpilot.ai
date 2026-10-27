ALTER TABLE bp_local_runs
  ADD COLUMN IF NOT EXISTS field_values jsonb NOT NULL DEFAULT '[]'::jsonb;
