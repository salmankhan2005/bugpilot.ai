import os

CONTENT = """\
import Link from 'next/link';
import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import WorkflowSection from '@/components/landing/WorkflowSection';
import SampleFinding from '@/components/landing/SampleFinding';

export const metadata: Metadata = {
  title: 'BugPilot AI — Evidence-First Autonomous QA',
  description:
    'Autonomous agents explore, reproduce, diagnose, and help verify bugs in your web application. Every finding is connected to the evidence that justifies it.',
};

// Canvas particles — client only
const LandingParticles = dynamic(
  () => import('@/components/landing/LandingParticles'),
  { ssr: false }
);

export default function LandingPage() {
  return (
    <div style={{ minHeight: '100dvh', background: 'var(--obsidian)', color: 'var(--ivory)', position: 'relative' }}>
      {/* ── NAV ──────────────────────────────────────────────────── */}
      <nav
        style={{
          position: 'sticky', top: 0, zIndex: 50,
          borderBottom: '1px solid var(--border)',
          background: 'color-mix(in srgb, var(--obsidian) 92%, transparent)',
          backdropFilter: 'blur(12px)',
          display: 'flex', alignItems: 'center', padding: '0 32px', height: 56,
          gap: 32,
        }}
        role="navigation"
        aria-label="Main navigation"
      >
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
            <circle cx="11" cy="11" r="10" stroke="var(--active-green)" strokeWidth="1.5"/>
            <path d="M7 8l4 3-4 3" stroke="var(--active-green)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M13 14h2" stroke="var(--active-green)" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--ivory)', letterSpacing: '-0.02em' }}>BugPilot AI</span>
        </Link>

        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          {['Product', 'Features', 'Pricing', 'Docs'].map(l => (
            <Link key={l} href="#" style={{ fontSize: 13, color: 'var(--secondary-text)', textDecoration: 'none' }}>
              {l}
            </Link>
          ))}
        </div>

        <div style={{ flex: 1 }} />
        <Link href="/app/proj_demo_001" className="btn btn-secondary btn-sm">Sign in</Link>
        <Link href="/app/proj_demo_001/runs/new" className="btn btn-primary btn-sm">Get started →</Link>
      </nav>

      {/* ── HERO ──────────────────────────────────────────────────── */}
      <section
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          minHeight: 'calc(100dvh - 56px)',
          padding: '80px 32px 100px',
          overflow: 'hidden',
        }}
        aria-labelledby="hero-heading"
      >
        {/* Ambient particle canvas */}
        <LandingParticles />

        {/* Content — above particles */}
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 740, margin: '0 auto' }}>
          {/* Pill badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            padding: '4px 14px', borderRadius: 999, marginBottom: 32,
            background: 'rgba(0,229,153,0.08)',
            border: '1px solid rgba(0,229,153,0.25)',
          }}>
            <span className="dot dot-running" style={{ width: 7, height: 7 }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--active-green)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Agentic QA · Evidence-first
            </span>
          </div>

          {/* Headline */}
          <h1
            id="hero-heading"
            style={{
              fontSize: 'clamp(3rem, 6vw, 4.5rem)',
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: '-0.04em',
              margin: '0 0 24px',
            }}
          >
            QA that follows<br />
            <span style={{ color: 'var(--active-green)' }}>the Evidence.</span>
          </h1>

          {/* Subheadline */}
          <p style={{
            fontSize: 18, color: 'var(--secondary-text)',
            lineHeight: 1.7, maxWidth: 540, margin: '0 auto 44px',
          }}>
            Autonomous agents explore, reproduce, diagnose, and verify bugs in your web application.
            Every finding is backed by evidence you can inspect.
          </p>

          {/* CTA Buttons */}
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 64 }}>
            <Link href="/app/proj_demo_001/runs/new" className="btn btn-primary btn-xl">
              Start a Free Run →
            </Link>
            <Link href="/app/proj_demo_001/agent-office" className="btn btn-secondary btn-xl">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.3"/>
                <path d="M6.5 5.5l4 2.5-4 2.5V5.5z" fill="currentColor"/>
              </svg>
              Live Agent Office
            </Link>
          </div>

          {/* Proof strip */}
          <div style={{
            display: 'flex', gap: 32, justifyContent: 'center',
            flexWrap: 'wrap', paddingTop: 32,
            borderTop: '1px solid var(--border)',
          }}>
            {[
              { stat: '94%', label: 'Bug detection rate' },
              { stat: '< 3 min', label: 'Avg. time to first finding' },
              { stat: '6 agents', label: 'Specialized roles' },
              { stat: 'Zero config', label: 'Point at any URL' },
            ].map(({ stat, label }) => (
              <div key={stat} style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 22, fontWeight: 800, margin: '0 0 2px', letterSpacing: '-0.03em', color: 'var(--ivory)' }}>
                  {stat}
                </p>
                <p style={{ fontSize: 11, color: 'var(--secondary-text)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WORKFLOW SECTION ──────────────────────────────────────── */}
      <WorkflowSection />

      {/* ── SAMPLE FINDING ───────────────────────────────────────── */}
      <SampleFinding />

      {/* ── FOOTER ───────────────────────────────────────────────── */}
      <footer style={{
        borderTop: '1px solid var(--border)', padding: '40px 80px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 24,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="18" height="18" viewBox="0 0 22 22" fill="none" aria-hidden="true">
            <circle cx="11" cy="11" r="10" stroke="var(--active-green)" strokeWidth="1.5"/>
            <path d="M7 8l4 3-4 3" stroke="var(--active-green)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span style={{ fontSize: 13, color: 'var(--secondary-text)' }}>BugPilot AI — evidence-first autonomous QA</span>
        </div>
        <div style={{ display: 'flex', gap: 24 }}>
          {['Docs', 'GitHub', 'Security', 'Status', 'Contact'].map(l => (
            <Link key={l} href="#" style={{ fontSize: 12, color: 'var(--muted-text)', textDecoration: 'none' }}>{l}</Link>
          ))}
        </div>
        <p style={{ fontSize: 11, color: 'var(--muted-text)', margin: 0 }}>
          Built for hackathon demo · No real customer data
        </p>
      </footer>
    </div>
  );
}
"""

with open("app/page.tsx", "w", encoding="utf-8") as f:
    f.write(CONTENT)
print("Written OK")
