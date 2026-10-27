export type VerificationStatus = 'passed' | 'failed' | 'blocked';

export interface VerificationResult {
  status: VerificationStatus;
  findingReproduced: boolean | null;
  detail: string;
}

export function evaluateVerificationResult(input: {
  findingReproduced: boolean;
  pagesLoaded: number;
  timedOut: boolean;
}): VerificationResult {
  if (input.findingReproduced) {
    return {
      status: 'failed',
      findingReproduced: true,
      detail: 'The exact browser signal was reproduced in this verification run.',
    };
  }

  if (input.timedOut) {
    return {
      status: 'blocked',
      findingReproduced: null,
      detail: 'The run timed out before it could complete a fresh verification.',
    };
  }

  if (input.pagesLoaded < 1) {
    return {
      status: 'blocked',
      findingReproduced: null,
      detail: 'No page loaded successfully, so the finding could not be verified.',
    };
  }

  return {
    status: 'passed',
    findingReproduced: false,
    detail: 'The exact browser signal was not observed during this fresh run.',
  };
}
