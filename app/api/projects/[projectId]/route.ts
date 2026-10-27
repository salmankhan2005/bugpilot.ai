import { getCurrentUser } from '@/lib/auth/current-user';
import { isSameOriginRequest } from '@/lib/auth/session-security';
import { getUserProject, ProjectValidationError, updateUserProject } from '@/lib/firebase/projects';

export const runtime = 'nodejs';

export async function GET(
  _request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: 'Sign in to access this project.' }, { status: 401 });

  try {
    const { projectId } = await context.params;
    const project = await getUserProject(user.uid, projectId);
    if (!project) return Response.json({ error: 'Project not found.' }, { status: 404 });
    return Response.json({ project }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Project lookup failed:', error);
    return Response.json({ error: 'Could not load the project.' }, { status: 503 });
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  if (!isSameOriginRequest(request)) {
    return Response.json({ error: 'A same-origin request is required.' }, { status: 403 });
  }

  const user = await getCurrentUser();
  if (!user) return Response.json({ error: 'Sign in to update a project.' }, { status: 401 });

  try {
    const { projectId } = await context.params;
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > 8_192) {
      return Response.json({ error: 'Project request is too large.' }, { status: 413 });
    }
    const input: unknown = JSON.parse(rawBody);
    const project = await updateUserProject(user.uid, projectId, input);
    if (!project) return Response.json({ error: 'Project not found.' }, { status: 404 });
    return Response.json({ project }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof ProjectValidationError || error instanceof SyntaxError) {
      return Response.json({
        error: error instanceof ProjectValidationError ? error.message : 'Enter valid project details.',
      }, { status: 400 });
    }
    console.error('Project update failed:', error);
    return Response.json({ error: 'Could not update the project. Please try again.' }, { status: 503 });
  }
}
