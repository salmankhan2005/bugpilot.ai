'use client';

import { useCallback, useEffect, useState } from 'react';
import { BrainCircuit, Loader2, RotateCcw } from 'lucide-react';
import type { FindingDiagnosis } from '@/lib/local-worker/diagnosis-schema';

interface Diagnosis {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  summary: string | null;
  hypotheses: FindingDiagnosis['hypotheses'];
  nextChecks: string[];
  limitations: string[];
  model: string | null;
  failureReason: string | null;
  createdAt?: string;
  finishedAt?: string | null;
}

export default function FindingDiagnosisPanel({
  projectId,
  findingId,
}: {
  projectId: string;
  findingId: string;
}) {
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const endpoint = `/api/local/projects/${encodeURIComponent(projectId)}/findings/${encodeURIComponent(findingId)}/diagnosis`;

  const loadDiagnosis = useCallback(async () => {
    const response = await fetch(endpoint, { cache: 'no-store' });
    const result = await response.json() as { diagnosis?: Diagnosis | null; error?: string };
    if (!response.ok) throw new Error(result.error || 'Could not load diagnosis.');
    setDiagnosis(result.diagnosis ?? null);
  }, [endpoint]);

  useEffect(() => {
    let active = true;
    void fetch(endpoint, { cache: 'no-store' })
      .then(async (response) => {
        const result = await response.json() as { diagnosis?: Diagnosis | null; error?: string };
        if (!response.ok) throw new Error(result.error || 'Could not load diagnosis.');
        if (active) setDiagnosis(result.diagnosis ?? null);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Could not load diagnosis.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [endpoint]);

  useEffect(() => {
    if (!diagnosis || !['pending', 'running'].includes(diagnosis.status)) return;
    let active = true;
    const timer = setInterval(() => {
      void loadDiagnosis().catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Could not refresh diagnosis.');
      });
    }, 2500);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [diagnosis, loadDiagnosis]);

  async function requestDiagnosis() {
    setStarting(true);
    setError('');
    try {
      const response = await fetch(endpoint, { method: 'POST' });
      const result = await response.json() as { diagnosis?: Diagnosis; error?: string };
      if (!response.ok || !result.diagnosis) {
        throw new Error(result.error || 'Could not start diagnosis.');
      }
      setDiagnosis(result.diagnosis);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not start diagnosis.');
    } finally {
      setStarting(false);
    }
  }

  const busy = starting || diagnosis?.status === 'pending' || diagnosis?.status === 'running';
  return (
    <section className="card" style={{ padding: 24, display: 'grid', gap: 14 }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <BrainCircuit size={17} color="var(--sage)" />
          AI-assisted diagnosis
        </h2>
        <p style={{ margin: '6px 0 0', color: 'var(--secondary-text)', fontSize: 13 }}>
          Generates evidence-linked hypotheses and suggested checks. This is unverified guidance, not a confirmed root cause or code patch.
        </p>
      </div>

      {diagnosis?.status === 'completed' && diagnosis.summary && (
        <div style={{ display: 'grid', gap: 14 }}>
          <div>
            <p style={{ margin: 0, color: 'var(--ivory)', fontSize: 14, lineHeight: 1.6 }}>{diagnosis.summary}</p>
            {diagnosis.model && (
              <p style={{ margin: '6px 0 0', color: 'var(--muted-text)', fontSize: 11 }}>
                Model: <code className="mono">{diagnosis.model}</code> · Unverified
              </p>
            )}
          </div>

          {diagnosis.hypotheses.length > 0 && (
            <div>
              <h3 style={{ margin: '0 0 8px', fontSize: 13 }}>Possible explanations</h3>
              <ul style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 8 }}>
                {diagnosis.hypotheses.map((hypothesis, index) => (
                  <li key={`${index}-${hypothesis.claim}`} style={{ color: 'var(--secondary-text)', fontSize: 13 }}>
                    {hypothesis.claim}
                    <span style={{ display: 'block', marginTop: 3, color: 'var(--muted-text)', fontSize: 11 }}>
                      Confidence: {Math.round(hypothesis.confidence * 100)}% · Evidence: {hypothesis.evidenceRefs.join(', ') || 'none cited'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {diagnosis.nextChecks.length > 0 && (
            <div>
              <h3 style={{ margin: '0 0 8px', fontSize: 13 }}>Suggested checks</h3>
              <ul style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 6 }}>
                {diagnosis.nextChecks.map((check) => (
                  <li key={check} style={{ color: 'var(--secondary-text)', fontSize: 13 }}>{check}</li>
                ))}
              </ul>
            </div>
          )}

          {diagnosis.limitations.length > 0 && (
            <p style={{ margin: 0, color: 'var(--muted-text)', fontSize: 12 }}>
              Limitations: {diagnosis.limitations.join(' ')}
            </p>
          )}
        </div>
      )}

      {(diagnosis?.status === 'pending' || diagnosis?.status === 'running') && (
        <p role="status" style={{ margin: 0, color: 'var(--secondary-text)', fontSize: 13 }}>
          <Loader2 size={14} className="spin" style={{ verticalAlign: 'middle', marginRight: 7 }} />
          {diagnosis.status === 'pending' ? 'Waiting for the local worker…' : 'Reviewing the recorded evidence…'}
        </p>
      )}

      {diagnosis?.status === 'failed' && (
        <p role="alert" style={{ margin: 0, color: 'var(--red)', fontSize: 13 }}>
          {diagnosis.failureReason || 'Diagnosis failed. The original finding and evidence are unchanged.'}
        </p>
      )}

      {error && <p role="alert" style={{ margin: 0, color: 'var(--red)', fontSize: 13 }}>{error}</p>}
      {!loading && diagnosis?.status !== 'completed' && !busy && (
        <button type="button" onClick={() => void requestDiagnosis()} className="btn btn-secondary btn-sm" style={{ width: 'fit-content' }}>
          {diagnosis?.status === 'failed' ? <RotateCcw size={14} /> : <BrainCircuit size={14} />}
          {diagnosis?.status === 'failed' ? 'Retry diagnosis' : 'Generate diagnosis'}
        </button>
      )}
      {loading && (
        <p style={{ margin: 0, color: 'var(--muted-text)', fontSize: 12 }}>Checking for a saved diagnosis…</p>
      )}
    </section>
  );
}
