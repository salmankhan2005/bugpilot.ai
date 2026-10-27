// Fixture data — explicitly labelled DEMO. Never mix with live production data.
import type {
  Project, Run, RunEvent, Finding, Evidence, Journey,
  PatchProposal, VerificationCheck, CoverageArea, RunStage,
} from './types';

export const DEMO_LABEL = '[DEMO DATA]';

export const DEMO_PROJECT: Project = {
  id: 'proj_demo_001',
  name: 'Acme Project',
  targetUrl: 'https://acme.demo',
  environment: 'staging',
  allowedHosts: ['acme.demo'],
  createdAt: '2026-10-20T08:00:00Z',
  description: 'Demo e-commerce checkout flow',
};

export const DEMO_RUNS: Run[] = [
  {
    id: 'run_0047',
    projectId: 'proj_demo_001',
    status: 'running',
    targetUrl: 'https://acme.demo',
    goal: 'Find bugs in the checkout flow, form validation, payment process and mobile responsiveness',
    viewport: '1440x900',
    browser: 'chromium',
    startedAt: '2026-10-26T09:48:00Z',
    finishedAt: null,
    duration: 724,
    findingCount: 2,
    criticalCount: 1,
    environment: 'staging',
  },
  {
    id: 'run_0046',
    projectId: 'proj_demo_001',
    status: 'completed',
    targetUrl: 'https://acme.demo',
    goal: 'Verify login flow and session handling',
    viewport: '1440x900',
    browser: 'chromium',
    startedAt: '2026-10-26T07:30:00Z',
    finishedAt: '2026-10-26T07:48:12Z',
    duration: 1092,
    findingCount: 3,
    criticalCount: 0,
    environment: 'staging',
  },
  {
    id: 'run_0045',
    projectId: 'proj_demo_001',
    status: 'failed',
    targetUrl: 'https://staging.acme.demo',
    goal: 'Full regression sweep',
    viewport: '1440x900',
    browser: 'webkit',
    startedAt: '2026-10-26T04:00:00Z',
    finishedAt: '2026-10-26T04:14:00Z',
    duration: 840,
    findingCount: 5,
    criticalCount: 2,
    environment: 'staging',
  },
  {
    id: 'run_0044',
    projectId: 'proj_demo_001',
    status: 'completed',
    targetUrl: 'https://acme.demo',
    goal: 'Cart persistence and coupon validation',
    viewport: '1440x900',
    browser: 'chromium',
    startedAt: '2026-10-25T22:00:00Z',
    finishedAt: '2026-10-25T22:11:52Z',
    duration: 712,
    findingCount: 1,
    criticalCount: 0,
    environment: 'staging',
  },
  {
    id: 'run_0043',
    projectId: 'proj_demo_001',
    status: 'completed',
    targetUrl: 'https://acme.demo',
    goal: 'Accessibility audit — payment forms',
    viewport: '390x844',
    browser: 'chromium',
    startedAt: '2026-10-25T20:00:00Z',
    finishedAt: '2026-10-25T20:09:11Z',
    duration: 551,
    findingCount: 0,
    criticalCount: 0,
    environment: 'staging',
  },
];

export const DEMO_RUN_STAGES: RunStage[] = [
  { name: 'preflight',        label: 'Preflight',        status: 'done',    startedAt: '2026-10-26T09:48:00Z', completedAt: '2026-10-26T09:48:08Z' },
  { name: 'explore_login',    label: 'Explore login',    status: 'done',    startedAt: '2026-10-26T09:48:09Z', completedAt: '2026-10-26T09:49:35Z' },
  { name: 'checkout',         label: 'Checkout flow',    status: 'running', startedAt: '2026-10-26T09:49:36Z' },
  { name: 'responsive_checks',label: 'Responsive checks',status: 'pending' },
  { name: 'normalize',        label: 'Normalize evidence',status: 'pending' },
  { name: 'triage',           label: 'AI triage',        status: 'pending' },
];

