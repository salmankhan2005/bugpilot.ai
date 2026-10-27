'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { Play, Search, RefreshCw } from 'lucide-react';
import { PageHeader, RunStatusBadge, MonoId } from '@/components/ui/shared';
import { useProjectDashboard } from '@/components/projects/useProjectDashboard';
import { formatDuration, timeAgo } from '@/lib/domain/helpers';

const STATUS_FILTERS = ['all', 'queued', 'running', 'completed', 'failed', 'cancelled'] as const;

export default function RunsListPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  const { data, error, loading } = useProjectDashboard(projectId);
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const base = `/app/${projectId}`;
  const runs = data?.runs.filter((run) => {
    if (statusFilter !== 'all' && run.status !== statusFilter) return false;
    const query = searchQuery.trim().toLowerCase();
    return !query
      || run.id.toLowerCase().includes(query)
      || run.goal.toLowerCase().includes(query)
      || run.targetUrl.toLowerCase().includes(query);
  }) ?? [];

  return (
    <div style={{ paddingBottom: 64 }}>
      <PageHeader
        title="Execution Runs & History"
        breadcrumb="Runs"
        subtitle="Persisted browser runs for this project"
        actions={
          <Link href={`${base}/runs/new`} className="btn btn-primary btn-sm">
            <Play size={14} /> Start New Run
          </Link>
        }
      />

      <div style={{ padding: '24px 28px' }}>
        {error && <p role="alert" className="card" style={{ padding: 14, color: 'var(--red)' }}>{error}</p>}
        {loading && !data && <p role="status" style={{ color: 'var(--muted-text)' }}>Loading runs…</p>}
        {data && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
              <label style={{ position: 'relative', minWidth: 280 }}>
                <Search size={15} color="var(--muted-text)" style={{ position: 'absolute', left: 12, top: 10 }} />
                <input
                  type="search"
                  placeholder="Filter by run ID, goal, or URL…"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="input"
                  style={{ paddingLeft: 34 }}
                />
              </label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {STATUS_FILTERS.map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setStatusFilter(status)}
                    className={statusFilter === status ? 'btn btn-secondary btn-sm' : 'btn btn-ghost btn-sm'}
                    aria-pressed={statusFilter === status}
                    style={{ textTransform: 'capitalize' }}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            <div className="card" style={{ padding: '0 20px', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--muted-text)', fontSize: 11, textTransform: 'uppercase' }}>
                    <th style={{ padding: '14px 12px 14px 0' }}>Run ID</th>
                    <th style={{ padding: 14 }}>Status</th>
                    <th style={{ padding: 14 }}>Goal & target</th>
                    <th style={{ padding: 14 }}>Findings</th>
                    <th style={{ padding: 14 }}>Browser</th>
                    <th style={{ padding: 14 }}>Duration</th>
                    <th style={{ padding: '14px 0 14px 12px', textAlign: 'right' }}>Started</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((run) => (
                    <tr key={run.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '14px 12px 14px 0' }}>
                        <Link href={`${base}/runs/${encodeURIComponent(run.id)}`} style={{ color: 'var(--ivory)', fontWeight: 600, textDecoration: 'none' }}>
                          <MonoId>{run.id}</MonoId>
                        </Link>
                      </td>
                      <td style={{ padding: 14 }}><RunStatusBadge status={run.status} /></td>
                      <td style={{ padding: 14, minWidth: 240 }}>
                        <span style={{ display: 'block', color: 'var(--ivory)' }}>{run.goal}</span>
                        <span style={{ display: 'block', marginTop: 3, color: 'var(--muted-text)', fontFamily: 'DM Mono, monospace', fontSize: 11 }}>{run.targetUrl}</span>
                      </td>
                      <td style={{ padding: 14 }}>{run.findingCount}</td>
                      <td style={{ padding: 14, color: 'var(--secondary-text)' }}>{run.browser} · {run.viewport}</td>
                      <td style={{ padding: 14, color: 'var(--secondary-text)' }}>
                        {run.durationSeconds === null ? '—' : formatDuration(run.durationSeconds)}
                      </td>
                      <td style={{ padding: '14px 0 14px 12px', textAlign: 'right', color: 'var(--muted-text)' }}>{timeAgo(run.createdAt)}</td>
                    </tr>
                  ))}
                  {runs.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ padding: 28, textAlign: 'center', color: 'var(--muted-text)' }}>
                        {data.runs.length === 0 ? 'No runs have been recorded yet.' : 'No runs match these filters.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
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
