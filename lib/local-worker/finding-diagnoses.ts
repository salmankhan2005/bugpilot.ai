import { getLocalDatabase, queryLocalDatabase } from './database';
import { appendLocalRunEventInTransaction } from './events';
import { diagnoseFinding, type DiagnosisEvidence } from './groq-diagnosis';
import type { FindingDiagnosis } from './diagnosis-schema';

export interface LocalFindingDiagnosis {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  summary: string | null;
  hypotheses: FindingDiagnosis['hypotheses'];
  nextChecks: string[];
  limitations: string[];
  model: string | null;
  failureReason: string | null;
  createdAt: string;
  finishedAt: string | null;
}

interface DiagnosisJobEvidence extends DiagnosisEvidence {
  diagnosisId: string;
  findingId: string;
  runId: string;
}

export async function processFindingDiagnosis(diagnosisId: string): Promise<void> {
  const client = await getLocalDatabase().connect();
  let evidence: DiagnosisJobEvidence | null = null;
  try {
    await client.query('BEGIN');
    const result = await client.query<{
      finding_id: string;
      run_id: string;
      category: 'console' | 'network';
      severity: 'high' | 'medium' | 'low';
      title: string;
      observed: string;
      source_url: string;
      run_goal: string;
      source_event_seq: number;
      status: string;
    }>(
      `SELECT d.finding_id, f.run_id, f.category, f.severity, f.title, f.observed,
              f.source_url, r.goal AS run_goal, f.source_event_seq, d.status
       FROM bp_local_finding_diagnoses d
       JOIN bp_local_run_findings f ON f.id = d.finding_id
       JOIN bp_local_runs r ON r.id = f.run_id
       WHERE d.id = $1 AND d.status IN ('pending', 'running')
       FOR UPDATE OF d`,
      [diagnosisId],
    );
    const row = result.rows[0];
    if (!row) {
      await client.query('ROLLBACK');
      return;
    }

    await client.query(
      `UPDATE bp_local_finding_diagnoses
       SET status = 'running', started_at = COALESCE(started_at, now()), failure_reason = NULL
       WHERE id = $1`,
      [diagnosisId],
    );
    await appendLocalRunEventInTransaction(
      client,
      row.run_id,
      'diagnosis.started',
      'Diagnostician',
      'Started bounded evidence-grounded diagnosis.',
      { diagnosisId, findingId: row.finding_id },
    );
    await client.query('COMMIT');

    const nearby = await getLocalDatabase().query<{
      seq: number;
      type: string;
      summary: string;
    }>(
      `SELECT seq, type, summary
       FROM bp_local_run_events
       WHERE run_id = $1 AND seq <= $2 AND seq <> $2
         AND type IN ('browser.action', 'console.error', 'network.request.failed')
       ORDER BY seq DESC
       LIMIT 12`,
      [row.run_id, row.source_event_seq],
    );
    evidence = {
      diagnosisId,
      findingId: row.finding_id,
      runId: row.run_id,
      category: row.category,
      severity: row.severity,
      title: row.title,
      observed: row.observed,
      sourceUrl: row.source_url,
      runGoal: row.run_goal,
      sourceEventSeq: row.source_event_seq,
      nearbyEvents: nearby.rows.reverse(),
    };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }

  if (!evidence) return;
  try {
    const result = await diagnoseFinding(evidence);
    await finishDiagnosis(evidence, {
      status: 'completed',
      summary: result.diagnosis.summary,
      hypotheses: result.diagnosis.hypotheses,
      nextChecks: result.diagnosis.nextChecks,
      limitations: result.diagnosis.limitations,
      model: result.model,
      failureReason: null,
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Finding diagnosis failed.';
    console.error(`Finding diagnosis ${diagnosisId} failed:`, reason);
    await finishDiagnosis(evidence, {
      status: 'failed',
      summary: null,
      hypotheses: [],
      nextChecks: [],
      limitations: [],
      model: null,
      failureReason: reason.slice(0, 500),
    });
  }
}

export async function getUserFindingDiagnosis(
  uid: string,
  projectId: string,
  findingId: string,
): Promise<LocalFindingDiagnosis | null> {
  const result = await queryLocalDatabase<{
    id: string;
    status: LocalFindingDiagnosis['status'];
    summary: string | null;
    hypotheses: LocalFindingDiagnosis['hypotheses'];
    next_checks: string[];
    limitations: string[];
    model: string | null;
    failure_reason: string | null;
    created_at: Date;
    finished_at: Date | null;
  }>(
    `SELECT d.id, d.status, d.summary, d.hypotheses, d.next_checks, d.limitations,
            d.model, d.failure_reason, d.created_at, d.finished_at
     FROM bp_local_finding_diagnoses d
     JOIN bp_local_run_findings f ON f.id = d.finding_id
     JOIN bp_local_runs r ON r.id = f.run_id
     WHERE f.id = $1 AND r.owner_uid = $2 AND r.project_id = $3
     ORDER BY d.created_at DESC
     LIMIT 1`,
    [findingId, uid, projectId],
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    id: row.id,
    status: row.status,
    summary: row.summary,
    hypotheses: row.hypotheses,
    nextChecks: row.next_checks,
    limitations: row.limitations,
    model: row.model,
    failureReason: row.failure_reason,
    createdAt: row.created_at.toISOString(),
    finishedAt: row.finished_at?.toISOString() ?? null,
  };
}

async function finishDiagnosis(
  evidence: DiagnosisJobEvidence,
  result: {
    status: 'completed' | 'failed';
    summary: string | null;
    hypotheses: FindingDiagnosis['hypotheses'];
    nextChecks: string[];
    limitations: string[];
    model: string | null;
    failureReason: string | null;
  },
): Promise<void> {
  const client = await getLocalDatabase().connect();
  try {
    await client.query('BEGIN');
    const updated = await client.query(
      `UPDATE bp_local_finding_diagnoses
       SET status = $2, summary = $3, hypotheses = $4::jsonb, next_checks = $5::jsonb,
           limitations = $6::jsonb, model = $7, failure_reason = $8, finished_at = now()
       WHERE id = $1 AND status = 'running'
       RETURNING id`,
      [
        evidence.diagnosisId,
        result.status,
        result.summary,
        JSON.stringify(result.hypotheses),
        JSON.stringify(result.nextChecks),
        JSON.stringify(result.limitations),
        result.model,
        result.failureReason,
      ],
    );
    if (updated.rowCount === 0) throw new Error(`Diagnosis ${evidence.diagnosisId} was not running.`);

    const eventType = result.status === 'completed' ? 'diagnosis.completed' : 'diagnosis.failed';
    await appendLocalRunEventInTransaction(
      client,
      evidence.runId,
      eventType,
      'Diagnostician',
      result.status === 'completed'
        ? 'Evidence-grounded hypotheses and next checks are ready for review.'
        : 'Diagnosis could not be completed; the persisted finding remains available.',
      { diagnosisId: evidence.diagnosisId, findingId: evidence.findingId, status: result.status },
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
