import { getCurrentUser } from '@/lib/auth/current-user';
import { getUserProject } from '@/lib/firebase/projects';
import { listUserProjectActivity } from '@/lib/local-worker/project-activity';
import { listUserProjectFindings } from '@/lib/local-worker/project-findings';
import { listUserProjectRouteCoverage } from '@/lib/local-worker/route-coverage';
import { getUserProjectDashboardStats, listUserProjectRuns } from '@/lib/local-worker/project-runs';

export const runtime = 'nodejs';

interface RouteContext {
  params: Promise<{ projectId: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: 'Sign in to access this project.' }, { status: 401 });

  try {
    const { projectId } = await context.params;
    const project = await getUserProject(user.uid, projectId);
    if (!project) return Response.json({ error: 'Project not found.' }, { status: 404 });

    const [stats, runs, findings, coverage, activity] = await Promise.all([
      getUserProjectDashboardStats(user.uid, projectId),
      listUserProjectRuns(user.uid, projectId),
      listUserProjectFindings(user.uid, projectId),
      listUserProjectRouteCoverage(user.uid, projectId),
      listUserProjectActivity(user.uid, projectId, 20),
    ]);

    return Response.json(
      { project, stats, runs, findings, coverage, activity, refreshedAt: new Date().toISOString() },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    console.error('Project dashboard lookup failed:', error);
    return Response.json({ error: 'Could not load project data.' }, { status: 503 });
  }
}
