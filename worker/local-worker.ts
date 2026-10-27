import { randomUUID } from 'node:crypto';
import { isIP } from 'node:net';
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import { Worker } from 'bullmq';
import { processFindingDiagnosis } from '../lib/local-worker/finding-diagnoses';
import { recordLocalRunRoute } from '../lib/local-worker/route-coverage';
import { appendLocalRunEvent } from '../lib/local-worker/events';
import { classifyBrowserFindingSignal } from '../lib/local-worker/finding-classifier';
import { persistBrowserFinding } from '../lib/local-worker/run-findings';
import {
  blockLocalRunVerification,
  finishLocalRunVerification,
  startLocalRunVerification,
} from '../lib/local-worker/run-verifications';
import { getLocalDatabase } from '../lib/local-worker/database';
import { LOCAL_RUN_QUEUE, getLocalRedis } from '../lib/local-worker/queue';
import { evaluateVerificationResult } from '../lib/local-worker/verification-result';
import { normalizeRunFieldValues, type RunFieldValue } from '../lib/local-worker/run-field-values';
import {
  getAllowedOrigins,
  resolveAllowedBrowserAddresses,
  redactText,
  sanitizeUrl,
} from '../lib/local-worker/security';

interface RunRecord {
  id: string;
  status: 'queued' | 'cancel_requested';
  target_url: string;
  goal: string;
  viewport: 'desktop' | 'tablet' | 'mobile';
  browser: 'chromium';
  max_duration_seconds: number;
  max_pages: number;
  field_values: RunFieldValue[] | string | null;
  verification_finding_id: string | null;
  verification_fingerprint: string | null;
}

interface QueueJob {
  runId?: string;
  diagnosisId?: string;
}

const viewportSizes = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 390, height: 844 },
} as const;

