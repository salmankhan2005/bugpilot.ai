import { getCurrentUser } from '@/lib/auth/current-user';
import { getLocalDatabase } from '@/lib/local-worker/database';
import { assertLocalWorkerEnabled } from '@/lib/local-worker/security';
import { getUserProject } from '@/lib/firebase/projects';

export const runtime = 'nodejs';

interface RouteContext {
  params: Promise<{ projectId: string; journeyId: string }>;
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    assertLocalWorkerEnabled(request);
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: 'Sign in to delete a saved journey.' }, { status: 401 });

    const { projectId, journeyId } = await context.params;
    if (!/^[a-zA-Z0-9_-]{1,100}$/.test(projectId)
      || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(journeyId)) {
      return Response.json({ error: 'Invalid project or journey ID.' }, { status: 400 });
    }
    const project = await getUserProject(user.uid, projectId);
    if (!project) return Response.json({ error: 'Project not found.' }, { status: 404 });

    const result = await getLocalDatabase().query(
      `DELETE FROM bp_local_journeys
       WHERE id = $1 AND owner_uid = $2 AND project_id = $3
       RETURNING id`,
      [journeyId, user.uid, projectId],
    );
    if (result.rowCount === 0) return Response.json({ error: 'Journey not found.' }, { status: 404 });
    return Response.json({ deleted: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not delete this journey.';
    const status = message.includes('disabled') || message.includes('loopback') || message.includes('same-origin')
      ? 403
      : message.includes('DATABASE_URL') || message.includes('REDIS_URL')
        ? 503
        : 500;
    return Response.json({ error: message }, { status });
  }
}
