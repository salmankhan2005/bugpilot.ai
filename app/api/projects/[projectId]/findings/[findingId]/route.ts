import { getCurrentUser } from '@/lib/auth/current-user';
import { isSameOriginRequest } from '@/lib/auth/session-security';
import {
  getUserProjectFinding,
  listUserFindingVerifications,
  updateUserProjectFindingStatus,
  type LocalProjectFinding,
} from '@/lib/local-worker/project-findings';
import { queryLocalDatabase } from '@/lib/local-worker/database';

export const runtime = 'nodejs';

interface RouteContext {
  params: Promise<{ projectId: string; findingId: string }>;
}

const FINDING_STATUSES: LocalProjectFinding['status'][] = [
  'new',
  'confirmed',
  'needs_review',
  'duplicate',
  'resolved',
];

export async function GET(_request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: 'Sign in to access this finding.' }, { status: 401 });

  try {
    const { projectId, findingId } = await context.params;
    if (!isValidResourceId(projectId, findingId)) {
      return Response.json({ error: 'Invalid project or finding ID.' }, { status: 400 });
    }

    const finding = await getUserProjectFinding(user.uid, projectId, findingId);
    if (!finding) return Response.json({ error: 'Finding not found.' }, { status: 404 });

    const [verifications, source] = await Promise.all([
      listUserFindingVerifications(user.uid, projectId, findingId),
      queryLocalDatabase<{
        type: string;
        actor: string;
        summary: string;
        payload: Record<string, unknown>;
        created_at: Date;
      }>(
        `SELECT e.type, e.actor, e.summary, e.payload, e.created_at
         FROM bp_local_run_events e
         JOIN bp_local_runs r ON r.id = e.run_id
         WHERE e.run_id = $1 AND e.seq = $2
           AND r.owner_uid = $3 AND r.project_id = $4`,
        [finding.runId, finding.sourceEventSeq, user.uid, projectId],
      ),
    ]);
    const event = source.rows[0];

    return Response.json({
      finding,
      verifications,
      sourceEvent: event ? {
        type: event.type,
        actor: event.actor,
        summary: event.summary,
        payload: event.payload,
        timestamp: event.created_at.toISOString(),
      } : null,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Finding lookup failed:', error);
    return Response.json({ error: 'Could not load the finding.' }, { status: 503 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  if (!isSameOriginRequest(request)) {
    return Response.json({ error: 'A same-origin request is required.' }, { status: 403 });
  }

  const user = await getCurrentUser();
  if (!user) return Response.json({ error: 'Sign in to update this finding.' }, { status: 401 });

  try {
    const { projectId, findingId } = await context.params;
    if (!isValidResourceId(projectId, findingId)) {
      return Response.json({ error: 'Invalid project or finding ID.' }, { status: 400 });
    }
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > 1_024) {
      return Response.json({ error: 'Finding update is too large.' }, { status: 413 });
    }
    const body: unknown = JSON.parse(rawBody);
    if (!isRecord(body) || !isFindingStatus(body.status)) {
      return Response.json({ error: 'Choose a valid finding status.' }, { status: 400 });
    }

    const updated = await updateUserProjectFindingStatus(
      user.uid,
      projectId,
      findingId,
      body.status,
    );
    if (!updated) return Response.json({ error: 'Finding not found.' }, { status: 404 });
    return Response.json({ status: body.status }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return Response.json({ error: 'Enter valid finding details.' }, { status: 400 });
    }
    console.error('Finding status update failed:', error);
    return Response.json({ error: 'Could not update the finding.' }, { status: 503 });
  }
}

function isValidResourceId(projectId: string, findingId: string): boolean {
  return /^[a-zA-Z0-9_-]{1,100}$/.test(projectId)
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(findingId);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFindingStatus(value: unknown): value is LocalProjectFinding['status'] {
  return typeof value === 'string'
    && FINDING_STATUSES.some((status) => status === value);
}
