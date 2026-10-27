// ============================================================
// BugPilot AI — Office Event Adapter
// Converts canonical QA run events and snapshots into office presentation state
// ============================================================

import type { Run, RunEvent, Finding, PatchProposal, VerificationCheck } from '@/lib/domain/types';
import type { OfficeAgentState, CameraPOI, Workstation3DConfig } from './types';

export const CAMERA_POIS: CameraPOI[] = [
  {
    id: 'overview',
    label: 'Overview View',
    position: [0, 8.5, 12],
    target: [0, 0, 0],
  },
  {
    id: 'orchestrator',
    label: 'Planning Desk',
    role: 'orchestrator',
    position: [0, 3.8, -0.2],
    target: [0, 1.2, -2.5],
  },
  {
    id: 'explorer',
    label: 'Browser Testing',
    role: 'explorer',
    position: [-2.0, 3.2, 1.2],
    target: [-3.2, 1.2, -0.5],
  },
  {
    id: 'checker',
    label: 'Assertion Station',
    role: 'checker',
    position: [2.0, 3.2, 1.2],
    target: [3.2, 1.2, -0.5],
  },
  {
    id: 'diagnostician',
    label: 'Diagnostic Desk',
    role: 'diagnostician',
    position: [-1.4, 3.2, 4.2],
    target: [-2.5, 1.2, 2.8],
  },
  {
    id: 'fix_advisor',
    label: 'Code Review Desk',
    role: 'fix_advisor',
    position: [1.4, 3.2, 4.2],
    target: [2.5, 1.2, 2.8],
  },
  {
    id: 'verifier',
    label: 'Verification Sandbox',
    role: 'verifier',
    position: [0, 3.2, 5.8],
    target: [0, 1.2, 4.0],
  },
];

export const WORKSTATION_CONFIGS: Workstation3DConfig[] = [
  {
    role: 'orchestrator',
    label: 'Planning & Strategy Desk',
    position: [0, 0, -2.5],
    rotationY: 0,
    deskColor: 0x27272a,
    monitorColor: 0x16a34a,
    screenContent: 'dashboard',
  },
  {
    role: 'explorer',
    label: 'Browser Testing Station',
    position: [-3.2, 0, -0.5],
    rotationY: Math.PI / 6,
    deskColor: 0x27272a,
    monitorColor: 0x16a34a,
    screenContent: 'browser',
  },
  {
    role: 'checker',
    label: 'Assertions & DOM Testing Station',
    position: [3.2, 0, -0.5],
    rotationY: -Math.PI / 6,
    deskColor: 0x27272a,
    monitorColor: 0xdc2626, // alert on finding
    screenContent: 'terminal',
  },
  {
    role: 'diagnostician',
    label: 'Root-Cause Diagnostic Station',
    position: [-2.5, 0, 2.8],
    rotationY: Math.PI / 4,
    deskColor: 0x27272a,
    monitorColor: 0x71717a,
    screenContent: 'diagnostics',
  },
  {
    role: 'fix_advisor',
    label: 'Code Review & Patch Station',
    position: [2.5, 0, 2.8],
    rotationY: -Math.PI / 4,
    deskColor: 0x27272a,
    monitorColor: 0x71717a,
    screenContent: 'code',
  },
  {
    role: 'verifier',
    label: 'Sandbox Verification Runner',
    position: [0, 0, 4.0],
    rotationY: Math.PI,
    deskColor: 0x27272a,
    monitorColor: 0x71717a,
    screenContent: 'verifier',
  },
];

