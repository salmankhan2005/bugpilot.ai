// ============================================================
// BugPilot AI — 3D Agent Office Types & Presentation Contracts
// ============================================================

import type { AgentRole, StationStatus, RunEventType, Severity } from '@/lib/domain/types';

export interface OfficeAgentState {
  role: AgentRole;
  name: string;
  title: string;
  workstationName: string;
  description: string;
  status: StationStatus;
  currentTask: string;
  targetUrl?: string;
  currentStep?: string;
  linkedRunId?: string;
  linkedFindingId?: string;
  evidenceCount?: number;
  verificationStatus?: 'not_run' | 'running' | 'passed' | 'failed';
  diffProposalId?: string;
  logs: string[];
}

export interface CameraPOI {
  id: string;
  label: string;
  role?: AgentRole;
  position: [number, number, number];
  target: [number, number, number];
}

export interface Workstation3DConfig {
  role: AgentRole;
  label: string;
  position: [number, number, number];
  rotationY: number;
  deskColor: number;
  monitorColor: number;
  screenContent: 'dashboard' | 'browser' | 'terminal' | 'diagnostics' | 'code' | 'verifier';
}

export interface OfficeEventRecord {
  id: string;
  seq: number;
  timestamp: string;
  type: RunEventType;
  actor: string;
  summary: string;
  findingId?: string;
  screenshotUrl?: string;
  isError?: boolean;
}
