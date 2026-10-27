'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import FindingDiagnosisPanel from '@/components/findings/FindingDiagnosisPanel';
import VerifyFindingButton from '@/components/findings/VerifyFindingButton';
import { FindingStatusBadge, MonoId, PageHeader, SeverityBadge } from '@/components/ui/shared';
import { timeAgo } from '@/lib/domain/helpers';
import type { LocalProjectFinding, LocalProjectVerification } from '@/lib/local-worker/project-findings';

interface FindingDetailData {
  finding: LocalProjectFinding;
  verifications: LocalProjectVerification[];
  sourceEvent: {
    type: string;
    actor: string;
    summary: string;
    payload: Record<string, unknown>;
    timestamp: string;
  } | null;
}

const FINDING_STATUSES: LocalProjectFinding['status'][] = [
  'new', 'confirmed', 'needs_review', 'duplicate', 'resolved',
];

export default function FindingDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; findingId: string }>;
}) {
  const { projectId, findingId } = use(params);
  const [detail, setDetail] = useState<FindingDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endpoint = `/api/projects/${encodeURIComponent(projectId)}/findings/${encodeURIComponent(findingId)}`;

  useEffect(() => {
    let active = true;
    let timeout: ReturnType<typeof setTimeout>;
    let controller: AbortController | null = null;

    const refresh = async () => {
      controller = new AbortController();
      try {
        const response = await fetch(endpoint, { cache: 'no-store', signal: controller.signal });
        const result = await response.json() as FindingDetailData & { error?: string };
        if (!response.ok || !result.finding) throw new Error(result.error || 'Could not load the finding.');
        if (active) {
          setDetail(result);
          setError(null);
        }
      } catch (cause) {
        if (active && !(cause instanceof DOMException && cause.name === 'AbortError')) {
          setError(cause instanceof Error ? cause.message : 'Could not load the finding.');
        }
      } finally {
        if (active) {
          setLoading(false);
          timeout = setTimeout(() => void refresh(), 4_000);
        }
      }
    };

    void refresh();
    return () => {
      active = false;
      clearTimeout(timeout);
      controller?.abort();
    };
  }, [endpoint]);

  async function updateStatus(status: LocalProjectFinding['status']) {
    setSavingStatus(true);
    setError(null);
    try {
      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || 'Could not update finding status.');
      setDetail((current) => current
        ? { ...current, finding: { ...current.finding, status } }
        : current);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update finding status.');
    } finally {
      setSavingStatus(false);
    }
  }

  const finding = detail?.finding;
  const base = `/app/${projectId}`;

  return (
    <div style={{ paddingBottom: 80 }}>
      <PageHeader
        title={finding?.title ?? 'Finding details'}
        breadcrumb="Findings / Detail"
        subtitle={finding ? `Recorded from run ${finding.runId}` : 'Persisted finding record'}
        actions={<Link href={`${base}/findings`} className="btn btn-ghost btn-sm"><ArrowLeft size={14} /> Back to findings</Link>}
      />

      <div style={{ maxWidth: 1000, margin: '24px auto', padding: '0 24px', display: 'grid', gap: 18 }}>
        {error && <p role="alert" className="card" style={{ padding: 14, color: 'var(--red)' }}>{error}</p>}
        {loading && !detail && <p role="status" style={{ color: 'var(--muted-text)' }}>Loading finding…</p>}
        {finding && detail && (
          <>
            <section className="card" style={{ padding: 22, display: 'grid', gap: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: 9, alignItems: 'center', flexWrap: 'wrap' }}>
                  <SeverityBadge severity={finding.severity} />
                  <FindingStatusBadge status={finding.status} />
                  <MonoId>{finding.id}</MonoId>
                  <span style={{ color: 'var(--muted-text)', fontSize: 12 }}>{finding.category}</span>
                </div>
                <label style={{ display: 'flex', gap: 8, alignItems: 'center', color: 'var(--secondary-text)', fontSize: 12 }}>
                  Update status
                  <select
                    value={finding.status}
                    disabled={savingStatus}
                    onChange={(event) => {
                      const status = event.target.value;
                      if (FINDING_STATUSES.includes(status as LocalProjectFinding['status'])) {
                        void updateStatus(status as LocalProjectFinding['status']);
                      }
                    }}
                    className="input"
                  >
                    {FINDING_STATUSES.map((status) => <option key={status} value={status}>{status.replace('_', ' ')}</option>)}
                  </select>
                </label>
              </div>

              <div>
                <h2 style={{ margin: '0 0 8px', fontSize: 15 }}>Observed</h2>
                <p style={{ margin: 0, color: 'var(--secondary-text)', lineHeight: 1.6 }}>{finding.observed}</p>
              </div>
              <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, margin: 0 }}>
                <div><dt style={{ color: 'var(--muted-text)', fontSize: 11 }}>Source URL</dt><dd style={{ margin: '4px 0 0', overflowWrap: 'anywhere' }}>{finding.sourceUrl}</dd></div>
                <div><dt style={{ color: 'var(--muted-text)', fontSize: 11 }}>Fingerprint</dt><dd style={{ margin: '4px 0 0', fontFamily: 'DM Mono, monospace' }}>{finding.fingerprint}</dd></div>
                <div><dt style={{ color: 'var(--muted-text)', fontSize: 11 }}>First recorded</dt><dd style={{ margin: '4px 0 0' }}>{timeAgo(finding.createdAt)}</dd></div>
              </dl>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', paddingTop: 14, borderTop: '1px solid var(--border-subtle)' }}>
                <Link href={`${base}/runs/${encodeURIComponent(finding.runId)}`} className="btn btn-secondary btn-sm">Open source run <MonoId>{finding.runId}</MonoId></Link>
                {['completed', 'timed_out'].includes(finding.sourceRunStatus)
                  ? <VerifyFindingButton projectId={projectId} findingId={findingId} />
                  : <span style={{ color: 'var(--muted-text)', fontSize: 12 }}>Verification is available after the source run finishes.</span>}
              </div>
            </section>

            <section className="card" style={{ padding: 22 }}>
              <h2 style={{ margin: '0 0 14px', fontSize: 16 }}>Recorded evidence</h2>
              {detail.sourceEvent ? (
                <div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
                    <span className="mono">{detail.sourceEvent.type}</span>
                    <span style={{ color: 'var(--muted-text)', fontSize: 12 }}>by {detail.sourceEvent.actor} · {timeAgo(detail.sourceEvent.timestamp)}</span>
                  </div>
                  <p style={{ margin: 0, color: 'var(--secondary-text)', lineHeight: 1.6 }}>{detail.sourceEvent.summary}</p>
                </div>
              ) : (
                <p style={{ margin: 0, color: 'var(--muted-text)' }}>The source event is no longer available.</p>
              )}
            </section>

            <section className="card" style={{ padding: 22 }}>
              <h2 style={{ margin: '0 0 14px', fontSize: 16 }}>Verification history</h2>
              {detail.verifications.length === 0 ? (
                <p style={{ margin: 0, color: 'var(--muted-text)' }}>No verification runs have been recorded.</p>
              ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                  {detail.verifications.map((verification) => (
                    <Link key={verification.runId} href={`${base}/runs/${encodeURIComponent(verification.runId)}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: 12, border: '1px solid var(--border-subtle)', borderRadius: 8, color: 'var(--ivory)', textDecoration: 'none' }}>
                      <span>
                        <MonoId>{verification.runId}</MonoId>
                        {verification.detail && <span style={{ display: 'block', marginTop: 4, color: 'var(--secondary-text)', fontSize: 12 }}>{verification.detail}</span>}
                      </span>
                      <span style={{ textAlign: 'right', color: 'var(--secondary-text)', fontSize: 12 }}>
                        {verification.status.replace('_', ' ')}<br />
                        {timeAgo(verification.createdAt)}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            <FindingDiagnosisPanel projectId={projectId} findingId={findingId} />
            <p style={{ display: 'flex', gap: 7, alignItems: 'center', color: 'var(--muted-text)', fontSize: 11 }}>
              <RefreshCw size={12} /> Finding and verification data refreshes every 4 seconds
            </p>
          </>
        )}
        {!loading && !finding && !error && <p className="card" style={{ padding: 20 }}>Finding not found.</p>}
      </div>
    </div>
  );
}
