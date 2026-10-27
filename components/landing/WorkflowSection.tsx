import Link from 'next/link';

const STEPS = [
  {
    id: 'explore',
    num: '01',
    title: 'Explore',
    desc: 'Agent navigates your running application, maps user journeys, and identifies interactive elements within a bounded scope.',
    color: 'var(--sage)',
    icon: '🔍',
  },
  {
    id: 'reproduce',
    num: '02',
    title: 'Reproduce',
    desc: 'Deterministic checks run against observed browser state. Real screenshots, console errors, and network failures are captured.',
    color: 'var(--sage)',
    icon: '📸',
  },
  {
    id: 'diagnose',
    num: '03',
    title: 'Diagnose',
    desc: 'Findings are normalized into evidence graphs. AI proposes likely root causes — always citing evidence IDs, always expressing uncertainty.',
    color: 'var(--amber)',
    icon: '🧠',
  },
  {
    id: 'propose',
    num: '04',
    title: 'Propose Fix',
    desc: 'When source code is connected, a reviewable diff is generated. No code is applied without explicit human approval.',
    color: 'var(--sage)',
    icon: '🔧',
  },
  {
    id: 'verify',
    num: '05',
    title: 'Verify',
    desc: 'A separate isolated run executes configured checks against the patched revision. Verification status reflects actual test outcomes.',
    color: 'var(--sage)',
    icon: '✅',
  },
];

export default function WorkflowSection() {
  return (
    <section id="workflow" style={{
      padding: '96px 80px',
      borderTop: '1px solid var(--border)',
    }} aria-labelledby="workflow-heading">
      <div style={{ marginBottom: 56, maxWidth: 600 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '3px 10px', borderRadius: 999,
          background: 'var(--surface-2)', border: '1px solid var(--border)',
          marginBottom: 20,
        }}>
          <span style={{ fontSize: 10, color: 'var(--secondary-text)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            How it works
          </span>
        </div>
        <h2 id="workflow-heading" style={{ margin: '0 0 16px' }}>
          From target URL to<br />
          <span style={{ color: 'var(--sage)' }}>traceable evidence</span>
        </h2>
        <p style={{ fontSize: 15, color: 'var(--secondary-text)', lineHeight: 1.7, margin: 0 }}>
          Every finding is an investigation graph: trigger → user steps → expected vs. observed → runtime evidence → root-cause hypothesis → proposed change → verification result.
        </p>
      </div>

      {/* Steps */}
      <div style={{ position: 'relative' }}>
        {/* Connector line */}
        <div style={{
          position: 'absolute', top: 28, left: 28, right: 28,
          height: 1, background: 'var(--border)',
          zIndex: 0,
        }} aria-hidden="true" />

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 24,
          position: 'relative', zIndex: 1,
        }}>
          {STEPS.map((step, i) => (
            <div key={step.id} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Icon */}
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'var(--graphite)', border: `1.5px solid var(--border)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24, position: 'relative',
              }} aria-hidden="true">
                <span style={{
                  position: 'absolute', top: -4, right: -4,
                  width: 18, height: 18, borderRadius: '50%',
                  background: 'var(--obsidian)', border: `1px solid ${step.color}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 8, color: step.color, fontFamily: 'DM Mono, monospace', fontWeight: 600,
                }}>
                  {i + 1}
                </span>
                {step.icon}
              </div>
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--ivory)', margin: '0 0 8px', letterSpacing: '-0.01em' }}>
                  {step.title}
                </h3>
                <p style={{ fontSize: 12.5, color: 'var(--secondary-text)', lineHeight: 1.6, margin: 0 }}>
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ marginTop: 64, display: 'flex', gap: 12, alignItems: 'center' }}>
        <Link href="/app" className="btn btn-primary btn-lg">
          Start your first investigation →
        </Link>
        <Link href="/app" className="btn btn-secondary btn-lg">
          Open workspace
        </Link>
      </div>
    </section>
  );
}
