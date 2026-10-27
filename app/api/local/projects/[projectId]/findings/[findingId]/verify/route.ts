import { randomUUID } from 'node:crypto';
import { getCurrentUser } from '@/lib/auth/current-user';
import { getUserProject } from '@/lib/firebase/projects';
import { getLocalDatabase, queryLocalDatabase } from '@/lib/local-worker/database';
import { getLocalRunQueue } from '@/lib/local-worker/queue';
import { appendLocalRunEvent } from '@/lib/local-worker/events';
import { blockLocalRunVerification } from '@/lib/local-worker/run-verifications';
import { assertLocalWorkerEnabled, isAllowedBrowserRequest, parseTargetUrl } from '@/lib/local-worker/security';
import { isUserOriginAuthorized } from '@/lib/firebase/verified-origins';

export const runtime = 'nodejs';

interface RouteContext {
  params: Promise<{ projectId: string; findingId: string }>;
}

interface VerificationSource {
  finding_id: string;
  fingerprint: string;
  run_id: string;
  run_status: string;
  target_url: string;
  goal: string;
  viewport: 'desktop' | 'tablet' | 'mobile';
  browser: 'chromium';
  max_duration_seconds: number;
  max_pages: number;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    assertLocalWorkerEnabled(request);
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: 'Sign in to verify a finding.' }, { status: 401 });

    const { projectId, findingId } = await context.params;
    if (!/^[a-zA-Z0-9_-]{1,100}$/.test(projectId)
      || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(findingId)) {
      return Response.json({ error: 'Invalid project or finding ID.' }, { status: 400 });
    }

    const sourceResult = await queryLocalDatabase<VerificationSource>(
      `SELECT f.id AS finding_id, f.fingerprint, r.id AS run_id, r.status AS run_status,
              r.target_url, r.goal, r.viewport, r.browser, r.max_duration_seconds, r.max_pages
       FROM bp_local_run_findings f
       JOIN bp_local_runs r ON r.id = f.run_id
       WHERE f.id = $1 AND r.owner_uid = $2 AND r.project_id = $3`,
      [findingId, user.uid, projectId],
    );
    const source = sourceResult.rows[0];
    if (!source) return Response.json({ error: 'Finding not found.' }, { status: 404 });
    if (!['completed', 'timed_out'].includes(source.run_status)) {
      return Response.json({ error: 'Only findings from completed or timed-out runs can be verified.' }, { status: 409 });
    }

    const project = await getUserProject(user.uid, projectId);
    if (!project) return Response.json({ error: 'Project not found.' }, { status: 404 });
    const target = parseTargetUrl(source.target_url);
    if (new URL(project.targetUrl).origin !== target.origin) {
      return Response.json({ error: 'The source run origin no longer matches this project.' }, { status: 409 });
    }
    if (!await isUserOriginAuthorized(user.uid, target.origin)) {
      return Response.json({ error: 'Verify this website domain before verifying findings.' }, { status: 403 });
    }
    if (!await isAllowedBrowserRequest(target.toString(), new Set([target.origin]))) {
      return Response.json({ error: 'The target resolves to a private or blocked network address.' }, { status: 400 });
    }

    const active = await findActiveVerificationRun(findingId);
    if (active) return Response.json({ runId: active, existing: true }, { status: 202 });

    const runId = `run_${randomUUID()}`;
    const client = await getLocalDatabase().connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO bp_local_runs
          (id, owner_uid, project_id, status, target_url, goal, viewport, browser,
           max_duration_seconds, max_pages)
         VALUES ($1, $2, $3, 'queued', $4, $5, $6, $7, $8, $9)`,
        [
          runId,
          user.uid,
          projectId,
          target.toString(),
          source.goal,
          source.viewport,
          source.browser,
          source.max_duration_seconds,
          source.max_pages,
        ],
      );
      await client.query(
        `INSERT INTO bp_local_run_verifications (run_id, finding_id)
         VALUES ($1, $2)`,
        [runId, findingId],
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      if (postgresErrorCode(error) === '23505') {
        const existing = await findActiveVerificationRun(findingId);
        if (existing) return Response.json({ runId: existing, existing: true }, { status: 202 });
      }
      throw error;
    } finally {
      client.release();
    }

    try {
      await appendLocalRunEvent(
        runId,
        'run.created',
        'Orchestrator',
        'A fresh verification run was accepted and added to the local Playwright queue.',
        { verificationFindingId: findingId, targetUrl: `${target.origin}${target.pathname}` },
      );
      await getLocalRunQueue().add('execute-run', { runId }, { jobId: runId, attempts: 1 });
    } catch (error) {
      await getLocalDatabase().query(
        `UPDATE bp_local_runs
         SET status = 'failed', failure_reason = 'Could not queue the verification run.', finished_at = now()
         WHERE id = $1 AND status = 'queued'`,
        [runId],
      );
      await blockLocalRunVerification(runId, 'The verification run could not be queued.');
      await appendLocalRunEvent(runId, 'run.failed', 'Orchestrator', 'Could not queue the verification run.');
      console.error('Could not enqueue a local verification run:', error);
      return Response.json({
        error: 'Could not queue the verification run. Check the Redis connection and local worker setup.',
      }, { status: 503 });
    }

    return Response.json({ runId, existing: false }, { status: 202 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not start verification.';
    const status = message.includes('disabled') || message.includes('loopback') || message.includes('same-origin')
      ? 403
      : message.includes('DATABASE_URL') || message.includes('REDIS_URL')
        ? 503
        : message.includes('target') || message.includes('origin')
          ? 400
          : 500;
    return Response.json({ error: message }, { status });
  }
}

async function findActiveVerificationRun(findingId: string): Promise<string | null> {
  const result = await queryLocalDatabase<{ run_id: string }>(
    `SELECT run_id
     FROM bp_local_run_verifications
     WHERE finding_id = $1 AND status IN ('pending', 'running')
     LIMIT 1`,
    [findingId],
  );
  return result.rows[0]?.run_id ?? null;
}

function postgresErrorCode(error: unknown): string | null {
  if (typeof error !== 'object' || error === null || !('code' in error)) return null;
  return typeof error.code === 'string' ? error.code : null;
}
