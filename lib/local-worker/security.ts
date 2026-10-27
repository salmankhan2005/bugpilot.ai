import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

export function assertLocalWorkerEnabled(request?: Request): void {
  if (process.env.NODE_ENV !== 'development' || process.env.LOCAL_WORKER_ENABLED !== 'true') {
    throw new Error('The local Playwright worker is disabled outside enabled development mode.');
  }

  if (!request) return;

  const requestUrl = new URL(request.url);
  if (!isLoopback(requestUrl.hostname)) {
    throw new Error('Local worker API requests must use a loopback host.');
  }

  const origin = request.headers.get('origin');
  if (request.method !== 'GET') {
    if (!origin) throw new Error('A same-origin request is required.');
    const parsedOrigin = new URL(origin);
    if (parsedOrigin.host !== requestUrl.host || !isLoopback(parsedOrigin.hostname)) {
      throw new Error('Local worker API requests must be same-origin.');
    }
  }
}

export function getAllowedOrigins(): Set<string> {
  const configuredOrigins = process.env.LOCAL_WORKER_ALLOWED_ORIGINS;
  if (!configuredOrigins) {
    return new Set();
  }

  const origins = configuredOrigins.split(',').map((value) => value.trim()).filter(Boolean);
  if (origins.length === 0 || origins.length > 20) {
    throw new Error('LOCAL_WORKER_ALLOWED_ORIGINS must contain between 1 and 20 origins.');
  }

  return new Set(origins.map((value) => {
    const parsed = new URL(value);
    if (!['http:', 'https:'].includes(parsed.protocol)
      || parsed.username
      || parsed.password
      || parsed.pathname !== '/'
      || parsed.search
      || parsed.hash) {
      throw new Error(`Invalid allowed origin: ${value}`);
    }
    return parsed.origin;
  }));
}

export function validateTargetUrl(value: unknown): URL {
  const target = parseTargetUrl(value);
  if (!getAllowedOrigins().has(target.origin)) {
    throw new Error('This target origin is not in LOCAL_WORKER_ALLOWED_ORIGINS.');
  }
  return target;
}

export function parseTargetUrl(value: unknown): URL {
  if (typeof value !== 'string' || value.length > 2048) {
    throw new Error('Enter a valid target URL.');
  }

  let target: URL;
  try {
    target = new URL(value);
  } catch {
    throw new Error('Enter a valid target URL.');
  }

  if (!['http:', 'https:'].includes(target.protocol)
    || target.username
    || target.password
    || target.search
    || target.hash) {
    throw new Error('Target must be an HTTP or HTTPS URL without credentials, query parameters, or a fragment.');
  }
  return target;
}

export async function isAllowedBrowserRequest(value: string, allowedOrigins: Set<string>): Promise<boolean> {
  return (await resolveAllowedBrowserAddresses(value, allowedOrigins)) !== null;
}

export async function resolveAllowedBrowserAddresses(
  value: string,
  allowedOrigins: Set<string>,
): Promise<string[] | null> {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)
      || url.username
      || url.password
      || !allowedOrigins.has(url.origin)) {
      return null;
    }

    const host = url.hostname.toLowerCase();
    const ipVersion = isIP(host.replace(/^\[|\]$/g, ''));
    if (LOCAL_HOSTS.has(host)) {
      if (host === 'localhost') {
        const addresses = await lookup(host, { all: true, verbatim: true });
        return addresses.length > 0 ? addresses.map(({ address }) => address) : ['127.0.0.1'];
      }
      return [host.replace(/^\[|\]$/g, '')];
    }

    if (ipVersion === 4) return isPrivateIpv4(host) ? null : [host];
    if (ipVersion === 6) return isPrivateIpv6(host) ? null : [host];
    if (!host || host.endsWith('.local') || host.endsWith('.internal')) return null;

    const addresses = await lookup(host, { all: true, verbatim: true });
    if (addresses.length === 0 || !addresses.every(({ address }) => {
      const version = isIP(address);
      if (version === 4) return !isPrivateIpv4(address);
      if (version === 6) return !isPrivateIpv6(address);
      return false;
    })) return null;
    return addresses.map(({ address }) => address);
  } catch {
    return null;
  }
}

export function sanitizeUrl(value: string): string {
  try {
    const url = new URL(value);
    const safePath = url.pathname.replace(/[A-Za-z0-9_-]{32,}/g, '[REDACTED]');
    return `${url.origin}${safePath}`;
  } catch {
    return '[invalid URL]';
  }
}

export function redactText(value: string, maxLength = 500): string {
  return value
    .replace(/\bBearer\s+\S+/gi, 'Bearer [REDACTED]')
    .replace(/\b(password|token|secret|authorization)\s*[:=]\s*["']?[^"'\s,;]+/gi, '$1=[REDACTED]')
    .replace(/https?:\/\/[^\s"'<>]+/gi, (url) => sanitizeUrl(url))
    .slice(0, maxLength);
}

function isLoopback(hostname: string): boolean {
  return LOCAL_HOSTS.has(hostname.toLowerCase());
}

function isPrivateIpv4(host: string): boolean {
  const octets = host.split('.').map(Number);
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
    return true;
  }

  const [first, second] = octets;
  return first === 0
    || first === 10
    || first === 127
    || (first === 169 && second === 254)
    || (first === 172 && second >= 16 && second <= 31)
    || (first === 192 && second === 168)
    || first >= 224;
}

function isPrivateIpv6(host: string): boolean {
  const normalized = host.toLowerCase();
  return normalized === '::'
    || normalized === '::1'
    || normalized.startsWith('fc')
    || normalized.startsWith('fd')
    || normalized.startsWith('fe8')
    || normalized.startsWith('fe9')
    || normalized.startsWith('fea')
    || normalized.startsWith('feb')
    || normalized.startsWith('::ffff:');
}
