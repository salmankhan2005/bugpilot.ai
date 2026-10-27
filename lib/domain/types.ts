// ============================================================
// BugPilot AI — Domain Types
// Source of truth for all typed data contracts
// ============================================================

// ---- Run Status Machine --------------------------------
export type RunStatus =
  | 'draft'
  | 'preflight'
  | 'queued'
  | 'running'
  | 'cancel_requested'
  | 'exploring'
  | 'executing_checks'
  | 'normalizing'
  | 'triaging'
  | 'completed'
  | 'needs_review'
  | 'partial'
  | 'blocked'
  | 'failed'
  | 'cancelled'
  | 'timed_out';

export const RUN_TERMINAL_STATES: RunStatus[] = [
  'completed', 'needs_review', 'partial', 'blocked', 'failed', 'cancelled', 'timed_out',
];

// ---- Finding Status ------------------------------------
export type FindingStatus = 'new' | 'confirmed' | 'needs_review' | 'duplicate' | 'resolved';

// ---- Severity ------------------------------------------
export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

// ---- Evidence Kind -------------------------------------
export type EvidenceKind = 'screenshot' | 'console' | 'network' | 'trace' | 'assertion' | 'source';

// ---- Verification Status -------------------------------
export type VerificationStatus = 'not_run' | 'blocked' | 'running' | 'passed' | 'failed';

// ---- Run Event Types -----------------------------------
export type RunEventType =
  | 'run.created'
  | 'run.preflight.completed'
  | 'run.stage.started'
  | 'browser.action'
  | 'browser.screenshot'
  | 'console.error'
  | 'network.request.failed'
  | 'assertion.failed'
  | 'finding.created'
  | 'triage.completed'
  | 'run.cancel.requested'
  | 'run.cancelled'
  | 'run.completed'
  | 'run.failed'
  | 'run.cancel.requested'
  | 'run.timed_out'
  | 'verification.started'
  | 'verification.check.completed'
  | 'verification.passed'
  | 'verification.failed'
  | 'verification.blocked'
  | 'diagnosis.queued'
  | 'diagnosis.started'
  | 'diagnosis.completed'
  | 'diagnosis.failed';

// ---- Core Entities ------------------------------------

export interface Project {
  id: string;
  name: string;
  targetUrl: string;
  environment: 'preview' | 'staging' | 'demo';
  allowedHosts: string[];
  createdAt: string;
  description?: string;
}

export interface Run {
  id: string;
  projectId: string;
  status: RunStatus;
  targetUrl: string;
  goal: string;
  viewport: string;
  browser: string;
  startedAt: string | null;
  finishedAt: string | null;
  duration?: number; // seconds
  findingCount?: number;
  criticalCount?: number;
  codeRevision?: string;
  environment?: string;
  maxDuration?: number;
  maxPages?: number;
  maxSteps?: number;
}

export interface RunEvent {
  id: string;
  runId: string;
  seq: number;
  timestamp: string;
  type: RunEventType;
  actor: string;
  summary: string;
  payload?: Record<string, unknown>;
  findingId?: string;
  screenshotUrl?: string;
}

export interface Finding {
  id: string;
  runId: string;
  stableFingerprint: string;
  title: string;
  category: 'network' | 'console' | 'assertion' | 'accessibility' | 'visual' | 'performance';
  severity: Severity;
  status: FindingStatus;
  observed: string;
  expected: string | null;
  evidenceIds: string[];
  reproductionSteps: string[];
  hypotheses: Hypothesis[];
  verified: boolean;
  firstSeen: string;
  lastSeen: string;
}

export interface Hypothesis {
  text: string;
  confidence: number; // 0–1
  evidenceIds: string[];
  contradictingEvidenceIds?: string[];
}

export interface Evidence {
  id: string;
  runId: string;
  findingId?: string;
  kind: EvidenceKind;
  timestamp: string;
  url: string;
  stepId?: string;
  summary: string;
  artifactRef?: string;
  redactionsApplied?: string[];
  sourceRevision?: string;
}

export interface Journey {
  id: string;
  projectId: string;
  name: string;
  goal: string;
  startingUrl: string;
  stepsJson: JourneyStep[];
  version: number;
  lastRunId?: string;
  lastRunStatus?: RunStatus;
  reliability?: number; // 0–1
  lastChanged: string;
  owner?: string;
}

export interface JourneyStep {
  index: number;
  action: string;
  selector?: string;
  value?: string;
  assertion?: string;
  url?: string;
}

export interface PatchProposal {
  id: string;
  findingId: string;
  repository: string;
  branch: string;
  commit: string;
  revision: string;
  diffText: string;
  explanation: string;
  risks: string[];
  limitations: string[];
  status: 'proposed' | 'approved' | 'rejected' | 'applied';
  approvedBy?: string;
  createdAt: string;
}

export interface VerificationCheck {
  id: string;
  patchProposalId: string;
  checkName: string;
  status: VerificationStatus;
  exitCode?: number;
  startedAt?: string;
  finishedAt?: string;
  artifactId?: string;
  detail?: string;
}

export interface CoverageArea {
  url: string;
  path: string;
  label: string;
  visited: boolean;
  tested: boolean;
  lastTestedAt?: string;
  riskLevel: 'high' | 'medium' | 'low';
  notes?: string;
}

export interface RunStage {
  name: string;
  label: string;
  status: 'pending' | 'running' | 'done' | 'failed' | 'skipped';
  startedAt?: string;
  completedAt?: string;
}

export interface TriageResult {
  summary: string;
  findingGroups: { title: string; findingIds: string[]; reason: string }[];
  hypotheses: {
    findingId: string;
    claim: string;
    confidence: number;
    supportingEvidenceIds: string[];
    contradictingEvidenceIds: string[];
    missingEvidence: string[];
  }[];
  nextChecks: { action: string; reason: string; requiresApproval: boolean }[];
  limitations: string[];
}

// ---- Agent Office types --------------------------------
export type AgentRole = 'orchestrator' | 'explorer' | 'checker' | 'diagnostician' | 'fix_advisor' | 'verifier';
export type StationStatus = 'idle' | 'active' | 'blocked' | 'done' | 'error';

export interface AgentStation {
  role: AgentRole;
  label: string;
  description: string;
  status: StationStatus;
  currentTask?: string;
  linkedRunId?: string;
  linkedFindingId?: string;
}