async function executeRun(runId: string): Promise<void> {
  const pool = getLocalDatabase();
  const runResult = await pool.query<RunRecord>(
    `SELECT r.id, r.status, r.target_url, r.goal, r.viewport, r.browser,
            r.max_duration_seconds, r.max_pages, r.field_values,
            v.finding_id AS verification_finding_id, f.fingerprint AS verification_fingerprint
     FROM bp_local_runs r
     LEFT JOIN bp_local_run_verifications v ON v.run_id = r.id
     LEFT JOIN bp_local_run_findings f ON f.id = v.finding_id
     WHERE r.id = $1 AND r.status IN ('queued', 'cancel_requested')`,
    [runId],
  );
  const run = runResult.rows[0];
  if (!run) return;
  const fieldValues = normalizeRunFieldValues(
    typeof run.field_values === 'string' ? JSON.parse(run.field_values) as unknown : run.field_values ?? [],
  );

  if (run.status === 'cancel_requested') {
    await pool.query(
      `UPDATE bp_local_runs SET status = 'cancelled', finished_at = now()
       WHERE id = $1 AND status = 'cancel_requested'`,
      [runId],
    );
    if (run.verification_finding_id) {
      await blockLocalRunVerification(runId, 'The verification run was cancelled before the browser started.');
    }
    await appendLocalRunEvent(runId, 'run.cancelled', 'Orchestrator', 'Run was cancelled before the browser started.');
    return;
  }

  const startedAt = Date.now();
  const timeoutAt = startedAt + run.max_duration_seconds * 1000;
  const target = new URL(run.target_url);
  let browser: Browser | undefined;
  let context: BrowserContext | undefined;
  let flushTelemetry = async () => {};
  let cancelled = false;
  let cancelPollBusy = false;

  const startUpdate = await pool.query(
    `UPDATE bp_local_runs SET status = 'running', started_at = now()
     WHERE id = $1 AND status = 'queued'
     RETURNING id`,
    [runId],
  );
  if (startUpdate.rowCount === 0) {
    const current = await pool.query<{ status: string }>(
      'SELECT status FROM bp_local_runs WHERE id = $1',
      [runId],
    );
    if (current.rows[0]?.status === 'cancel_requested') {
      await pool.query(
        `UPDATE bp_local_runs SET status = 'cancelled', finished_at = now()
         WHERE id = $1 AND status = 'cancel_requested'`,
        [runId],
      );
      if (run.verification_finding_id) {
        await blockLocalRunVerification(runId, 'The verification run was cancelled before the browser started.');
      }
      await appendLocalRunEvent(runId, 'run.cancelled', 'Orchestrator', 'Run was cancelled before the browser started.');
    }
    return;
  }
  const cancelTimer = setInterval(() => {
    if (cancelPollBusy || cancelled) return;
    cancelPollBusy = true;
    void pool.query<{ status: string }>(
      'SELECT status FROM bp_local_runs WHERE id = $1',
      [runId],
    ).then(async (result) => {
      if (result.rows[0]?.status === 'cancel_requested') {
        cancelled = true;
        await browser?.close();
      }
    }).catch((error: unknown) => {
      console.error(`Could not check cancellation for ${runId}:`, error);
    }).finally(() => {
      cancelPollBusy = false;
    });
  }, 750);

  const emit = async (type: string, actor: string, summary: string, payload: Record<string, unknown> = {}) => {
    const event = await appendLocalRunEvent(runId, type, actor, summary, payload);
    const finding = classifyBrowserFindingSignal(type, summary, payload);
    if (finding) await persistBrowserFinding(runId, event, finding);
    return event;
  };

  try {
    await appendLocalRunEvent(runId, 'run.stage.started', 'Explorer', 'Local Chromium worker started.');
    if (run.verification_finding_id) await startLocalRunVerification(runId);
    const targetAddresses = await resolveAllowedBrowserAddresses(run.target_url, new Set([target.origin]));
    if (!targetAddresses) {
      throw new Error('The target resolves to a private or blocked network address.');
    }
    const browserAllowedOrigins = new Set([target.origin]);
    const addressByHost = new Map<string, string>();
    const targetHostname = target.hostname.replace(/^\[|\]$/g, '');
    if (isIP(targetHostname) === 0) addressByHost.set(targetHostname, targetAddresses[0]);
    for (const origin of getAllowedOrigins()) {
      const url = new URL(origin);
      const hostname = url.hostname.replace(/^\[|\]$/g, '');
      const addresses = await resolveAllowedBrowserAddresses(origin, new Set([origin]));
      if (!addresses) continue;
      browserAllowedOrigins.add(origin);
      if (isIP(hostname) === 0 && !addressByHost.has(hostname)) {
        addressByHost.set(hostname, addresses[0]);
      }
    }
    const resolverMappings = [...addressByHost]
      .map(([hostname, address]) => `MAP ${hostname} ${address.includes(':') ? `[${address}]` : address}`);
    const hostResolverRules = resolverMappings.length > 0
      ? `--host-resolver-rules=${[...resolverMappings, 'MAP * ~NOTFOUND'].join(',')}`
      : undefined;
    browser = await chromium.launch({
      headless: process.env.LOCAL_WORKER_HEADED !== 'true',
      args: hostResolverRules ? [hostResolverRules] : [],
    });
    context = await browser.newContext({
      viewport: viewportSizes[run.viewport],
      acceptDownloads: false,
      serviceWorkers: 'block',
    });
    await context.route('**/*', async (route) => {
      let requestedUrl: URL;
      try {
        requestedUrl = new URL(route.request().url());
      } catch {
        await route.abort('blockedbyclient');
        return;
      }
      if (!browserAllowedOrigins.has(requestedUrl.origin)
        || requestedUrl.username
        || requestedUrl.password) {
        await route.abort('blockedbyclient');
        return;
      }
      await route.continue();
    });

    const page = await context.newPage();
    await page.addInitScript(() => {
      const installCursor = () => {
        if (document.getElementById('__bugpilot_run_cursor')) return;
        const cursor = document.createElement('div');
        cursor.id = '__bugpilot_run_cursor';
        cursor.setAttribute('aria-hidden', 'true');
        cursor.style.cssText = [
          'position:fixed',
          'z-index:2147483647',
          'left:0',
          'top:0',
          'width:18px',
          'height:18px',
          'border:2px solid #fff',
          'border-radius:50%',
          'background:rgba(255,60,60,.75)',
          'box-shadow:0 0 0 2px rgba(0,0,0,.7),0 2px 8px rgba(0,0,0,.45)',
          'pointer-events:none',
          'transform:translate(-100px,-100px)',
          'transition:transform 90ms linear',
        ].join(';');
        document.documentElement.appendChild(cursor);
        window.addEventListener('mousemove', (event) => {
          cursor.style.transform = `translate(${event.clientX - 9}px,${event.clientY - 9}px)`;
        }, { passive: true });
      };
      if (document.documentElement) installCursor();
      else document.addEventListener('DOMContentLoaded', installCursor, { once: true });
    });
    flushTelemetry = attachPageTelemetry(page, runId, emit);

    const visited = new Set<string>();
    const pending = [target.toString()];
    const remainingFieldValues = new Map(fieldValues.map((field) => [field.label, field]));
    let pagesLoaded = 0;

    await emit('run.stage.started', 'Explorer', 'Beginning bounded, same-origin page discovery.', {
      viewport: run.viewport,
      goal: redactText(run.goal, 300),
    });

    while (pending.length > 0 && visited.size < run.max_pages && Date.now() < timeoutAt) {
      if (cancelled) throw new Error('RUN_CANCELLED');
      const nextUrl = pending.shift();
      if (!nextUrl || visited.has(nextUrl)) continue;
      visited.add(nextUrl);

      await emit('browser.action', 'Explorer', `Navigating to ${sanitizeUrl(nextUrl)}.`);
      const navigationTimeout = Math.min(30_000, Math.max(1_000, timeoutAt - Date.now()));
      try {
        const response = await page.goto(nextUrl, { waitUntil: 'domcontentloaded', timeout: navigationTimeout });
        await recordLocalRunRoute(runId, target.origin, page.url(), 'loaded', response?.status() ?? null);
        pagesLoaded += 1;
      } catch (error) {
        if (cancelled) throw new Error('RUN_CANCELLED');
        await recordLocalRunRoute(runId, target.origin, nextUrl, 'failed', null);
        const message = error instanceof Error ? error.message : 'Navigation failed.';
        await emit('network.request.failed', 'Explorer', redactText(message), {
          url: sanitizeUrl(nextUrl),
        });
        continue;
      }

      await emit('browser.action', 'Explorer', `Loaded ${sanitizeUrl(page.url())}.`, {
        pageTitle: redactText(await page.title(), 200),
      });
      await page.mouse.move(40, 40, { steps: 8 });

      const handledFieldLabels = await validateRunFieldValues(
        page,
        [...remainingFieldValues.values()],
        runId,
        emit,
      );
      for (const label of handledFieldLabels) {
        remainingFieldValues.delete(label);
      }
      if (handledFieldLabels.size === 0) {
        await saveScreenshot(page, runId, emit);
      }

      const discoveredUrls = await page.locator('a[href]').evaluateAll((anchors) =>
        anchors
          .map((anchor) => (anchor as HTMLAnchorElement).href)
          .filter(Boolean),
      );
      for (const href of discoveredUrls) {
        if (pending.length + visited.size >= run.max_pages * 2) break;
        try {
          const candidate = new URL(href);
          candidate.hash = '';
          if (candidate.origin === target.origin
            && !visited.has(candidate.toString())
            && !pending.includes(candidate.toString())) {
            pending.push(candidate.toString());
          }
        } catch {
          // Ignore malformed links discovered in the page.
        }
      }
    }

    for (const field of remainingFieldValues.values()) {
      await emit('browser.value.failed', 'Explorer', `Could not find a uniquely labeled field for "${field.label}" on any visited page.`, {
        fieldLabel: field.label,
      });
    }

    await context.close();
    context = undefined;
    await browser?.close();
    browser = undefined;
    await flushTelemetry();
    if (cancelled) throw new Error('RUN_CANCELLED');
    const wasTimedOut = Date.now() >= timeoutAt;
    if (wasTimedOut) {
      await emit('run.stage.started', 'Orchestrator', 'Run reached its configured time limit.');
    }

    if (run.verification_finding_id) {
      if (!run.verification_fingerprint) {
        throw new Error('Verification finding fingerprint is unavailable.');
      }
      const reproduced = await pool.query<{ found: boolean }>(
        `SELECT EXISTS (
           SELECT 1 FROM bp_local_run_findings
           WHERE run_id = $1 AND fingerprint = $2
         ) AS found`,
        [runId, run.verification_fingerprint],
      );
      await finishLocalRunVerification(runId, evaluateVerificationResult({
        findingReproduced: reproduced.rows[0]?.found === true,
        pagesLoaded,
        timedOut: wasTimedOut,
      }), wasTimedOut ? 'timed_out' : 'completed');
    } else {
      const terminalStatus = wasTimedOut ? 'timed_out' : 'completed';
      const terminalUpdate = await pool.query(
        `UPDATE bp_local_runs
         SET status = $2, finished_at = now()
         WHERE id = $1 AND status = 'running'
         RETURNING status`,
        [runId, terminalStatus],
      );
      if (terminalUpdate.rowCount === 0) {
        const current = await pool.query<{ status: string }>(
          'SELECT status FROM bp_local_runs WHERE id = $1',
          [runId],
        );
        if (current.rows[0]?.status === 'cancelled') {
          cancelled = true;
          throw new Error('RUN_CANCELLED');
        }
        throw new Error('Run state changed before completion could be persisted.');
      }
    }
    if (wasTimedOut) {
      await emit('run.timed_out', 'Orchestrator', `Run reached its configured time limit after visiting ${visited.size} page(s).`, {
        pagesVisited: visited.size,
        timedOut: true,
      });
    } else {
      await emit('run.completed', 'Orchestrator', `Run completed after visiting ${visited.size} page(s).`, {
        pagesVisited: visited.size,
        timedOut: false,
      });
    }
  } catch (error) {
    const currentStatus = await pool.query<{ status: string }>(
      'SELECT status FROM bp_local_runs WHERE id = $1',
      [runId],
    );
    if (cancelled
      || currentStatus.rows[0]?.status === 'cancel_requested'
      || currentStatus.rows[0]?.status === 'cancelled'
      || (error instanceof Error && error.message === 'RUN_CANCELLED')) {
      cancelled = true;
      await pool.query(
        `UPDATE bp_local_runs SET status = 'cancelled', finished_at = now()
         WHERE id = $1 AND status IN ('running', 'cancel_requested')`,
        [runId],
      );
      if (run.verification_finding_id) {
        await blockLocalRunVerification(runId, 'The verification run was cancelled before the check completed.');
      }
      await emit('run.cancelled', 'Orchestrator', 'Local browser stopped after cancellation.');
      return;
    }

    const message = redactText(error instanceof Error ? error.message : 'Browser run failed.');
    await pool.query(
      `UPDATE bp_local_runs
       SET status = 'failed', failure_reason = $2, finished_at = now()
       WHERE id = $1 AND status = 'running'`,
      [runId, message],
    );
    if (run.verification_finding_id) {
      await blockLocalRunVerification(runId, 'The verification run failed before the check could complete.');
    }
    await emit('run.failed', 'Orchestrator', message);
    throw error;
  } finally {
    clearInterval(cancelTimer);
    await context?.close().catch((error: unknown) => {
      console.error(`Could not close browser context for ${runId}:`, error);
    });
    await browser?.close().catch((error: unknown) => {
      console.error(`Could not close browser for ${runId}:`, error);
    });
  }
}

