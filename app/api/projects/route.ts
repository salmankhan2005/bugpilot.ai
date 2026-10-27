import { getCurrentUser } from '@/lib/auth/current-user';
import { isSameOriginRequest } from '@/lib/auth/session-security';
import { createUserProject, ProjectValidationError } from '@/lib/firebase/projects';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return Response.json({ error: 'A same-origin request is required.' }, { status: 403 });
  }

  const user = await getCurrentUser();
  if (!user) return Response.json({ error: 'Sign in to create a project.' }, { status: 401 });

  try {
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > 8_192) {
      return Response.json({ error: 'Project request is too large.' }, { status: 413 });
    }
    const input: unknown = JSON.parse(rawBody);
    const project = await createUserProject(user.uid, input);
    return Response.json({ project }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof ProjectValidationError || error instanceof SyntaxError) {
      return Response.json({
        error: error instanceof ProjectValidationError ? error.message : 'Enter valid project details.',
      }, { status: 400 });
    }
    console.error('Project creation failed:', error);
    return Response.json({ error: 'Could not create the project. Please try again.' }, { status: 503 });
  }
}
