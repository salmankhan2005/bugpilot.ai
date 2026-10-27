'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';

const MARK = (
  <g transform="rotate(-30 12 12)">
    <circle cx="7.3" cy="3.2" r="1.45" />
    <rect x="5.5" y="4.7" width="3.6" height="14.6" rx="1.8" />
    <rect x="14.9" y="4.7" width="3.6" height="14.6" rx="1.8" />
    <circle cx="16.7" cy="20.8" r="1.45" />
  </g>
);

const NAV = [
  { label: 'Benefits', href: '#benefits', mod: 'appear--scale', d: '0.16s' },
  { label: 'How It Works', href: '#how-it-works', mod: 'appear--soft', d: '0.28s' },
  { label: 'FAQs', href: '#faqs', mod: 'appear--scale', d: '0.40s' },
  { label: 'Pricing', href: '#pricing', mod: 'appear--soft', d: '0.52s' },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);
  const burgerRef = useRef<HTMLButtonElement>(null);

  const closeMenu = useCallback(() => {
    setOpen(false);
    document.body.style.overflow = open ? 'hidden' : '';
  }, [open]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenu();
    },
    [closeMenu]
  );

  useEffect(() => {
    if (open) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, handleKeyDown]);

  const appearEls = useRef<Element[]>([]);

  useEffect(() => {
    const els = document.querySelectorAll('.appear, .hero-photo');
    appearEls.current = Array.from(els);
    const onEnd: EventListener = (event) => {
      if (!(event instanceof AnimationEvent) || !(event.currentTarget instanceof Element)) return;
      if (event.animationName && (event.animationName.startsWith('in-') || event.animationName.startsWith('in-star') || event.animationName.startsWith('in-em'))) {
        event.currentTarget.classList.add('is-in');
      }
    };
    els.forEach((el) => el.addEventListener('animationend', onEnd, { once: true }));
    let raf = 0;
    const force = () => {
      els.forEach((el) => {
        const anims = el.getAnimations ? el.getAnimations() : [];
        const running = anims.some((a) => a.playState === 'running' || a.playState === 'finished');
        if (!running) el.classList.add('is-in');
      });
    };
    raf = requestAnimationFrame(() => {
      requestAnimationFrame(force);
    });
    return () => {
      cancelAnimationFrame(raf);
      els.forEach((el) => el.removeEventListener('animationend', onEnd));
    };
  }, []);

  return (
    <>
      <header className="header appear appear--scale" style={{ '--d': '0.08s' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            alignItems: 'center',
            padding: '22px 40px 10px',
            zIndex: 50,
            position: 'relative',
          }}
        >
          <Link
            href="#top"
            className="logo appear appear--scale"
            style={{
              '--d': '0.08s',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 9,
              justifySelf: 'start',
              fontSize: '15.5px',
              fontWeight: 600,
              letterSpacing: '-0.03em',
              color: '#fff',
              textDecoration: 'none',
            }}
            aria-label="BugPilot AI"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">{MARK}</svg>
            BugPilot<span style={{ fontWeight: 400 }}>.ai</span>
          </Link>

          <nav
            id="site-nav"
            ref={navRef}
            aria-label="Primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              justifySelf: 'center',
            }}
          >
            {NAV.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className={`nav-link appear ${item.mod}`}
                style={{ '--d': item.d, height: '40px', padding: '0 18px', borderRadius: '7px', overflow: 'hidden', position: 'relative', border: '1px solid rgba(198,198,198,0.55)', background: 'linear-gradient(105deg, #050505 0%, #2a2a2a 48%, #4a4a4a 100%)', color: '#f3f3f3', fontSize: '14px', fontWeight: 400, letterSpacing: '-0.01em', whiteSpace: 'nowrap', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.35s ease, border-color 0.35s ease, box-shadow 0.35s ease' }}
                onClick={closeMenu}
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div style={{ justifySelf: 'end', display: 'flex', alignItems: 'center', gap: 10 }}>
            <a
              href="#start"
              className="btn btn-solid header-cta appear appear--scale"
              style={{ '--d': '0.34s', height: '40px', padding: '0 16px' }}
            >
              Start for Free
            </a>
            <button
              ref={burgerRef}
              className="burger appear appear--scale"
              style={{ '--d': '0.34s', display: 'none', width: 42, height: 42, borderRadius: 6, border: '1px solid rgba(255,255,255,0.16)', background: 'rgba(8,8,8,0.55)', zIndex: 60, cursor: 'pointer', color: '#fff', fontSize: 12, lineHeight: 1, padding: 0, outline: 'none' }}
              aria-controls="site-nav"
              aria-expanded={open}
              onClick={() => setOpen((o) => !o)}
            >
              Open menu
              <span style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none', userSelect: 'none' }}>
                <span style={{ width: 16, height: 1.5, background: '#fff', borderRadius: 1, display: 'block', transition: 'transform 0.25s ease, opacity 0.2s ease' }} />
                <span style={{ width: 16, height: 1.5, background: '#fff', borderRadius: 1, display: 'block', margin: '5px 0', transition: 'opacity 0.2s ease' }} />
                <span style={{ width: 16, height: 1.5, background: '#fff', borderRadius: 1, display: 'block', transition: 'transform 0.25s ease, opacity 0.2s ease' }} />
              </span>
            </button>
          </div>
        </div>
      </header>

      {open && (
        <>
          <div
            className="menu-backdrop"
            style={{
              display: 'block',
              position: 'fixed',
              inset: 0,
              zIndex: 40,
              background: 'rgba(8,8,8,0.42)',
              opacity: 0,
              visibility: 'hidden',
              transition: 'opacity 0.28s ease, backdrop-filter 0.28s ease',
              WebkitBackdropFilter: 'blur(24px)',
              backdropFilter: 'blur(24px)',
            }}
            onClick={closeMenu}
          />
          <nav
            className="menu-panel"
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 45,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
              padding: '96px 22px 32px',
              paddingTop: 'max(96px, calc(env(safe-area-inset-top) + 88px))',
              color: '#fff',
              fontSize: 19,
              width: '100%',
              boxSizing: 'border-box',
              transform: 'translateY(0)',
              transition: 'transform 0.28s ease',
            }}
          >
            {NAV.map((item) => (
              <a
                key={item.label}
                href={item.href}
                style={{
                  width: '100%',
                  height: 56,
                  fontSize: 19,
                  borderRadius: 10,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  textDecoration: 'none',
                  background: 'transparent',
                  border: '1px solid rgba(198,198,198,0.45)',
                }}
                onClick={closeMenu}
              >
                {item.label}
              </a>
            ))}
          </nav>
        </>
      )}
    </>
  );
}
