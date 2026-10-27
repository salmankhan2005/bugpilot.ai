'use client';

import { use } from 'react';
import { PageHeader } from '@/components/ui/shared';
import { SavedJourneysPanel } from '@/components/journeys/SavedJourneysPanel';

export default function JourneysPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);

  return (
    <div style={{ paddingBottom: 64 }}>
      <PageHeader
        title="Journey Library"
        breadcrumb="Journeys"
        subtitle="Saved same-origin crawl presets"
      />
      <div style={{ padding: '24px 28px' }}>
        <SavedJourneysPanel projectId={projectId} />
      </div>
    </div>
  );
}
