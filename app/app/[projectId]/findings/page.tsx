'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { Search, RefreshCw } from 'lucide-react';
import { PageHeader, SeverityBadge, FindingStatusBadge, MonoId } from '@/components/ui/shared';
import { useProjectDashboard } from '@/components/projects/useProjectDashboard';
import { timeAgo } from '@/lib/domain/helpers';
import type { LocalProjectFinding } from '@/lib/local-worker/project-findings';

const STATUSES = ['all', 'new', 'confirmed', 'needs_review', 'duplicate', 'resolved'] as const;
const SEVERITIES = ['all', 'high', 'medium', 'low'] as const;

export default function FindingsInboxPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  const { data, error: loadError, loading } = useProjectDashboard(projectId);
  const [statusOverrides, setStatusOverrides] = useState<Record<string, {
    from: LocalProjectFinding['status'];
    to: LocalProjectFinding['status'];
  }>>({});
  const [statusFilter, setStatusFilter] = useState<(typeof STATUSES)[number]>('all');
  const [severityFilter, setSeverityFilter] = useState<(typeof SEVERITIES)[number]>('all');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const findings = data?.findings.map((finding) => {
    const override = statusOverrides[finding.id];
    return override && finding.status === override.from
      ? { ...finding, status: override.to }
      : finding;
  }) ?? [];

  const filtered = findings.filter((finding) => {
    if (statusFilter !== 'all' && finding.status !== statusFilter) return false;
    if (severityFilter !== 'all' && finding.severity !== severityFilter) return false;
    const query = search.trim().toLowerCase();
    return !query
      || finding.title.toLowerCase().includes(query)
      || finding.id.toLowerCase().includes(query)
      || finding.observed.toLowerCase().includes(query)
      || finding.fingerprint.toLowerCase().includes(query);
  });

  async function updateStatuses(status: LocalProjectFinding['status']) {
    if (selectedIds.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      const results = await Promise.allSettled(selectedIds.map(async (findingId) => {
        const response = await fetch(
          `/api/projects/${encodeURIComponent(projectId)}/findings/${encodeURIComponent(findingId)}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status }),
          },
        );
        const result = await response.json() as { error?: string };
        if (!response.ok) throw new Error(result.error || `Could not update finding ${findingId}.`);
        return findingId;
      }));
      const updatedIds = results.flatMap((result) => result.status === 'fulfilled' ? [result.value] : []);
      if (data) {
        setStatusOverrides((current) => {
          const next = { ...current };
          for (const id of updatedIds) {
            const finding = data.findings.find((item) => item.id === id);
            if (finding) next[id] = { from: finding.status, to: status };
          }
          return next;
        });
      }
      setSelectedIds([]);
      const failedCount = results.length - updatedIds.length;
      if (failedCount) setError(`${updatedIds.length} finding(s) updated; ${failedCount} could not be updated. Refresh the page to retry.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update findings.');
    } finally {
      setSaving(false);
    }
  }

  const base = `/app/${projectId}`;

  return (
    <div style={{ paddingBottom: 64 }}>
      <PageHeader
        title="Findings Inbox"
        breadcrumb="Findings"
        subtitle="Persisted findings from local browser runs"
        actions={selectedIds.length > 0 ? (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--muted-text)' }}>{selectedIds.length} selected</span>
            <button type="button" onClick={() => void updateStatuses('confirmed')} disabled={saving} className="btn btn-secondary btn-sm">Mark Confirmed</button>
            <button type="button" onClick={() => void updateStatuses('resolved')} disabled={saving} className="btn btn-secondary btn-sm">Mark Resolved</button>
          </div>
        ) : undefined}
      />

      <div style={{ padding: '24px 28px' }}>
        {(loadError || error) && (
          <p role="alert" className="card" style={{ padding: 14, color: 'var(--red)' }}>{error ?? loadError}</p>
        )}
        {loading && !data && <p role="status" style={{ color: 'var(--muted-text)' }}>Loading findings…</p>}
        {data && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
              <label style={{ position: 'relative', minWidth: 280 }}>
                <Search size={15} color="var(--muted-text)" style={{ position: 'absolute', left: 12, top: 10 }} />
                <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search findings…" className="input" style={{ paddingLeft: 34 }} />
              </label>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', gap: 7, alignItems: 'center', color: 'var(--secondary-text)', fontSize: 12 }}>
                  Severity
                  <select value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value as typeof severityFilter)} className="input">
                    {SEVERITIES.map((severity) => <option key={severity} value={severity}>{severity}</option>)}
                  </select>
                </label>
                <label style={{ display: 'flex', gap: 7, alignItems: 'center', color: 'var(--secondary-text)', fontSize: 12 }}>
                  Status
                  <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} className="input">
                    {STATUSES.map((status) => <option key={status} value={status}>{status.replace('_', ' ')}</option>)}
                  </select>
                </label>
              </div>
            </div>

            <div style={{ display: 'grid', gap: 12 }}>
              {filtered.map((finding) => (
                <article key={finding.id} className="card" style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: 18 }}>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(finding.id)}
                    onChange={() => setSelectedIds((current) => current.includes(finding.id)
                      ? current.filter((id) => id !== finding.id)
                      : [...current, finding.id])}
                    aria-label={`Select ${finding.title}`}
                    style={{ marginTop: 4 }}
                  />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                      <SeverityBadge severity={finding.severity} />
                      <FindingStatusBadge status={finding.status} />
                      <MonoId>{finding.id}</MonoId>
                      <span style={{ color: 'var(--muted-text)', fontSize: 11 }}>{finding.category}</span>
                    </div>
                    <Link href={`${base}/findings/${encodeURIComponent(finding.id)}`} style={{ color: 'var(--ivory)', textDecoration: 'none' }}>
                      <h2 style={{ margin: '0 0 6px', fontSize: 15 }}>{finding.title}</h2>
                    </Link>
                    <p style={{ margin: '0 0 10px', color: 'var(--secondary-text)', fontSize: 13, lineHeight: 1.5 }}>{finding.observed}</p>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', color: 'var(--muted-text)', fontSize: 11 }}>
                      <Link href={`${base}/runs/${encodeURIComponent(finding.runId)}`} style={{ color: 'inherit' }}>Run <MonoId>{finding.runId}</MonoId></Link>
                      <span>{finding.sourceUrl}</span>
                      <span>{timeAgo(finding.createdAt)}</span>
                    </div>
                  </div>
                </article>
              ))}
              {filtered.length === 0 && (
                <p className="card" style={{ padding: 24, color: 'var(--muted-text)' }}>
                  {findings.length === 0 ? 'No findings have been recorded for this project.' : 'No findings match these filters.'}
                </p>
              )}
            </div>
            <p style={{ display: 'flex', gap: 7, alignItems: 'center', color: 'var(--muted-text)', fontSize: 11 }}>
              <RefreshCw size={12} /> Live data refreshes every 4 seconds
            </p>
          </>
        )}
      </div>
    </div>
  );
}
