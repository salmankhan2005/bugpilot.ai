'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  BrainCircuit,
  Camera,
  CheckCircle2,
  ChevronDown,
  Circle,
  Loader2,
  ShieldCheck,
  Square,
} from 'lucide-react';
import FindingDiagnosisPanel from '@/components/findings/FindingDiagnosisPanel';
import { ConfirmDialog, RunStatusBadge } from '@/components/ui/shared';
import type { RunStatus } from '@/lib/domain/types';
import { formatDuration } from '@/lib/domain/helpers';

type LocalStatus = 'queued' | 'running' | 'cancel_requested' | 'completed' | 'failed' | 'cancelled' | 'timed_out';
type EventFilter = 'all' | 'errors' | 'network' | 'actions' | 'values';
type LocalVerificationStatus = 'pending' | 'running' | 'passed' | 'failed' | 'blocked';

interface LocalRun {
  id: string;
  projectId: string;
  status: LocalStatus;
  targetUrl: string;
  goal: string;
  viewport: string;
  browser: string;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  failureReason: string | null;
  latestArtifactId: string | null;
  verification: {
    findingId: string;
    status: LocalVerificationStatus;
    findingReproduced: boolean | null;
    detail: string | null;
    startedAt: string | null;
    finishedAt: string | null;
  } | null;
}

interface LocalRunEvent {
  id: string;
  runId: string;
  seq: number;
  timestamp: string;
  type: string;
  actor: string;
  summary: string;
  payload: Record<string, unknown>;
}

interface Props {
  projectId: string;
  runId: string;
}

