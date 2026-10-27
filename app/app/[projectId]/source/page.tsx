'use client';

import { use, useEffect, useState } from 'react';
import { GitBranch, ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/ui/shared';
import type { UserProject } from '@/lib/firebase/projects';

export default function SourcePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  const [project, setProject] = useState<UserProject | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/projects/${encodeURIComponent(projectId)}`, {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (response) => {
        const result = await response.json() as { project?: UserProject; error?: string };
        if (!response.ok || !result.project) throw new Error(result.error || 'Could not load this project.');
        setProject(result.project);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Could not load this project.');
      });
    return () => controller.abort();
  }, [projectId]);

  return (
    <div style={{ paddingBottom: 64 }}>
      <PageHeader
        title="Source Repository & Security Boundaries"
        breadcrumb="Source Context"
        subtitle="Repository integrations are not configured for this project."
      />
      <div style={{ padding: '24px 28px', display: 'grid', gap: 18 }}>
        {error && <p role="alert" className="card" style={{ padding: 14, color: 'var(--red)' }}>{error}</p>}
        <section className="card" style={{ padding: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <GitBranch size={16} color="var(--muted-text)" />
            <h2 style={{ margin: 0, fontSize: 16 }}>Repository connection</h2>
          </div>
          <p style={{ margin: '0 0 16px', color: 'var(--secondary-text)', fontSize: 13 }}>
            No GitHub repository or branch is linked. Repository metadata, patch proposals, and pull requests are not available in the current backend.
          </p>
          <div style={{ padding: 14, background: 'var(--surface-2)', borderRadius: 8, display: 'grid', gap: 5 }}>
            <span style={{ color: 'var(--muted-text)', fontSize: 11, textTransform: 'uppercase' }}>Configured project target</span>
            <span style={{ color: 'var(--ivory)', overflowWrap: 'anywhere' }}>{project?.targetUrl ?? 'Loading project…'}</span>
          </div>
        </section>

        <section className="card" style={{ padding: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <ShieldCheck size={16} color="var(--sage)" />
            <h2 style={{ margin: 0, fontSize: 16 }}>Current browser boundary</h2>
          </div>
          <p style={{ margin: 0, color: 'var(--secondary-text)', fontSize: 13, lineHeight: 1.6 }}>
            Runs are limited to the project&apos;s verified website origin and the local worker&apos;s network checks. Code repository access, patch application, and editable project guardrails are not currently persisted or enforced by the backend.
          </p>
        </section>
      </div>
    </div>
  );
}
