'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';

export function SignOutButton({ email }: { email?: string }) {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState('');

  const signOut = async () => {
    setError('');
    setIsSigningOut(true);
    try {
      const response = await fetch('/api/auth/session', {
        method: 'DELETE',
        credentials: 'same-origin',
      });
      if (!response.ok) throw new Error('Sign out failed.');
      router.replace('/sign-in');
      router.refresh();
    } catch {
      setIsSigningOut(false);
      setError('Could not sign out. Please try again.');
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' }}>
      {error && <span role="alert" style={{ color: 'var(--red)', fontSize: 12 }}>{error}</span>}
      {email && (
        <span className="app-user-email" style={{
          maxWidth: 220,
          overflow: 'hidden',
          color: 'var(--secondary-text)',
          fontSize: 12,
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {email}
        </span>
      )}
      <button
        className="btn btn-ghost btn-sm"
        type="button"
        title="Sign out"
        aria-label="Sign out"
        disabled={isSigningOut}
        onClick={() => void signOut()}
        style={{ padding: 6 }}
      >
        <LogOut size={15} color="var(--secondary-text)" />
      </button>
    </div>
  );
}
