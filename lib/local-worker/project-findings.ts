import 'server-only';

import { queryLocalDatabase } from './database';

export interface LocalProjectFinding {
  id: string;
  runId: string;
  runGoal: string;
  fingerprint: string;
  sourceRunStatus: 'queued' | 'running' | 'cancel_requested' | 'completed' | 'failed' | 'cancelled' | 'timed_out';
  category: 'console' | 'network';
  severity: 'high' | 'medium' | 'low';
  status: 'new' | 'confirmed' | 'needs_review' | 'duplicate' | 'resolved';
  title: string;
  observed: string;
  sourceUrl: string;
  sourceEventSeq: number;
  createdAt: string;
}

export interface LocalProjectVerification {
  runId: string;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'blocked';
  findingReproduced: boolean | null;
  detail: string | null;
  createdAt: string;
  finishedAt: string | null;
}

interface LocalProjectFindingRow {
  id: string;
  run_id: string;
  run_goal: string;
  fingerprint: string;
  run_status: LocalProjectFinding['sourceRunStatus'];
  category: LocalProjectFinding['category'];
  severity: LocalProjectFinding['severity'];
  status: LocalProjectFinding['status'];
  title: string;
  observed: string;
  source_url: string;
  source_event_seq: number;
  created_at: Date;
}

export async function listUserProjectFindings(
  uid: string,
  projectId: string,
): Promise<LocalProjectFinding[]> {
  const result = await queryLocalDatabase<LocalProjectFindingRow>(
    `SELECT f.id, f.run_id, r.goal AS run_goal, f.fingerprint, r.status AS run_status, f.category, f.severity, f.status,
            f.title, f.observed, f.source_url, f.source_event_seq, f.created_at
     FROM bp_local_run_findings f
     JOIN bp_local_runs r ON r.id = f.run_id
     WHERE r.owner_uid = $1 AND r.project_id = $2
     ORDER BY f.created_at DESC
     LIMIT 100`,
    [uid, projectId],
  );

  return result.rows.map(toProjectFinding);
}

export async function getUserProjectFinding(
  uid: string,
  projectId: string,
  findingId: string,
): Promise<LocalProjectFinding | null> {
  const result = await queryLocalDatabase<LocalProjectFindingRow>(
    `SELECT f.id, f.run_id, r.goal AS run_goal, f.fingerprint, r.status AS run_status, f.category, f.severity, f.status,
            f.title, f.observed, f.source_url, f.source_event_seq, f.created_at
     FROM bp_local_run_findings f
     JOIN bp_local_runs r ON r.id = f.run_id
     WHERE f.id = $1 AND r.owner_uid = $2 AND r.project_id = $3`,
    [findingId, uid, projectId],
  );
  const row = result.rows[0];
  return row ? toProjectFinding(row) : null;
}

export async function listUserFindingVerifications(
  uid: string,
  projectId: string,
  findingId: string,
): Promise<LocalProjectVerification[]> {
  const result = await queryLocalDatabase<{
    run_id: string;
    status: LocalProjectVerification['status'];
    finding_reproduced: boolean | null;
    outcome_detail: string | null;
    created_at: Date;
    finished_at: Date | null;
  }>(
    `SELECT v.run_id, v.status, v.finding_reproduced, v.outcome_detail, v.created_at, v.finished_at
     FROM bp_local_run_verifications v
     JOIN bp_local_runs r ON r.id = v.run_id
     JOIN bp_local_run_findings f ON f.id = v.finding_id
     WHERE v.finding_id = $1 AND r.owner_uid = $2 AND r.project_id = $3
     ORDER BY v.created_at DESC
     LIMIT 20`,
    [findingId, uid, projectId],
  );

  return result.rows.map((row) => ({
    runId: row.run_id,
    status: row.status,
    findingReproduced: row.finding_reproduced,
    detail: row.outcome_detail,
    createdAt: row.created_at.toISOString(),
    finishedAt: row.finished_at?.toISOString() ?? null,
  }));
}

function toProjectFinding(row: LocalProjectFindingRow): LocalProjectFinding {
  return {
    id: row.id,
    runId: row.run_id,
    runGoal: row.run_goal,
    fingerprint: row.fingerprint,
    sourceRunStatus: row.run_status,
    category: row.category,
    severity: row.severity,
    status: row.status,
    title: row.title,
    observed: row.observed,
    sourceUrl: row.source_url,
    sourceEventSeq: row.source_event_seq,
    createdAt: row.created_at.toISOString(),
  };
}

export async function updateUserProjectFindingStatus(
  uid: string,
  projectId: string,
  findingId: string,
  status: LocalProjectFinding['status'],
): Promise<boolean> {
  const result = await queryLocalDatabase(
    `UPDATE bp_local_run_findings f
     SET status = $4
     FROM bp_local_runs r
     WHERE f.run_id = r.id
       AND f.id = $1
       AND r.owner_uid = $2
       AND r.project_id = $3`,
    [findingId, uid, projectId, status],
  );
  return result.rowCount === 1;
}
