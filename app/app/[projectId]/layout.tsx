import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import AppShell from '@/components/shell/AppShell';
import { getCurrentUser } from '@/lib/auth/current-user';
import { getUserProject } from '@/lib/firebase/projects';

export const dynamic = 'force-dynamic';

export default async function AppProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/sign-in?next=${encodeURIComponent(`/app/${projectId}`)}`);
  }

  const project = await getUserProject(user.uid, projectId);
  if (!project) notFound();

  return (
    <AppShell project={project} userEmail={user.email ?? undefined}>
      <Suspense fallback={<div style={{ padding: 32, color: 'var(--muted-text)' }}>Loading workspace…</div>}>
        {children}
      </Suspense>
    </AppShell>
  );
}
