'use client';

import Link from 'next/link';
import { 
  Bot, Terminal, ExternalLink, Bug, FileCode, 
  CheckCircle2, AlertTriangle, ArrowRight, Activity, Globe, Shield 
} from 'lucide-react';
import type { OfficeAgentState } from '@/lib/office/types';
import { MonoId } from '@/components/ui/shared';

interface AgentOfficeInspectorProps {
  agent: OfficeAgentState;
  projectId: string;
}

export default function AgentOfficeInspector({ agent, projectId }: AgentOfficeInspectorProps) {
  const base = `/app/${projectId}`;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 18,
      padding: 24,
      background: 'var(--surface-1)',
      height: '100%',
      overflowY: 'auto',
    }}>
      {/* Header */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--sage)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {agent.workstationName}
          </span>
          <span style={{
            padding: '2px 8px',
            borderRadius: 999,
            fontSize: 10,
            fontWeight: 700,
            textTransform: 'uppercase',
            background: agent.status === 'active' ? 'var(--sage-dim)' : 'var(--surface-2)',
            color: agent.status === 'active' ? 'var(--sage)' : 'var(--muted-text)',
            border: '1px solid var(--border)',
          }}>
            {agent.status}
          </span>
        </div>

        <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px', color: 'var(--ivory)' }}>
          {agent.name}
        </h2>
        <p style={{ fontSize: 12, color: 'var(--secondary-text)', margin: 0, fontWeight: 500 }}>
          {agent.title}
        </p>
      </div>

      {/* Role description */}
      <p style={{ fontSize: 13, color: 'var(--secondary-text)', margin: 0, lineHeight: 1.5 }}>
        {agent.description}
      </p>

      {/* Active Objective Card */}
      <div className="card" style={{ padding: 14, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted-text)', letterSpacing: '0.04em', marginBottom: 4 }}>
          Current Task & State
        </div>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--ivory)', fontWeight: 500, lineHeight: 1.45 }}>
          {agent.currentTask}
        </p>

        {agent.targetUrl && (
          <div style={{ marginTop: 8, fontSize: 11, color: 'var(--secondary-text)', fontFamily: 'DM Mono, monospace' }}>
            URL: {agent.targetUrl}
          </div>
        )}

        {agent.currentStep && (
          <div style={{ marginTop: 4, fontSize: 11, color: 'var(--sage)', fontWeight: 600 }}>
            {agent.currentStep}
          </div>
        )}
      </div>

      {/* Linked Real QA Objects */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {agent.linkedRunId && (
          <div style={{
            padding: '10px 12px',
            borderRadius: 6,
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontSize: 10, color: 'var(--muted-text)', textTransform: 'uppercase' }}>Active Run</div>
              <MonoId>{agent.linkedRunId}</MonoId>
            </div>
            <Link href={`${base}/runs/${agent.linkedRunId}`} className="btn btn-secondary btn-sm" style={{ padding: '3px 8px', fontSize: 11 }}>
              Open Run Room →
            </Link>
          </div>
        )}

        {agent.linkedFindingId && (
          <div style={{
            padding: '10px 12px',
            borderRadius: 6,
            background: 'var(--red-dim)',
            border: '1px solid rgba(220,38,38,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontSize: 10, color: 'var(--red)', fontWeight: 700, textTransform: 'uppercase' }}>Emitted Defect</div>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ivory)' }}>#{agent.linkedFindingId.split('_')[1]}</span>
            </div>
            <Link href={`${base}/findings/${agent.linkedFindingId}`} className="btn btn-secondary btn-sm" style={{ padding: '3px 8px', fontSize: 11 }}>
              Inspect Defect →
            </Link>
          </div>
        )}

        {agent.diffProposalId && (
          <div style={{
            padding: '10px 12px',
            borderRadius: 6,
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontSize: 10, color: 'var(--muted-text)', textTransform: 'uppercase' }}>Generated Patch</div>
              <span style={{ fontSize: 12, color: 'var(--ivory)', fontWeight: 600 }}>fix-card-validation-1024</span>
            </div>
            <Link href={`${base}/findings/finding_1024`} className="btn btn-secondary btn-sm" style={{ padding: '3px 8px', fontSize: 11 }}>
              Review Diff →
            </Link>
          </div>
        )}
      </div>

      {/* Activity Log Stream */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <Terminal size={14} color="var(--sage)" />
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ivory)' }}>
            Station Execution Log
          </span>
        </div>

        <div style={{
          background: 'var(--surface-2)',
          border: '1px solid var(--border)',
          borderRadius: 6,
          padding: 12,
          fontFamily: 'DM Mono, monospace',
          fontSize: 11,
          color: 'var(--secondary-text)',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}>
          {agent.logs.map((log, i) => (
            <div key={i} style={{ color: log.includes('ANOMALY') ? 'var(--red)' : log.includes('Hypothesis') || log.includes('passed') ? 'var(--sage)' : 'inherit' }}>
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
