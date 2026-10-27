'use client';

import { use } from 'react';
import Link from 'next/link';
import { Activity, Bot, Play, RefreshCw } from 'lucide-react';
import FindingSeverityChart from '@/components/projects/FindingSeverityChart';
import RunThroughputChart from '@/components/projects/RunThroughputChart';
import { useProjectDashboard } from '@/components/projects/useProjectDashboard';
import { PageHeader, RunStatusBadge, SeverityBadge, MonoId } from '@/components/ui/shared';
import { timeAgo } from '@/lib/domain/helpers';
import type { ProjectRouteCoverage } from '@/lib/local-worker/route-coverage';

function compareRouteActivity(left: ProjectRouteCoverage, right: ProjectRouteCoverage) {
  return right.visitCount - left.visitCount
    || right.failedVisits - left.failedVisits
    || left.path.localeCompare(right.path);
}

export default function ProjectDashboardPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  const { data, error, loading } = useProjectDashboard(projectId);
  const base = `/app/${projectId}`;
  const openFindings = data?.findings.filter((finding) =>
    finding.status !== 'resolved' && finding.status !== 'duplicate',
  ) ?? [];
  const activeRun = data?.runs.find((run) =>
    ['queued', 'running', 'cancel_requested'].includes(run.status),
  );
  const routesByActivity = [...(data?.coverage ?? [])].sort(compareRouteActivity).slice(0, 5);
  const highPriorityFindings = data?.stats.findingSeverityCounts.high ?? 0;
  const reviewQueueNote = !data || data.stats.findingsToReview === 0
    ? 'The review queue is clear.'
    : highPriorityFindings > 0
      ? `Start with ${highPriorityFindings} high-severity ${highPriorityFindings === 1 ? 'finding' : 'findings'}.`
      : `Review the ${data.stats.findingsToReview} remaining ${data.stats.findingsToReview === 1 ? 'finding' : 'findings'} by recency; none are high severity.`;

  return (
    <div className="project-overview">
      <PageHeader
        title={data?.project.name ?? 'Project overview'}
        breadcrumb="Overview"
        subtitle={data ? `${data.project.targetUrl} · ${data.project.environment}` : 'Live project data'}
        actions={
          <div className="overview-header-actions">
            <Link href={`${base}/agent-office`} className="btn btn-secondary btn-sm">
              <Bot size={15} /> Agent Office
            </Link>
            <Link href={`${base}/runs/new`} className="btn btn-primary btn-sm">
              <Play size={14} /> Start Run
            </Link>
          </div>
        }
      />

      <div className="project-overview-content">
        {error && (
          <p role="alert" className="card overview-error">{error}</p>
        )}
        {loading && !data && (
          <p role="status" className="overview-loading">Loading project data…</p>
        )}

        {data && (
          <>
            <section className="card overview-stat-strip" aria-label="Project summary">
              <div className="overview-stat">
                <span>Runs recorded</span>
                <strong>{data.stats.totalRuns}</strong>
                <small>Across this project</small>
              </div>
              <div className="overview-stat">
                <span>Active runs</span>
                <strong>{data.stats.activeRuns}</strong>
                <small>Queued or running now</small>
              </div>
              <div className="overview-stat overview-stat--priority">
                <span>Findings to review</span>
                <strong>{data.stats.findingsToReview}</strong>
                <small>{highPriorityFindings} high severity</small>
              </div>
              <div className="overview-stat">
                <span>Routes observed</span>
                <strong>{data.stats.uniqueRoutes}</strong>
                <small>{data.stats.routeVisits} browser visits</small>
              </div>
            </section>

            {activeRun && (
              <section className="card overview-active-run">
                <div>
                  <Link href={`${base}/runs/${encodeURIComponent(activeRun.id)}`} className="overview-active-run-title">
                    {activeRun.goal}
                  </Link>
                  <span className="overview-active-run-url">{activeRun.targetUrl}</span>
                </div>
                <RunStatusBadge status={activeRun.status} />
              </section>
            )}

            <section className="card overview-panel overview-throughput-panel">
              <div className="overview-panel-heading">
                <div>
                  <h2>Run throughput</h2>
                  <p>Weekly runs this month · latest 100 records</p>
                </div>
              </div>
              <RunThroughputChart runs={data.runs} />
            </section>

            <div className="overview-insights-grid">
              <section className="card overview-panel">
                <div className="overview-panel-heading">
                  <div>
                    <h2>Finding priority</h2>
                    <p>All new and needs-review findings, grouped by severity</p>
                  </div>
                  <Link href={`${base}/findings`} className="btn btn-ghost btn-sm">Review queue</Link>
                </div>
                <div className="overview-finding-content">
                  <FindingSeverityChart counts={data.stats.findingSeverityCounts} />
                  <aside className="overview-finding-note" aria-live="polite">
                    <span>Next focus</span>
                    <p>{reviewQueueNote}</p>
                    {data.stats.findingsToReview > 0 && (
                      <Link href={`${base}/findings`}>Review queue <span aria-hidden="true">→</span></Link>
                    )}
                  </aside>
                </div>
              </section>

              <section className="card overview-panel">
                <div className="overview-panel-heading">
                  <div>
                    <h2>Route activity</h2>
                    <p>Most visited paths · browser observations, not code coverage</p>
                  </div>
                  <Link href={`${base}/coverage`} className="btn btn-ghost btn-sm">All routes</Link>
                </div>
                {routesByActivity.length === 0 ? (
                  <p className="overview-empty">Routes appear here after a browser run visits them.</p>
                ) : (
                  <ul className="overview-route-list">
                    {routesByActivity.map((route) => (
                      <li key={route.path}>
                        <Link href={`${base}/coverage`} className="overview-route-link">
                          <span className={`overview-route-state${route.latestStatus === 'failed' ? ' overview-route-state--failed' : ''}`}>
                            <span className="overview-route-dot" />
                            <span>{route.latestStatus === 'failed' ? 'Failed' : 'Loaded'}</span>
                          </span>
                          <code>{route.path}</code>
                          <span className="overview-route-count">
                            {route.visitCount} visits
                            {route.latestHttpStatus !== null && route.latestStatus === 'failed'
                              ? ` · HTTP ${route.latestHttpStatus}`
                              : ''}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            <div className="overview-activity-grid">
              <section className="card overview-panel">
                <div className="overview-panel-heading">
                  <div>
                    <h2>Recent runs</h2>
                    <p>Latest browser sessions</p>
                  </div>
                  <Link href={`${base}/runs`} className="btn btn-ghost btn-sm">All runs</Link>
                </div>
                {data.runs.length === 0 ? (
                  <p className="overview-empty">No runs yet. Start a browser run to begin collecting evidence.</p>
                ) : (
                  <ul className="overview-row-list">
                    {data.runs.slice(0, 5).map((run) => (
                      <li key={run.id}>
                        <Link href={`${base}/runs/${encodeURIComponent(run.id)}`} className="overview-run-link">
                          <span className="overview-row-main">
                            <span className="overview-row-title">{run.goal}</span>
                            <span className="overview-row-meta">
                              <MonoId>{run.id}</MonoId>
                              <span>{timeAgo(run.createdAt)}</span>
                            </span>
                          </span>
                          <span className="overview-run-result">
                            <RunStatusBadge status={run.status} />
                            <span>{run.findingCount} findings</span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="card overview-panel">
                <div className="overview-panel-heading">
                  <div>
                    <h2>Open findings</h2>
                    <p>Open findings from the 100 most recent records</p>
                  </div>
                  <Link href={`${base}/findings`} className="btn btn-ghost btn-sm">All findings</Link>
                </div>
                {openFindings.length === 0 ? (
                  <p className="overview-empty">No open findings in the 100 most recent records.</p>
                ) : (
                  <ul className="overview-row-list">
                    {openFindings.slice(0, 5).map((finding) => (
                      <li key={finding.id}>
                        <Link href={`${base}/findings/${encodeURIComponent(finding.id)}`} className="overview-finding-link">
                          <SeverityBadge severity={finding.severity} />
                          <span className="overview-row-main">
                            <span className="overview-row-title">{finding.title}</span>
                            <span className="overview-row-meta">{timeAgo(finding.createdAt)}</span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="card overview-panel">
                <div className="overview-panel-heading">
                  <div>
                    <h2>Recent activity</h2>
                    <p>Persisted project events</p>
                  </div>
                  <Activity size={15} aria-hidden="true" />
                </div>
                {data.activity.length === 0 ? (
                  <p className="overview-empty">Activity will appear when a run starts.</p>
                ) : (
                  <ul className="overview-row-list">
                    {data.activity.slice(0, 5).map((item) => (
                      <li key={item.id}>
                        <Link href={`${base}/runs/${encodeURIComponent(item.runId)}`} className="overview-activity-link">
                          <span className="overview-row-main">
                            <span className="overview-row-title">{item.summary}</span>
                            <span className="overview-row-meta">{item.actor}</span>
                          </span>
                          <time dateTime={item.timestamp}>{timeAgo(item.timestamp)}</time>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            <p className="overview-refresh-note">
              <RefreshCw size={12} aria-hidden="true" />
              Project data refreshes every 4 seconds
            </p>
          </>
        )}
      </div>
    </div>
  );
}
