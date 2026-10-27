'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Bot, Sparkles, ArrowRight, Layers } from 'lucide-react';
import dynamic from 'next/dynamic';

const Landing3DOfficeHero = dynamic(
  () => import('@/components/landing/Landing3DOfficeHero'),
  {
    ssr: false,
    loading: () => (
      <div style={{
        height: '100%',
        minHeight: 480,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--obsidian)',
        color: 'var(--muted-text)',
        fontSize: 13,
      }}>
        Loading 3D Canvas...
      </div>
    ),
  }
);

export default function LandingHeroVisual() {
  const [mode, setMode] = useState<'render' | 'interactive'>('render');

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '100%',
      minHeight: 520,
      overflow: 'hidden',
      background: 'var(--card)',
    }}>
      {mode === 'render' ? (
        <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 520 }}>
          {/* Gemini-Generated High-Level 3D Render */}
          <div style={{
            position: 'absolute',
            inset: 0,
            overflow: 'hidden',
          }}>
            <Image
              src="/images/bugpilot_hero_3d.jpg"
              alt="BugPilot AI Autonomous 3D Agent Office"
              fill
              priority
              style={{
                objectFit: 'cover',
                objectPosition: 'center',
              }}
            />
            {/* Subtle contrast gradient for Vercel text readability */}
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.55) 100%)',
              pointerEvents: 'none',
            }} />
          </div>

          {/* Top Badge: 3D Agent Office Live */}
          <div style={{
            position: 'absolute',
            top: 24,
            left: 24,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(12px)',
            border: '1px solid var(--border)',
            padding: '8px 14px',
            borderRadius: 'var(--radius)',
            boxShadow: 'var(--shadow-md)',
          }}>
            <span className="agent-live-blinking" style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: 'var(--active-green)',
              boxShadow: '0 0 10px var(--active-green)',
              flexShrink: 0,
            }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#ffffff', letterSpacing: '0.02em' }}>
              3D OFFICE · ILLUSTRATION
            </span>
            <span style={{
              fontSize: 10,
              padding: '2px 6px',
              borderRadius: 4,
              background: 'rgba(255,255,255,0.15)',
              color: '#ffffff',
              fontWeight: 600,
            }}>
              SAMPLE
            </span>
          </div>

          {/* View Mode Switcher in top right */}
          <div style={{
            position: 'absolute',
            top: 24,
            right: 24,
            display: 'flex',
            gap: 4,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(12px)',
            border: '1px solid var(--border)',
            padding: 4,
            borderRadius: 'var(--radius)',
          }}>
            <button
              onClick={() => setMode('render')}
              style={{
                padding: '4px 10px',
                borderRadius: 'calc(var(--radius) - 2px)',
                border: 'none',
                background: '#ffffff',
                color: '#000000',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <Sparkles size={12} />
              3D Render
            </button>
            <button
              onClick={() => setMode('interactive')}
              style={{
                padding: '4px 10px',
                borderRadius: 'calc(var(--radius) - 2px)',
                border: 'none',
                background: 'transparent',
                color: '#a1a1aa',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <Layers size={12} />
              Interactive 3D
            </button>
          </div>

          {/* Bottom Floating Card: Active Investigation & Office Deep Link */}
          <div style={{
            position: 'absolute',
            bottom: 24,
            left: 24,
            right: 24,
            background: 'rgba(0, 0, 0, 0.88)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: 'var(--radius)',
            padding: '16px 20px',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: 'rgba(0, 229, 153, 0.15)',
                border: '1px solid rgba(0, 229, 153, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Bot size={20} color="var(--active-green)" />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="agent-live-blinking" style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: 'var(--active-green)',
                  }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#ffffff' }}>
                    Example run activity · illustrative only
                  </span>
                </div>
                <p style={{ margin: '3px 0 0', fontSize: 12, color: '#a1a1aa' }}>
                  This marketing preview is not connected to a project run.
                </p>
              </div>
            </div>

            <Link
              href="/app"
              className="btn btn-primary btn-sm"
              style={{
                background: '#ffffff',
                color: '#000000',
                border: 'none',
                fontWeight: 700,
                padding: '8px 16px',
                gap: 6,
                textDecoration: 'none',
              }}
            >
              <span>Open workspace</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      ) : (
        <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 520 }}>
          <Landing3DOfficeHero />
          {/* Switch back to Render mode button */}
          <div style={{
            position: 'absolute',
            top: 24,
            left: 24,
            zIndex: 10,
          }}>
            <button
              onClick={() => setMode('render')}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
                background: 'rgba(0, 0, 0, 0.85)',
                color: '#ffffff',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Sparkles size={13} color="var(--active-green)" />
              Switch to 3D High-Res Render
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
