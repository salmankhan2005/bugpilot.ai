import type { RunStatus, Severity, FindingStatus } from '@/lib/domain/types';
import { runStatusLabel, runStatusBadgeClass, runStatusDotClass, severityLabel, findingStatusLabel, findingStatusClass } from '@/lib/domain/helpers';

// ── Run Status Badge ──────────────────────────────────────────
export function RunStatusBadge({ status }: { status: RunStatus }) {
  return (
    <span className={`badge ${runStatusBadgeClass(status)}`}>
      <span className={`dot ${runStatusDotClass(status)}`} style={{ width: 5, height: 5 }} />
      {runStatusLabel(status)}
    </span>
  );
}

// ── Severity Badge ────────────────────────────────────────────
export function SeverityBadge({ severity }: { severity: Severity }) {
  const colorMap: Record<Severity, string> = {
    critical: 'var(--red)',
    high:     '#E0895E',
    medium:   'var(--amber)',
    low:      'var(--sage-muted)',
    info:     'var(--secondary-text)',
  };
  const bgMap: Record<Severity, string> = {
    critical: 'rgba(214,106,97,0.12)',
    high:     'rgba(224,137,94,0.12)',
    medium:   'rgba(201,136,74,0.12)',
    low:      'rgba(122,153,87,0.12)',
    info:     'rgba(163,167,159,0.10)',
  };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 7px', borderRadius: 4,
      background: bgMap[severity], color: colorMap[severity],
      fontSize: 11, fontWeight: 600, letterSpacing: '0.03em', textTransform: 'uppercase',
    }}>
      {severityLabel(severity)}
    </span>
  );
}

// ── Finding Status Badge ──────────────────────────────────────
export function FindingStatusBadge({ status }: { status: FindingStatus }) {
  return (
    <span className={`badge ${findingStatusClass(status)}`}>
      {findingStatusLabel(status)}
    </span>
  );
}

// ── Empty State ───────────────────────────────────────────────
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}
export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '64px 24px', gap: 16, textAlign: 'center',
    }}>
      {icon && (
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          background: 'var(--surface-2)', border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--muted-text)',
        }}>
          {icon}
        </div>
      )}
      <div>
        <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--ivory)', marginBottom: 6 }}>{title}</p>
        <p style={{ fontSize: 13, color: 'var(--secondary-text)', maxWidth: 360 }}>{description}</p>
      </div>
      {action}
    </div>
  );
}

// ── Loading Skeleton ──────────────────────────────────────────
export function Skeleton({ width, height, rounded }: { width?: string | number; height?: string | number; rounded?: boolean }) {
  return (
    <div style={{
      width: width ?? '100%', height: height ?? 16,
      background: 'var(--surface-2)',
      borderRadius: rounded ? 999 : 6,
      animation: 'pulse 1.5s ease-in-out infinite',
    }} aria-hidden="true" />
  );
}

// ── Page Header ───────────────────────────────────────────────
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumb?: string;
  actions?: React.ReactNode;
}
export function PageHeader({ title, subtitle, breadcrumb, actions }: PageHeaderProps) {
  return (
    <div style={{
      borderBottom: '1px solid var(--border)',
      padding: '20px 28px 16px',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16,
    }}>
      <div>
        {breadcrumb && (
          <p style={{ fontSize: 11, color: 'var(--muted-text)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
            {breadcrumb}
          </p>
        )}
        <h1 style={{ fontSize: '1.5rem', margin: 0 }}>{title}</h1>
        {subtitle && <p style={{ fontSize: 13, color: 'var(--secondary-text)', marginTop: 4 }}>{subtitle}</p>}
      </div>
      {actions && <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>{actions}</div>}
    </div>
  );
}

// ── Confirm Dialog (simple) ───────────────────────────────────
interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}
export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', onConfirm, onCancel, danger }: ConfirmDialogProps) {
  if (!open) return null;
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(9,11,9,0.75)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} role="dialog" aria-modal="true" aria-labelledby="dialog-title">
      <div className="card" style={{ width: 400, padding: 24 }}>
        <h3 id="dialog-title" style={{ margin: '0 0 10px' }}>{title}</h3>
        <p style={{ fontSize: 13, color: 'var(--secondary-text)', margin: '0 0 24px' }}>{message}</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary btn-sm" onClick={onCancel}>Cancel</button>
          <button className={`btn btn-sm ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Metric Card ───────────────────────────────────────────────
interface MetricCardProps {
  label: string;
  value: string | number;
  delta?: string;
  deltaDir?: 'up' | 'down';
  sub?: string;
}
export function MetricCard({ label, value, delta, deltaDir, sub }: MetricCardProps) {
  return (
    <div className="card" style={{ padding: '16px 20px' }}>
      <div className="metric-label">{label}</div>
      <div className="metric-value" style={{ margin: '8px 0 4px' }}>{value}</div>
      {delta && <div className={`metric-delta ${deltaDir ?? ''}`}>{delta}</div>}
      {sub && <div style={{ fontSize: 11, color: 'var(--muted-text)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// ── Inline code / ID ─────────────────────────────────────────
export function MonoId({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      fontFamily: 'DM Mono, monospace', fontSize: 11,
      color: 'var(--muted-text)', letterSpacing: '0.03em',
    }}>{children}</span>
  );
}

