'use client';

import { use, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import Image from 'next/image';
import { Activity, Bot, Camera, Layers, Monitor, RefreshCw } from 'lucide-react';
import AgentOfficeInspector from '@/components/office/AgentOfficeInspector';
import AgentOfficeTimeline from '@/components/office/AgentOfficeTimeline';
import AgentOfficeFallback from '@/components/office/AgentOfficeFallback';
import { RunStatusBadge } from '@/components/ui/shared';
import { useProjectDashboard } from '@/components/projects/useProjectDashboard';
import { CAMERA_POIS } from '@/lib/office/adapter';
import type { AgentRole } from '@/lib/domain/types';
import type { LocalProjectRun } from '@/lib/local-worker/project-runs';
import type { OfficeAgentState } from '@/lib/office/types';

const AgentOfficeScene = dynamic(
  () => import('@/components/office/AgentOfficeScene'),
  {
    ssr: false,
    loading: () => (
      <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: 'var(--secondary-text)' }}>
        Loading office view…
      </div>
    ),
  },
);

interface OfficeEvent {
  id: string;
  runId: string;
  seq: number;
  timestamp: string;
  type: string;
  actor: string;
  summary: string;
  payload: Record<string, unknown>;
  findingId?: string;
}

const AGENT_ROLES: AgentRole[] = [
  'orchestrator', 'explorer', 'checker', 'diagnostician', 'fix_advisor', 'verifier',
];

const AGENT_DETAILS: Record<AgentRole, Pick<OfficeAgentState, 'name' | 'title' | 'workstationName' | 'description'>> = {
  orchestrator: {
    name: 'Run coordinator',
    title: 'Local run lifecycle',
    workstationName: 'Run coordination',
    description: 'Coordinates the run lifecycle and tracks queue, browser, and completion stages.',
  },
  explorer: {
    name: 'Browser worker',
    title: 'Local Chromium activity',
    workstationName: 'Browser exploration',
    description: 'Opens the target in Chromium, enters supplied values, checks fields, and captures screenshots.',
  },
  checker: {
    name: 'Signal detector',
    title: 'Console and network findings',
    workstationName: 'Finding signals',
    description: 'Monitors browser console and network failures, then records reviewable findings.',
  },
  diagnostician: {
    name: 'AI Diagnostician',
    title: 'Groq LLM · evidence-grounded',
    workstationName: 'AI diagnosis',
    description: 'Analyzes saved finding evidence after a run. It does not control Chromium.',
  },
  fix_advisor: {
    name: 'Source integration',
    title: 'Not connected',
    workstationName: 'Repository work',
    description: 'Repository inspection and code patches are unavailable until a source integration is implemented.',
  },
  verifier: {
    name: 'Finding verifier',
    title: 'Fresh-run verification',
    workstationName: 'Verification',
    description: 'Replays a finding in a fresh run and reports whether the signal appears again.',
  },
};

function roleForEvent(type: string, actor = ''): AgentRole {
  if (type.startsWith('browser.')) return 'explorer';
  if (type === 'console.error' || type === 'finding.created') return 'checker';
  if (type === 'network.request.failed') {
    return actor.toLowerCase() === 'explorer' ? 'explorer' : 'checker';
  }
  if (type.startsWith('diagnosis.') || type === 'triage.completed') return 'diagnostician';
  if (type.startsWith('verification.')) return 'verifier';
  if (actor.toLowerCase() === 'explorer' || actor.toLowerCase() === 'evidence collector') return 'explorer';
  if (actor.toLowerCase() === 'checker') return 'checker';
  if (actor.toLowerCase() === 'diagnostician') return 'diagnostician';
  if (actor.toLowerCase() === 'verifier') return 'verifier';
  return 'orchestrator';
}

function isActiveRun(run: LocalProjectRun): boolean {
  return ['queued', 'running', 'cancel_requested'].includes(run.status);
}

function toRunEvent(event: OfficeEvent) {
  return {
    id: event.id,
    timestamp: event.timestamp,
    type: event.type,
    actor: event.actor,
    summary: event.summary,
    findingId: event.findingId,
  };
}

