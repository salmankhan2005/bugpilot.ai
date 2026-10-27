import { Shield, FileText, Eye } from 'lucide-react';

export default function SecurityControl() {
  return (
    <section style={{
      padding: '96px 32px',
      background: 'var(--background)',
      borderTop: '1px solid var(--border)',
      borderBottom: '1px solid var(--border)',
    }} aria-label="Security and control">
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 48, maxWidth: 600 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '3px 10px', borderRadius: 999,
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            marginBottom: 12,
          }}>
            <span style={{ fontSize: 11, color: 'var(--secondary-text)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Zero‑trust operational model
            </span>
          </div>
          <h2 style={{ margin: '0 0 12px', fontSize: 28, fontWeight: 600, color: 'var(--foreground)' }}>
            Security and control built into every investigation
          </h2>
          <p style={{ margin: 0, fontSize: 16, color: 'var(--secondary-text)', lineHeight: 1.6 }}>
            Agents work within ephemeral, sandboxed browser contexts. No scripts modify your source until you explicitly approve the proposed fix.
          </p>
        </div>

        {/* Features grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 24,
          marginBottom: 48,
        }}>
          {/* Sandbox / Isolation */}
          <div style={{
            borderRadius: 'var(--r-lg)',
            border: '1px solid var(--border)',
            padding: '32px',
            background: 'var(--card)',
          }}>
            <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Shield size={20} strokeWidth={1.5} style={{ color: '#10B981' }} />
              </div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--foreground)' }}>
                Sandbox isolation
              </h3>
            </div>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--secondary-text)', lineHeight: 1.6 }}>
              Each run executes in an ephemeral Chromium instance with a single clean page load. No access to your development tools or backend.
            </p>
            <div style={{ marginTop: 20, padding: '10px 12px', borderRadius: 'var(--r-md)', background: 'var(--surface-2)', fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--muted-text)' }}>
              <span style={{ color: '#10B981' }}>self.clean.chromium()</span>
            </div>
          </div>

          {/* Evidence chain */}
          <div style={{
            borderRadius: 'var(--r-lg)',
            border: '1px solid var(--border)',
            padding: '32px',
            background: 'var(--card)',
          }}>
            <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                background: 'rgba(59, 130, 246, 0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Eye size={20} strokeWidth={1.5} style={{ color: '#3B82F6' }} />
              </div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--foreground)' }}>
                Immutable evidence
              </h3>
            </div>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--secondary-text)', lineHeight: 1.6 }}>
              Every browser state, network request, and console message is recorded as evidence ID. No unsaved temporary state can escape the investigation.
            </p>
            <div style={{ marginTop: 20, padding: '10px 12px', borderRadius: 'var(--r-md)', background: 'var(--surface-2)', fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--muted-text)' }}>
              <span>ev_e001, ev_e002, ev_e003 ...</span>
            </div>
          </div>

          {/* Review workflow */}
          <div style={{
            borderRadius: 'var(--r-lg)',
            border: '1px solid var(--border)',
            padding: '32px',
            background: 'var(--card)',
          }}>
            <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                background: 'rgba(245, 158, 11, 0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <FileText size={20} strokeWidth={1.5} style={{ color: '#F59E0B' }} />
              </div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--foreground)' }}>
                Code review workflow
              </h3>
            </div>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--secondary-text)', lineHeight: 1.6 }}>
              Patch proposals are version‑controlled changes, reviewed by a dedicated interface, and never applied without explicit approval.
            </p>
            <div style={{ marginTop: 20, padding: '10px 12px', borderRadius: 'var(--r-md)', background: 'var(--surface-2)', fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--muted-text)' }}>
              <span style={{ color: '#F59E0B' }}>approved_by = you</span>
            </div>
          </div>
        </div>

        {/* Architecture diagram */}
        <div style={{ marginTop: 40 }}>
          <h3 style={{ margin: '0 0 20px', fontSize: 20, fontWeight: 600, color: 'var(--foreground)' }}>Trust model</h3>
          <div style={{
            borderRadius: 'var(--r-lg)',
            border: '1px solid var(--border)',
            background: 'var(--surface-2)',
            padding: 24,
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, alignItems: 'center' }}>
              {['User', 'Agent', 'Codebase', 'Test Suite'].map((label, idx) => (
                <div key={label} style={{ textAlign: 'center' }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: '50%',
                    background: idx === 1 ? 'rgba(16, 185, 129, 0.15)' : 'var(--surface-3)',
                    border: idx === 1 ? '1.5px solid #10B981' : '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 8px',
                  }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: idx === 1 ? '#10B981' : 'var(--muted-text)' }}>
                      {label}
                    </span>
                  </div>
                  <div style={{ height: 1, background: idx === 1 ? '#10B981' : 'var(--border)', margin: '0 auto 12px', width: '60%' }} />
                </div>
              ))}
            </div>
            <div style={{ marginTop: 20, textAlign: 'center', fontSize: 12, color: 'var(--muted-text)' }}>
              Trust boundary · Approvers · Applied · Verified
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
