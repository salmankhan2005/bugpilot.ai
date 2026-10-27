import { Activity, GitPullRequest, MessageSquare, Puzzle, ShieldAlert } from 'lucide-react';
import { PageHeader } from '@/components/ui/shared';

const INTEGRATIONS = [
  {
    name: 'GitHub',
    category: 'Source control',
    description: 'Repository linking and pull request creation are not implemented.',
    icon: GitPullRequest,
  },
  {
    name: 'Slack',
    category: 'Notifications',
    description: 'Alert delivery and channel configuration are not implemented.',
    icon: MessageSquare,
  },
  {
    name: 'Linear',
    category: 'Issue tracking',
    description: 'Issue sync and workspace configuration are not implemented.',
    icon: Puzzle,
  },
  {
    name: 'Sentry',
    category: 'Observability',
    description: 'Production telemetry connection is not implemented.',
    icon: Activity,
  },
];

export default function IntegrationsPage() {
  return (
    <div style={{ paddingBottom: 64 }}>
      <PageHeader
        title="Connected Integrations"
        breadcrumb="Integrations"
        subtitle="No third-party integration is connected to this project."
      />
      <div style={{ padding: '24px 28px' }}>
        <div role="status" className="card" style={{ display: 'flex', gap: 10, padding: 16, marginBottom: 20, color: 'var(--secondary-text)', fontSize: 13 }}>
          <ShieldAlert size={17} color="var(--amber)" />
          These are unavailable integrations, not active connections. No test messages or webhook deliveries will be simulated.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {INTEGRATIONS.map(({ name, category, description, icon: Icon }) => (
            <section key={name} className="card" style={{ display: 'grid', gap: 12, padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div>
                  <span style={{ color: 'var(--muted-text)', fontSize: 11, textTransform: 'uppercase' }}>{category}</span>
                  <h2 style={{ margin: '4px 0 0', color: 'var(--ivory)', fontSize: 16 }}>{name}</h2>
                </div>
                <span style={{ padding: '3px 8px', borderRadius: 999, background: 'var(--surface-2)', color: 'var(--muted-text)', fontSize: 11 }}>
                  Not connected
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', color: 'var(--secondary-text)', fontSize: 13, lineHeight: 1.5 }}>
                <Icon size={15} style={{ flex: '0 0 auto', marginTop: 2 }} />
                <p style={{ margin: 0 }}>{description}</p>
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
