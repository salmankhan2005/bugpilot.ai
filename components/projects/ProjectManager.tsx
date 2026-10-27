'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import type { UserProject } from '@/lib/firebase/projects';

type OriginChallenge = {
  id: string;
  origin: string;
  txtName: string;
  txtValue: string;
  expiresAt: string;
};

export function ProjectManager({ projects }: { projects: UserProject[] }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [environment, setEnvironment] = useState<UserProject['environment']>('staging');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState('');
  const [challenge, setChallenge] = useState<OriginChallenge | null>(null);
  const [checkingVerification, setCheckingVerification] = useState(false);

  async function requestDomainVerification() {
    setError('');
    setVerificationMessage('');
    setChallenge(null);
    try {
      const origin = new URL(targetUrl).origin;
      const response = await fetch('/api/verified-origins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin }),
      });
      const result = await response.json() as { challenge?: OriginChallenge; error?: string };
      if (!response.ok || !result.challenge) throw new Error(result.error || 'Could not start domain verification.');
      setChallenge(result.challenge);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not start domain verification.');
    }
  }

  async function checkDomainVerification() {
    if (!challenge) return;
    setCheckingVerification(true);
    setError('');
    setVerificationMessage('');
    try {
      const response = await fetch(`/api/verified-origins/${encodeURIComponent(challenge.id)}/verify`, {
        method: 'POST',
      });
      const result = await response.json() as { origin?: string; verified?: boolean; error?: string };
      if (!response.ok || !result.verified) throw new Error(result.error || 'Domain verification failed.');
      setVerificationMessage(`${result.origin} verified. You can now create a project for this origin.`);
      setChallenge(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not verify the domain.');
    } finally {
      setCheckingVerification(false);
    }
  }

  async function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, targetUrl, environment }),
      });
      const result = await response.json() as { project?: UserProject; error?: string };
      if (!response.ok || !result.project) throw new Error(result.error || 'Could not create the project.');
      router.push(`/app/${result.project.id}`);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not create the project.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: 'grid', gap: 24, maxWidth: 900 }}>
      {projects.length > 0 && (
        <section className="card" style={{ padding: 24 }}>
          <h2 style={{ margin: '0 0 16px', fontSize: 18 }}>Your projects</h2>
          <div style={{ display: 'grid', gap: 10 }}>
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/app/${project.id}`}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 16,
                  padding: 14,
                  color: 'var(--ivory)',
                  background: 'var(--surface-2)',
                  borderRadius: 8,
                  textDecoration: 'none',
                }}
              >
                <span>
                  <strong>{project.name}</strong>
                  <span style={{ display: 'block', marginTop: 4, color: 'var(--secondary-text)' }}>
                    {project.targetUrl}
                  </span>
                </span>
                <span style={{ color: 'var(--muted-text)' }}>{project.environment}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="card" style={{ padding: 24 }}>
        <h2 style={{ margin: '0 0 8px', fontSize: 18 }}>
          {projects.length ? 'Add a project' : 'Create your first project'}
        </h2>
        <p style={{ margin: '0 0 20px', color: 'var(--secondary-text)', fontSize: 14 }}>
          Add a site you own or are authorized to test.
        </p>
        <form onSubmit={createProject} style={{ display: 'grid', gap: 14 }}>
          <label style={{ display: 'grid', gap: 6, color: 'var(--secondary-text)', fontSize: 13 }}>
            Project name
            <input
              required
              maxLength={100}
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="organization"
              className="input"
            />
          </label>
          <label style={{ display: 'grid', gap: 6, color: 'var(--secondary-text)', fontSize: 13 }}>
            Target URL
            <input
              required
              type="url"
              value={targetUrl}
              onChange={(event) => {
                setTargetUrl(event.target.value);
                setChallenge(null);
                setVerificationMessage('');
              }}
              placeholder="https://staging.your-site.example"
              aria-describedby="project-target-help"
              className="input"
            />
          </label>
          <p id="project-target-help" style={{ margin: '-8px 0 0', color: 'var(--muted-text)', fontSize: 12 }}>
            Add an HTTPS site you own or are authorized to test. Local development sites can still use the exact-origin worker allowlist.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <button type="button" className="btn btn-secondary" onClick={() => void requestDomainVerification()} disabled={!targetUrl || saving || checkingVerification}>
              Verify website domain
            </button>
          </div>
          {challenge && (
            <section className="card" aria-live="polite" style={{ display: 'grid', gap: 12, padding: 16 }}>
              <p style={{ margin: 0, color: 'var(--secondary-text)', fontSize: 13 }}>
                Add this TXT record in the DNS settings for <strong>{challenge.origin}</strong>, then check verification. The challenge expires at {new Date(challenge.expiresAt).toLocaleString()}.
              </p>
              <label style={{ display: 'grid', gap: 6, color: 'var(--secondary-text)', fontSize: 12 }}>
                TXT record name
                <input readOnly value={challenge.txtName} className="input" />
              </label>
              <label style={{ display: 'grid', gap: 6, color: 'var(--secondary-text)', fontSize: 12 }}>
                TXT record value
                <input readOnly value={challenge.txtValue} className="input" />
              </label>
              <button type="button" className="btn btn-secondary" onClick={() => void checkDomainVerification()} disabled={checkingVerification}>
                {checkingVerification ? 'Checking DNS…' : 'Check DNS verification'}
              </button>
            </section>
          )}
          {verificationMessage && <p role="status" style={{ margin: 0, color: 'var(--sage)' }}>{verificationMessage}</p>}
          <label style={{ display: 'grid', gap: 6, color: 'var(--secondary-text)', fontSize: 13 }}>
            Environment
            <select
              value={environment}
              onChange={(event) => setEnvironment(event.target.value as UserProject['environment'])}
              className="input"
            >
              <option value="staging">Staging</option>
              <option value="preview">Preview</option>
              <option value="production">Production</option>
            </select>
          </label>
          {error && <p role="alert" style={{ margin: 0, color: 'var(--red)' }}>{error}</p>}
          <button type="submit" disabled={saving} className="btn btn-primary" style={{ justifySelf: 'start' }}>
            {saving ? 'Creating…' : 'Create project'}
          </button>
        </form>
      </section>
    </div>
  );
}
