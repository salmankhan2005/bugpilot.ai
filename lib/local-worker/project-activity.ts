import 'server-only';

import { queryLocalDatabase } from './database';
import type { LocalProjectRun } from './project-runs';

export interface LocalProjectActivity {
  id: string;
  runId: string;
  runStatus: LocalProjectRun['status'];
  actor: string;
  type: string;
  summary: string;
  timestamp: string;
}

export async function listUserProjectActivity(
  uid: string,
  projectId: string,
  limit = 50,
): Promise<LocalProjectActivity[]> {
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new Error('Project activity limit must be between 1 and 100.');
  }

  const result = await queryLocalDatabase<{
    run_id: string;
    run_status: LocalProjectRun['status'];
    seq: number;
    actor: string;
    type: string;
    summary: string;
    created_at: Date;
  }>(
    `SELECT r.id AS run_id, r.status AS run_status, e.seq, e.actor, e.type, e.summary, e.created_at
     FROM bp_local_run_events e
     JOIN bp_local_runs r ON r.id = e.run_id
     WHERE r.owner_uid = $1 AND r.project_id = $2
     ORDER BY e.created_at DESC, e.seq DESC
     LIMIT $3`,
    [uid, projectId, limit],
  );

  return result.rows.map((row) => ({
    id: `${row.run_id}:${row.seq}`,
    runId: row.run_id,
    runStatus: row.run_status,
    actor: row.actor,
    type: row.type,
    summary: row.summary,
    timestamp: row.created_at.toISOString(),
  }));
}
