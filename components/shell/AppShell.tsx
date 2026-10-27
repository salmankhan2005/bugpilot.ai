'use client';
import { useEffect, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Play, Bug, Map, BarChart2, GitBranch,
  Puzzle, Settings, Bot, ChevronDown, Search, Bell,
  Sun, Moon, UserRound
} from 'lucide-react';
import type { UserProject } from '@/lib/firebase/projects';
import { shortUrl } from '@/lib/domain/helpers';
import { SignOutButton } from '@/components/auth/SignOutButton';

const NAV_ITEMS = [
  { href: '',              label: 'Overview',     icon: LayoutDashboard },
  { href: '/runs',         label: 'Runs',         icon: Play },
  { href: '/findings',     label: 'Findings',     icon: Bug },
  { href: '/agent-office', label: 'Agent Office', icon: Bot },
  { href: '/journeys',     label: 'Journeys',     icon: Map },
  { href: '/coverage',     label: 'Coverage',     icon: BarChart2 },
  { href: '/source',       label: 'Source',       icon: GitBranch },
  { href: '/integrations', label: 'Integrations', icon: Puzzle },
  { href: '/settings',     label: 'Settings',     icon: Settings },
];

type Theme = 'light' | 'dark';

function getStoredTheme(): Theme {
  return localStorage.getItem('bugpilot-theme') === 'dark' ? 'dark' : 'light';
}

function getServerTheme(): Theme {
  return 'light';
}

function subscribeToTheme(onChange: () => void) {
  window.addEventListener('storage', onChange);
  window.addEventListener('bugpilot-theme-change', onChange);

  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener('bugpilot-theme-change', onChange);
  };
}

interface AppShellProps {
  project: UserProject;
  userEmail?: string;
  children: React.ReactNode;
}

