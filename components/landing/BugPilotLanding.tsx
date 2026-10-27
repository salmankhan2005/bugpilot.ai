'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Bug, Check } from 'lucide-react';
import { SonarBackground } from './SonarBackground';

const recordedOutput = [
  'Browser console errors',
  'Failed and unsuccessful network requests',
  'Run events and initial viewport screenshots',
];

export default function BugPilotLanding() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>('.bp-site');
    const elements = Array.from(document.querySelectorAll<HTMLElement>('.bp-reveal'));
    if (!root || !('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    root.dataset.motion = 'ready';
    elements.forEach((element) => observer.observe(element));
    return () => {
      observer.disconnect();
      delete root.dataset.motion;
    };
  }, []);

  return (
    <div className="bp-site">
      <header className="bp-header">
        <div className="bp-nav-wrap">
          <Link className="bp-brand" href="#top" aria-label="BugPilot home">
            <span className="bp-brand-mark" aria-hidden="true"><Bug size={17} strokeWidth={2.2} /></span>
            <span>BugPilot</span>
          </Link>
          <nav className="bp-nav" aria-label="Main navigation">
            <a href="#scope">What it records</a>
            <a href="#data">Your data</a>
            <a href="#limits">Current scope</a>
          </nav>
          <div className="bp-nav-actions">
            <Link className="bp-nav-signin" href="/sign-in">Sign in</Link>
            <Link className="bp-nav-signup" href="/sign-up">Create account</Link>
            <Link className="bp-nav-cta" href="/app">
              Open workspace <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="bp-hero bp-frame" id="top" aria-labelledby="bp-title">
          <SonarBackground />
          <div className="bp-hero-copy">
            <h1 id="bp-title">Test your own<br />web application.</h1>
            <p>
              Run a local Chromium session against a project you own. Review the
              browser events and screenshot saved from that run.
            </p>
            <div className="bp-hero-actions">
              <Link className="bp-button bp-button-primary" href="/app">
                Create a project <ArrowRight size={17} aria-hidden="true" />
              </Link>
              <Link className="bp-text-link" href="/sign-in">Sign in to your account</Link>
            </div>
          </div>

          <section className="bp-scope-panel bp-reveal" aria-label="Current local worker output">
            <h2>Recorded from each run</h2>
            <ul>
              {recordedOutput.map((item) => (
                <li key={item}><Check size={16} aria-hidden="true" />{item}</li>
              ))}
            </ul>
            <p>
              Projects and profiles are stored in Firebase. Runs, events, and screenshot artifacts
              are stored in Neon.
            </p>
          </section>
        </section>

        <section className="bp-section bp-frame" id="scope" aria-labelledby="scope-title">
          <div className="bp-section-intro bp-reveal">
            <h2 id="scope-title">See what the browser actually reported.</h2>
            <p>
              Each persisted run belongs to your signed-in account and project. Open its run room
              to inspect the real status, event stream, and captured artifact.
            </p>
          </div>
          <div className="bp-scope-columns bp-reveal">
            <article>
              <h3>Local execution</h3>
              <p>The Playwright worker runs on your development machine and uses Chromium.</p>
            </article>
            <article>
              <h3>Explicit target scope</h3>
              <p>Only verified website origins or locally allowlisted targets can be visited by the worker.</p>
            </article>
            <article>
              <h3>Account-owned records</h3>
              <p>Project and run lookups are scoped to the Firebase account that created them.</p>
            </article>
          </div>
        </section>

        <section className="bp-section bp-frame" id="data" aria-labelledby="data-title">
          <div className="bp-section-intro bp-reveal">
            <h2 id="data-title">Your records, not sample records.</h2>
            <p>
              Create a project with your own target URL. BugPilot does not prefill fabricated
              projects, findings, activity, routes, or integration statuses.
            </p>
          </div>
          <div className="bp-data-note bp-reveal">
            <p>
              Your workspace keeps its real runs, browser evidence, detected findings, route
              coverage, and reusable journey presets. Empty states appear only when there is no
              project data yet.
            </p>
            <Link className="bp-inline-link" href="/app">
              Go to your workspace <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
        </section>

        <section className="bp-section bp-frame" id="limits" aria-labelledby="limits-title">
          <div className="bp-section-intro bp-reveal">
            <h2 id="limits-title">Current worker scope</h2>
            <p>
              Run creation is development-only and requires the local worker, Neon, Redis, and an
              explicitly allowed target origin.
            </p>
          </div>
          <div className="bp-data-note bp-reveal">
            <p>
              A run goal is context only; the worker does not execute scripted clicks or forms.
              Authenticated target sessions and integration delivery are not available yet.
            </p>
            <Link className="bp-inline-link" href="/sign-up">
              Create your account <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="bp-footer bp-frame">
        <div className="bp-footer-main">
          <Link className="bp-brand bp-footer-brand" href="#top">
            <span className="bp-brand-mark" aria-hidden="true"><Bug size={15} /></span>
            <span>BugPilot</span>
          </Link>
          <p>Local-first browser QA with inspectable run evidence.</p>
          <Link href="/sign-in" className="bp-back-top">Sign in <ArrowUpRight size={15} /></Link>
        </div>
        <span className="bp-footer-wordmark">BugPilot</span>
      </footer>
    </div>
  );
}
