import 'server-only';

import { queryLocalDatabase } from './database';

export interface LocalProjectRun {
  id: string;
  projectId: string;
  status: 'queued' | 'running' | 'cancel_requested' | 'completed' | 'failed' | 'cancelled' | 'timed_out';
  targetUrl: string;
  goal: string;
  viewport: string;
  browser: string;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  failureReason: string | null;
  durationSeconds: number | null;
  findingCount: number;
  criticalCount: number;
}

export interface LocalProjectDashboardStats {
  totalRuns: number;
  activeRuns: number;
  findingsToReview: number;
  findingSeverityCounts: {
    high: number;
    medium: number;
    low: number;
  };
  uniqueRoutes: number;
  routeVisits: number;
}

interface LocalProjectRunRow {
  id: string;
  project_id: string;
  status: LocalProjectRun['status'];
  target_url: string;
  goal: string;
  viewport: string;
  browser: string;
  started_at: Date | null;
  finished_at: Date | null;
  created_at: Date;
  failure_reason: string | null;
  duration_seconds: number | null;
  finding_count: number;
  critical_count: number;
}

export async function listUserProjectRuns(uid: string, projectId: string): Promise<LocalProjectRun[]> {
  const result = await queryLocalDatabase<LocalProjectRunRow>(
    `SELECT r.id, r.project_id, r.status, r.target_url, r.goal, r.viewport, r.browser,
            r.started_at, r.finished_at, r.created_at, r.failure_reason,
            CASE WHEN r.started_at IS NOT NULL AND r.finished_at IS NOT NULL
                 THEN GREATEST(0, EXTRACT(EPOCH FROM (r.finished_at - r.started_at)))::int
                 WHEN r.started_at IS NOT NULL
                 THEN GREATEST(0, EXTRACT(EPOCH FROM (now() - r.started_at)))::int
                 ELSE NULL END AS duration_seconds,
            count(f.id)::int AS finding_count,
            count(f.id) FILTER (WHERE f.severity = 'high')::int AS critical_count
     FROM bp_local_runs r
     LEFT JOIN bp_local_run_findings f ON f.run_id = r.id
     WHERE r.owner_uid = $1 AND r.project_id = $2
     GROUP BY r.id
     ORDER BY r.created_at DESC
     LIMIT 100`,
    [uid, projectId],
  );

  return result.rows.map((run) => ({
    id: run.id,
    projectId: run.project_id,
    status: run.status,
    targetUrl: run.target_url,
    goal: run.goal,
    viewport: run.viewport,
    browser: run.browser,
    startedAt: run.started_at?.toISOString() ?? null,
    finishedAt: run.finished_at?.toISOString() ?? null,
    createdAt: run.created_at.toISOString(),
    failureReason: run.failure_reason,
    durationSeconds: run.duration_seconds,
    findingCount: run.finding_count,
    criticalCount: run.critical_count,
  }));
}

export async function getUserProjectDashboardStats(
  uid: string,
  projectId: string,
): Promise<LocalProjectDashboardStats> {
  const result = await queryLocalDatabase<{
    total_runs: number;
    active_runs: number;
    findings_to_review: number;
    high_priority_findings: number;
    medium_priority_findings: number;
    low_priority_findings: number;
    unique_routes: number;
    route_visits: number;
  }>(
    `WITH project_runs AS (
       SELECT id, status
       FROM bp_local_runs
       WHERE owner_uid = $1 AND project_id = $2
     ),
     review_findings AS (
       SELECT f.severity
       FROM bp_local_run_findings f
       JOIN project_runs r ON r.id = f.run_id
       WHERE f.status IN ('new', 'needs_review')
     ),
     project_routes AS (
       SELECT rr.route_path, rr.visit_count
       FROM bp_local_run_routes rr
       JOIN project_runs r ON r.id = rr.run_id
     )
     SELECT
       (SELECT count(*)::int FROM project_runs) AS total_runs,
       (SELECT count(*)::int
        FROM project_runs
        WHERE status IN ('queued', 'running', 'cancel_requested')) AS active_runs,
       (SELECT count(*)::int FROM review_findings) AS findings_to_review,
       (SELECT count(*) FILTER (WHERE severity = 'high')::int
        FROM review_findings) AS high_priority_findings,
       (SELECT count(*) FILTER (WHERE severity = 'medium')::int
        FROM review_findings) AS medium_priority_findings,
       (SELECT count(*) FILTER (WHERE severity = 'low')::int
        FROM review_findings) AS low_priority_findings,
       (SELECT count(DISTINCT route_path)::int FROM project_routes) AS unique_routes,
       (SELECT COALESCE(sum(visit_count), 0)::int FROM project_routes) AS route_visits`,
    [uid, projectId],
  );
  const row = result.rows[0];
  if (!row) throw new Error('Could not load project dashboard statistics.');

  return {
    totalRuns: row.total_runs,
    activeRuns: row.active_runs,
    findingsToReview: row.findings_to_review,
    findingSeverityCounts: {
      high: row.high_priority_findings,
      medium: row.medium_priority_findings,
      low: row.low_priority_findings,
    },
    uniqueRoutes: row.unique_routes,
    routeVisits: row.route_visits,
  };
}
