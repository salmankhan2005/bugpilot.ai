import type { PoolClient } from 'pg';
import { appendLocalRunEventInTransaction } from './events';
import { getLocalDatabase } from './database';
import type { VerificationResult } from './verification-result';

export interface LocalRunVerification {
  findingId: string;
  status: 'pending' | 'running' | VerificationResult['status'];
  findingReproduced: boolean | null;
  detail: string | null;
  startedAt: string | null;
  finishedAt: string | null;
}

export async function startLocalRunVerification(runId: string): Promise<void> {
  await withVerificationTransaction(async (client) => {
    const updated = await client.query<{ finding_id: string }>(
      `UPDATE bp_local_run_verifications
       SET status = 'running', started_at = now()
       WHERE run_id = $1 AND status = 'pending'
       RETURNING finding_id`,
      [runId],
    );
    const verification = updated.rows[0];
    if (!verification) return;

    await appendLocalRunEventInTransaction(
      client,
      runId,
      'verification.started',
      'Verifier',
      'Started a fresh deterministic run for this finding.',
      { findingId: verification.finding_id, status: 'running' },
    );
  });
}

export async function finishLocalRunVerification(
  runId: string,
  result: VerificationResult,
  runStatus: 'completed' | 'timed_out',
): Promise<void> {
  await withVerificationTransaction(async (client) => {
    const finishedRun = await client.query(
      `UPDATE bp_local_runs
       SET status = $2, finished_at = now()
       WHERE id = $1 AND status = 'running'
       RETURNING id`,
      [runId, runStatus],
    );
    if (finishedRun.rowCount === 0) throw new Error(`Run state for ${runId} changed before verification completed.`);

    const updated = await client.query<{ finding_id: string }>(
      `UPDATE bp_local_run_verifications
       SET status = $2, finding_reproduced = $3, outcome_detail = $4, finished_at = now()
       WHERE run_id = $1 AND status = 'running'
       RETURNING finding_id`,
      [runId, result.status, result.findingReproduced, result.detail],
    );
    const verification = updated.rows[0];
    if (!verification) throw new Error(`Verification state for ${runId} was not running.`);

    await appendLocalRunEventInTransaction(
      client,
      runId,
      `verification.${result.status}`,
      'Verifier',
      result.detail,
      {
        findingId: verification.finding_id,
        status: result.status,
        findingReproduced: result.findingReproduced,
      },
    );
  });
}

export async function blockLocalRunVerification(runId: string, detail: string): Promise<void> {
  await withVerificationTransaction(async (client) => {
    const updated = await client.query<{ finding_id: string }>(
      `UPDATE bp_local_run_verifications
       SET status = 'blocked', finding_reproduced = NULL, outcome_detail = $2, finished_at = now()
       WHERE run_id = $1 AND status IN ('pending', 'running')
       RETURNING finding_id`,
      [runId, detail],
    );
    const verification = updated.rows[0];
    if (!verification) return;

    await appendLocalRunEventInTransaction(
      client,
      runId,
      'verification.blocked',
      'Verifier',
      detail,
      { findingId: verification.finding_id, status: 'blocked' },
    );
  });
}

export async function getLocalRunVerification(runId: string): Promise<LocalRunVerification | null> {
  const result = await getLocalDatabase().query<{
    finding_id: string;
    status: LocalRunVerification['status'];
    finding_reproduced: boolean | null;
    outcome_detail: string | null;
    started_at: Date | null;
    finished_at: Date | null;
  }>(
    `SELECT finding_id, status, finding_reproduced, outcome_detail, started_at, finished_at
     FROM bp_local_run_verifications
     WHERE run_id = $1`,
    [runId],
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    findingId: row.finding_id,
    status: row.status,
    findingReproduced: row.finding_reproduced,
    detail: row.outcome_detail,
    startedAt: row.started_at?.toISOString() ?? null,
    finishedAt: row.finished_at?.toISOString() ?? null,
  };
}

async function withVerificationTransaction(
  action: (client: PoolClient) => Promise<void>,
): Promise<void> {
  const client = await getLocalDatabase().connect();
  try {
    await client.query('BEGIN');
    await action(client);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
