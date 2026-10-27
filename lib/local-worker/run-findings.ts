import { randomUUID } from 'node:crypto';
import { appendLocalRunEvent, type LocalRunEvent } from './events';
import type { BrowserFindingSignal } from './finding-classifier';
import { getLocalDatabase } from './database';

export async function persistBrowserFinding(
  runId: string,
  sourceEvent: LocalRunEvent,
  finding: BrowserFindingSignal,
): Promise<string | null> {
  const result = await getLocalDatabase().query<{ id: string }>(
    `INSERT INTO bp_local_run_findings
       (id, run_id, fingerprint, source_event_seq, category, severity, status, title, observed, source_url)
     VALUES ($1, $2, $3, $4, $5, $6, 'needs_review', $7, $8, $9)
     ON CONFLICT (run_id, fingerprint) DO NOTHING
     RETURNING id`,
    [
      randomUUID(),
      runId,
      finding.fingerprint,
      sourceEvent.seq,
      finding.category,
      finding.severity,
      finding.title,
      finding.observed,
      finding.sourceUrl,
    ],
  );
  const findingId = result.rows[0]?.id;
  if (!findingId) return null;

  await appendLocalRunEvent(
    runId,
    'finding.created',
    'Checker',
    `${finding.title} recorded for review.`,
    {
      findingId,
      category: finding.category,
      severity: finding.severity,
      sourceEventSeq: sourceEvent.seq,
    },
  );
  return findingId;
}