export default function AgentOfficePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  const { data, error, loading } = useProjectDashboard(projectId);
  const [selectedRunId, setSelectedRunId] = useState('');
  const [events, setEvents] = useState<OfficeEvent[]>([]);
  const [connectedRunId, setConnectedRunId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<AgentRole>('orchestrator');
  const [activePoiId, setActivePoiId] = useState('overview');
  const [viewMode, setViewMode] = useState<'3d' | 'fallback' | 'browser'>('3d');

  const defaultRun = data?.runs.find(isActiveRun) ?? data?.runs[0];
  const effectiveRunId = data?.runs.some((item) => item.id === selectedRunId)
    ? selectedRunId
    : defaultRun?.id ?? '';

  useEffect(() => {
    if (!effectiveRunId) return;

    let active = true;
    const source = new EventSource(
      `/api/local/runs/${encodeURIComponent(effectiveRunId)}/events?projectId=${encodeURIComponent(projectId)}`,
    );
    source.onopen = () => {
      if (active) setConnectedRunId(effectiveRunId);
    };
    source.onerror = () => {
      if (active) setConnectedRunId(null);
    };
    source.onmessage = (message) => {
      try {
        const event = JSON.parse(message.data) as OfficeEvent;
        const payload = event.payload ?? {};
        const findingId = typeof payload.findingId === 'string' ? payload.findingId : undefined;
        if (active) {
          setEvents((current) => current.some((item) => item.runId === event.runId && item.seq === event.seq)
            ? current
            : [...current, { ...event, payload, findingId }].slice(-200));
        }
      } catch (cause) {
        console.error('Could not parse agent office run event:', cause);
      }
    };

    return () => {
      active = false;
      source.close();
    };
  }, [effectiveRunId, projectId]);

  const run = data?.runs.find((item) => item.id === effectiveRunId) ?? null;
  const streamOpen = connectedRunId === effectiveRunId && effectiveRunId !== '';
  const runEvents = events.filter((event) => event.runId === effectiveRunId);
  const latestEvent = runEvents[runEvents.length - 1];
  const latestScreenshot = [...runEvents].reverse().find((event) =>
    event.type === 'browser.screenshot' && typeof event.payload.artifactId === 'string');
  const latestScreenshotId = latestScreenshot?.payload.artifactId;
  const latestRole = latestEvent ? roleForEvent(latestEvent.type, latestEvent.actor) : 'orchestrator';
  const agents: Record<string, OfficeAgentState> = Object.fromEntries(AGENT_ROLES.map((role) => {
    const roleEvents = runEvents.filter((event) => roleForEvent(event.type, event.actor) === role);
    const latestRoleEvent = roleEvents[roleEvents.length - 1];
    const active = Boolean(run && isActiveRun(run) && latestEvent && latestRole === role);
    const terminal = Boolean(run && !isActiveRun(run)
      && ['completed', 'failed', 'cancelled', 'timed_out'].includes(run.status));
    const status: OfficeAgentState['status'] = active
      ? 'active'
      : terminal && roleEvents.length > 0
        ? run?.status === 'failed' && role === 'orchestrator' ? 'error' : 'done'
        : 'idle';

    return [role, {
      role,
      ...AGENT_DETAILS[role],
      status,
      currentTask: active
        ? latestRoleEvent?.summary ?? AGENT_DETAILS[role].description
        : run && isActiveRun(run)
          ? AGENT_DETAILS[role].description
          : latestRoleEvent?.summary ?? AGENT_DETAILS[role].description,
      targetUrl: role === 'explorer' ? run?.targetUrl : undefined,
      linkedRunId: run?.id,
      linkedFindingId: latestRoleEvent?.findingId,
      logs: roleEvents.slice(-6).map((event) => `[${new Date(event.timestamp).toLocaleTimeString()}] ${event.summary}`),
    }];
  }));

  const selectedAgent = agents[selectedRole] ?? agents.orchestrator;
  const base = `/app/${projectId}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 52px)', background: 'var(--obsidian)' }}>
      <header style={{ padding: '14px 24px', background: 'var(--surface-1)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Bot size={20} color="var(--sage)" />
          <div>
            <h1 style={{ margin: 0, fontSize: 17 }}>Run activity office</h1>
            <p style={{ margin: '4px 0 0', color: 'var(--muted-text)', fontSize: 12 }}>
              Activity and status derive from persisted worker events; no simulated handoffs.
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {data && data.runs.length > 0 && (
            <select value={effectiveRunId} onChange={(event) => setSelectedRunId(event.target.value)} className="input" aria-label="Select run">
              {data.runs.map((item) => <option key={item.id} value={item.id}>{item.id} · {item.goal}</option>)}
            </select>
          )}
          {run && <RunStatusBadge status={run.status} />}
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: streamOpen ? 'var(--sage)' : 'var(--muted-text)', fontSize: 12 }}>
            <span className={streamOpen ? 'dot dot-running' : 'dot'} />
            {streamOpen ? 'Live event stream' : 'Reconnecting'}
          </span>
          {run && <Link href={`${base}/runs/${encodeURIComponent(run.id)}`} className="btn btn-secondary btn-sm">Open run room</Link>}
        </div>
      </header>

      {error && <p role="alert" style={{ margin: 0, padding: 12, color: 'var(--red)' }}>{error}</p>}
      {loading && !data && <p role="status" style={{ padding: 24, color: 'var(--muted-text)' }}>Loading run activity…</p>}
      {data && data.runs.length === 0 && (
        <section className="card" style={{ maxWidth: 700, margin: '32px auto', padding: 24 }}>
          <h2 style={{ marginTop: 0 }}>No run activity yet</h2>
          <p style={{ color: 'var(--secondary-text)' }}>Start a real local run to populate this office with its recorded events.</p>
          <Link href={`${base}/runs/new`} className="btn btn-primary">Start a run</Link>
        </section>
      )}
      {run && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '8px 20px', background: 'var(--surface-1)', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflowX: 'auto' }}>
              {CAMERA_POIS.map((poi) => (
                <button
                  type="button"
                  key={poi.id}
                  className={activePoiId === poi.id ? 'btn btn-secondary btn-sm' : 'btn btn-ghost btn-sm'}
                  onClick={() => {
                    setActivePoiId(poi.id);
                    if (poi.role) setSelectedRole(poi.role);
                  }}
                >
                  {poi.label}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button type="button" className={viewMode === '3d' ? 'btn btn-secondary btn-sm' : 'btn btn-ghost btn-sm'} onClick={() => setViewMode('3d')}><Camera size={13} /> 3D</button>
              <button type="button" className={viewMode === 'fallback' ? 'btn btn-secondary btn-sm' : 'btn btn-ghost btn-sm'} onClick={() => setViewMode('fallback')}><Layers size={13} /> 2D</button>
              <button type="button" className={viewMode === 'browser' ? 'btn btn-secondary btn-sm' : 'btn btn-ghost btn-sm'} onClick={() => setViewMode('browser')}><Monitor size={13} /> Browser</button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(320px, 380px)', flex: 1, minHeight: 420 }}>
            <div style={{ minHeight: 420, background: '#000' }}>
              {viewMode === 'browser' ? (
                <section aria-label="Live browser evidence" style={{ minHeight: 420, height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--surface-1)' }}>
                  <div style={{ padding: '10px 16px', display: 'flex', justifyContent: 'space-between', gap: 12, borderBottom: '1px solid var(--border)', color: 'var(--secondary-text)', fontSize: 12 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}><Monitor size={14} color="var(--sage)" /> Latest browser capture</span>
                    <span>{latestScreenshot ? new Date(latestScreenshot.timestamp).toLocaleTimeString() : 'Waiting for first page'}</span>
                  </div>
                  <div style={{ flex: 1, minHeight: 360, display: 'grid', placeItems: 'center', padding: 16, background: '#101310' }}>
                    {typeof latestScreenshotId === 'string' ? (
                      <Image
                        key={`${effectiveRunId}:${latestScreenshotId}`}
                        src={`/api/local/runs/${encodeURIComponent(effectiveRunId)}/artifacts/${encodeURIComponent(latestScreenshotId)}`}
                        alt={`Latest browser screenshot for ${run.goal}`}
                        width={1280}
                        height={800}
                        unoptimized
                        style={{ maxWidth: '100%', maxHeight: 620, objectFit: 'contain', borderRadius: 8 }}
                      />
                    ) : (
                      <p role="status" style={{ maxWidth: 420, textAlign: 'center', color: 'var(--secondary-text)', lineHeight: 1.6 }}>
                        {isActiveRun(run)
                          ? 'Waiting for the worker to load a page and capture its viewport…'
                          : 'This run has no browser screenshot evidence.'}
                      </p>
                    )}
                  </div>
                  <div style={{ margin: 0, padding: '8px 16px', color: 'var(--muted-text)', fontSize: 11, borderTop: '1px solid var(--border)' }}>
                    <p style={{ margin: '0 0 4px', color: 'var(--secondary-text)' }}>
                      Latest activity: {latestEvent?.summary ?? 'Waiting for the worker to report its first event.'}
                    </p>
                    <p style={{ margin: 0 }}>
                      Screenshots update over the live event stream after each page navigation. This is page-by-page evidence, not a continuous video feed.
                    </p>
                  </div>
                </section>
              ) : viewMode === '3d' ? (
                <AgentOfficeScene
                  agents={agents}
                  selectedRole={selectedRole}
                  onSelectRole={(role) => {
                    setSelectedRole(role);
                    setActivePoiId(role);
                  }}
                  activePoiId={activePoiId}
                />
              ) : (
                <AgentOfficeFallback agents={agents} selectedRole={selectedRole} onSelectRole={setSelectedRole} projectId={projectId} />
              )}
            </div>
            <AgentOfficeInspector agent={selectedAgent} projectId={projectId} />
          </div>
          <AgentOfficeTimeline events={runEvents.map(toRunEvent)} projectId={projectId} />
          <p style={{ display: 'flex', gap: 7, alignItems: 'center', margin: '0 20px 12px', color: 'var(--muted-text)', fontSize: 11 }}>
            {streamOpen ? <Activity size={12} /> : <RefreshCw size={12} />}
            {runEvents.length} persisted events · {latestEvent ? `Last event: ${latestEvent.summary}` : 'Waiting for run events'}
          </p>
        </>
      )}
    </div>
  );
}