export const DEMO_EVENTS: RunEvent[] = [
  { id: 'ev_001', runId: 'run_0047', seq: 1,  timestamp: '2026-10-26T09:48:00Z', type: 'run.created',           actor: 'Orchestrator', summary: 'Run created, preflight starting' },
  { id: 'ev_002', runId: 'run_0047', seq: 2,  timestamp: '2026-10-26T09:48:09Z', type: 'run.preflight.completed',actor: 'Orchestrator', summary: 'Preflight passed — target reachable, policy approved' },
  { id: 'ev_003', runId: 'run_0047', seq: 3,  timestamp: '2026-10-26T09:48:10Z', type: 'run.stage.started',     actor: 'Explorer',     summary: 'Exploration started: navigating to home page' },
  { id: 'ev_004', runId: 'run_0047', seq: 4,  timestamp: '2026-10-26T09:48:14Z', type: 'browser.action',        actor: 'Explorer',     summary: 'Navigated to https://acme.demo/checkout' },
  { id: 'ev_005', runId: 'run_0047', seq: 5,  timestamp: '2026-10-26T09:48:22Z', type: 'browser.action',        actor: 'Explorer',     summary: 'Found 12 interactive elements on checkout page' },
  { id: 'ev_006', runId: 'run_0047', seq: 6,  timestamp: '2026-10-26T09:49:05Z', type: 'run.stage.started',     actor: 'Checker',      summary: 'Testing form validation — Shipping Information' },
  { id: 'ev_007', runId: 'run_0047', seq: 7,  timestamp: '2026-10-26T09:49:08Z', type: 'browser.action',        actor: 'Checker',      summary: 'Filled test data into address fields' },
  { id: 'ev_008', runId: 'run_0047', seq: 8,  timestamp: '2026-10-26T09:49:12Z', type: 'browser.action',        actor: 'Checker',      summary: 'Clicked "Continue"' },
  { id: 'ev_009', runId: 'run_0047', seq: 9,  timestamp: '2026-10-26T09:49:15Z', type: 'console.error',         actor: 'Checker',      summary: 'Detected validation error — Credit card field rejecting valid numbers', findingId: 'finding_1024' },
  { id: 'ev_010', runId: 'run_0047', seq: 10, timestamp: '2026-10-26T09:49:17Z', type: 'browser.screenshot',    actor: 'Checker',      summary: 'Capturing screenshot of error state' },
  { id: 'ev_011', runId: 'run_0047', seq: 11, timestamp: '2026-10-26T09:49:20Z', type: 'browser.action',        actor: 'Checker',      summary: 'Analysing root cause' },
  { id: 'ev_012', runId: 'run_0047', seq: 12, timestamp: '2026-10-26T09:49:28Z', type: 'finding.created',       actor: 'Checker',      summary: 'Issue detected: Payment validation failed — Card number is being rejected', findingId: 'finding_1024' },
];

