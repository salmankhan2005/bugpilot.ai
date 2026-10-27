'use client';

import { use } from 'react';
import Link from 'next/link';
import { Play, RefreshCw } from 'lucide-react';
import { PageHeader, MetricCard } from '@/components/ui/shared';
import { useProjectDashboard } from '@/components/projects/useProjectDashboard';
import { timeAgo } from '@/lib/domain/helpers';

export default function CoveragePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  const { data, error, loading } = useProjectDashboard(projectId);
  const routes = data?.coverage ?? [];
  const loadedVisits = routes.reduce((total, route) => total + route.loadedVisits, 0);
  const failedVisits = routes.reduce((total, route) => total + route.failedVisits, 0);
  const base = `/app/${projectId}`;

  return (
    <div style={{ paddingBottom: 64 }}>
      <PageHeader
        title="Application Surface & Route Coverage"
        breadcrumb="Coverage"
        subtitle="Routes recorded by actual local browser runs"
        actions={data?.project ? (
          <Link
            href={`${base}/runs/new?url=${encodeURIComponent(data.project.targetUrl)}&goal=${encodeURIComponent('Explore the project site and record visited routes')}`}
            className="btn btn-primary btn-sm"
          >
            <Play size={14} /> Explore routes
          </Link>
        ) : undefined}
      />

      <div style={{ padding: '24px 28px' }}>
        {error && <p role="alert" className="card" style={{ padding: 14, color: 'var(--red)' }}>{error}</p>}
        {loading && !data && <p role="status" style={{ color: 'var(--muted-text)' }}>Loading route coverage…</p>}
        {data && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14, marginBottom: 24 }}>
              <MetricCard label="Routes observed" value={routes.length} sub="Unique same-origin paths visited" />
              <MetricCard label="Successful visits" value={loadedVisits} sub="Recorded as loaded by the worker" />
              <MetricCard label="Failed visits" value={failedVisits} sub="Recorded navigation failures" />
              <MetricCard label="Total route visits" value={data.stats.routeVisits} sub="Across all persisted runs" />
            </div>

            <div className="card" style={{ padding: '0 20px', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--muted-text)', fontSize: 11, textTransform: 'uppercase' }}>
                    <th style={{ padding: '14px 12px 14px 0' }}>Route path</th>
                    <th style={{ padding: 14 }}>Runs</th>
                    <th style={{ padding: 14 }}>Visits</th>
                    <th style={{ padding: 14 }}>Loaded</th>
                    <th style={{ padding: 14 }}>Failed</th>
                    <th style={{ padding: 14 }}>Latest result</th>
                    <th style={{ padding: '14px 0 14px 12px', textAlign: 'right' }}>Last visited</th>
                  </tr>
                </thead>
                <tbody>
                  {routes.map((route) => (
                    <tr key={route.path} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '14px 12px 14px 0', color: 'var(--ivory)', fontFamily: 'DM Mono, monospace' }}>{route.path}</td>
                      <td style={{ padding: 14 }}>{route.runCount}</td>
                      <td style={{ padding: 14 }}>{route.visitCount}</td>
                      <td style={{ padding: 14, color: 'var(--sage)' }}>{route.loadedVisits}</td>
                      <td style={{ padding: 14, color: route.failedVisits ? 'var(--red)' : 'var(--muted-text)' }}>{route.failedVisits}</td>
                      <td style={{ padding: 14 }}>
                        <span style={{ color: route.latestStatus === 'loaded' ? 'var(--sage)' : 'var(--red)' }}>
                          {route.latestStatus}
                          {route.latestHttpStatus ? ` · HTTP ${route.latestHttpStatus}` : ''}
                        </span>
                      </td>
                      <td style={{ padding: '14px 0 14px 12px', textAlign: 'right', color: 'var(--muted-text)' }}>{timeAgo(route.lastVisitedAt)}</td>
                    </tr>
                  ))}
                  {routes.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ padding: 28, textAlign: 'center', color: 'var(--muted-text)' }}>
                        No routes have been recorded yet. Start a run to populate coverage from pages the worker actually visits.
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
