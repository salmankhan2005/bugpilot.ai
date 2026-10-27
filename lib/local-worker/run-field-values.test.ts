import assert from 'node:assert/strict';
import test from 'node:test';
import {
  mergeRunFieldValues,
  normalizeRunFieldValues,
  parseRunGoalFieldValues,
} from './run-field-values';

test('normalizes labeled field values and defaults to no values', () => {
  assert.deepEqual(normalizeRunFieldValues(undefined), []);
  assert.deepEqual(normalizeRunFieldValues([
    { label: ' Email ', value: 'sample@example.test' },
    { label: 'Plan', value: 'starter' },
  ]), [
    { label: 'Email', value: 'sample@example.test' },
    { label: 'Plan', value: 'starter' },
  ]);
});

test('rejects duplicate labels without case sensitivity', () => {
  assert.throws(
    () => normalizeRunFieldValues([{ label: 'Email', value: 'a' }, { label: ' email ', value: 'b' }]),
    /duplicated/,
  );
});

test('rejects oversized or malformed field values', () => {
  assert.throws(() => normalizeRunFieldValues(Array.from({ length: 21 }, (_, index) => ({
    label: `Field ${index}`,
    value: '',
  }))), /no more than 20/);
  assert.throws(() => normalizeRunFieldValues([{ label: '', value: 'value' }]), /label must be/);
  assert.throws(() => normalizeRunFieldValues([{ label: 'Email', value: 'x'.repeat(501) }]), /500 characters/);
});

test('parses goal values and gives structured values precedence', () => {
  const fromGoal = parseRunGoalFieldValues([
    'Check the signup form.',
    '',
    'Values to enter:',
    'Email = goal@example.test',
    'Plan: starter',
    '',
    'Do not parse this line.',
  ].join('\n'));
  assert.deepEqual(mergeRunFieldValues(fromGoal, [
    { label: 'email', value: 'structured@example.test' },
  ]), [
    { label: 'email', value: 'structured@example.test' },
    { label: 'Plan', value: 'starter' },
  ]);
});

test('rejects malformed goal value lines', () => {
  assert.throws(() => parseRunGoalFieldValues('Values to enter:\nEmail address'), /Field label = value/);
});
