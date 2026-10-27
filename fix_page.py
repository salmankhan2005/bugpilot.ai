# Write the ClientParticles wrapper
client_particles = """'use client';

import dynamic from 'next/dynamic';

const LandingParticles = dynamic(
  () => import('@/components/landing/LandingParticles'),
  { ssr: false, loading: () => null }
);

export default function ClientParticles() {
  return <LandingParticles />;
}
"""

with open("components/landing/ClientParticles.tsx", "w", encoding="utf-8") as f:
    f.write(client_particles)

# Now fix app/page.tsx - read it, fix imports
with open("app/page.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Replace dynamic import block with simple import
content = content.replace("import dynamic from 'next/dynamic';\n", "import ClientParticles from '@/components/landing/ClientParticles';\n")
content = content.replace(
    "// Canvas particles — client only\nconst LandingParticles = dynamic(\n  () => import('@/components/landing/LandingParticles'),\n  { ssr: false }\n);\n\n",
    ""
)
# Replace usage of LandingParticles with ClientParticles in JSX
content = content.replace("<LandingParticles />", "<ClientParticles />")

with open("app/page.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Done")
