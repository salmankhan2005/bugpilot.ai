import { appendLocalRunEvent } from '@/lib/local-worker/events';
import { queryLocalDatabase } from '@/lib/local-worker/database';
import { assertLocalWorkerEnabled } from '@/lib/local-worker/security';
import { getCurrentUser } from '@/lib/auth/current-user';

export const runtime = 'nodejs';

interface RouteContext {
  params: Promise<{ runId: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    assertLocalWorkerEnabled(request);
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: 'Sign in to access runs.' }, { status: 401 });
    const { runId } = await context.params;
    const result = await queryLocalDatabase<{ status: string }>(
      `UPDATE bp_local_runs
       SET status = 'cancel_requested'
       WHERE id = $1 AND owner_uid = $2 AND status IN ('queued', 'running')
       RETURNING status`,
      [runId, user.uid],
    );

    if (result.rowCount === 0) {
      const existing = await queryLocalDatabase<{ status: string }>(
        'SELECT status FROM bp_local_runs WHERE id = $1 AND owner_uid = $2',
        [runId, user.uid],
      );
      if (!existing.rows[0]) return Response.json({ error: 'Run not found.' }, { status: 404 });
      if (existing.rows[0].status === 'cancel_requested' || existing.rows[0].status === 'cancelled') {
        return Response.json({ status: existing.rows[0].status });
      }
      return Response.json({ error: `Run is already ${existing.rows[0].status}.` }, { status: 409 });
    }

    await appendLocalRunEvent(
      runId,
      'run.cancel.requested',
      'Orchestrator',
      'Cancellation requested. The local worker will stop the browser.',
    );
    return Response.json({ status: 'cancel_requested' }, { status: 202 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not cancel the run.';
    const status = message.includes('disabled') || message.includes('loopback') || message.includes('same-origin')
      ? 403
      : 500;
    return Response.json({ error: message }, { status });
  }
}