export const DEMO_FINDINGS: Finding[] = [
  {
    id: 'finding_1024',
    runId: 'run_0047',
    stableFingerprint: 'fp_checkout_cc_validation_001',
    title: 'Payment validation fails with valid credit card numbers',
    category: 'assertion',
    severity: 'critical',
    status: 'new',
    observed: 'Card number 4242 4242 4242 4242 is rejected with "Invalid card number" error on the checkout form.',
    expected: 'Valid Visa test numbers should be accepted by the payment form.',
    evidenceIds: ['ev_e001', 'ev_e002', 'ev_e003'],
    reproductionSteps: [
      'Go to https://acme.demo/checkout',
      'Fill in Shipping Information with valid test address',
      'Click "Continue"',
      'Enter card number: 4242 4242 4242 4242',
      'Enter expiry: 12/29, CVV: 123',
      'Observe: "Invalid card number" error appears immediately',
    ],
    hypotheses: [
      {
        text: 'The card input validation regex likely strips spaces before running the Luhn algorithm, but the UI formats the number with spaces (4242 4242 4242 4242) and the normalisation step is missing.',
        confidence: 0.82,
        evidenceIds: ['ev_e002'],
        contradictingEvidenceIds: [],
      },
    ],
    verified: false,
    firstSeen: '2026-10-26T09:49:15Z',
    lastSeen: '2026-10-26T09:49:28Z',
  },
  {
    id: 'finding_1023',
    runId: 'run_0047',
    stableFingerprint: 'fp_console_undefined_ref_002',
    title: 'Uncaught TypeError: Cannot read properties of undefined (reading "price")',
    category: 'console',
    severity: 'high',
    status: 'confirmed',
    observed: 'Console error thrown when navigating from cart to checkout when cart contains a product with a missing variant.',
    expected: null,
    evidenceIds: ['ev_e004'],
    reproductionSteps: [
      'Add any product to cart',
      'Navigate to /cart',
      'Remove the variant selector value',
      'Click "Proceed to Checkout"',
      'Observe console error in DevTools',
    ],
    hypotheses: [
      {
        text: 'The cart-to-checkout navigation handler accesses `item.variant.price` without a null guard, which throws if variant is undefined.',
        confidence: 0.71,
        evidenceIds: ['ev_e004'],
      },
    ],
    verified: false,
    firstSeen: '2026-10-26T09:48:55Z',
    lastSeen: '2026-10-26T09:48:55Z',
  },
];

export const DEMO_EVIDENCE: Evidence[] = [
  {
    id: 'ev_e001',
    runId: 'run_0047',
    findingId: 'finding_1024',
    kind: 'screenshot',
    timestamp: '2026-10-26T09:49:17Z',
    url: 'https://acme.demo/checkout',
    stepId: 'step_009',
    summary: 'Screenshot: Invalid card number error visible on payment form',
  },
  {
    id: 'ev_e002',
    runId: 'run_0047',
    findingId: 'finding_1024',
    kind: 'console',
    timestamp: '2026-10-26T09:49:15Z',
    url: 'https://acme.demo/checkout',
    stepId: 'step_009',
    summary: 'Console error: ValidationError: card number failed Luhn check',
  },
  {
    id: 'ev_e003',
    runId: 'run_0047',
    findingId: 'finding_1024',
    kind: 'network',
    timestamp: '2026-10-26T09:49:16Z',
    url: 'https://acme.demo/api/validate-card',
    stepId: 'step_009',
    summary: 'POST /api/validate-card → 400 Bad Request: {"error":"invalid_card_number"}',
  },
  {
    id: 'ev_e004',
    runId: 'run_0047',
    findingId: 'finding_1023',
    kind: 'console',
    timestamp: '2026-10-26T09:48:55Z',
    url: 'https://acme.demo/cart',
    stepId: 'step_007',
    summary: 'Uncaught TypeError: Cannot read properties of undefined (reading "price") at CartItem.js:42',
  },
];

export const DEMO_PATCH: PatchProposal = {
  id: 'patch_001',
  findingId: 'finding_1024',
  repository: 'acme-corp/storefront',
  branch: 'bugpilot/fix-card-validation-1024',
  commit: 'a7f3c81',
  revision: 'a7f3c81e9d4b2c58f7e6a1d3b9c4e0f2',
  diffText: `--- a/src/components/checkout/PaymentForm.tsx
+++ b/src/components/checkout/PaymentForm.tsx
@@ -34,7 +34,8 @@ export function validateCardNumber(raw: string): boolean {
-  const digits = raw.replace(/\\D/g, '');
+  // Normalise: strip spaces and dashes before Luhn check
+  const digits = raw.replace(/[\\s-]/g, '').replace(/\\D/g, '');
   if (digits.length < 13 || digits.length > 19) return false;
   return luhnCheck(digits);
 }`,
  explanation: 'The card validation function used `\\D` (non-digits) but the formatted input contains spaces between groups. Adding `[\\s-]` normalisation before the Luhn check allows properly formatted card numbers to pass.',
  risks: ['Ensure the API endpoint also strips spaces server-side to prevent divergence.'],
  limitations: ['Only tested against Luhn-valid test numbers. Should be verified with the full card network test suite.'],
  status: 'proposed',
  createdAt: '2026-10-26T09:52:00Z',
};

