import { createHash } from 'node:crypto';

export type BrowserFindingSignal = {
  category: 'console' | 'network';
  severity: 'high' | 'medium' | 'low';
  fingerprint: string;
  title: string;
  observed: string;
  sourceUrl: string;
};

export function classifyBrowserFindingSignal(
  type: string,
  summary: string,
  payload: Record<string, unknown>,
): BrowserFindingSignal | null {
  if (type !== 'console.error' && type !== 'network.request.failed') return null;
  if (/blockedbyclient|err_blocked_by_client|net::err_aborted/i.test(summary)) return null;

  const category = type === 'console.error' ? 'console' : 'network';
  const status = typeof payload.status === 'number' && Number.isInteger(payload.status)
    ? payload.status
    : null;
  const severity = status !== null && status >= 500
    ? 'high'
    : status !== null && status >= 400
      ? 'low'
      : 'medium';
  const sourceUrl = typeof payload.url === 'string' ? payload.url : '';
  const observed = summary.trim().slice(0, 1000) || 'Browser reported an error without additional details.';
  const identity = [
    category,
    status ?? '',
    sourceUrl,
    observed.toLowerCase().replace(/\s+/g, ' '),
  ].join('\n');
  const fingerprint = createHash('sha256').update(identity).digest('hex');
  const title = category === 'console'
    ? 'JavaScript console error'
    : status === null
      ? 'Network request failed'
      : `HTTP ${status} response`;

  return { category, severity, fingerprint, title, observed, sourceUrl };
}
