export interface RunFieldValue {
  label: string;
  value: string;
}

const MAX_FIELD_COUNT = 20;
const MAX_LABEL_LENGTH = 100;
const MAX_VALUE_LENGTH = 500;

export function normalizeRunFieldValues(input: unknown): RunFieldValue[] {
  if (input === undefined) return [];
  if (!Array.isArray(input) || input.length > MAX_FIELD_COUNT) {
    throw new Error(`Provide no more than ${MAX_FIELD_COUNT} labeled field values.`);
  }

  const labels = new Set<string>();
  return input.map((item, index) => {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      throw new Error(`Field value ${index + 1} must include a label and value.`);
    }

    const record = item as Record<string, unknown>;
    const label = typeof record.label === 'string' ? record.label.trim() : '';
    const value = typeof record.value === 'string' ? record.value : '';
    const normalizedLabel = label.toLocaleLowerCase();
    if (!label || label.length > MAX_LABEL_LENGTH) {
      throw new Error(`Field ${index + 1} label must be between 1 and ${MAX_LABEL_LENGTH} characters.`);
    }
    if (value.length > MAX_VALUE_LENGTH) {
      throw new Error(`Value for "${label}" must be ${MAX_VALUE_LENGTH} characters or fewer.`);
    }
    if (labels.has(normalizedLabel)) {
      throw new Error(`Field label "${label}" is duplicated.`);
    }
    labels.add(normalizedLabel);
    return { label, value };
  });
}

export function parseRunGoalFieldValues(goal: string): RunFieldValue[] {
  const lines = goal.split(/\r?\n/);
  const headerIndex = lines.findIndex((line) => line.trim().toLowerCase() === 'values to enter:');
  if (headerIndex === -1) return [];

  const parsed: RunFieldValue[] = [];
  for (const [index, rawLine] of lines.slice(headerIndex + 1).entries()) {
    const line = rawLine.trim();
    if (!line) break;
    const separatorIndex = line.search(/[:=]/);
    if (separatorIndex <= 0) {
      throw new Error(`Goal value line ${index + 1} must use "Field label = value" format.`);
    }
    parsed.push({
      label: line.slice(0, separatorIndex).trim(),
      value: line.slice(separatorIndex + 1).trim(),
    });
  }
  return normalizeRunFieldValues(parsed);
}

export function mergeRunFieldValues(
  goalValues: RunFieldValue[],
  structuredValues: RunFieldValue[],
): RunFieldValue[] {
  const merged = new Map(goalValues.map((field) => [field.label.toLocaleLowerCase(), field]));
  for (const field of structuredValues) {
    merged.set(field.label.toLocaleLowerCase(), field);
  }
  return normalizeRunFieldValues([...merged.values()]);
}
