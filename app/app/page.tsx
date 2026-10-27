import { redirect } from 'next/navigation';
import { ProjectManager } from '@/components/projects/ProjectManager';
import { getCurrentUser } from '@/lib/auth/current-user';
import { getFirebaseUserProfile, syncFirebaseUserProfile } from '@/lib/firebase/user-profile';
import { listUserProjects } from '@/lib/firebase/projects';


export const dynamic = 'force-dynamic';

export default async function ProjectsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/sign-in?next=%2Fapp');

  const [profile, projects] = await Promise.all([
    getFirebaseUserProfile(user.uid).then((storedProfile) =>
      storedProfile ?? syncFirebaseUserProfile(user),
    ),
    listUserProjects(user.uid),
  ]);

  return (
    <main style={{ minHeight: '100vh', padding: '40px 24px', background: 'var(--obsidian)', color: 'var(--ivory)' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <header style={{ marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <p style={{ margin: '0 0 8px', color: 'var(--secondary-text)' }}>
              Signed in as {profile.email ?? user.email}
            </p>
            <h1 style={{ margin: 0, fontSize: 30 }}>BugPilot workspace</h1>
          </div>
        </header>
        <ProjectManager projects={projects} />
      </div>
    </main>
  );
}
