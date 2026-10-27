import { queryLocalDatabase } from '@/lib/local-worker/database';
import { assertLocalWorkerEnabled } from '@/lib/local-worker/security';
import { getCurrentUser } from '@/lib/auth/current-user';

export const runtime = 'nodejs';

interface RouteContext {
  params: Promise<{ runId: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    assertLocalWorkerEnabled(request);
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: 'Sign in to access runs.' }, { status: 401 });
    const { runId } = await context.params;
    const expectedProjectId = new URL(request.url).searchParams.get('projectId');
    if (expectedProjectId && !/^[a-zA-Z0-9_-]{1,100}$/.test(expectedProjectId)) {
      return Response.json({ error: 'Invalid project ID.' }, { status: 400 });
    }
    const result = await queryLocalDatabase<{
      id: string;
      project_id: string;
      status: string;
      target_url: string;
      goal: string;
      viewport: string;
      browser: string;
      started_at: Date | null;
      finished_at: Date | null;
      created_at: Date;
      failure_reason: string | null;
      artifact_id: string | null;
      verification_finding_id: string | null;
      verification_status: 'pending' | 'running' | 'passed' | 'failed' | 'blocked' | null;
      verification_reproduced: boolean | null;
      verification_detail: string | null;
      verification_started_at: Date | null;
      verification_finished_at: Date | null;
    }>(
      `SELECT r.id, r.project_id, r.status, r.target_url, r.goal, r.viewport, r.browser,
              r.started_at, r.finished_at, r.created_at, r.failure_reason,
              v.finding_id AS verification_finding_id, v.status AS verification_status,
              v.finding_reproduced AS verification_reproduced, v.outcome_detail AS verification_detail,
              v.started_at AS verification_started_at, v.finished_at AS verification_finished_at,
              (SELECT id FROM bp_local_run_artifacts a
               WHERE a.run_id = r.id ORDER BY a.created_at DESC LIMIT 1) AS artifact_id
       FROM bp_local_runs r
       LEFT JOIN bp_local_run_verifications v ON v.run_id = r.id
       WHERE r.id = $1 AND r.owner_uid = $2
         AND ($3::text IS NULL OR r.project_id = $3)`,
      [runId, user.uid, expectedProjectId],
    );

    const run = result.rows[0];
    if (!run) return Response.json({ error: 'Run not found.' }, { status: 404 });
    return Response.json({
      run: {
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
        latestArtifactId: run.artifact_id,
        verification: run.verification_finding_id ? {
          findingId: run.verification_finding_id,
          status: run.verification_status,
          findingReproduced: run.verification_reproduced,
          detail: run.verification_detail,
          startedAt: run.verification_started_at?.toISOString() ?? null,
          finishedAt: run.verification_finished_at?.toISOString() ?? null,
        } : null,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not load the run.';
    const status = message.includes('disabled') || message.includes('loopback') ? 403 : 500;
    return Response.json({ error: message }, { status });
  }
}
