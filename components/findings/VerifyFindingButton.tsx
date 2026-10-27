'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, RotateCcw } from 'lucide-react';

export default function VerifyFindingButton({
  projectId,
  findingId,
}: {
  projectId: string;
  findingId: string;
}) {
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');

  async function startVerification() {
    setStarting(true);
    setError('');
    try {
      const response = await fetch(
        `/api/local/projects/${encodeURIComponent(projectId)}/findings/${encodeURIComponent(findingId)}/verify`,
        { method: 'POST' },
      );
      const result = await response.json() as { runId?: string; error?: string };
      if (!response.ok || !result.runId) {
        throw new Error(result.error || 'Could not start verification.');
      }
      router.push(`/app/${encodeURIComponent(projectId)}/runs/${encodeURIComponent(result.runId)}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not start verification.');
      setStarting(false);
    }
  }

  return (
    <div style={{ display: 'grid', gap: 8, justifyItems: 'start' }}>
      <button
        type="button"
        onClick={() => void startVerification()}
        disabled={starting}
        className="btn btn-primary btn-sm"
      >
        {starting ? <Loader2 size={14} className="spin" /> : <RotateCcw size={14} />}
        {starting ? 'Starting verification…' : 'Run fresh verification'}
      </button>
      {error && <p role="alert" style={{ margin: 0, color: 'var(--red)', fontSize: 12 }}>{error}</p>}
    </div>
  );
}
