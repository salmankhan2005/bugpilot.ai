import type { RunStatus, Severity, FindingStatus, VerificationStatus } from './types';

// ---- Display helpers -----------------------------------------

export function runStatusLabel(status: RunStatus): string {
  const map: Record<RunStatus, string> = {
    draft:             'Draft',
    preflight:         'Preflight',
    queued:            'Queued',
    running:           'Running',
    cancel_requested:  'Stopping',
    exploring:         'Exploring',
    executing_checks:  'Checking',
    normalizing:       'Normalizing',
    triaging:          'Triaging',
    completed:         'Completed',
    needs_review:      'Needs Review',
    partial:           'Partial',
    blocked:           'Blocked',
    failed:            'Failed',
    cancelled:         'Cancelled',
    timed_out:         'Timed Out',
  };
  return map[status] ?? status;
}

export function runStatusBadgeClass(status: RunStatus): string {
  const map: Record<RunStatus, string> = {
    draft:             'badge-draft',
    preflight:         'badge-queued',
    queued:            'badge-queued',
    running:           'badge-running',
    cancel_requested:  'badge-queued',
    exploring:         'badge-running',
    executing_checks:  'badge-running',
    normalizing:       'badge-running',
    triaging:          'badge-running',
    completed:         'badge-completed',
    needs_review:      'badge-needs-review',
    partial:           'badge-partial',
    blocked:           'badge-blocked',
    failed:            'badge-failed',
    cancelled:         'badge-queued',
    timed_out:         'badge-failed',
  };
  return map[status] ?? 'badge-queued';
}

export function runStatusDotClass(status: RunStatus): string {
  const map: Record<RunStatus, string> = {
    draft:             'dot-queued',
    preflight:         'dot-queued',
    queued:            'dot-queued',
    running:           'dot-running',
    cancel_requested:  'dot-queued',
    exploring:         'dot-running',
    executing_checks:  'dot-running',
    normalizing:       'dot-running',
    triaging:          'dot-running',
    completed:         'dot-completed',
    needs_review:      'dot-needs-review',
    partial:           'dot-partial',
    blocked:           'dot-blocked',
    failed:            'dot-failed',
    cancelled:         'dot-queued',
    timed_out:         'dot-failed',
  };
  return map[status] ?? 'dot-queued';
}

export function isRunActive(status: RunStatus): boolean {
  return ['preflight', 'queued', 'running', 'cancel_requested', 'exploring', 'executing_checks', 'normalizing', 'triaging'].includes(status);
}

export function isRunTerminal(status: RunStatus): boolean {
  return ['completed', 'needs_review', 'partial', 'blocked', 'failed', 'cancelled', 'timed_out'].includes(status);
}

export function severityLabel(s: Severity): string {
  return { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low', info: 'Info' }[s] ?? s;
}

export function severityClass(s: Severity): string {
  return { critical: 'sev-critical', high: 'sev-high', medium: 'sev-medium', low: 'sev-low', info: 'sev-info' }[s] ?? '';
}

export function severityOrder(s: Severity): number {
  return { critical: 0, high: 1, medium: 2, low: 3, info: 4 }[s] ?? 5;
}

export function findingStatusLabel(s: FindingStatus): string {
  return { new: 'New', confirmed: 'Confirmed', needs_review: 'Needs Review', duplicate: 'Duplicate', resolved: 'Resolved' }[s] ?? s;
}

export function findingStatusClass(s: FindingStatus): string {
  const map: Record<FindingStatus, string> = {
    new:          'badge-failed',
    confirmed:    'badge-needs-review',
    needs_review: 'badge-partial',
    duplicate:    'badge-queued',
    resolved:     'badge-completed',
  };
  return map[s] ?? 'badge-queued';
}

export function verificationStatusLabel(s: VerificationStatus): string {
  return { not_run: 'Not Run', blocked: 'Blocked', running: 'Running', passed: 'Passed', failed: 'Failed' }[s] ?? s;
}

export function verificationStatusClass(s: VerificationStatus): string {
  const map: Record<VerificationStatus, string> = {
    not_run: 'text-[var(--muted-text)]',
    blocked: 'text-[var(--red-muted)]',
    running: 'text-[var(--sage)]',
    passed:  'text-[var(--sage)]',
    failed:  'text-[var(--red)]',
  };
  return map[s] ?? '';
}

// ---- Duration formatting -----------------------------------------
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return s > 0 ? `${m}m ${s}s` : `${m}m`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm > 0 ? `${h}h ${rm}m` : `${h}h`;
}

export function formatRelativeTime(isoString: string): string {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diffMs = now - then;
  const diffS = Math.floor(diffMs / 1000);
  if (diffS < 60)  return `${diffS}s ago`;
  if (diffS < 3600) return `${Math.floor(diffS / 60)}m ago`;
  if (diffS < 86400) return `${Math.floor(diffS / 3600)}h ago`;
  return `${Math.floor(diffS / 86400)}d ago`;
}

export const timeAgo = formatRelativeTime;

export function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

export function formatShortDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// ---- Confidence helpers -----------------------------------------
export function confidenceLabel(c: number): string {
  if (c >= 0.75) return 'High';
  if (c >= 0.45) return 'Medium';
  return 'Low';
}
export function confidenceClass(c: number): string {
  if (c >= 0.75) return 'high';
  if (c >= 0.45) return 'medium';
  return 'low';
}

// ---- URL display -----------------------------------------------
export function shortUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname + (u.pathname !== '/' ? u.pathname : '');
  } catch {
    return url;
  }
}
