'use client';

import { use, useEffect, useState, type FormEvent } from 'react';
import { PageHeader } from '@/components/ui/shared';
import type { UserProject } from '@/lib/firebase/projects';

export default function SettingsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  const [project, setProject] = useState<UserProject | null>(null);
  const [name, setName] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [environment, setEnvironment] = useState<UserProject['environment']>('staging');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

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
        setName(result.project.name);
        setTargetUrl(result.project.targetUrl);
        setEnvironment(result.project.environment);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : 'Could not load this project.');
        }
      });
    return () => controller.abort();
  }, [projectId]);

  async function saveProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, targetUrl, environment }),
      });
      const result = await response.json() as { project?: UserProject; error?: string };
      if (!response.ok || !result.project) throw new Error(result.error || 'Could not save project settings.');
      setProject(result.project);
      setSaved(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save project settings.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ paddingBottom: 64 }}>
      <PageHeader title="Project settings" breadcrumb="Settings" subtitle="Edit this project’s saved configuration." />
      <div style={{ maxWidth: 820, margin: '24px auto', padding: '0 24px' }}>
        <form onSubmit={saveProject} className="card" style={{ padding: 22, display: 'grid', gap: 16 }}>
          <label style={{ display: 'grid', gap: 7, color: 'var(--secondary-text)', fontSize: 13 }}>
            Project name
            <input
              required
              maxLength={100}
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={!project || saving}
              className="input"
            />
          </label>
          <label style={{ display: 'grid', gap: 7, color: 'var(--secondary-text)', fontSize: 13 }}>
            Target URL
            <input
              required
              type="url"
              value={targetUrl}
              onChange={(event) => setTargetUrl(event.target.value)}
              disabled={!project || saving}
              aria-describedby="settings-target-help"
              className="input"
            />
          </label>
          <label style={{ display: 'grid', gap: 7, color: 'var(--secondary-text)', fontSize: 13 }}>
            Environment
            <select
              value={environment}
              onChange={(event) => setEnvironment(event.target.value as UserProject['environment'])}
              disabled={!project || saving}
              className="input"
            >
              <option value="staging">Staging</option>
              <option value="preview">Preview</option>
              <option value="production">Production</option>
            </select>
          </label>
          <p id="settings-target-help" style={{ margin: 0, color: 'var(--muted-text)', fontSize: 12 }}>
            The target origin must be verified for your account or explicitly listed in the local worker allowlist.
          </p>
          {error && <p role="alert" style={{ margin: 0, color: 'var(--red)' }}>{error}</p>}
          {saved && <p role="status" style={{ margin: 0, color: 'var(--sage)' }}>Project settings saved.</p>}
          <button type="submit" disabled={!project || saving} className="btn btn-primary" style={{ justifySelf: 'start' }}>
            {saving ? 'Saving…' : 'Save settings'}
          </button>
        </form>
      </div>
    </div>
  );
}
