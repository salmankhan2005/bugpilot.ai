import { cookies } from 'next/headers';
import { getFirebaseAdminAuth } from '@/lib/firebase/admin';
import { syncFirebaseUserProfile } from '@/lib/firebase/user-profile';
import {
  AUTH_SESSION_COOKIE,
  AUTH_SESSION_MAX_AGE_SECONDS,
  isRecentAuthenticationTime,
  isSameOriginRequest,
} from '@/lib/auth/session-security';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return Response.json({ error: 'A same-origin request is required.' }, { status: 403 });
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return Response.json({ error: 'Invalid session request.' }, { status: 400 });
  }

  if (new TextEncoder().encode(rawBody).byteLength > 16_384) {
    return Response.json({ error: 'Session request is too large.' }, { status: 413 });
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: 'Invalid session request.' }, { status: 400 });
  }

  if (!isRecord(body) || typeof body.idToken !== 'string' || body.idToken.length > 12_000) {
    return Response.json({ error: 'A valid Firebase ID token is required.' }, { status: 400 });
  }

  try {
    const auth = getFirebaseAdminAuth();
    const decodedToken = await auth.verifyIdToken(body.idToken);
    if (!isRecentAuthenticationTime(decodedToken.auth_time)) {
      return Response.json({ error: 'Sign in again before creating a session.' }, { status: 401 });
    }

    const [sessionCookie] = await Promise.all([
      auth.createSessionCookie(body.idToken, {
        expiresIn: AUTH_SESSION_MAX_AGE_SECONDS * 1000,
      }),
      syncFirebaseUserProfile(decodedToken),
    ]);
    const cookieStore = await cookies();
    cookieStore.set(AUTH_SESSION_COOKIE, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: AUTH_SESSION_MAX_AGE_SECONDS,
    });

    return Response.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const code = getFirebaseErrorCode(error);
    if (code.startsWith('auth/')) {
      return Response.json({ error: 'Firebase could not verify this sign-in. Please sign in again.' }, { status: 401 });
    }
    console.error('Firebase session creation failed:', code || 'unknown error');
    return Response.json({
      error: 'Firebase server authentication or Firestore is unavailable. Check Firebase Admin credentials and database access.',
    }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  if (!isSameOriginRequest(request)) {
    return Response.json({ error: 'A same-origin request is required.' }, { status: 403 });
  }

  const cookieStore = await cookies();
  cookieStore.set(AUTH_SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return Response.json({ success: true });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getFirebaseErrorCode(error: unknown): string {
  if (typeof error !== 'object' || error === null || !('code' in error)) return '';
  return typeof error.code === 'string' ? error.code : '';
}
