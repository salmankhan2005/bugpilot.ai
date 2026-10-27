import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/ui/shared';
import { getCurrentUser } from '@/lib/auth/current-user';
import { getFirebaseUserProfile, syncFirebaseUserProfile } from '@/lib/firebase/user-profile';

export const dynamic = 'force-dynamic';

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/sign-in?next=${encodeURIComponent(`/app/${projectId}/profile`)}`);
  }

  const profile = await getFirebaseUserProfile(user.uid) ?? await syncFirebaseUserProfile(user);
  const displayName = profile.displayName || 'Name not provided';
  const initials = (profile.displayName || profile.email || '?')
    .trim()
    .slice(0, 1)
    .toLocaleUpperCase();

  return (
    <div style={{ paddingBottom: 80 }}>
      <PageHeader
        title="Account profile"
        breadcrumb="Profile"
        subtitle="Your BugPilot identity and sign-in details."
      />

      <div style={{ maxWidth: 900, margin: '28px auto', padding: '0 24px' }}>
        <section className="card" aria-labelledby="profile-identity-heading" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              aria-hidden="true"
              style={{
                width: 56,
                height: 56,
                flex: '0 0 56px',
                display: 'grid',
                placeItems: 'center',
                borderRadius: '50%',
                background: 'var(--surface-2)',
                color: 'var(--ivory)',
                fontSize: 20,
                fontWeight: 600,
              }}
            >
              {initials}
            </div>
            <div style={{ minWidth: 0 }}>
              <h2 id="profile-identity-heading" style={{ margin: 0, fontSize: 18 }}>
                {displayName}
              </h2>
              <p style={{ margin: '5px 0 0', color: 'var(--secondary-text)', overflowWrap: 'anywhere' }}>
                {profile.email ?? 'Email not provided'}
              </p>
            </div>
          </div>

          <div style={{ marginTop: 28 }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 15 }}>Sign-in details</h3>
            <dl style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
              gap: 1,
              margin: 0,
              background: 'var(--border)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              overflow: 'hidden',
            }}>
              <ProfileDetail label="Email address" value={profile.email ?? 'Not provided'} />
              <ProfileDetail
                label="Email status"
                value={profile.emailVerified ? 'Verified' : 'Not verified'}
              />
              <ProfileDetail
                label="Sign-in method"
                value={getSignInMethodLabel(profile.signInProvider)}
              />
              <ProfileDetail label="Firebase user ID" value={profile.uid} isIdentifier />
            </dl>
          </div>

          <p style={{
            margin: '20px 0 0',
            color: 'var(--secondary-text)',
            fontSize: 13,
            lineHeight: 1.5,
          }}>
            Passwords are managed by Firebase Authentication and are never stored or displayed by BugPilot.
          </p>
        </section>
      </div>
    </div>
  );
}

function ProfileDetail({
  label,
  value,
  isIdentifier = false,
}: {
  label: string;
  value: string;
  isIdentifier?: boolean;
}) {
  return (
    <div style={{ minWidth: 0, padding: 16, background: 'var(--surface-1)' }}>
      <dt style={{ marginBottom: 6, color: 'var(--secondary-text)', fontSize: 12 }}>
        {label}
      </dt>
      <dd style={{
        margin: 0,
        color: 'var(--ivory)',
        fontSize: 14,
        fontFamily: isIdentifier ? 'monospace' : undefined,
        overflowWrap: 'anywhere',
      }}>
        {value}
      </dd>
    </div>
  );
}

function getSignInMethodLabel(provider: string | null): string {
  if (provider === 'google.com') return 'Google';
  if (provider === 'password') return 'Email and password';
  return provider ?? 'Not available';
}
