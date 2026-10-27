'use client';

import { use, useEffect, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, CheckCircle2, Loader2, Shield } from 'lucide-react';
import { PageHeader } from '@/components/ui/shared';
import type { UserProject } from '@/lib/firebase/projects';

type PreflightResult = {
  success: boolean;
  checks: { name: string; ok: boolean; detail: string }[];
};

interface RunFieldValue {
  label: string;
  value: string;
}

export default function NewRunPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialUrl = searchParams.get('url') ?? '';
  const [url, setUrl] = useState(initialUrl);
  const [goal, setGoal] = useState(searchParams.get('goal') ?? '');
  const [fieldValues, setFieldValues] = useState<RunFieldValue[]>([{ label: '', value: '' }]);
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [maxDuration, setMaxDuration] = useState(15);
  const [maxPages, setMaxPages] = useState(20);
  const [project, setProject] = useState<UserProject | null>(null);
  const [projectError, setProjectError] = useState('');
  const [error, setError] = useState('');
  const [preflight, setPreflight] = useState<PreflightResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/projects/${encodeURIComponent(projectId)}`, {
      signal: controller.signal,
      cache: 'no-store',
    })
      .then(async (response) => {
        const result = await response.json() as { project?: UserProject; error?: string };
        if (!response.ok || !result.project) throw new Error(result.error || 'Could not load this project.');
        setProject(result.project);
        if (!initialUrl) setUrl(result.project.targetUrl);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setProjectError(cause instanceof Error ? cause.message : 'Could not load this project.');
        }
      });
    return () => controller.abort();
  }, [initialUrl, projectId]);

  async function runPreflight() {
    setChecking(true);
    setError('');
    setPreflight(null);
    try {
      const response = await fetch('/api/local/preflight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, url }),
      });
      const result = await response.json() as PreflightResult & { error?: string };
      if (!response.ok) throw new Error(result.error || 'Preflight failed.');
      setPreflight(result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Preflight failed.');
    } finally {
      setChecking(false);
    }
  }

  async function startRun(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStarting(true);
    setError('');
    try {
      const response = await fetch('/api/local/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          targetUrl: url,
          goal,
          fieldValues: fieldValues.filter((field) => field.label.trim() || field.value),
          viewport,
          browser: 'chromium',
          maxDurationMinutes: maxDuration,
          maxPages,
        }),
      });
      const result = await response.json() as { runId?: string; error?: string };
      if (!response.ok || !result.runId) throw new Error(result.error || 'Could not start the run.');
      router.push(`/app/${projectId}/runs/${result.runId}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not start the run.');
      setStarting(false);
    }
  }

  const base = `/app/${projectId}`;

  return (
    <div style={{ paddingBottom: 64 }}>
      <PageHeader title="Start a run" breadcrumb="Runs / New" subtitle={project?.name ?? 'Loading project…'} />
      <div style={{ maxWidth: 820, margin: '24px auto', padding: '0 24px' }}>
        {projectError && <p role="alert" style={{ color: 'var(--red)' }}>{projectError}</p>}
        <form onSubmit={startRun} style={{ display: 'grid', gap: 18 }}>
          <section className="card" style={{ padding: 22, display: 'grid', gap: 16 }}>
            <label style={{ display: 'grid', gap: 7, color: 'var(--secondary-text)', fontSize: 13 }}>
              Target URL
              <input
                required
                type="url"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                disabled={!project || starting}
                aria-describedby="run-target-help"
                className="input"
              />
            </label>
            <p id="run-target-help" style={{ margin: '-8px 0 0', color: 'var(--muted-text)', fontSize: 12 }}>
              The target must match this project&apos;s verified origin. Public domains need DNS ownership verification; local development origins can use
              {' '}<code>LOCAL_WORKER_ALLOWED_ORIGINS</code>.
            </p>
            <label style={{ display: 'grid', gap: 7, color: 'var(--secondary-text)', fontSize: 13 }}>
              What should the run check?
              <textarea
                required
                minLength={1}
                maxLength={2000}
                rows={4}
                value={goal}
                onChange={(event) => setGoal(event.target.value)}
                placeholder="Describe the real workflow or behavior you want checked."
                disabled={starting}
                className="input"
              />
              <span style={{ marginTop: -8, color: 'var(--muted-text)', fontSize: 12 }}>
                For values in the goal, add a separate block with one <code>Field label = value</code> per line after <code>Values to enter:</code>. Structured values below override matching goal values.
              </span>
            </label>
            <fieldset style={{ display: 'grid', gap: 10, padding: 14, border: '1px solid var(--border)', borderRadius: 8 }}>
              <legend style={{ padding: '0 6px', color: 'var(--secondary-text)', fontSize: 13 }}>Values to enter and validate</legend>
              <p style={{ margin: 0, color: 'var(--muted-text)', fontSize: 12, lineHeight: 1.5 }}>
                The worker finds form controls by their accessible label, moves the Chromium pointer to each one, enters the value, and verifies the value and native field validity. It will not submit the form. Values are stored with the run; do not enter passwords, payment details, or other secrets.
              </p>
              {fieldValues.map((field, index) => (
                <div key={index} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) auto', gap: 8 }}>
                  <input
                    aria-label={`Field ${index + 1} accessible label`}
                    placeholder="Accessible label (e.g. Email)"
                    value={field.label}
                    maxLength={100}
                    disabled={starting}
                    className="input"
                    onChange={(event) => setFieldValues((current) => current.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, label: event.target.value } : item))}
                  />
                  <input
                    aria-label={`Field ${index + 1} value`}
                    placeholder="Value to enter"
                    value={field.value}
                    maxLength={500}
                    disabled={starting}
                    className="input"
                    onChange={(event) => setFieldValues((current) => current.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, value: event.target.value } : item))}
                  />
                  <button
                    type="button"
                    className="btn btn-ghost"
                    aria-label={`Remove field ${index + 1}`}
                    disabled={starting || fieldValues.length === 1}
                    onClick={() => setFieldValues((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="btn btn-ghost"
                disabled={starting || fieldValues.length >= 20}
                onClick={() => setFieldValues((current) => [...current, { label: '', value: '' }])}
                style={{ justifySelf: 'start' }}
              >
                Add labeled value
              </button>
            </fieldset>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
              <label style={{ display: 'grid', gap: 7, color: 'var(--secondary-text)', fontSize: 13 }}>
                Viewport
                <select value={viewport} onChange={(event) => setViewport(event.target.value as typeof viewport)} className="input">
                  <option value="desktop">Desktop</option>
                  <option value="tablet">Tablet</option>
                  <option value="mobile">Mobile</option>
                </select>
              </label>
              <label style={{ display: 'grid', gap: 7, color: 'var(--secondary-text)', fontSize: 13 }}>
                Time limit
                <select value={maxDuration} onChange={(event) => setMaxDuration(Number(event.target.value))} className="input">
                  <option value={5}>5 minutes</option>
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                </select>
              </label>
              <label style={{ display: 'grid', gap: 7, color: 'var(--secondary-text)', fontSize: 13 }}>
                Page limit
                <select value={maxPages} onChange={(event) => setMaxPages(Number(event.target.value))} className="input">
                  <option value={10}>10 pages</option>
                  <option value={20}>20 pages</option>
                  <option value={50}>50 pages</option>
                </select>
              </label>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              <button type="button" onClick={runPreflight} disabled={!url || checking || starting} className="btn btn-secondary">
                {checking ? <Loader2 size={15} className="spin" /> : <Shield size={15} />}
                Check target
              </button>
              <button type="submit" disabled={!project || starting} className="btn btn-primary">
                {starting ? 'Starting…' : 'Start local run'}
              </button>
              <Link href={`${base}/runs`} className="btn btn-ghost">Cancel</Link>
            </div>
          </section>
        </form>

        {error && <p role="alert" style={{ color: 'var(--red)', marginTop: 16 }}>{error}</p>}
        {preflight && (
          <section className="card" aria-live="polite" style={{ marginTop: 16, padding: 18 }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 12px', fontSize: 16 }}>
              {preflight.success
                ? <CheckCircle2 size={17} color="var(--sage)" />
                : <AlertCircle size={17} color="var(--red)" />}
              Target check {preflight.success ? 'passed' : 'failed'}
            </h2>
            <ul style={{ margin: 0, paddingLeft: 20, color: 'var(--secondary-text)' }}>
              {preflight.checks.map((check) => (
                <li key={check.name} style={{ marginTop: 6 }}>
                  <strong>{check.name}:</strong> {check.detail}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
