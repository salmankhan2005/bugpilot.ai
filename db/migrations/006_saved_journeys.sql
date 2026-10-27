CREATE TABLE IF NOT EXISTS bp_local_journeys (
  id uuid PRIMARY KEY,
  owner_uid text NOT NULL,
  project_id text NOT NULL,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  start_path text NOT NULL CHECK (char_length(start_path) BETWEEN 1 AND 2048),
  goal text NOT NULL CHECK (char_length(goal) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bp_local_journeys_owner_project_created_idx
  ON bp_local_journeys (owner_uid, project_id, created_at DESC);
