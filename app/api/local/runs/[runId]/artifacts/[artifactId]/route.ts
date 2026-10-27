import { queryLocalDatabase } from '@/lib/local-worker/database';
import { assertLocalWorkerEnabled } from '@/lib/local-worker/security';
import { getCurrentUser } from '@/lib/auth/current-user';

export const runtime = 'nodejs';

interface RouteContext {
  params: Promise<{ runId: string; artifactId: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    assertLocalWorkerEnabled(request);
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: 'Sign in to access run artifacts.' }, { status: 401 });
    const { runId, artifactId } = await context.params;
    const result = await queryLocalDatabase<{ content: Buffer; mime_type: string }>(
      `SELECT a.content, a.mime_type
       FROM bp_local_run_artifacts a
       JOIN bp_local_runs r ON r.id = a.run_id
       WHERE a.id = $1 AND a.run_id = $2 AND r.owner_uid = $3`,
      [artifactId, runId, user.uid],
    );
    const artifact = result.rows[0];
    if (!artifact) return Response.json({ error: 'Artifact not found.' }, { status: 404 });

    return new Response(new Uint8Array(artifact.content), {
      headers: {
        'Content-Type': artifact.mime_type,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not load the artifact.';
    const status = message.includes('disabled') || message.includes('loopback') ? 403 : 500;
    return Response.json({ error: message }, { status });
  }
}
