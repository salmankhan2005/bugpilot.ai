'use client';

import Link from 'next/link';
import { Activity, Bug } from 'lucide-react';

interface OfficeTimelineEvent {
  id: string;
  timestamp: string;
  type: string;
  actor: string;
  summary: string;
  findingId?: string;
}

interface AgentOfficeTimelineProps {
  events: OfficeTimelineEvent[];
  projectId: string;
}

export default function AgentOfficeTimeline({ events, projectId }: AgentOfficeTimelineProps) {
  const base = `/app/${projectId}`;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      padding: '16px 20px',
      background: 'var(--surface-1)',
      borderTop: '1px solid var(--border)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Activity size={15} color="var(--sage)" />
          <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--ivory)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Office Event Stream
          </h3>
          <span style={{ fontSize: 11, color: 'var(--muted-text)' }}>({events.length} chronological events)</span>
        </div>
      </div>

      <div style={{
        display: 'flex',
        gap: 12,
        overflowX: 'auto',
        paddingBottom: 4,
      }}>
        {events.map((ev) => {
          const isError = ev.type.includes('error') || ev.type.includes('failed');
          const isFinding = ev.type.includes('finding');

          return (
            <div
              key={ev.id}
              style={{
                flexShrink: 0,
                width: 280,
                padding: '10px 12px',
                borderRadius: 6,
                background: isError || isFinding ? 'var(--red-dim)' : 'var(--surface-2)',
                border: `1px solid ${isError || isFinding ? 'rgba(220,38,38,0.25)' : 'var(--border)'}`,
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '1px 5px',
                  borderRadius: 3,
                  background: 'var(--surface-3)',
                  color: isError || isFinding ? 'var(--red)' : 'var(--sage)',
                  textTransform: 'uppercase',
                }}>
                  {ev.actor}
                </span>
                <span style={{ fontSize: 10, color: 'var(--muted-text)', fontFamily: 'DM Mono, monospace' }}>
                  {ev.timestamp.split('T')[1].replace('Z', '')}
                </span>
              </div>

              <p style={{ margin: 0, fontSize: 11, color: 'var(--ivory)', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                {ev.summary}
              </p>

              {ev.findingId && (
                <Link
                  href={`${base}/findings/${ev.findingId}`}
                  style={{ fontSize: 10, color: 'var(--red)', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, marginTop: 'auto' }}
                >
                  <Bug size={10} />
                  Finding #{ev.findingId.split('_')[1]} →
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