export default function LocalLiveRunRoom({ projectId, runId }: Props) {
  const [run, setRun] = useState<LocalRun | null>(null);
  const [events, setEvents] = useState<LocalRunEvent[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<EventFilter>('all');
  const [elapsed, setElapsed] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showAbortDialog, setShowAbortDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diagnosisFindingId, setDiagnosisFindingId] = useState('');
  const [previewErrorArtifactId, setPreviewErrorArtifactId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    void fetch(`/api/local/runs/${encodeURIComponent(runId)}?projectId=${encodeURIComponent(projectId)}`, { cache: 'no-store' })
      .then(async (response) => {
        const result = await response.json() as { run?: LocalRun; error?: string };
        if (!response.ok || !result.run) throw new Error(result.error || 'Could not load run.');
        if (result.run.projectId !== projectId) throw new Error('Run not found.');
        if (mounted) setRun(result.run);
      })
      .catch((loadError: unknown) => {
        if (mounted) setError(loadError instanceof Error ? loadError.message : 'Could not load run.');
      });

    const source = new EventSource(
      `/api/local/runs/${encodeURIComponent(runId)}/events?projectId=${encodeURIComponent(projectId)}`,
    );
    source.onopen = () => setIsConnected(true);
    source.onerror = () => setIsConnected(false);
    source.onmessage = (message) => {
      try {
        const event = JSON.parse(message.data) as LocalRunEvent;
        if (!mounted) return;
        setEvents((current) => current.some((item) => item.seq === event.seq)
          ? current
          : [...current, event].slice(-500));
        const artifactId = event.payload.artifactId;
        if (event.type === 'browser.screenshot' && typeof artifactId === 'string') {
          setRun((current) => current
            ? { ...current, latestArtifactId: artifactId }
            : current);
        }
        if (event.type === 'run.completed') setRun((current) => current ? { ...current, status: 'completed' } : current);
        if (event.type === 'run.failed') {
          setRun((current) => current ? { ...current, status: 'failed', failureReason: event.summary } : current);
        }
        if (event.type === 'run.timed_out') {
          setRun((current) => current ? { ...current, status: 'timed_out', failureReason: event.summary } : current);
        }
        if (event.type === 'run.cancel.requested') {
          setRun((current) => current ? { ...current, status: 'cancel_requested' } : current);
        }
        if (event.type === 'run.cancelled') {
          setRun((current) => current ? { ...current, status: 'cancelled' } : current);
        }
        if (event.type.startsWith('verification.')) {
          const verificationStatus = event.type.slice('verification.'.length);
          const verificationStatusMap: Record<string, LocalVerificationStatus> = {
            started: 'running',
            passed: 'passed',
            failed: 'failed',
            blocked: 'blocked',
          };
          const nextVerificationStatus = verificationStatusMap[verificationStatus];
          if (nextVerificationStatus) {
            setRun((current) => current?.verification
              ? {
                ...current,
                verification: {
                  ...current.verification,
                  status: nextVerificationStatus,
                  findingReproduced: typeof event.payload.findingReproduced === 'boolean'
                    ? event.payload.findingReproduced
                    : current.verification.findingReproduced,
                  detail: event.summary,
                  finishedAt: verificationStatus === 'started' ? null : event.timestamp,
                },
              }
              : current);
          }
        }
        if (['run.completed', 'run.failed', 'run.cancelled', 'run.timed_out'].includes(event.type)) {
          source.close();
          setIsConnected(false);
        }
      } catch (parseError) {
        console.error('Could not parse local run event:', parseError);
        setError('Received an invalid event from the local worker.');
      }
    };

    return () => {
      mounted = false;
      source.close();
    };
  }, [projectId, runId]);

  useEffect(() => {
    if (!run?.startedAt || !['queued', 'running'].includes(run.status)) return;
    const updateElapsed = () => {
      setElapsed(Math.max(0, Math.floor((Date.now() - Date.parse(run.startedAt!)) / 1000)));
    };
    updateElapsed();
    const timer = setInterval(updateElapsed, 1000);
    return () => clearInterval(timer);
  }, [run?.startedAt, run?.status]);

  const filteredEvents = useMemo(() => events.filter((event) => {
    if (selectedFilter === 'errors') return event.type.includes('error') || event.type.includes('failed');
    if (selectedFilter === 'network') return event.type.includes('network');
    if (selectedFilter === 'values') return event.type.startsWith('browser.value.');
    if (selectedFilter === 'actions') return event.type.includes('browser') || event.type.includes('stage');
    return true;
  }), [events, selectedFilter]);
  const diagnosisFindings = useMemo(() => {
    const findings = new Map<string, { id: string; summary: string }>();
    for (const event of events) {
      const findingId = event.payload.findingId;
      if (event.type === 'finding.created' && typeof findingId === 'string') {
        findings.set(findingId, { id: findingId, summary: event.summary });
      }
    }
    return [...findings.values()];
  }, [events]);
  const selectedDiagnosisFindingId = diagnosisFindings.some((finding) => finding.id === diagnosisFindingId)
    ? diagnosisFindingId
    : diagnosisFindings[0]?.id ?? '';

  const cancelRun = async () => {
    setIsCancelling(true);
    setError(null);
    try {
      const response = await fetch(`/api/local/runs/${encodeURIComponent(runId)}/cancel`, {
        method: 'POST',
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || 'Could not cancel the run.');
      setRun((current) => current ? { ...current, status: 'cancel_requested' } : current);
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : 'Could not cancel the run.');
    } finally {
      setIsCancelling(false);
      setShowAbortDialog(false);
    }
  };

  const base = `/app/${projectId}`;
  const active = run?.status === 'queued' || run?.status === 'running' || run?.status === 'cancel_requested';
  const latestBrowserEvent = [...events].reverse().find((event) => event.type.startsWith('browser.'));
  const stages = [
    { label: 'Queued', done: true, current: run?.status === 'queued' },
    {
      label: 'Exploring',
      done: run?.status === 'completed' || run?.status === 'failed' || run?.status === 'cancelled' || run?.status === 'timed_out',
      current: run?.status === 'running' || run?.status === 'cancel_requested',
    },
    {
      label: 'Evidence',
      done: events.some((event) => event.type === 'browser.screenshot'),
      current: run?.status === 'running' && !events.some((event) => event.type === 'browser.screenshot'),
    },
    {
      label: 'Complete',
      done: run?.status === 'completed',
      current: false,
    },
  ];
  const signalCount = events.filter((event) =>
    event.type === 'console.error' || event.type === 'network.request.failed',
  ).length;

  if (!run) {
    return (
      <div style={{ padding: 32 }}>
        <p style={{ color: error ? 'var(--red)' : 'var(--secondary-text)' }} role={error ? 'alert' : undefined}>
          {error || 'Loading local run…'}
        </p>
      </div>
    );
  }

  const artifactUrl = run.latestArtifactId
    ? `/api/local/runs/${encodeURIComponent(runId)}/artifacts/${encodeURIComponent(run.latestArtifactId)}`
    : null;
  const statusForBadge: RunStatus = run.status === 'queued'
    ? 'queued'
    : run.status === 'running'
      ? 'running'
      : run.status === 'cancel_requested'
        ? 'cancel_requested'
      : run.status === 'completed'
        ? 'completed'
        : run.status === 'failed'
          ? 'failed'
          : run.status === 'cancelled'
            ? 'cancelled'
            : 'timed_out';

  return (
    <div className="local-run-room" style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{
        borderBottom: '1px solid var(--border)',
        padding: '16px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--surface-1)',
        gap: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <Link href={`${base}/runs`} className="btn btn-ghost btn-sm" style={{ padding: 6 }}>
            <ArrowLeft size={16} />
          </Link>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: 16, margin: 0, fontWeight: 700 }}>
                {run.verification ? 'Local Verification Run' : 'Local Playwright Run'}
              </h1>
              <code className="mono">{run.id}</code>
              <RunStatusBadge status={statusForBadge} />
            </div>
            <p style={{
              fontSize: 12,
              color: 'var(--secondary-text)',
              margin: '4px 0 0',
              overflowWrap: 'anywhere',
            }}>
              Target: <span className="mono">{run.targetUrl}</span> · {run.viewport} · {run.browser}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <span style={{ fontSize: 12, color: isConnected ? 'var(--sage)' : 'var(--muted-text)' }}>
            <span className={isConnected ? 'dot dot-running' : 'dot'} style={{ marginRight: 6 }} />
            {isConnected ? 'Live' : 'Reconnecting'}
          </span>
          <span className="mono">{formatDuration(elapsed)}</span>
          {active && (
            <button
              onClick={() => setShowAbortDialog(true)}
              className="btn btn-danger btn-sm"
              disabled={isCancelling || run.status === 'cancel_requested'}
            >
              {isCancelling || run.status === 'cancel_requested' ? <Loader2 size={13} className="spin" /> : <Square size={13} />}
              {run.status === 'cancel_requested' ? 'Stopping' : 'Stop Run'}
            </button>
          )}
        </div>
      </div>

      <div style={{
        padding: '12px 28px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface-2)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        overflowX: 'auto',
      }}>
        {stages.map((stage, index) => (
          <div key={stage.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 10px',
              borderRadius: 6,
              background: stage.current ? 'var(--sage-dim)' : stage.done ? 'var(--surface-3)' : 'transparent',
              border: `1px solid ${stage.current ? 'var(--sage)' : 'var(--border-subtle)'}`,
              fontSize: 12,
              color: stage.current ? 'var(--sage)' : stage.done ? 'var(--ivory)' : 'var(--muted-text)',
            }}>
              {stage.done ? <CheckCircle2 size={13} color="var(--sage)" /> : stage.current ? <Loader2 size={13} className="spin" /> : <Circle size={13} />}
              {stage.label}
            </div>
            {index < stages.length - 1 && <span style={{ color: 'var(--muted-text)' }}>›</span>}
          </div>
        ))}
      </div>

      {error && (
        <div role="alert" style={{ padding: '10px 28px', color: 'var(--red)', background: 'var(--red-dim)', flexShrink: 0 }}>
          {error}
        </div>
      )}

      {run.verification && (
        <div style={{
          padding: '12px 28px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface-1)',
          color: run.verification.status === 'failed' ? 'var(--red)' : 'var(--secondary-text)',
        }}>
          <strong style={{ fontSize: 13 }}>
            Verification {run.verification.status.replace('_', ' ')}
          </strong>
          <p style={{ margin: '4px 0 0', fontSize: 12 }}>
            {run.verification.detail
              || 'This fresh run checks whether the exact recorded browser signal appears again.'}
            {' '}
            <Link href={`${base}/findings/${encodeURIComponent(run.verification.findingId)}`} style={{ color: 'var(--sage)' }}>
              View finding
            </Link>
          </p>
        </div>
      )}

      <div style={{
        display: 'grid',
        flex: 1,
      }} className="local-run-workspace">
        <section style={{
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--obsidian)',
        }} className="local-run-preview">
          <div style={{
            padding: '10px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--border)',
            color: 'var(--secondary-text)',
            fontSize: 12,
          }}>
            <span><ShieldCheck size={13} color="var(--sage)" style={{ verticalAlign: 'middle', marginRight: 6 }} />Live Chromium viewport</span>
            <span>{run.viewport} · {run.browser} · {isConnected ? 'streaming' : 'reconnecting'}</span>
          </div>
          <div style={{
            display: 'grid',
            placeItems: 'center',
            flex: 1,
            padding: 20,
            background: '#101310',
          }} className="local-run-preview-image">
            {artifactUrl && previewErrorArtifactId !== run.latestArtifactId ? (
              <Image
                key={run.latestArtifactId}
                src={artifactUrl}
                alt="Latest Playwright screenshot evidence"
                fill
                sizes="(max-width: 900px) 100vw, 65vw"
                unoptimized
                onError={() => setPreviewErrorArtifactId(run.latestArtifactId)}
                style={{ objectFit: 'contain', borderRadius: 8 }}
              />
            ) : artifactUrl ? (
              <div role="alert" style={{ textAlign: 'center', color: 'var(--secondary-text)', maxWidth: 400 }}>
                <AlertTriangle size={24} color="var(--amber)" />
                <p>The latest screenshot could not be displayed.</p>
                <a href={artifactUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--ivory)' }}>
                  Open captured evidence
                </a>
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--secondary-text)', maxWidth: 400 }}>
                {active ? <Loader2 className="spin" size={24} color="var(--sage)" /> : <Camera size={24} color="var(--muted-text)" />}
                <p>{active ? 'Waiting for the local Chromium worker to capture the first page…' : 'No screenshot was captured for this run.'}</p>
              </div>
            )}
          </div>
          <div aria-live="polite" style={{ padding: '8px 16px', borderTop: '1px solid var(--border)', color: 'var(--muted-text)', fontSize: 11, lineHeight: 1.5 }}>
            <p style={{ margin: '0 0 4px', color: 'var(--secondary-text)' }}>
              {latestBrowserEvent?.summary ?? 'Waiting for Chromium browser activity…'}
            </p>
            Cursor-marked captures refresh after navigation and each provided field value. This is live, page-by-page evidence—not a continuous video feed.
          </div>
        </section>

        <section style={{ display: 'flex', flexDirection: 'column', background: 'var(--surface-1)' }} className="local-run-event-panel">
          <section aria-label="AI Diagnostician" style={{ padding: 14, display: 'grid', gap: 10, borderBottom: '1px solid var(--border)', background: 'var(--surface-1)' }} className="local-run-diagnostician">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--ivory)', fontSize: 13, fontWeight: 700 }}>
                <BrainCircuit size={15} color="var(--sage)" />
                AI Diagnostician
              </span>
              <span style={{ color: 'var(--muted-text)', fontSize: 10 }}>Groq LLM · findings only</span>
            </div>
            <p style={{ margin: 0, color: 'var(--muted-text)', fontSize: 11, lineHeight: 1.5 }}>
              Analyzes saved browser evidence after the run. Chromium actions and field checks remain deterministic; the LLM does not control the browser.
            </p>
            {diagnosisFindings.length > 0 ? (
              <>
                <label style={{ display: 'grid', gap: 6, color: 'var(--secondary-text)', fontSize: 11 }}>
                  Finding to analyze
                  <select
                    className="input"
                    value={selectedDiagnosisFindingId}
                    onChange={(event) => setDiagnosisFindingId(event.target.value)}
                    aria-label="Choose finding for AI diagnosis"
                  >
                    {diagnosisFindings.map((finding) => (
                      <option key={finding.id} value={finding.id}>{finding.summary.slice(0, 100)}</option>
                    ))}
                  </select>
                </label>
                {active ? (
                  <p style={{ margin: 0, color: 'var(--muted-text)', fontSize: 11 }}>
                    Diagnosis becomes available when the run completes.
                  </p>
                ) : selectedDiagnosisFindingId ? (
                  <FindingDiagnosisPanel
                    key={selectedDiagnosisFindingId}
                    projectId={projectId}
                    findingId={selectedDiagnosisFindingId}
                  />
                ) : null}
              </>
            ) : (
              <p style={{ margin: 0, color: 'var(--muted-text)', fontSize: 11 }}>
                The AI Diagnostician will appear here when this run records a finding.
              </p>
            )}
          </section>
          <div style={{
            padding: '10px 16px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--surface-2)',
            gap: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Activity size={14} color="var(--sage)" />
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ivory)' }}>Persisted event stream</span>
              <span style={{ fontSize: 11, color: 'var(--muted-text)' }}>({filteredEvents.length})</span>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {(['all', 'errors', 'network', 'actions', 'values'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setSelectedFilter(filter)}
                  style={{
                    padding: '3px 8px',
                    borderRadius: 4,
                    background: selectedFilter === filter ? 'var(--surface-3)' : 'transparent',
                    border: `1px solid ${selectedFilter === filter ? 'var(--border)' : 'transparent'}`,
                    color: selectedFilter === filter ? 'var(--ivory)' : 'var(--muted-text)',
                    fontSize: 11,
                    cursor: 'pointer',
                  }}
                >
                  {filter[0].toUpperCase() + filter.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div
            aria-label="Persisted run event list"
            tabIndex={0}
            style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}
            className="local-run-event-list"
          >
            {filteredEvents.length === 0 && (
              <p style={{ color: 'var(--muted-text)', fontSize: 12 }}>Waiting for persisted run events…</p>
            )}
            {filteredEvents.map((event) => {
              const isError = event.type.includes('error') || event.type.includes('failed');
              const isComplete = event.type === 'run.completed';
              const findingId = event.payload.findingId;
              return (
                <details
                  key={event.id}
                  className={`run-event${isError ? ' run-event--error' : isComplete ? ' run-event--success' : ''}`}
                >
                  <summary className="run-event-summary">
                    <span className="run-event-marker" aria-hidden="true" />
                    <span className="run-event-content">
                      <span className="run-event-title">{event.summary}</span>
                      <span className="run-event-meta">
                        <span>{event.actor}</span>
                        <time dateTime={event.timestamp}>{new Date(event.timestamp).toLocaleTimeString()}</time>
                      </span>
                    </span>
                    <ChevronDown className="run-event-chevron" size={14} aria-hidden="true" />
                  </summary>
                  <div className="run-event-detail">
                    <code>{event.type}</code>
                    {event.type === 'finding.created' && typeof findingId === 'string' && (
                      <Link
                        href={`${base}/findings/${encodeURIComponent(findingId)}`}
                        style={{ display: 'inline-block', marginTop: 8, color: 'var(--sage)', fontSize: 12 }}
                      >
                        Review finding
                      </Link>
                    )}
                  </div>
                </details>
              );
            })}
          </div>
        </section>
      </div>

      <section style={{ padding: '14px 28px', borderTop: '1px solid var(--border)', background: 'var(--surface-2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <AlertTriangle size={15} color={signalCount ? 'var(--red)' : 'var(--muted-text)'} />
          <strong style={{ fontSize: 13 }}>Observed browser signals ({signalCount})</strong>
        </div>
        <p style={{ margin: 0, color: 'var(--muted-text)', fontSize: 12 }}>
          Unique console and network signals are saved as reviewable findings. They are deterministic observations, not confirmed root causes.
        </p>
        {run.failureReason && <p role="alert" style={{ color: 'var(--red)', fontSize: 12 }}>{run.failureReason}</p>}
      </section>

      <ConfirmDialog
        open={showAbortDialog}
        danger
        title="Stop Local Playwright Run?"
        message="The local worker will close the browser and retain events and evidence already saved."
        confirmLabel="Stop Run"
        onConfirm={() => void cancelRun()}
        onCancel={() => setShowAbortDialog(false)}
      />
    </div>
  );
}
