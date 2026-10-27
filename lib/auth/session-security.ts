export const AUTH_SESSION_COOKIE = 'bp_session';
export const AUTH_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 5;

export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;

  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export function getSafeRedirectPath(value: unknown): string {
  if (typeof value !== 'string'
    || value.length > 2048
    || (value !== '/app' && !value.startsWith('/app/'))
    || value.startsWith('//')
    || value.includes('\\')) {
    return '/app';
  }

  try {
    const url = new URL(value, 'https://bugpilot.invalid');
    if (url.origin !== 'https://bugpilot.invalid' || ['/sign-in', '/sign-up'].includes(url.pathname)) {
      return '/app';
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return '/app';
  }
}

export function isRecentAuthenticationTime(authTime: unknown, now = Date.now()): authTime is number {
  if (typeof authTime !== 'number' || !Number.isSafeInteger(authTime)) return false;
  const ageMs = now - authTime * 1000;
  return ageMs >= -30_000 && ageMs <= 5 * 60 * 1000;
}
