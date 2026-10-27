'use client';

import { use } from 'react';
import LocalLiveRunRoom from '@/components/runs/LocalLiveRunRoom';

export default function LiveRunRoomPage({
  params,
}: {
  params: Promise<{ projectId: string; runId: string }>;
}) {
  const { projectId, runId } = use(params);
  return <LocalLiveRunRoom projectId={projectId} runId={runId} />;
}
