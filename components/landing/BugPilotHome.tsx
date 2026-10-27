import Link from 'next/link';
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Bug,
  Check,
  CircleAlert,
  Clock3,
  Code2,
  Globe2,
  Image,
  ShieldCheck,
} from 'lucide-react';

const navigation = [
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Evidence', href: '#evidence' },
];

const recordedSignals = [
  { label: 'Console errors', value: '01', icon: Code2 },
  { label: 'Failed requests', value: '02', icon: Activity },
  { label: 'Screenshots', value: '01', icon: Image },
];

const runEvents = [
  { time: '00:01', title: 'Browser session started', detail: 'Chromium · 1440 × 900', state: 'complete' },
  { time: '00:04', title: 'Route observed', detail: '/checkout', state: 'complete' },
  { time: '00:06', title: 'Console error captured', detail: 'TypeError · checkout.ts:84', state: 'issue' },
  { time: '00:08', title: 'Screenshot saved', detail: 'Initial viewport evidence', state: 'complete' },
];

function ProductPreview() {
  return (
    <div className="bp-home-preview" aria-label="Illustrative BugPilot run interface preview">
      <div className="bp-home-preview-frame">
        <div className="bp-home-window-bar">
          <div className="bp-home-window-dots" aria-hidden="true"><i /><i /><i /></div>
          <div className="bp-home-address"><ShieldCheck size={12} /> app.bugpilot.dev / runs / preview</div>
          <span className="bp-home-preview-tag">Interface preview</span>
        </div>

        <div className="bp-home-workspace">
          <aside className="bp-home-sidebar" aria-label="Preview navigation">
            <div className="bp-home-side-brand">
              <span className="bp-home-side-mark"><Bug size={14} /></span>
              <span>BugPilot</span>
            </div>
            <span className="bp-home-side-label">WORKSPACE</span>
            <div className="bp-home-project"><span className="bp-home-project-dot" /> Web checkout</div>
            <div className="bp-home-nav-item"><Activity size={14} /> Overview</div>
            <div className="bp-home-nav-item bp-home-nav-item--active"><Clock3 size={14} /> Runs <span>04</span></div>
            <div className="bp-home-nav-item"><CircleAlert size={14} /> Findings <span>02</span></div>
            <div className="bp-home-nav-item"><Globe2 size={14} /> Routes</div>
            <div className="bp-home-sidebar-foot"><span className="bp-home-live-dot" /> Local worker ready</div>
          </aside>

          <section className="bp-home-run-view" aria-label="Illustrative browser run details">
            <div className="bp-home-run-titlebar">
              <div>
                <span className="bp-home-kicker">BROWSER RUN</span>
                <h2>Checkout smoke test</h2>
              </div>
              <span className="bp-home-run-status"><i /> Completed</span>
            </div>
            <div className="bp-home-run-meta">
              <span><Globe2 size={12} /> localhost:3000</span>
              <span>Chromium</span>
              <span>00:08</span>
            </div>

            <div className="bp-home-evidence-grid">
              <div className="bp-home-browser-shot">
                <div className="bp-home-shot-bar">
                  <span className="bp-home-shot-lock"><ShieldCheck size={10} /></span>
                  <span>localhost:3000/checkout</span>
                  <span className="bp-home-shot-menu">•••</span>
                </div>
                <div className="bp-home-shot-content">
                  <span className="bp-home-shot-brand">NORTH / FORM</span>
                  <div className="bp-home-shot-copy">
                    <span>YOUR ORDER</span>
                    <strong>Complete checkout</strong>
                  </div>
                  <div className="bp-home-shot-field"><span>Email address</span><i /></div>
                  <div className="bp-home-shot-field bp-home-shot-field--error">
                    <span>Card number</span><strong>Unable to validate card</strong>
                  </div>
                  <div className="bp-home-shot-button">Continue to payment</div>
                  <span className="bp-home-shot-note">Captured browser viewport · illustrative</span>
                </div>
              </div>

              <div className="bp-home-event-list">
                <div className="bp-home-event-heading">
                  <span>Run events</span>
                  <span>4 recorded</span>
                </div>
                <ol>
                  {runEvents.map((event) => (
                    <li key={event.time}>
                      <span className={`bp-home-event-marker bp-home-event-marker--${event.state}`}>
                        {event.state === 'issue' ? <CircleAlert size={12} /> : <Check size={12} />}
                      </span>
                      <div>
                        <strong>{event.title}</strong>
                        <span>{event.detail}</span>
                      </div>
                      <time>{event.time}</time>
                    </li>
                  ))}
                </ol>
                <div className="bp-home-finding">
                  <div className="bp-home-finding-icon"><CircleAlert size={14} /></div>
                  <div><span>NEEDS REVIEW</span><strong>Checkout validation error</strong></div>
                  <ArrowUpRight size={14} />
                </div>
              </div>
            </div>
            <div className="bp-home-preview-foot">
              <span>Illustrative interface — not live project data</span>
              <span><ArrowDownRight size={12} /> Events linked to browser evidence</span>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default function BugPilotHome() {
  return (
    <div className="bp-site bp-landing-v2">
      <header className="bp-header">
        <div className="bp-nav-wrap">
          <Link className="bp-brand" href="/" aria-label="BugPilot home">
            <span className="bp-brand-mark" aria-hidden="true"><Bug size={17} strokeWidth={2.2} /></span>
            <span>BugPilot</span>
          </Link>
          <nav className="bp-nav" aria-label="Main navigation">
            {navigation.map((item) => <a key={item.href} href={item.href}>{item.label}</a>)}
          </nav>
          <div className="bp-nav-actions">
            <Link className="bp-nav-signin" href="/sign-in">Sign in</Link>
            <Link className="bp-nav-cta" href="/sign-up">
              Create account <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="bp-home-hero bp-frame" aria-labelledby="bp-home-title">
          <div className="bp-home-hero-copy">
            <h1 id="bp-home-title">Find the bug.<br />Follow the evidence.</h1>
            <p>
              Run Chromium against your own application. See what happened, where it happened,
              and the browser evidence behind every finding.
            </p>
            <div className="bp-home-actions">
              <Link className="bp-home-primary" href="/sign-up">
                Start testing <ArrowRight size={16} aria-hidden="true" />
              </Link>
              <Link className="bp-home-secondary" href="/sign-in">Sign in to your workspace</Link>
            </div>
          </div>

          <ProductPreview />

          <ul className="bp-home-proof" aria-label="BugPilot capabilities">
            <li><span><Check size={13} /></span> Chromium runs locally</li>
            <li><span><Check size={13} /></span> Browser events stay inspectable</li>
            <li><span><Check size={13} /></span> Findings link to captured evidence</li>
          </ul>
        </section>

        <section className="bp-home-how bp-frame" id="how-it-works" aria-labelledby="bp-home-how-title">
          <div className="bp-home-section-heading">
            <span>One run. Clear evidence.</span>
            <h2 id="bp-home-how-title">A browser session you can actually inspect.</h2>
          </div>
          <div className="bp-home-signal-grid" id="evidence">
            {recordedSignals.map(({ label, value, icon: Icon }) => (
              <article className="bp-home-signal" key={label}>
                <span className="bp-home-signal-icon"><Icon size={17} /></span>
                <strong>{label}</strong>
                <span>{value} signal{value === '01' ? '' : 's'} recorded per illustrative run</span>
              </article>
            ))}
          </div>
          <p className="bp-home-scope-note">
            Run goals provide context; they do not execute scripted clicks or forms. Use verified
            website origins or locally allowlisted targets.
          </p>
        </section>
      </main>

      <footer className="bp-home-footer bp-frame">
        <Link className="bp-brand" href="/" aria-label="BugPilot home">
          <span className="bp-brand-mark" aria-hidden="true"><Bug size={15} /></span>
          <span>BugPilot</span>
        </Link>
        <p>Local-first browser QA with inspectable run evidence.</p>
        <Link href="/sign-in">Open your workspace <ArrowUpRight size={14} /></Link>
      </footer>
    </div>
  );
}
