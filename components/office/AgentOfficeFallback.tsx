'use client';

import Link from 'next/link';
import { Bot, Bug, ExternalLink, Activity, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import type { AgentRole } from '@/lib/domain/types';
import type { OfficeAgentState } from '@/lib/office/types';
import { MonoId } from '@/components/ui/shared';

interface AgentOfficeFallbackProps {
  agents: Record<string, OfficeAgentState>;
  selectedRole: AgentRole;
  onSelectRole: (role: AgentRole) => void;
  projectId: string;
}

export default function AgentOfficeFallback({
  agents,
  selectedRole,
  onSelectRole,
  projectId,
}: AgentOfficeFallbackProps) {
  const base = `/app/${projectId}`;

  return (
    <div style={{
      padding: 24,
      display: 'flex',
      flexDirection: 'column',
      gap: 20,
      background: 'var(--surface-1)',
      height: '100%',
      overflowY: 'auto',
    }}>
      <div style={{
        padding: '12px 16px',
        borderRadius: 8,
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Bot size={16} color="var(--sage)" />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ivory)' }}>
            Accessible 2D Station Roster (Non-3D Fallback Mode)
          </span>
        </div>
        <span style={{ fontSize: 11, color: 'var(--muted-text)' }}>
          High-performance accessible view · Screen-reader optimized
        </span>
      </div>

      {/* Grid of Workstations */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: 16,
      }}>
        {Object.values(agents).map(agent => {
          const isSelected = selectedRole === agent.role;
          const isActive = agent.status === 'active';

          return (
            <div
              key={agent.role}
              onClick={() => onSelectRole(agent.role)}
              className="card"
              style={{
                padding: 18,
                background: isSelected ? 'var(--surface-2)' : 'var(--surface-1)',
                borderColor: isSelected ? 'var(--sage)' : 'var(--border)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span style={{ fontSize: 10, color: 'var(--muted-text)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {agent.workstationName}
                  </span>
                  <h3 style={{ margin: '2px 0 0', fontSize: 15, fontWeight: 700, color: 'var(--ivory)' }}>
                    {agent.name}
                  </h3>
                  <p style={{ margin: 0, fontSize: 11, color: 'var(--secondary-text)' }}>
                    {agent.title}
                  </p>
                </div>

                <span style={{
                  padding: '2px 8px',
                  borderRadius: 999,
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  background: isActive ? 'var(--sage-dim)' : 'var(--surface-3)',
                  color: isActive ? 'var(--sage)' : 'var(--muted-text)',
                  border: '1px solid var(--border)',
                }}>
                  {agent.status}
                </span>
              </div>

              <div style={{
                padding: '8px 10px',
                borderRadius: 6,
                background: 'var(--surface-2)',
                border: '1px solid var(--border-subtle)',
                fontSize: 12,
                color: 'var(--ivory)',
                fontWeight: 500,
              }}>
                {agent.currentTask}
              </div>

              <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--muted-text)', marginTop: 'auto' }}>
                {agent.linkedRunId && <span>Run: <MonoId>{agent.linkedRunId}</MonoId></span>}
                {agent.linkedFindingId && (
                  <Link href={`${base}/findings/${agent.linkedFindingId}`} style={{ color: 'var(--red)', fontWeight: 600, textDecoration: 'none' }}>
                    Finding #{agent.linkedFindingId.split('_')[1]} →
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
