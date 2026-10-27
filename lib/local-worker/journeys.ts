import { queryLocalDatabase } from './database';

export interface SavedJourney {
  id: string;
  name: string;
  startPath: string;
  startUrl: string;
  goal: string;
  createdAt: string;
}

export interface SavedJourneyInput {
  name: string;
  startPath: string;
  goal: string;
}

export class JourneyValidationError extends Error {}

export function parseSavedJourneyInput(value: unknown, projectTargetUrl: string): SavedJourneyInput {
  if (!isRecord(value)) throw new JourneyValidationError('Enter valid journey details.');
  const name = typeof value.name === 'string' ? value.name.trim() : '';
  const startPath = typeof value.startPath === 'string' ? value.startPath.trim() : '';
  const goal = typeof value.goal === 'string' ? value.goal.trim() : '';

  if (!name || name.length > 100) {
    throw new JourneyValidationError('Journey name must be between 1 and 100 characters.');
  }
  if (!goal || goal.length > 2_000) {
    throw new JourneyValidationError('Journey objective must be between 1 and 2,000 characters.');
  }
  if (!startPath.startsWith('/') || startPath.startsWith('//') || startPath.length > 2_048) {
    throw new JourneyValidationError('Start path must be a same-origin path beginning with one slash.');
  }

  let base: URL;
  let target: URL;
  try {
    base = new URL(projectTargetUrl);
    target = new URL(startPath, base);
  } catch {
    throw new JourneyValidationError('Enter a valid same-origin start path.');
  }
  if (target.origin !== base.origin || target.search || target.hash || target.username || target.password) {
    throw new JourneyValidationError('Journey start paths cannot change origin or include query parameters or fragments.');
  }

  return { name, startPath: target.pathname, goal };
}

export async function listUserProjectJourneys(
  uid: string,
  projectId: string,
  projectTargetUrl: string,
): Promise<SavedJourney[]> {
  const result = await queryLocalDatabase<{
    id: string;
    name: string;
    start_path: string;
    goal: string;
    created_at: Date;
  }>(
    `SELECT id, name, start_path, goal, created_at
     FROM bp_local_journeys
     WHERE owner_uid = $1 AND project_id = $2
     ORDER BY created_at DESC`,
    [uid, projectId],
  );
  const base = new URL(projectTargetUrl);
  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    startPath: row.start_path,
    startUrl: new URL(row.start_path, base).toString(),
    goal: row.goal,
    createdAt: row.created_at.toISOString(),
  }));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
