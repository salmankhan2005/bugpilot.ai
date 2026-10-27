'use client';

import dynamic from 'next/dynamic';

const LandingParticles = dynamic(
  () => import('@/components/landing/LandingParticles'),
  { ssr: false, loading: () => null }
);

export default function ClientParticles() {
  return <LandingParticles />;
}
