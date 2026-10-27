'use client';

import { useEffect, useState } from 'react';
import type { UserProject } from '@/lib/firebase/projects';
import type { LocalProjectActivity } from '@/lib/local-worker/project-activity';
import type { LocalProjectFinding } from '@/lib/local-worker/project-findings';
import type { ProjectRouteCoverage } from '@/lib/local-worker/route-coverage';
import type { LocalProjectDashboardStats, LocalProjectRun } from '@/lib/local-worker/project-runs';

export interface ProjectDashboardData {
  project: UserProject;
  stats: LocalProjectDashboardStats;
  runs: LocalProjectRun[];
  findings: LocalProjectFinding[];
  coverage: ProjectRouteCoverage[];
  activity: LocalProjectActivity[];
  refreshedAt: string;
}

export function useProjectDashboard(projectId: string) {
  const [data, setData] = useState<ProjectDashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let timeout: ReturnType<typeof setTimeout>;
    let controller: AbortController | null = null;

    const refresh = async () => {
      controller = new AbortController();
      try {
        const response = await fetch(
          `/api/projects/${encodeURIComponent(projectId)}/dashboard`,
          { cache: 'no-store', signal: controller.signal },
        );
        const result = await response.json() as ProjectDashboardData & { error?: string };
        if (!response.ok) throw new Error(result.error || 'Could not load project data.');
        if (active) {
          setData(result);
          setError(null);
        }
      } catch (cause) {
        if (active && !(cause instanceof DOMException && cause.name === 'AbortError')) {
          setError(cause instanceof Error ? cause.message : 'Could not load project data.');
        }
      } finally {
        if (active) {
          setLoading(false);
          timeout = setTimeout(() => void refresh(), 4_000);
        }
      }
    };

    void refresh();
    return () => {
      active = false;
      clearTimeout(timeout);
      controller?.abort();
    };
  }, [projectId]);

  return { data, error, loading };
}
