import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AuthPage } from '@/components/auth/AuthPage';
import { getCurrentUser } from '@/lib/auth/current-user';
import { getSafeRedirectPath } from '@/lib/auth/session-security';
import './sign-in.css';

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to your BugPilot QA workspace.',
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const redirectTo = getSafeRedirectPath(next);
  if (await getCurrentUser()) redirect(redirectTo);
  return <AuthPage mode="sign-in" redirectTo={redirectTo} />;
}
