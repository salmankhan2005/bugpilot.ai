CREATE TABLE IF NOT EXISTS bp_local_run_routes (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  run_id text NOT NULL REFERENCES bp_local_runs(id) ON DELETE CASCADE,
  route_path text NOT NULL,
  status text NOT NULL CHECK (status IN ('loaded', 'failed')),
  http_status integer CHECK (http_status IS NULL OR http_status BETWEEN 100 AND 599),
  last_visited_at timestamptz NOT NULL DEFAULT now(),
  visit_count integer NOT NULL DEFAULT 1 CHECK (visit_count > 0),
  UNIQUE (run_id, route_path)
);

CREATE INDEX IF NOT EXISTS bp_local_run_routes_path_visited_idx
  ON bp_local_run_routes (route_path, last_visited_at DESC);
