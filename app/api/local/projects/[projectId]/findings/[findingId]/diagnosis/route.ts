import { randomUUID } from 'node:crypto';
import { getCurrentUser } from '@/lib/auth/current-user';
import { getLocalDatabase, queryLocalDatabase } from '@/lib/local-worker/database';
import { appendLocalRunEventInTransaction } from '@/lib/local-worker/events';
import { getUserFindingDiagnosis } from '@/lib/local-worker/finding-diagnoses';
import { getLocalRunQueue } from '@/lib/local-worker/queue';
import { assertLocalWorkerEnabled } from '@/lib/local-worker/security';

export const runtime = 'nodejs';

interface RouteContext {
  params: Promise<{ projectId: string; findingId: string }>;
}

interface OwnedFinding {
  finding_id: string;
  run_id: string;
  run_status: string;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    assertLocalWorkerEnabled(request);
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: 'Sign in to access finding diagnosis.' }, { status: 401 });

    const { projectId, findingId } = await context.params;
    if (!isValidResourceId(projectId, findingId)) {
      return Response.json({ error: 'Invalid project or finding ID.' }, { status: 400 });
    }

    const diagnosis = await getUserFindingDiagnosis(user.uid, projectId, findingId);
    if (!diagnosis) {
      const finding = await getOwnedFinding(user.uid, projectId, findingId);
      if (!finding) return Response.json({ error: 'Finding not found.' }, { status: 404 });
    }
    return Response.json({ diagnosis: diagnosis ?? null });
  } catch (error) {
    return apiError(error, 'Could not load finding diagnosis.');
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    assertLocalWorkerEnabled(request);
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: 'Sign in to request finding diagnosis.' }, { status: 401 });
    if (!process.env.GROQ_API_KEY?.trim()) {
      return Response.json({ error: 'Finding diagnosis is not configured. Set GROQ_API_KEY in the local worker environment.' }, { status: 503 });
    }

    const { projectId, findingId } = await context.params;
    if (!isValidResourceId(projectId, findingId)) {
      return Response.json({ error: 'Invalid project or finding ID.' }, { status: 400 });
    }
    const finding = await getOwnedFinding(user.uid, projectId, findingId);
    if (!finding) return Response.json({ error: 'Finding not found.' }, { status: 404 });
    if (!['completed', 'timed_out'].includes(finding.run_status)) {
      return Response.json({ error: 'Diagnosis is available only after the source run completes or times out.' }, { status: 409 });
    }

    const latest = await getUserFindingDiagnosis(user.uid, projectId, findingId);
    if (latest && ['pending', 'running', 'completed'].includes(latest.status)) {
      return Response.json({ diagnosis: latest, existing: true }, { status: 202 });
    }

    const diagnosisId = randomUUID();
    const client = await getLocalDatabase().connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO bp_local_finding_diagnoses (id, finding_id, status)
         VALUES ($1, $2, 'pending')`,
        [diagnosisId, findingId],
      );
      await appendLocalRunEventInTransaction(
        client,
        finding.run_id,
        'diagnosis.queued',
        'Diagnostician',
        'Queued a bounded AI-assisted finding diagnosis for review.',
        { diagnosisId, findingId },
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      if (postgresErrorCode(error) === '23505') {
        const active = await getUserFindingDiagnosis(user.uid, projectId, findingId);
        if (active && ['pending', 'running', 'completed'].includes(active.status)) {
          return Response.json({ diagnosis: active, existing: true }, { status: 202 });
        }
      }
      throw error;
    } finally {
      client.release();
    }

    try {
      await getLocalRunQueue().add(
        'diagnose-finding',
        { diagnosisId },
        { jobId: diagnosisId, attempts: 1 },
      );
    } catch (error) {
      const client = await getLocalDatabase().connect();
      try {
        await client.query('BEGIN');
        await client.query(
          `UPDATE bp_local_finding_diagnoses
           SET status = 'failed', failure_reason = 'Could not queue diagnosis.', finished_at = now()
           WHERE id = $1 AND status = 'pending'`,
          [diagnosisId],
        );
        await appendLocalRunEventInTransaction(
          client,
          finding.run_id,
          'diagnosis.failed',
          'Diagnostician',
          'Diagnosis could not be queued. Check the Redis connection and local worker setup.',
          { diagnosisId, findingId, status: 'failed' },
        );
        await client.query('COMMIT');
      } catch (updateError) {
        await client.query('ROLLBACK');
        console.error('Could not persist diagnosis queue failure:', updateError);
      } finally {
        client.release();
      }
      console.error('Could not enqueue finding diagnosis:', error);
      return Response.json({ error: 'Could not queue diagnosis. Check the Redis connection and local worker setup.' }, { status: 503 });
    }

    return Response.json({
      diagnosis: {
        id: diagnosisId,
        status: 'pending',
        summary: null,
        hypotheses: [],
        nextChecks: [],
        limitations: [],
        model: null,
        failureReason: null,
      },
      existing: false,
    }, { status: 202 });
  } catch (error) {
    return apiError(error, 'Could not start finding diagnosis.');
  }
}

async function getOwnedFinding(
  uid: string,
  projectId: string,
  findingId: string,
): Promise<OwnedFinding | null> {
  const result = await queryLocalDatabase<OwnedFinding>(
    `SELECT f.id AS finding_id, f.run_id, r.status AS run_status
     FROM bp_local_run_findings f
     JOIN bp_local_runs r ON r.id = f.run_id
     WHERE f.id = $1 AND r.owner_uid = $2 AND r.project_id = $3`,
    [findingId, uid, projectId],
  );
  return result.rows[0] ?? null;
}

function isValidResourceId(projectId: string, findingId: string): boolean {
  return /^[a-zA-Z0-9_-]{1,100}$/.test(projectId)
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(findingId);
}

function postgresErrorCode(error: unknown): string | null {
  if (typeof error !== 'object' || error === null || !('code' in error)) return null;
  return typeof error.code === 'string' ? error.code : null;
}

function apiError(error: unknown, fallback: string): Response {
  const message = error instanceof Error ? error.message : fallback;
  const status = message.includes('disabled') || message.includes('loopback') || message.includes('same-origin')
    ? 403
    : message.includes('DATABASE_URL') || message.includes('REDIS_URL')
      ? 503
      : 500;
  return Response.json({ error: message }, { status });
}
