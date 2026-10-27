import { randomUUID } from 'node:crypto';
import { appendLocalRunEvent } from '@/lib/local-worker/events';
import { getLocalDatabase } from '@/lib/local-worker/database';
import { getLocalRunQueue } from '@/lib/local-worker/queue';
import {
  assertLocalWorkerEnabled,
  isAllowedBrowserRequest,
  parseTargetUrl,
} from '@/lib/local-worker/security';
import { getCurrentUser } from '@/lib/auth/current-user';
import { getUserProject } from '@/lib/firebase/projects';
import { isUserOriginAuthorized } from '@/lib/firebase/verified-origins';
import {
  mergeRunFieldValues,
  normalizeRunFieldValues,
  parseRunGoalFieldValues,
  type RunFieldValue,
} from '@/lib/local-worker/run-field-values';

export const runtime = 'nodejs';

const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 390, height: 844 },
} as const;

export async function POST(request: Request) {
  try {
    assertLocalWorkerEnabled(request);
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: 'Sign in to use local runs.' }, { status: 401 });
    const body: unknown = await request.json();
    if (!isRecord(body)) return Response.json({ error: 'Invalid run request.' }, { status: 400 });

    const target = parseTargetUrl(body.targetUrl);
    const projectId = typeof body.projectId === 'string' ? body.projectId : '';
    const goal = typeof body.goal === 'string' ? body.goal.trim() : '';
    let fieldValues: RunFieldValue[];
    try {
      fieldValues = mergeRunFieldValues(parseRunGoalFieldValues(goal), normalizeRunFieldValues(body.fieldValues));
    } catch (error) {
      return Response.json({ error: error instanceof Error ? error.message : 'Invalid field values.' }, { status: 400 });
    }
    const viewport = body.viewport;
    const maxDurationMinutes = Number(body.maxDurationMinutes);
    const maxPages = Number(body.maxPages);

    if (!/^[a-zA-Z0-9_-]{1,100}$/.test(projectId)) {
      return Response.json({ error: 'Invalid project ID.' }, { status: 400 });
    }
    const project = await getUserProject(user.uid, projectId);
    if (!project) return Response.json({ error: 'Project not found.' }, { status: 404 });
    if (new URL(project.targetUrl).origin !== target.origin) {
      return Response.json({ error: 'Target origin does not match this project.' }, { status: 400 });
    }
    if (!await isUserOriginAuthorized(user.uid, target.origin)) {
      return Response.json({ error: 'Verify this website domain before starting a run.' }, { status: 403 });
    }
    if (!await isAllowedBrowserRequest(target.toString(), new Set([target.origin]))) {
      return Response.json({ error: 'The target resolves to a private or blocked network address.' }, { status: 400 });
    }
    if (!goal || goal.length > 2000) {
      return Response.json({ error: 'Goal must be between 1 and 2,000 characters.' }, { status: 400 });
    }
    if (typeof viewport !== 'string' || !(viewport in VIEWPORTS)) {
      return Response.json({ error: 'Choose a supported viewport.' }, { status: 400 });
    }
    if (![5, 15, 30].includes(maxDurationMinutes)) {
      return Response.json({ error: 'Choose a supported run duration.' }, { status: 400 });
    }
    if (![10, 20, 50].includes(maxPages)) {
      return Response.json({ error: 'Choose a supported page limit.' }, { status: 400 });
    }
    if (body.browser !== 'chromium') {
      return Response.json({ error: 'The local worker currently supports Chromium only.' }, { status: 400 });
    }

    const runId = `run_${randomUUID()}`;
    const pool = getLocalDatabase();
    await pool.query(
      `INSERT INTO bp_local_runs
        (id, owner_uid, project_id, status, target_url, goal, field_values, viewport, browser, max_duration_seconds, max_pages)
       VALUES ($1, $2, $3, 'queued', $4, $5, $6::jsonb, $7, 'chromium', $8, $9)`,
      [runId, user.uid, projectId, target.toString(), goal, JSON.stringify(fieldValues), viewport, maxDurationMinutes * 60, maxPages],
    );
    await appendLocalRunEvent(
      runId,
      'run.created',
      'Orchestrator',
      'Run accepted and added to the local Playwright queue.',
      { targetUrl: `${target.origin}${target.pathname}`, viewport, browser: 'chromium' },
    );

    try {
      await getLocalRunQueue().add('execute-run', { runId }, { jobId: runId, attempts: 1 });
    } catch (error) {
      const failureReason = error instanceof Error ? error.message : 'Queue unavailable.';
      await pool.query(
        `UPDATE bp_local_runs
         SET status = 'failed', failure_reason = $2, finished_at = now()
         WHERE id = $1`,
        [runId, failureReason.slice(0, 500)],
      );
      await appendLocalRunEvent(runId, 'run.failed', 'Orchestrator', 'Could not enqueue the local run.');
      throw new Error('Could not queue the run. Check the Redis connection and local worker setup.');
    }

    return Response.json({ runId }, { status: 202 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not create the run.';
    const status = message.includes('disabled') || message.includes('loopback') || message.includes('same-origin')
      ? 403
      : message.includes('DATABASE_URL') || message.includes('REDIS_URL')
        ? 503
        : message.includes('target') || message.includes('origin') || message.includes('goal')
          ? 400
          : 500;
    return Response.json({ error: message }, { status });
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
