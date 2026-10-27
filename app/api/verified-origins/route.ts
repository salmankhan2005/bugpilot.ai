import { getCurrentUser } from '@/lib/auth/current-user';
import { isSameOriginRequest } from '@/lib/auth/session-security';
import {
  createOriginVerificationChallenge,
  OriginVerificationError,
} from '@/lib/firebase/verified-origins';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return Response.json({ error: 'A same-origin request is required.' }, { status: 403 });
  }
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: 'Sign in to verify a website domain.' }, { status: 401 });

  try {
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > 4_096) {
      return Response.json({ error: 'Domain verification request is too large.' }, { status: 413 });
    }
    let body: unknown;
    try {
      body = JSON.parse(rawBody) as unknown;
    } catch {
      return Response.json({ error: 'Enter a valid website origin.' }, { status: 400 });
    }
    const origin = isRecord(body) ? body.origin : undefined;
    const challenge = await createOriginVerificationChallenge(user.uid, origin);
    return Response.json({ challenge }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof OriginVerificationError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    console.error('Could not create website domain verification:', error);
    return Response.json({ error: 'Could not create the verification request.' }, { status: 503 });
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
