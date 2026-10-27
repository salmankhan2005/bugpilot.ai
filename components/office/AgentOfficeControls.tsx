'use client';

import { Camera, RotateCcw, Play, Pause, Layers, Zap } from 'lucide-react';
import type { AgentRole } from '@/lib/domain/types';
import { CAMERA_POIS } from '@/lib/office/adapter';

interface AgentOfficeControlsProps {
  activePoiId: string;
  onSelectPoi: (id: string, role?: AgentRole) => void;
  onResetCamera: () => void;
  viewMode: '3d' | 'fallback';
  onToggleViewMode: (mode: '3d' | 'fallback') => void;
  simMode: 'pipeline' | 'exploration' | 'triage' | 'idle';
  onChangeSimMode: (mode: 'pipeline' | 'exploration' | 'triage' | 'idle') => void;
  onCycleAgent?: () => void;
  activeRole?: AgentRole;
  isPlaying?: boolean;
  onTogglePlay?: () => void;
}

export default function AgentOfficeControls({
  activePoiId,
  onSelectPoi,
  onResetCamera,
  viewMode,
  onToggleViewMode,
  simMode,
  onChangeSimMode,
  onCycleAgent,
  activeRole,
  isPlaying,
  onTogglePlay,
}: AgentOfficeControlsProps) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '8px 24px',
      background: 'var(--surface-1)',
      borderBottom: '1px solid var(--border)',
      flexWrap: 'wrap',
      gap: 12,
    }}>
      {/* Camera POI Presets */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflowX: 'auto' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted-text)', textTransform: 'uppercase', letterSpacing: '0.04em', marginRight: 4 }}>
          Focus:
        </span>
        {CAMERA_POIS.map(poi => {
          const isSelected = activePoiId === poi.id;
          return (
            <button
              key={poi.id}
              onClick={() => onSelectPoi(poi.id, poi.role)}
              style={{
                padding: '6px 14px',
                minHeight: 36,
                borderRadius: 'var(--radius)',
                border: `1px solid ${isSelected ? 'var(--active-green)' : 'var(--border)'}`,
                background: isSelected ? 'rgba(0,229,153,0.1)' : 'var(--surface-2)',
                color: isSelected ? 'var(--active-green)' : 'var(--secondary-text)',
                fontSize: 12,
                fontWeight: isSelected ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
              }}
            >
              {poi.label}
            </button>
          );
        })}

        <button
          onClick={onResetCamera}
          className="btn btn-ghost btn-sm"
          style={{ padding: '4px 8px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}
          title="Reset camera to default isometric overview"
        >
          <RotateCcw size={12} />
          Reset
        </button>
      </div>

      {/* Right controls: Blinking Simulation & 3D / Fallback mode */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {/* Play / Pause Auto-Handoff Animation */}
        {onTogglePlay && (
          <button
            onClick={onTogglePlay}
            className="btn btn-secondary btn-sm"
            style={{
              padding: '4px 10px',
              fontSize: 11,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: isPlaying ? 'rgba(0,229,153,0.14)' : 'var(--surface-2)',
              borderColor: isPlaying ? 'var(--active-green)' : 'var(--border)',
              color: isPlaying ? 'var(--active-green)' : 'var(--ivory)',
              fontWeight: 600,
            }}
            title="Toggle automated agent handoff animation"
          >
            {isPlaying ? <Pause size={12} color="var(--active-green)" /> : <Play size={12} color="var(--active-green)" />}
            <span>{isPlaying ? 'Auto-Running' : 'Play Live'}</span>
          </button>
        )}

        {/* Cycle Agent Action button */}
        {onCycleAgent && (
          <button
            onClick={onCycleAgent}
            className="btn btn-secondary btn-sm"
            style={{
              padding: '4px 10px',
              fontSize: 11,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'var(--surface-2)',
              borderColor: 'var(--border)',
            }}
            title="Step to next agent to watch them blink, spin and run"
          >
            <Zap size={12} color="var(--active-green)" />
            <span>Step Agent</span>
          </button>
        )}

        {/* Pipeline Simulation state */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 11, color: 'var(--muted-text)' }}>Workflow:</span>
          {[
            { id: 'pipeline',    label: 'All Active' },
            { id: 'exploration', label: 'Exploration' },
            { id: 'triage',      label: 'Diagnostics' },
            { id: 'idle',        label: 'Standby' },
          ].map(m => (
            <button
              key={m.id}
              onClick={() => onChangeSimMode(m.id as any)}
              style={{
                padding: '3px 8px',
                borderRadius: 'var(--radius)',
                border: `1px solid ${simMode === m.id ? 'var(--primary)' : 'transparent'}`,
                background: simMode === m.id ? 'var(--surface-2)' : 'transparent',
                color: simMode === m.id ? 'var(--ivory)' : 'var(--muted-text)',
                fontSize: 11,
                fontWeight: simMode === m.id ? 600 : 400,
                cursor: 'pointer',
              }}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div style={{ width: 1, height: 16, background: 'var(--border)' }} />

        {/* View Mode Toggle (3D vs Non-3D Fallback) */}
        <div style={{ display: 'flex', gap: 2, background: 'var(--surface-2)', padding: 2, borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
          <button
            onClick={() => onToggleViewMode('3d')}
            style={{
              padding: '3px 8px',
              borderRadius: 'calc(var(--radius) - 2px)',
              border: 'none',
              background: viewMode === '3d' ? 'var(--surface-1)' : 'transparent',
              color: viewMode === '3d' ? 'var(--ivory)' : 'var(--muted-text)',
              fontSize: 11,
              fontWeight: viewMode === '3d' ? 600 : 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Camera size={12} />
            3D Scene
          </button>
          <button
            onClick={() => onToggleViewMode('fallback')}
            style={{
              padding: '3px 8px',
              borderRadius: 'calc(var(--radius) - 2px)',
              border: 'none',
              background: viewMode === 'fallback' ? 'var(--surface-1)' : 'transparent',
              color: viewMode === 'fallback' ? 'var(--ivory)' : 'var(--muted-text)',
              fontSize: 11,
              fontWeight: viewMode === 'fallback' ? 600 : 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Layers size={12} />
            2D Roster
          </button>
        </div>
      </div>
    </div>
  );
}
