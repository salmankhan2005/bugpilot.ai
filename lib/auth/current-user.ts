import { cookies } from 'next/headers';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { AUTH_SESSION_COOKIE } from './session-security';
import { getFirebaseAdminAuth } from '@/lib/firebase/admin';

export async function getCurrentUser(): Promise<DecodedIdToken | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(AUTH_SESSION_COOKIE)?.value;
  if (!sessionCookie) return null;

  try {
    return await getFirebaseAdminAuth().verifySessionCookie(sessionCookie, true);
  } catch {
    return null;
  }
}
