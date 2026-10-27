'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useState, type FormEvent } from 'react';
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  inMemoryPersistence,
  sendPasswordResetEmail,
  setPersistence,
  signInWithPopup,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type Auth,
  type User,
} from '@firebase/auth';
import {
  ArrowRight,
  Bug,
  LoaderCircle,
} from 'lucide-react';
import { getSafeRedirectPath } from '@/lib/auth/session-security';
import { getFirebaseAuth } from '@/lib/firebase/client';

type AuthPageProps = {
  mode: 'sign-in' | 'sign-up';
  redirectTo: string;
};

export function AuthPage({ mode, redirectTo }: AuthPageProps) {
  const router = useRouter();
  const isSignUp = mode === 'sign-up';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);

  const finishAuthentication = useCallback(async (auth: Auth, user: User) => {
    try {
      await createServerSession(user);
    } catch (error) {
      try {
        await signOut(auth);
      } catch (cleanupError) {
        console.error('Could not clear Firebase client auth state after session creation failed.', cleanupError);
      }
      throw error;
    }

    try {
      await signOut(auth);
    } catch (error) {
      console.error('Could not clear Firebase client auth state after session creation.', error);
    }

    router.replace(getSafeRedirectPath(redirectTo));
  }, [redirectTo, router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setNotice('');
    setIsSubmitting(true);

    let auth;
    try {
      auth = getFirebaseAuth();
      await setPersistence(auth, inMemoryPersistence);
      const credential = isSignUp
        ? await createUserWithEmailAndPassword(auth, email.trim(), password)
        : await signInWithEmailAndPassword(auth, email.trim(), password);

      if (isSignUp && name.trim()) {
        await updateProfile(credential.user, { displayName: name.trim() });
      }

      await finishAuthentication(auth, credential.user);
    } catch (cause) {
      logAuthFailure(cause);
      setError(getAuthErrorMessage(cause));
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setNotice('');
    setIsSubmitting(true);

    try {
      const auth = getFirebaseAuth();
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await setPersistence(auth, inMemoryPersistence);
      const result = await signInWithPopup(auth, provider);
      await finishAuthentication(auth, result.user);
    } catch (cause) {
      logAuthFailure(cause);
      setError(getAuthErrorMessage(cause));
      setIsSubmitting(false);
    }
  };

  const handlePasswordReset = async () => {
    setError('');
    setNotice('');
    if (!email.trim()) {
      setError('Enter your email address first.');
      return;
    }

    setIsSendingReset(true);
    try {
      const auth = getFirebaseAuth();
      await sendPasswordResetEmail(auth, email.trim());
      setNotice('If an account exists for that address, a password reset email has been sent.');
    } catch (cause) {
      setError(getAuthErrorMessage(cause));
    } finally {
      setIsSendingReset(false);
    }
  };

  return (
    <main className="bp-auth">
      <section className="bp-auth-proof" aria-labelledby="bp-auth-proof-title">
        <header className="bp-auth-header">
          <Link className="bp-auth-brand" href="/" aria-label="BugPilot home">
            <span className="bp-auth-brand-mark" aria-hidden="true">
              <Bug size={18} strokeWidth={2.2} />
            </span>
            <span>BugPilot</span>
          </Link>
          <span className="bp-auth-context">Local-first QA</span>
        </header>

        <div className="bp-auth-proof-copy">
          <h1 id="bp-auth-proof-title">Test your own<br />web application.</h1>
          <p>BugPilot runs Chromium locally and stores project and account data in your Firebase workspace.</p>
        </div>

        <div className="bp-auth-run" aria-label="Current local worker capabilities">
          <div className="bp-auth-run-head">
            <div>
              <span className="bp-auth-run-name">Current worker output</span>
              <span className="bp-auth-run-id">Recorded for your runs</span>
            </div>
            <span className="bp-auth-run-status"><i aria-hidden="true" /> Local</span>
          </div>
          <ul className="bp-auth-capability-list">
            <li>Browser console errors</li>
            <li>Failed and unsuccessful network requests</li>
            <li>Initial viewport screenshot and run events</li>
          </ul>
          <p className="bp-auth-finding-copy">
            Browser console and network errors are recorded as findings for review; AI diagnosis is optional and unverified.
          </p>
        </div>

        <p className="bp-auth-proof-note">
          Project data belongs to your account; no sample investigation is displayed.
        </p>
      </section>

      <section className="bp-auth-access" aria-labelledby="bp-auth-title">
        <div className="bp-auth-access-inner">
          <Link className="bp-auth-back" href="/">
            <ArrowRight size={15} aria-hidden="true" />
            Back to BugPilot
          </Link>

          <div className="bp-auth-access-copy">
            <h2 id="bp-auth-title">{isSignUp ? 'Create a BugPilot account' : 'Sign in to BugPilot'}</h2>
            <p>
              {isSignUp
                ? 'Create an account to access your BugPilot workspace.'
                : 'Sign in to continue to your BugPilot workspace.'}
            </p>
          </div>

          <form className="bp-auth-form" onSubmit={handleSubmit}>
            {isSignUp && (
              <label>
                Name
                <input
                  autoComplete="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={100}
                  placeholder="Your name"
                />
              </label>
            )}
            <label>
              Email
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                maxLength={254}
                placeholder="you@example.com"
              />
            </label>
            <label>
              Password
              <input
                type="password"
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                required
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={isSignUp ? 'At least 6 characters' : 'Your password'}
              />
            </label>
            {error && <p className="bp-auth-error" role="alert">{error}</p>}
            {notice && <p className="bp-auth-status" role="status">{notice}</p>}
            <button className="bp-auth-primary" type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? 'Securing your session…'
                : isSignUp ? 'Create account' : 'Sign in'}
              {isSubmitting
                ? <LoaderCircle size={16} className="bp-auth-spinner" aria-hidden="true" />
                : <ArrowRight size={16} aria-hidden="true" />}
            </button>
          </form>

          <div className="bp-auth-divider" aria-hidden="true"><span>or</span></div>
          <button
            className="bp-auth-google"
            type="button"
            onClick={() => void handleGoogleSignIn()}
            disabled={isSubmitting}
          >
            <span className="bp-auth-google-mark" aria-hidden="true">G</span>
            {isSubmitting ? 'Securing your session…' : 'Continue with Google'}
          </button>

          {!isSignUp && (
            <button
              className="bp-auth-reset"
              type="button"
              onClick={handlePasswordReset}
              disabled={isSendingReset}
            >
              {isSendingReset ? 'Sending reset email…' : 'Forgot password?'}
            </button>
          )}

          <div className="bp-auth-switch-link">
            <span>{isSignUp ? 'Already have an account?' : 'New to BugPilot?'}</span>
            <Link href={isSignUp ? '/sign-in' : '/sign-up'}>
              {isSignUp ? 'Sign in' : 'Create an account'}
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>

          <p className="bp-auth-security">
            <span aria-hidden="true" />
            Passwords are handled by Firebase Authentication. Sessions use an HTTP-only cookie.
          </p>
        </div>
      </section>
    </main>
  );
}