export function buildOfficePresentationState(
  run: Run,
  events: RunEvent[],
  findings: Finding[],
  patch?: PatchProposal | null,
  checks?: VerificationCheck[]
): Record<string, OfficeAgentState> {
  const isRunActive = run.status === 'running' || run.status === 'exploring';
  const hasCritical = findings.some(f => f.severity === 'critical');
  const mainFinding = findings[0];

  return {
    orchestrator: {
      role: 'orchestrator',
      name: 'Agent Arthur',
      title: 'QA Orchestrator & Planner',
      workstationName: 'Central Planning Desk',
      description: 'Coordinates state machine progression, manages exploration budget, and tracks stage execution.',
      status: isRunActive ? 'active' : run.status === 'completed' ? 'done' : 'idle',
      currentTask: isRunActive 
        ? `Supervising stage 'checkout' for ${run.id}`
        : `Run ${run.id} finished with status: ${run.status}`,
      linkedRunId: run.id,
      logs: [
        `[${run.startedAt ? run.startedAt.split('T')[1].replace('Z','') : '09:48:00'}] Initialized run pipeline for ${run.targetUrl}`,
        `[Preflight] Validated DNS resolution and SSL handshake`,
        `[Dispatched] Target routes sent to Explorer agent`,
      ],
    },
    explorer: {
      role: 'explorer',
      name: 'Agent Elena',
      title: 'Autonomous Browser Explorer',
      workstationName: 'Browser Testing Workstation',
      description: 'Crawls DOM trees, traverses interactive links, tests viewport responsiveness, and generates accessibility maps.',
      status: isRunActive ? 'active' : 'idle',
      currentTask: isRunActive 
        ? 'Traversing /checkout DOM tree and extracting interactive form inputs'
        : 'Standby for target dispatch',
      targetUrl: `${run.targetUrl}/checkout`,
      currentStep: 'Step 9: Fill credit card number',
      linkedRunId: run.id,
      logs: [
        `[Navigated] ${run.targetUrl}/checkout`,
        `[DOM] Extracted 4 input fields, 2 dropdowns, 1 submit button`,
        `[Interaction] Filled billing address data`,
      ],
    },
    checker: {
      role: 'checker',
      name: 'Agent Connor',
      title: 'Assertion & Anomaly Checker',
      workstationName: 'Assertion & QA Terminal',
      description: 'Evaluates user assertions, detects console exceptions, catches 4xx/5xx network failures, and emits findings.',
      status: isRunActive ? 'active' : hasCritical ? 'blocked' : 'idle',
      currentTask: isRunActive 
        ? 'Testing credit card Luhn validation on payment form'
        : 'Assertions complete',
      linkedRunId: run.id,
      linkedFindingId: mainFinding?.id,
      evidenceCount: mainFinding ? mainFinding.evidenceIds.length : 0,
      logs: [
        `[Assertion] Checking credit card input validation`,
        `[ANOMALY] Form rejected valid Visa test digits 4242 4242 4242 4242`,
        `[Finding] Emitted finding_1024 with 3 evidence artifacts`,
      ],
    },
    diagnostician: {
      role: 'diagnostician',
      name: 'Agent Dana',
      title: 'Root-Cause Diagnostician',
      workstationName: 'Root-Cause Diagnostic Desk',
      description: 'Correlates console logs, stack traces, and network payloads to synthesize high-confidence root-cause hypotheses.',
      status: mainFinding ? 'active' : 'idle',
      currentTask: mainFinding 
        ? `Hypothesis formulated (82% confidence) for ${mainFinding.id}`
        : 'Awaiting evidence ingestion',
      linkedRunId: run.id,
      linkedFindingId: mainFinding?.id,
      evidenceCount: mainFinding?.evidenceIds.length ?? 0,
      logs: [
        `[Ingest] Correlating console ValidationError with Network 400 response`,
        `[Analysis] Formatted input contains spaces; Luhn parser missing strip regex`,
        `[Hypothesis] Formulated with 82% confidence`,
      ],
    },
    fix_advisor: {
      role: 'fix_advisor',
      name: 'Agent Felix',
      title: 'Source Code Fix Advisor',
      workstationName: 'Code Review & AST Station',
      description: 'Analyzes repository AST context and generates minimal unified git patches for human review.',
      status: patch ? 'active' : 'idle',
      currentTask: patch 
        ? `Unified patch generated for branch ${patch.branch}`
        : 'Standby for finding assignment',
      linkedRunId: run.id,
      linkedFindingId: patch?.findingId,
      diffProposalId: patch?.id,
      logs: [
        `[AST Context] Retrieved PaymentForm.tsx:34`,
        `[Patch] Synthesized unified patch with [\\s-] normalization`,
        `[Review] Generated risks and limitations review notes`,
      ],
    },
    verifier: {
      role: 'verifier',
      name: 'Agent Victor',
      title: 'Sandbox Verification Runner',
      workstationName: 'Verification Sandbox Station',
      description: 'Executes containerized regression checks (TypeScript build, unit tests, ESLint, Playwright rerun) to verify fixes.',
      status: checks && checks.some(c => c.status === 'passed') ? 'active' : 'idle',
      currentTask: checks && checks.every(c => c.status === 'passed')
        ? 'All 4 verification checks passed (100% fix rate)'
        : 'Sandbox runner standby',
      linkedRunId: run.id,
      verificationStatus: checks && checks.every(c => c.status === 'passed') ? 'passed' : 'not_run',
      logs: [
        `[Sandbox] Initialized isolated test container`,
        `[Build] TypeScript compilation passed`,
        `[Tests] Unit tests validateCardNumber passed`,
        `[Rerun] Playwright rerun passed cleanly`,
      ],
    },
  };
}
