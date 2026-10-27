import {
  assertLocalWorkerEnabled,
  isAllowedBrowserRequest,
  parseTargetUrl,
} from '@/lib/local-worker/security';
import { getCurrentUser } from '@/lib/auth/current-user';
import { getUserProject } from '@/lib/firebase/projects';
import { isUserOriginAuthorized } from '@/lib/firebase/verified-origins';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    assertLocalWorkerEnabled(request);
    const user = await getCurrentUser();
    if (!user) {
      return Response.json({ error: 'Sign in to use local runs.' }, { status: 401 });
    }
    const body: unknown = await request.json();
    if (!isRecord(body)) {
      return Response.json({ error: 'Invalid preflight request.' }, { status: 400 });
    }

    const projectId = typeof body.projectId === 'string' ? body.projectId : '';
    if (!/^[a-zA-Z0-9_-]{1,100}$/.test(projectId)) {
      return Response.json({ error: 'Choose a valid project before checking its target.' }, { status: 400 });
    }
    const project = await getUserProject(user.uid, projectId);
    if (!project) return Response.json({ error: 'Project not found.' }, { status: 404 });
    const target = parseTargetUrl(body.url);
    if (new URL(project.targetUrl).origin !== target.origin) {
      return Response.json({ error: 'Target origin does not match this project.' }, { status: 400 });
    }
    if (!await isUserOriginAuthorized(user.uid, target.origin)) {
      return Response.json({ error: 'Verify this website domain before checking its target.' }, { status: 403 });
    }
    if (!await isAllowedBrowserRequest(target.toString(), new Set([target.origin]))) {
      return Response.json({ error: 'The target resolves to a blocked private or invalid network address.' }, { status: 400 });
    }

    return Response.json({
      success: true,
      checks: [
        {
          name: 'Project authorization',
          ok: true,
          detail: `Verified project origin: ${target.origin}`,
        },
        {
          name: 'Public DNS policy',
          ok: true,
          detail: 'The target resolves only to public addresses; browser navigation is pinned to a checked address.',
        },
      ],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Preflight failed.';
    const status = message.includes('disabled') || message.includes('loopback') || message.includes('same-origin')
      ? 403
      : 502;
    return Response.json({ error: message }, { status });
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
