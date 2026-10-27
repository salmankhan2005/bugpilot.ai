'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { Trash2 } from 'lucide-react';
import type { SavedJourney } from '@/lib/local-worker/journeys';

export function SavedJourneysPanel({ projectId }: { projectId: string }) {
  const [journeys, setJourneys] = useState<SavedJourney[]>([]);
  const [name, setName] = useState('');
  const [startPath, setStartPath] = useState('/');
  const [goal, setGoal] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const endpoint = `/api/projects/${encodeURIComponent(projectId)}/journeys`;

  useEffect(() => {
    const controller = new AbortController();
    void fetch(endpoint, { signal: controller.signal, cache: 'no-store' })
      .then(async (response) => {
        const result = await response.json() as { journeys?: SavedJourney[]; error?: string };
        if (!response.ok || !result.journeys) throw new Error(result.error || 'Could not load journeys.');
        setJourneys(result.journeys);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : 'Could not load journeys.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [endpoint]);

  async function saveJourney(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, startPath, goal }),
      });
      const result = await response.json() as { journey?: SavedJourney; error?: string };
      const savedJourney = result.journey;
      if (!response.ok || !savedJourney) throw new Error(result.error || 'Could not save journey.');
      setJourneys((current) => [savedJourney, ...current]);
      setName('');
      setStartPath('/');
      setGoal('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save journey.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteJourney(journeyId: string) {
    setDeletingId(journeyId);
    setError('');
    try {
      const response = await fetch(`${endpoint}/${encodeURIComponent(journeyId)}`, { method: 'DELETE' });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || 'Could not delete journey.');
      setJourneys((current) => current.filter((journey) => journey.id !== journeyId));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not delete journey.');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <form className="card" onSubmit={saveJourney} style={{ display: 'grid', gap: 14, padding: 22 }}>
        <h2 style={{ margin: 0, fontSize: 17 }}>Save a crawl preset</h2>
        <label style={{ display: 'grid', gap: 6, color: 'var(--secondary-text)', fontSize: 13 }}>
          Name
          <input required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} className="input" />
        </label>
        <label style={{ display: 'grid', gap: 6, color: 'var(--secondary-text)', fontSize: 13 }}>
          Start path
          <input required maxLength={2048} value={startPath} onChange={(event) => setStartPath(event.target.value)} className="input" placeholder="/" />
        </label>
        <label style={{ display: 'grid', gap: 6, color: 'var(--secondary-text)', fontSize: 13 }}>
          Objective
          <textarea required maxLength={2000} rows={3} value={goal} onChange={(event) => setGoal(event.target.value)} className="input" placeholder="What should this run check?" />
        </label>
        <p style={{ margin: 0, color: 'var(--muted-text)', fontSize: 12 }}>
          Running a preset starts the existing same-origin crawl at this path. The objective is saved as context; scripted clicks and form actions are not executed.
        </p>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save preset'}
        </button>
      </form>

      {error && <p role="alert" className="card" style={{ margin: 0, padding: 16, color: 'var(--red)' }}>{error}</p>}
      {loading ? (
        <p className="card" style={{ margin: 0, padding: 20, color: 'var(--muted-text)' }}>Loading saved journeys…</p>
      ) : journeys.length === 0 ? (
        <section className="card" style={{ padding: 22 }}>
          <h2 style={{ margin: '0 0 8px', fontSize: 16 }}>No saved journeys</h2>
          <p style={{ margin: 0, color: 'var(--secondary-text)' }}>Create a crawl preset above to reuse its start path and objective.</p>
        </section>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {journeys.map((journey) => (
            <section key={journey.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: 20 }}>
              <div>
                <h2 style={{ margin: '0 0 6px', fontSize: 16 }}>{journey.name}</h2>
                <p style={{ margin: '0 0 6px', color: 'var(--secondary-text)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{journey.startPath}</p>
                <p style={{ margin: 0, color: 'var(--muted-text)', fontSize: 13 }}>{journey.goal}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                <Link
                  className="btn btn-primary"
                  href={`/app/${encodeURIComponent(projectId)}/runs/new?url=${encodeURIComponent(journey.startUrl)}&goal=${encodeURIComponent(journey.goal)}`}
                >
                  Start run
                </Link>
                <button
                  className="btn btn-ghost"
                  type="button"
                  aria-label={`Delete ${journey.name}`}
                  disabled={deletingId === journey.id}
                  onClick={() => void deleteJourney(journey.id)}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
