export interface FindingDiagnosisHypothesis {
  claim: string;
  confidence: number;
  evidenceRefs: string[];
}

export interface FindingDiagnosis {
  summary: string;
  hypotheses: FindingDiagnosisHypothesis[];
  nextChecks: string[];
  limitations: string[];
}

const MAX_HYPOTHESES = 3;
const MAX_NEXT_CHECKS = 4;
const MAX_LIMITATIONS = 4;
const MAX_TEXT_LENGTH = 600;

export function parseFindingDiagnosis(
  value: unknown,
  allowedEvidenceRefs: ReadonlySet<string>,
): FindingDiagnosis {
  if (!isRecord(value)) throw new Error('Diagnosis output must be a JSON object.');
  const summary = readText(value.summary, 'summary', 1000);
  if (!Array.isArray(value.hypotheses) || value.hypotheses.length > MAX_HYPOTHESES) {
    throw new Error('Diagnosis output contains an invalid hypotheses list.');
  }
  if (!Array.isArray(value.nextChecks) || value.nextChecks.length > MAX_NEXT_CHECKS) {
    throw new Error('Diagnosis output contains an invalid next-checks list.');
  }
  if (!Array.isArray(value.limitations) || value.limitations.length > MAX_LIMITATIONS) {
    throw new Error('Diagnosis output contains an invalid limitations list.');
  }

  const hypotheses = value.hypotheses.map((item): FindingDiagnosisHypothesis => {
    if (!isRecord(item)) throw new Error('Diagnosis hypothesis must be an object.');
    const claim = readText(item.claim, 'hypothesis claim', MAX_TEXT_LENGTH);
    if (typeof item.confidence !== 'number' || !Number.isFinite(item.confidence)
      || item.confidence < 0 || item.confidence > 1) {
      throw new Error('Diagnosis hypothesis confidence must be between 0 and 1.');
    }
    if (!Array.isArray(item.evidenceRefs) || item.evidenceRefs.length > 10) {
      throw new Error('Diagnosis hypothesis references unknown evidence.');
    }
    const evidenceRefs = item.evidenceRefs.map((ref) => {
      if (typeof ref !== 'string' || !allowedEvidenceRefs.has(ref)) {
        throw new Error('Diagnosis hypothesis references unknown evidence.');
      }
      return ref;
    });
    return { claim, confidence: item.confidence, evidenceRefs };
  });

  return {
    summary,
    hypotheses,
    nextChecks: value.nextChecks.map((item) => readText(item, 'next check', MAX_TEXT_LENGTH)),
    limitations: value.limitations.map((item) => readText(item, 'limitation', MAX_TEXT_LENGTH)),
  };
}

export function isFindingDiagnosis(value: unknown): value is FindingDiagnosis {
  try {
    if (!isRecord(value) || !Array.isArray(value.hypotheses)) return false;
    const allowedEvidenceRefs = new Set(
      value.hypotheses.flatMap((item) =>
        isRecord(item) && Array.isArray(item.evidenceRefs)
          ? item.evidenceRefs.filter((ref): ref is string => typeof ref === 'string')
          : [],
      ),
    );
    parseFindingDiagnosis(value, allowedEvidenceRefs);
    return true;
  } catch {
    return false;
  }
}

function readText(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== 'string' || !value.trim() || value.length > maxLength) {
    throw new Error(`Diagnosis ${field} must be a non-empty string under ${maxLength} characters.`);
  }
  return value.trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