function getAuthErrorMessage(error: unknown): string {
  const code = typeof error === 'object' && error !== null && 'code' in error
    ? String(error.code)
    : '';

  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Email or password is incorrect.';
    case 'auth/email-already-in-use':
      return 'An account already exists for this email. Try signing in instead.';
    case 'auth/invalid-email':
      return 'Enter a valid email address.';
    case 'auth/weak-password':
      return 'Choose a stronger password.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Wait a moment and try again.';
    case 'auth/network-request-failed':
      return 'Could not reach Firebase Authentication. Check your connection.';
    case 'auth/popup-blocked':
      return 'Your browser blocked the Google sign-in window. Allow pop-ups and try again.';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Google sign-in was cancelled. Try again when you are ready.';
    case 'auth/operation-not-allowed':
      return 'This sign-in method is not enabled for the Firebase project.';
    case 'auth/unauthorized-domain':
      return 'This site is not authorized for Firebase sign-in. Add its hostname in Firebase Authentication settings.';
    case 'auth/operation-not-supported-in-this-environment':
      return 'Google sign-in pop-ups are not supported in this browser environment. Try a regular browser window.';
    case 'auth/account-exists-with-different-credential':
      return 'An account already exists with this email. Sign in with its existing method first.';
  }

  if (error instanceof Error && error.message.startsWith('Firebase client settings are missing')) {
    return error.message;
  }
  if (error instanceof Error && (
    error.message.startsWith('Could not create a secure session')
    || error.message.startsWith('Server authentication is not configured')
    || error.message.startsWith('Firebase server authentication or Firestore is unavailable')
  )) {
    return error.message;
  }
  if (code.startsWith('auth/')) {
    return `Firebase sign-in could not complete (${code}). Check the Google provider and authorized domains in Firebase.`;
  }
  return 'Authentication failed. Check your details and Firebase configuration, then try again.';
}

function logAuthFailure(error: unknown): void {
  const name = error instanceof Error ? error.name : 'UnknownError';
  const message = error instanceof Error ? error.message.slice(0, 200) : '';
  const code = typeof error === 'object' && error !== null && 'code' in error
    && typeof error.code === 'string'
    ? error.code
    : '';
  console.error('BugPilot sign-in failed:', { name, code, message });
}

async function createServerSession(user: User): Promise<void> {
  const response = await fetch('/api/auth/session', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken: await user.getIdToken() }),
  });
  if (!response.ok) {
    const result: unknown = await response.json().catch(() => null);
    throw new Error(readApiError(result) ?? 'Could not create a secure session. Check the server auth configuration.');
  }
}

function readApiError(value: unknown): string | null {
  if (typeof value !== 'object' || value === null || !('error' in value)) return null;
  const error = value.error;
  return typeof error === 'string' ? error : null;
}