function attachPageTelemetry(
  page: Page,
  runId: string,
  emit: (type: string, actor: string, summary: string, payload?: Record<string, unknown>) => Promise<unknown>,
): () => Promise<void> {
  const pending = new Set<{ task: Promise<void> }>();
  let telemetryFailed = false;
  const record = (promise: Promise<unknown>, type: string) => {
    const entry: { task: Promise<void> } = { task: Promise.resolve() };
    entry.task = promise.then(() => undefined).catch((error: unknown) => {
      telemetryFailed = true;
      console.error(`Could not persist ${type} event for ${runId}:`, error);
    }).finally(() => pending.delete(entry));
    pending.add(entry);
  };

  page.on('console', (message) => {
    if (message.type() === 'error') {
      record(emit('console.error', 'Checker', redactText(message.text()), {
        url: sanitizeUrl(page.url()),
      }), 'console.error');
    }
  });

  page.on('pageerror', (error) => {
    record(emit('console.error', 'Checker', redactText(error.message), {
      url: sanitizeUrl(page.url()),
    }), 'pageerror');
  });

  page.on('requestfailed', (request) => {
    record(emit('network.request.failed', 'Checker', redactText(
      request.failure()?.errorText || 'Network request failed.',
    ), {
      url: sanitizeUrl(request.url()),
      method: request.method(),
    }), 'requestfailed');
  });

  page.on('response', (response) => {
    if (response.status() >= 400) {
      record(emit('network.request.failed', 'Checker', `HTTP ${response.status()} response.`, {
        url: sanitizeUrl(response.url()),
        status: response.status(),
      }), 'response');
    }
  });

  return async () => {
    while (pending.size > 0) {
      await Promise.all([...pending].map(({ task }) => task));
    }
    if (telemetryFailed) throw new Error(`Could not persist browser telemetry for ${runId}.`);
  };
}

