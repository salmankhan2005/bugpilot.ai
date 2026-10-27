import { randomUUID } from 'node:crypto';
import { getCurrentUser } from '@/lib/auth/current-user';
import { getLocalDatabase } from '@/lib/local-worker/database';
import { JourneyValidationError, listUserProjectJourneys, parseSavedJourneyInput } from '@/lib/local-worker/journeys';
import { assertLocalWorkerEnabled } from '@/lib/local-worker/security';
import { getUserProject } from '@/lib/firebase/projects';

export const runtime = 'nodejs';

interface RouteContext {
  params: Promise<{ projectId: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    assertLocalWorkerEnabled(request);
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: 'Sign in to access saved journeys.' }, { status: 401 });
    const { projectId } = await context.params;
    if (!isValidProjectId(projectId)) return Response.json({ error: 'Invalid project ID.' }, { status: 400 });
    const project = await getUserProject(user.uid, projectId);
    if (!project) return Response.json({ error: 'Project not found.' }, { status: 404 });

    const journeys = await listUserProjectJourneys(user.uid, projectId, project.targetUrl);
    return Response.json({ journeys }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return apiError(error, 'Could not load saved journeys.');
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    assertLocalWorkerEnabled(request);
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: 'Sign in to save a journey.' }, { status: 401 });
    const { projectId } = await context.params;
    if (!isValidProjectId(projectId)) return Response.json({ error: 'Invalid project ID.' }, { status: 400 });
    const project = await getUserProject(user.uid, projectId);
    if (!project) return Response.json({ error: 'Project not found.' }, { status: 404 });

    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > 8_192) {
      return Response.json({ error: 'Journey request is too large.' }, { status: 413 });
    }

    let input: unknown;
    try {
      input = JSON.parse(rawBody) as unknown;
    } catch {
      return Response.json({ error: 'Enter valid journey details.' }, { status: 400 });
    }
    const journey = parseSavedJourneyInput(input, project.targetUrl);
    const result = await getLocalDatabase().query<{
      id: string;
      name: string;
      start_path: string;
      goal: string;
      created_at: Date;
    }>(
      `INSERT INTO bp_local_journeys (id, owner_uid, project_id, name, start_path, goal)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, start_path, goal, created_at`,
      [randomUUID(), user.uid, projectId, journey.name, journey.startPath, journey.goal],
    );
    const row = result.rows[0];
    return Response.json({
      journey: {
        id: row.id,
        name: row.name,
        startPath: row.start_path,
        startUrl: new URL(row.start_path, project.targetUrl).toString(),
        goal: row.goal,
        createdAt: row.created_at.toISOString(),
      },
    }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof JourneyValidationError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    return apiError(error, 'Could not save this journey.');
  }
}

function isValidProjectId(value: string): boolean {
  return /^[a-zA-Z0-9_-]{1,100}$/.test(value);
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
