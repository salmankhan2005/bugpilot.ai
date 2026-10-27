// Sample finding card — explicitly labelled demo/sample content
export default function SampleFinding() {
  return (
    <section style={{
      padding: '80px 80px',
      borderTop: '1px solid var(--border)',
      background: 'var(--graphite)',
    }} aria-labelledby="sample-heading">
      {/* Header */}
      <div style={{ marginBottom: 40, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px',
            borderRadius: 999, background: 'var(--amber-dim)', border: '1px solid rgba(201,136,74,0.3)',
            marginBottom: 16,
          }}>
            <span style={{ fontSize: 10, color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Sample investigation · Demo data
            </span>
          </div>
          <h2 id="sample-heading" style={{ margin: 0 }}>An illustrative finding example</h2>
        </div>
        <span style={{ color: 'var(--muted-text)', fontSize: 12 }}>Illustrative sample · not live project data</span>
      </div>

      {/* Two-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Left: Finding */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Finding header */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
              <span style={{
                padding: '2px 7px', borderRadius: 4,
                background: 'rgba(214,106,97,0.12)', color: 'var(--red)',
                fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
              }}>Critical</span>
              <span style={{ fontSize: 11, color: 'var(--secondary-text)', fontFamily: 'DM Mono, monospace' }}>finding_1024</span>
              <span style={{
                marginLeft: 'auto', padding: '2px 7px', borderRadius: 999,
                background: 'rgba(214,106,97,0.1)', color: 'var(--red)',
                fontSize: 10, border: '1px solid rgba(214,106,97,0.2)', textTransform: 'uppercase',
              }}>New</span>
            </div>
            <h3 style={{ fontSize: 14, margin: '0 0 10px', lineHeight: 1.4 }}>
              Payment validation fails with valid credit card numbers
            </h3>
            <p style={{ fontSize: 12, color: 'var(--secondary-text)', margin: 0, lineHeight: 1.6 }}>
              <strong style={{ color: 'var(--ivory-muted)' }}>Observed:</strong> Card number 4242 4242 4242 4242 is rejected with &quot;Invalid card number&quot; error.
            </p>
          </div>

          {/* Reproduction steps */}
          <div className="card" style={{ padding: 20 }}>
            <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted-text)', margin: '0 0 12px' }}>
              Reproduction Steps
            </p>
            <ol style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                'Go to https://acme.demo/checkout',
                'Fill Shipping Information fields',
                'Enter card: 4242 4242 4242 4242',
                'Enter expiry 12/29, CVV 123',
                'Observe: "Invalid card number" error appears',
              ].map((step, i) => (
                <li key={i} style={{ fontSize: 12, color: 'var(--secondary-text)', lineHeight: 1.5 }}>{step}</li>
              ))}
            </ol>
          </div>

          {/* AI hypothesis */}
          <div className="card" style={{ padding: 20, borderColor: 'rgba(201,136,74,0.25)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{
                fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em',
                color: 'var(--amber)', padding: '2px 7px', borderRadius: 999,
                background: 'var(--amber-dim)', border: '1px solid rgba(201,136,74,0.2)',
              }}>Hypothesis · not confirmed</span>
              <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--amber)' }}>82% confidence</span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--secondary-text)', margin: 0, lineHeight: 1.6 }}>
              Card validation regex strips non-digits but the UI formats input with spaces.
              The normalisation step <code style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: 'var(--ivory-muted)' }}>.replace(/[\s-]/g, &#39;&#39;)</code> is missing before the Luhn check.
            </p>
            <p style={{ fontSize: 11, color: 'var(--muted-text)', margin: '10px 0 0' }}>
              Evidence: ev_e002 (console log) · ev_e003 (network 400)
            </p>
          </div>
        </div>

        {/* Right: Evidence */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Screenshot placeholder */}
          <div style={{
            background: 'var(--obsidian)', border: '1px solid var(--border)',
            borderRadius: 12, padding: 20, flex: 1,
            display: 'flex', flexDirection: 'column', gap: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: 'var(--muted-text)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Screenshot · ev_e001</span>
              <span style={{ marginLeft: 'auto', fontSize: 10, fontFamily: 'DM Mono, monospace', color: 'var(--muted-text)' }}>09:49:17</span>
            </div>
            {/* Simulated browser screenshot */}
            <div style={{
              background: '#fff', borderRadius: 8, overflow: 'hidden',
              border: '1px solid var(--border)', aspectRatio: '16/9',
              display: 'flex', flexDirection: 'column',
            }}>
              {/* Browser chrome */}
              <div style={{ background: '#f1f3f4', height: 32, display: 'flex', alignItems: 'center', padding: '0 12px', gap: 8 }}>
                <div style={{ display: 'flex', gap: 5 }}>
                  {['#ff5f57','#febc2e','#28c840'].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />)}
                </div>
                <div style={{ flex: 1, background: '#e8eaed', borderRadius: 6, height: 20, display: 'flex', alignItems: 'center', padding: '0 10px' }}>
                  <span style={{ fontSize: 10, color: '#5f6368' }}>acme.demo/checkout</span>
                </div>
              </div>
              {/* Page content simulation */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 16, gap: 8 }}>
                <div style={{ fontFamily: 'sans-serif', fontSize: 14, fontWeight: 600, color: '#202124', marginBottom: 8 }}>Payment Details</div>
                <div style={{ border: '2px solid #d93025', borderRadius: 6, padding: '8px 12px', background: '#fff' }}>
                  <span style={{ fontSize: 12, color: '#5f6368', display: 'block', marginBottom: 2 }}>Card number</span>
                  <span style={{ fontSize: 13, color: '#202124', fontFamily: 'monospace' }}>4242 4242 4242 4242</span>
                </div>
                <div style={{ background: '#fce8e6', border: '1px solid #d93025', borderRadius: 6, padding: '6px 12px' }}>
                  <span style={{ fontSize: 12, color: '#d93025', fontWeight: 500 }}>⚠ Invalid card number</span>
                </div>
              </div>
            </div>
          </div>

          {/* Network evidence */}
          <div className="card" style={{ padding: 16 }}>
            <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted-text)', margin: '0 0 10px' }}>Network · ev_e003</p>
            <div style={{
              fontFamily: 'DM Mono, monospace', fontSize: 11,
              background: 'var(--surface-3)', borderRadius: 6, padding: 12,
              color: 'var(--red)', lineHeight: 1.7,
            }}>
              <span style={{ color: 'var(--muted-text)' }}>POST </span>/api/validate-card<br />
              <span style={{ color: 'var(--red)' }}>← 400 Bad Request</span><br />
              <span style={{ color: 'var(--secondary-text)' }}>{'{"error":"invalid_card_number"}'}</span>
            </div>
          </div>

          {/* Verified state */}
          <div style={{
            padding: '12px 16px', borderRadius: 8,
            background: 'var(--surface-3)', border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{ fontSize: 16 }}>⚪</span>
            <div>
              <p style={{ fontSize: 12, color: 'var(--muted-text)', margin: 0, fontWeight: 500 }}>Verification: Not Run</p>
              <p style={{ fontSize: 11, color: 'var(--muted-text)', margin: '2px 0 0' }}>
                Fix must be applied and checks executed before this finding can be marked verified.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