async function validateRunFieldValues(
  page: Page,
  fieldValues: RunFieldValue[],
  runId: string,
  emit: (type: string, actor: string, summary: string, payload?: Record<string, unknown>) => Promise<unknown>,
): Promise<Set<string>> {
  const handled = new Set<string>();
  for (const field of fieldValues) {
    const locator = page.getByLabel(field.label, { exact: true });
    const count = await locator.count();
    if (count === 0) continue;
    handled.add(field.label);
    if (count !== 1) {
      await emit('browser.value.failed', 'Explorer', `Found more than one field labeled "${field.label}".`, {
        fieldLabel: field.label,
      });
      await saveScreenshot(page, runId, emit);
      continue;
    }

    try {
      const descriptor = await locator.evaluate((element) => ({
        tagName: element.tagName.toLowerCase(),
        inputType: element instanceof HTMLInputElement ? element.type : '',
      }));
      const bounds = await locator.boundingBox();
      if (!bounds) throw new Error('not_visible');
      await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2, { steps: 8 });

      let actualValue: string;
      if (descriptor.inputType === 'checkbox' || descriptor.inputType === 'radio') {
        if (field.value !== 'true' && field.value !== 'false') {
          throw new Error('boolean_value_required');
        }
        await locator.setChecked(field.value === 'true');
        actualValue = String(await locator.isChecked());
      } else if (descriptor.tagName === 'select') {
        await locator.selectOption(field.value);
        actualValue = await locator.inputValue();
      } else if (descriptor.tagName === 'input' || descriptor.tagName === 'textarea') {
        await locator.fill(field.value);
        actualValue = await locator.inputValue();
      } else {
        throw new Error('unsupported_control');
      }

      const fieldValid = await locator.evaluate((element) =>
        element instanceof HTMLInputElement
          || element instanceof HTMLSelectElement
          || element instanceof HTMLTextAreaElement
          ? element.checkValidity()
          : false);
      const matches = actualValue === field.value;
      const passed = matches && fieldValid;
      await emit(passed ? 'browser.value.validated' : 'browser.value.failed', 'Explorer',
        passed
          ? `Entered and validated "${field.label}".`
          : `Entered "${field.label}", but the value did not match or the browser marked the field invalid.`,
        { fieldLabel: field.label, matches, fieldValid });
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'unknown_error';
      const summaries: Record<string, string> = {
        not_visible: 'the field is not visible',
        boolean_value_required: 'checkbox and radio values must be "true" or "false"',
        unsupported_control: 'the field type is not supported',
      };
      await emit('browser.value.failed', 'Explorer',
        `Could not validate "${field.label}": ${summaries[reason] ?? 'the browser could not interact with the field'}.`,
        { fieldLabel: field.label });
    }
    await saveScreenshot(page, runId, emit);
  }
  return handled;
}

