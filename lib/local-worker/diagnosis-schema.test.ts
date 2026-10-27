import assert from 'node:assert/strict';
import test from 'node:test';
import { isFindingDiagnosis, parseFindingDiagnosis } from './diagnosis-schema';

const allowedRefs = new Set(['finding', 'run_event:12']);

test('parses a bounded diagnosis using only known evidence references', () => {
  const parsed = parseFindingDiagnosis({
    summary: 'The endpoint returned an HTTP error during the run.',
    hypotheses: [{
      claim: 'The route may not be available in this environment.',
      confidence: 0.6,
      evidenceRefs: ['finding', 'run_event:12'],
    }],
    nextChecks: ['Check the endpoint availability in the intended environment.'],
    limitations: ['No application source code was provided.'],
  }, allowedRefs);

  assert.equal(parsed.hypotheses[0].evidenceRefs.length, 2);
  assert.equal(isFindingDiagnosis(parsed), true);
});

test('rejects unknown evidence references', () => {
  assert.throws(() => parseFindingDiagnosis({
    summary: 'Summary.',
    hypotheses: [{ claim: 'Guess.', confidence: 0.5, evidenceRefs: ['made-up'] }],
    nextChecks: [],
    limitations: [],
  }, allowedRefs), /unknown evidence/);
});

test('rejects invalid confidence and oversized result lists', () => {
  assert.throws(() => parseFindingDiagnosis({
    summary: 'Summary.',
    hypotheses: [{ claim: 'Guess.', confidence: 2, evidenceRefs: ['finding'] }],
    nextChecks: [],
    limitations: [],
  }, allowedRefs), /confidence/);
  assert.throws(() => parseFindingDiagnosis({
    summary: 'Summary.',
    hypotheses: [],
    nextChecks: ['1', '2', '3', '4', '5'],
    limitations: [],
  }, allowedRefs), /next-checks/);
});

test('type guard accepts only valid empty-reference diagnoses', () => {
  assert.equal(isFindingDiagnosis({
    summary: 'Summary.',
    hypotheses: [{ claim: 'Hypothesis.', confidence: 0.3, evidenceRefs: [] }],
    nextChecks: [],
    limitations: [],
  }), true);
});
