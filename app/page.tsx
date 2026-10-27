import type { Metadata } from 'next';
import BugPilotHome from '@/components/landing/BugPilotHome';

export const metadata: Metadata = {
  title: 'Evidence-first browser QA',
  description: 'Run Chromium against your own application and inspect the browser events, screenshots, and findings behind each run.',
};

export default function LandingPage() {
  return <BugPilotHome />;
}