async function saveScreenshot(
  page: Page,
  runId: string,
  emit: (type: string, actor: string, summary: string, payload?: Record<string, unknown>) => Promise<unknown>,
): Promise<void> {
  const screenshot = await page.screenshot({ type: 'png', fullPage: false });
  if (screenshot.byteLength > 5 * 1024 * 1024) {
    await emit('browser.screenshot', 'Evidence Collector', 'Screenshot exceeded the 5 MB artifact limit.');
    return;
  }

  const artifactId = randomUUID();
  await getLocalDatabase().query(
    `INSERT INTO bp_local_run_artifacts (id, run_id, kind, mime_type, content)
     VALUES ($1, $2, 'screenshot', 'image/png', $3)`,
    [artifactId, runId, screenshot],
  );
  await emit('browser.screenshot', 'Evidence Collector', `Captured the viewport for ${sanitizeUrl(page.url())}.`, {
    artifactId,
  });
}

function validateWorkerEnvironment(): void {
  if (process.env.LOCAL_WORKER_ENABLED !== 'true') {
    throw new Error('Set LOCAL_WORKER_ENABLED=true before starting the local Playwright worker.');
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('The local Playwright worker cannot start in production mode.');
  }
  getAllowedOrigins();
  getLocalDatabase();
}

async function main(): Promise<void> {
  validateWorkerEnvironment();
  const connection = getLocalRedis();
  const worker = new Worker<QueueJob>(
    LOCAL_RUN_QUEUE,
    async (job) => {
      if (job.name === 'execute-run' && job.data.runId) {
        await executeRun(job.data.runId);
        return;
      }
      if (job.name === 'diagnose-finding' && job.data.diagnosisId) {
        await processFindingDiagnosis(job.data.diagnosisId);
        return;
      }
      throw new Error(`Unsupported local worker job: ${job.name}.`);
    },
    {
      connection,
      concurrency: 1,
      lockDuration: 60_000,
    },
  );

  worker.on('ready', () => console.log('Local Playwright worker is ready (concurrency: 1).'));
  worker.on('failed', (job, error) => {
    console.error(`Local worker job ${job?.name ?? '[unknown]'} failed:`, error);
  });
  worker.on('error', (error) => {
    console.error('Local Playwright worker error:', error);
  });

  const shutdown = async () => {
    console.log('Stopping local Playwright worker...');
    await worker.close();
    await connection.quit();
    await getLocalDatabase().end();
  };
  process.once('SIGINT', () => void shutdown().finally(() => process.exit(0)));
  process.once('SIGTERM', () => void shutdown().finally(() => process.exit(0)));
}

main().catch((error: unknown) => {
  console.error('Could not start local Playwright worker:', error);
  process.exitCode = 1;
});
