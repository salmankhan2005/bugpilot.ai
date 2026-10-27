import { createHash } from 'node:crypto';
import { isIP } from 'node:net';

export function parseVerifiableOrigin(value: unknown): URL {
  if (typeof value !== 'string' || value.length > 2_048) {
    throw new Error('Enter a valid website origin.');
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('Enter a valid website origin.');
  }

  const hostname = url.hostname.toLowerCase();
  if (url.protocol !== 'https:'
    || url.port !== ''
    || url.username
    || url.password
    || url.pathname !== '/'
    || url.search
    || url.hash
    || isIP(hostname.replace(/^\[|\]$/g, ''))
    || !hostname.includes('.')
    || hostname.endsWith('.local')
    || hostname.endsWith('.internal')) {
    throw new Error('Domain verification requires an HTTPS website origin with a public domain name and no path, query, or fragment.');
  }
  return url;
}

export function getVerifiedOriginId(origin: string): string {
  return createHash('sha256').update(origin).digest('hex');
}

export function getVerificationTxtName(hostname: string): string {
  return `_bugpilot-verification.${hostname}`;
}

export function hasVerificationTxt(records: string[][], expectedValue: string): boolean {
  return records.some((record) => record.join('') === expectedValue);
}
