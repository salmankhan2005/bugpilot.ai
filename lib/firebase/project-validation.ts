import { parseTargetUrl } from '@/lib/local-worker/security';

export type ProjectEnvironment = 'preview' | 'staging' | 'production';

export type ProjectInput = {
  name: string;
  targetUrl: string;
  environment: ProjectEnvironment;
};

export class ProjectValidationError extends Error {}

export function parseProjectInput(value: unknown): ProjectInput {
  if (!isRecord(value)) throw new ProjectValidationError('Enter valid project details.');

  const name = typeof value.name === 'string' ? value.name.trim() : '';
  if (!name || name.length > 100) {
    throw new ProjectValidationError('Project name must be between 1 and 100 characters.');
  }

  let target: URL;
  try {
    target = parseTargetUrl(value.targetUrl);
  } catch (error) {
    throw new ProjectValidationError(error instanceof Error ? error.message : 'Enter a valid target URL.');
  }

  const environment = value.environment;
  if (environment !== 'preview' && environment !== 'staging' && environment !== 'production') {
    throw new ProjectValidationError('Choose a valid project environment.');
  }

  return {
    name,
    targetUrl: target.toString(),
    environment,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
