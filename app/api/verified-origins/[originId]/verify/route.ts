import { getCurrentUser } from '@/lib/auth/current-user';
import { isSameOriginRequest } from '@/lib/auth/session-security';
import {
  OriginVerificationError,
  verifyOriginChallenge,
} from '@/lib/firebase/verified-origins';

export const runtime = 'nodejs';

export async function POST(
  request: Request,
  context: { params: Promise<{ originId: string }> },
) {
  if (!isSameOriginRequest(request)) {
    return Response.json({ error: 'A same-origin request is required.' }, { status: 403 });
  }
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: 'Sign in to verify a website domain.' }, { status: 401 });

  try {
    const { originId } = await context.params;
    const origin = await verifyOriginChallenge(user.uid, originId);
    return Response.json({ origin, verified: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof OriginVerificationError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    console.error('Could not verify website domain:', error);
    return Response.json({ error: 'Could not verify the DNS record.' }, { status: 503 });
  }
}
