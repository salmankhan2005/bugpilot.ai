import { queryLocalDatabase } from './database';
import { sanitizeUrl } from './security';

export interface ProjectRouteCoverage {
  path: string;
  runCount: number;
  visitCount: number;
  loadedVisits: number;
  failedVisits: number;
  latestStatus: 'loaded' | 'failed';
  latestHttpStatus: number | null;
  lastVisitedAt: string;
}

export function normalizeRoutePath(value: string, expectedOrigin: string): string {
  const url = new URL(value);
  if (url.origin !== expectedOrigin) {
    throw new Error('Route coverage can only record same-origin URLs.');
  }

  return new URL(sanitizeUrl(url.toString())).pathname || '/';
}

export async function recordLocalRunRoute(
  runId: string,
  expectedOrigin: string,
  value: string,
  status: 'loaded' | 'failed',
  httpStatus: number | null,
): Promise<void> {
  const routePath = normalizeRoutePath(value, expectedOrigin);
  await queryLocalDatabase(
    `INSERT INTO bp_local_run_routes (run_id, route_path, status, http_status)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (run_id, route_path) DO UPDATE
     SET status = EXCLUDED.status,
         http_status = EXCLUDED.http_status,
         last_visited_at = now(),
         visit_count = bp_local_run_routes.visit_count + 1`,
    [runId, routePath, status, httpStatus],
  );
}

export async function listUserProjectRouteCoverage(
  uid: string,
  projectId: string,
): Promise<ProjectRouteCoverage[]> {
  const result = await queryLocalDatabase<{
    route_path: string;
    run_count: number;
    visit_count: number;
    loaded_visits: number;
    failed_visits: number;
    latest_status: 'loaded' | 'failed';
    latest_http_status: number | null;
    last_visited_at: Date;
  }>(
    `SELECT rr.route_path,
            count(DISTINCT r.id)::int AS run_count,
            sum(rr.visit_count)::int AS visit_count,
            sum(CASE WHEN rr.status = 'loaded' THEN rr.visit_count ELSE 0 END)::int AS loaded_visits,
            sum(CASE WHEN rr.status = 'failed' THEN rr.visit_count ELSE 0 END)::int AS failed_visits,
            (array_agg(rr.status ORDER BY rr.last_visited_at DESC))[1] AS latest_status,
            (array_agg(rr.http_status ORDER BY rr.last_visited_at DESC))[1] AS latest_http_status,
            max(rr.last_visited_at) AS last_visited_at
     FROM bp_local_run_routes rr
     JOIN bp_local_runs r ON r.id = rr.run_id
     WHERE r.owner_uid = $1 AND r.project_id = $2
     GROUP BY rr.route_path
     ORDER BY rr.route_path`,
    [uid, projectId],
  );

  return result.rows.map((row) => ({
    path: row.route_path,
    runCount: row.run_count,
    visitCount: row.visit_count,
    loadedVisits: row.loaded_visits,
    failedVisits: row.failed_visits,
    latestStatus: row.latest_status,
    latestHttpStatus: row.latest_http_status,
    lastVisitedAt: row.last_visited_at.toISOString(),
  }));
}