export default function AppShell({ project, userEmail, children }: AppShellProps) {
  const pathname = usePathname();
  const base = `/app/${project.id}`;

  const theme = useSyncExternalStore(subscribeToTheme, getStoredTheme, getServerTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('bugpilot-theme', next);
    window.dispatchEvent(new Event('bugpilot-theme-change'));
  };

  return (
    <div className="app-grid">
      {/* ── TOP BAR (Efferd Dashboard 2 style) ───────────────────── */}
      <header className="app-topbar" style={{
        background: 'var(--surface-1)',
        borderBottom: '1px solid var(--border)',
        padding: '0 24px',
        height: 52,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
      }}>
        {/* Brand */}
        <Link href="/" className="app-brand" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <div style={{
            width: 24, height: 24, borderRadius: 6,
            background: 'var(--ivory)',
            color: 'var(--obsidian)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: 13,
          }}>
            B
          </div>
          <span className="app-brand-name" style={{ fontWeight: 700, fontSize: 14, color: 'var(--ivory)', letterSpacing: '-0.02em' }}>
            BugPilot AI
          </span>
        </Link>

        <div className="app-topbar-divider" style={{ width: 1, height: 20, background: 'var(--border)', flexShrink: 0 }} />

        {/* Project switcher */}
        <Link href="/app" className="app-project-switcher" style={{
          display: 'flex', alignItems: 'center', gap: 7, padding: '4px 10px',
          background: 'var(--surface-2)', border: '1px solid var(--border)',
          borderRadius: 6, cursor: 'pointer', color: 'var(--ivory)', fontSize: 13,
          fontWeight: 500,
        }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--sage)', flexShrink: 0 }} />
          {project.name}
          <ChevronDown size={13} color="var(--muted-text)" />
        </Link>

        {/* Target URL */}
        <span className="app-project-target" style={{ fontSize: 12, color: 'var(--secondary-text)', fontFamily: 'DM Mono, monospace' }}>
          {shortUrl(project.targetUrl)}
        </span>
        <span className="app-project-environment" style={{
          fontSize: 10, padding: '2px 6px', borderRadius: 4,
          background: 'var(--surface-2)', color: 'var(--secondary-text)',
          border: '1px solid var(--border)', textTransform: 'uppercase', letterSpacing: '0.05em',
          fontWeight: 600,
        }}>
          {project.environment}
        </span>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Search */}
        <button className="btn btn-ghost btn-sm app-search-button" aria-label="Search" title="⌘K to open command palette">
          <Search size={14} color="var(--muted-text)" />
          <span style={{ fontSize: 12, color: 'var(--muted-text)' }}>Search…</span>
          <kbd style={{
            fontSize: 10, padding: '1px 5px',
            background: 'var(--surface-2)', border: '1px solid var(--border)',
            borderRadius: 4, color: 'var(--muted-text)', fontFamily: 'monospace',
          }}>
            ⌘K
          </kbd>
        </button>

        {/* Theme Toggle (Light / Dark) */}
        <button 
          onClick={toggleTheme}
          className="btn btn-ghost btn-sm app-theme-toggle"
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} theme`}
          style={{ padding: 6 }}
        >
          {theme === 'light' ? <Moon size={15} color="var(--secondary-text)" /> : <Sun size={15} color="var(--secondary-text)" />}
        </button>

        {/* Notifications */}
        <button className="btn btn-ghost btn-sm app-notifications" aria-label="Notifications" style={{ padding: 6 }}>
          <Bell size={15} color="var(--secondary-text)" />
        </button>

        <Link
          href={`${base}/profile`}
          className="btn btn-ghost btn-sm app-profile-link"
          aria-current={pathname === `${base}/profile` ? 'page' : undefined}
          title="View account profile"
        >
          <UserRound size={14} color="var(--secondary-text)" />
          <span>Profile</span>
        </Link>

        <SignOutButton email={userEmail} />
      </header>

      {/* ── SIDEBAR (Efferd Dashboard 2 Dense Navigation) ─────────── */}
      <aside className="app-sidebar" role="navigation" aria-label="Primary navigation" style={{
        background: 'var(--surface-1)',
        borderRight: '1px solid var(--border)',
        padding: '12px 10px',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Workspace Quick Header */}
        <div style={{
          padding: '6px 8px 12px',
          borderBottom: '1px solid var(--border)',
          marginBottom: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <p style={{ fontSize: 10, color: 'var(--muted-text)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0, fontWeight: 600 }}>
              Workspace
            </p>
            <p style={{ fontSize: 13, color: 'var(--ivory)', fontWeight: 600, margin: '2px 0 0' }}>
              {project.name}
            </p>
          </div>
        </div>

        {/* Navigation list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const fullHref = `${base}${href}`;
            const isActive = pathname === fullHref || (href !== '' && pathname.startsWith(fullHref));
            return (
              <Link
                key={href}
                href={fullHref}
                className={`nav-item ${isActive ? 'active' : ''}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '7px 10px',
                  borderRadius: 6,
                  textDecoration: 'none',
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? 'var(--ivory)' : 'var(--secondary-text)',
                  background: isActive ? 'var(--surface-2)' : 'transparent',
                  border: isActive ? '1px solid var(--border)' : '1px solid transparent',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Icon size={15} color={isActive ? 'var(--sage)' : 'var(--muted-text)'} />
                  <span>{label}</span>
                </div>

              </Link>
            );
          })}
        </div>

        <div style={{ flex: 1 }} />

        {/* Bottom environment badge */}
        <div style={{
          padding: '10px 10px 4px',
          borderTop: '1px solid var(--border)',
          marginTop: 8,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span style={{ fontSize: 11, color: 'var(--muted-text)' }}>BugPilot v2.0</span>
          <Link href="/app" style={{ fontSize: 11, color: 'var(--secondary-text)', textDecoration: 'none' }}>
            Projects
          </Link>
        </div>
      </aside>

      {/* ── MAIN CONTENT ────────────────────────────────────────── */}
      <main className="app-main" id="main-content" style={{
        background: 'var(--obsidian)',
        overflowY: 'auto',
      }}>
        {children}
      </main>
    </div>
  );
}
