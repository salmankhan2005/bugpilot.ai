import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import { getLocalDatabase } from './database';

export interface LocalRunEvent {
  id: string;
  runId: string;
  seq: number;
  timestamp: string;
  type: string;
  actor: string;
  summary: string;
  payload: Record<string, unknown>;
}

export async function appendLocalRunEvent(
  runId: string,
  type: string,
  actor: string,
  summary: string,
  payload: Record<string, unknown> = {},
): Promise<LocalRunEvent> {
  const client = await getLocalDatabase().connect();
  try {
    await client.query('BEGIN');
    const event = await appendLocalRunEventInTransaction(client, runId, type, actor, summary, payload);
    await client.query('COMMIT');
    return event;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function appendLocalRunEventInTransaction(
  client: PoolClient,
  runId: string,
  type: string,
  actor: string,
  summary: string,
  payload: Record<string, unknown> = {},
): Promise<LocalRunEvent> {
  await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [runId]);
  const result = await client.query<{
    seq: number;
    created_at: Date;
  }>(
    `INSERT INTO bp_local_run_events (id, run_id, seq, type, actor, summary, payload)
     SELECT $1, $2, COALESCE(MAX(seq), 0) + 1, $3, $4, $5, $6::jsonb
     FROM bp_local_run_events
     WHERE run_id = $2
     RETURNING seq, created_at`,
    [randomUUID(), runId, type, actor, summary, JSON.stringify(payload)],
  );
  const row = result.rows[0];
  if (!row) throw new Error('Could not persist the run event.');
  return {
    id: `${runId}:${row.seq}`,
    runId,
    seq: row.seq,
    timestamp: row.created_at.toISOString(),
    type,
    actor,
    summary,
    payload,
  };
}