export const DEMO_VERIFICATION: VerificationCheck[] = [
  { id: 'vc_001', patchProposalId: 'patch_001', checkName: 'TypeScript build', status: 'not_run' },
  { id: 'vc_002', patchProposalId: 'patch_001', checkName: 'Unit tests: validateCardNumber', status: 'not_run' },
  { id: 'vc_003', patchProposalId: 'patch_001', checkName: 'ESLint', status: 'not_run' },
  { id: 'vc_004', patchProposalId: 'patch_001', checkName: 'BugPilot rerun — checkout flow', status: 'not_run' },
];

export const DEMO_JOURNEYS: Journey[] = [
  {
    id: 'journey_001',
    projectId: 'proj_demo_001',
    name: 'New user checkout with valid card',
    goal: 'Verify the end-to-end purchase flow succeeds for a new guest user',
    startingUrl: 'https://acme.demo/products',
    stepsJson: [
      { index: 0, action: 'navigate', url: 'https://acme.demo/products' },
      { index: 1, action: 'click', selector: '[data-testid="add-to-cart"]' },
      { index: 2, action: 'navigate', url: 'https://acme.demo/checkout' },
      { index: 3, action: 'fill', selector: '#card-number', value: '4242 4242 4242 4242' },
      { index: 4, action: 'assert', assertion: 'Order confirmation visible' },
    ],
    version: 3,
    lastRunId: 'run_0047',
    lastRunStatus: 'running',
    reliability: 0.91,
    lastChanged: '2026-10-25T14:20:00Z',
  },
  {
    id: 'journey_002',
    projectId: 'proj_demo_001',
    name: 'Checkout rejects invalid card',
    goal: 'Payment form should reject clearly invalid card numbers with a meaningful error',
    startingUrl: 'https://acme.demo/checkout',
    stepsJson: [
      { index: 0, action: 'navigate', url: 'https://acme.demo/checkout' },
      { index: 1, action: 'fill', selector: '#card-number', value: '0000 0000 0000 0000' },
      { index: 2, action: 'assert', assertion: '"Invalid card" error appears' },
    ],
    version: 1,
    lastRunStatus: 'completed',
    reliability: 1.0,
    lastChanged: '2026-10-24T10:00:00Z',
  },
];

export const DEMO_COVERAGE: CoverageArea[] = [
  { url: 'https://acme.demo/',          path: '/',          label: 'Home',             visited: true,  tested: true,  riskLevel: 'medium' },
  { url: 'https://acme.demo/products',  path: '/products',  label: 'Products list',    visited: true,  tested: true,  riskLevel: 'medium' },
  { url: 'https://acme.demo/cart',      path: '/cart',      label: 'Cart',             visited: true,  tested: true,  riskLevel: 'high',   notes: 'TypeError found during run_0047' },
  { url: 'https://acme.demo/checkout',  path: '/checkout',  label: 'Checkout',         visited: true,  tested: true,  riskLevel: 'high',   notes: 'Card validation bug found' },
  { url: 'https://acme.demo/account',   path: '/account',   label: 'Account',          visited: false, tested: false, riskLevel: 'medium' },
  { url: 'https://acme.demo/orders',    path: '/orders',    label: 'Order history',    visited: false, tested: false, riskLevel: 'low' },
  { url: 'https://acme.demo/reset',     path: '/reset',     label: 'Password reset',   visited: false, tested: false, riskLevel: 'high',   notes: 'No test covers password reset after expired session' },
];
