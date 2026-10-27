content = '''\'use client\';

import Link from \'next/link\';
import { Activity, Bug, ChevronDown, ChevronUp } from \'lucide-react\';
import type { RunEvent } from \'@/lib/domain/types\';
import { useState } from \'react\';

interface AgentOfficeTimelineProps {
  events: RunEvent[];
  projectId: string;
}

export default function AgentOfficeTimeline({ events, projectId }: AgentOfficeTimelineProps) {
  const base = `/app/${projectId}`;
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{
      display: \'flex\',
      flexDirection: \'column\',
      background: \'var(--surface-1)\',
      borderTop: \'1px solid var(--border)\',
      flexShrink: 0,
    }}>
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          display: \'flex\', alignItems: \'center\', justifyContent: \'space-between\',
          padding: \'10px 20px\', background: \'transparent\', border: \'none\',
          cursor: \'pointer\', width: \'100%\', color: \'var(--ivory)\',
        }}
      >
        <div style={{ display: \'flex\', alignItems: \'center\', gap: 8 }}>
          <Activity size={14} color="var(--active-green)" />
          <h3 style={{ margin: 0, fontSize: 12, fontWeight: 700, color: \'var(--ivory)\', textTransform: \'uppercase\', letterSpacing: \'0.04em\' }}>
            Office Event Stream
          </h3>
          <span style={{ fontSize: 11, color: \'var(--muted-text)\' }}>({events.length} events)</span>
        </div>
        {expanded ? <ChevronDown size={14} color="var(--muted-text)" /> : <ChevronUp size={14} color="var(--muted-text)" />}
      </button>

      {expanded && (
        <div style={{ display: \'flex\', gap: 12, overflowX: \'auto\', padding: \'0 20px 14px\' }}>
          {events.map((ev) => {
            const isError = ev.type.includes(\'error\') || ev.type.includes(\'failed\');
            const isFinding = ev.type.includes(\'finding\');
            return (
              <div
                key={ev.id}
                style={{
                  flexShrink: 0, width: 260, padding: \'10px 12px\', borderRadius: 6,
                  background: isError || isFinding ? \'var(--red-dim)\' : \'var(--surface-2)\',
                  border: `1px solid ${isError || isFinding ? \'rgba(220,38,38,0.25)\' : \'var(--border)\'}`,
                  display: \'flex\', flexDirection: \'column\', gap: 4,
                }}
              >
                <div style={{ display: \'flex\', justifyContent: \'space-between\', alignItems: \'center\' }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: \'1px 5px\', borderRadius: 3,
                    background: \'var(--surface-3)\',
                    color: isError || isFinding ? \'var(--red)\' : \'var(--active-green)\',
                    textTransform: \'uppercase\',
                  }}>
                    {ev.actor}
                  </span>
                  <span style={{ fontSize: 10, color: \'var(--muted-text)\', fontFamily: \'DM Mono, monospace\' }}>
                    {ev.timestamp.split(\'T\')[1].replace(\'Z\', \'\')}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: 11, color: \'var(--ivory)\', lineHeight: 1.4 }}>
                  {ev.summary}
                </p>
                {ev.findingId && (
                  <Link href={`${base}/findings/${ev.findingId}`}
                    style={{ fontSize: 10, color: \'var(--red)\', fontWeight: 700, textDecoration: \'none\', display: \'flex\', alignItems: \'center\', gap: 4, marginTop: \'auto\' }}>
                    <Bug size={10} />
                    Finding #{ev.findingId.split(\'_\')[1]} →
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
'''
with open("components/office/AgentOfficeTimeline.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Written OK")
