import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateVerificationResult } from './verification-result';

test('fails verification when the exact signal is reproduced', () => {
  assert.deepEqual(evaluateVerificationResult({
    findingReproduced: true,
    pagesLoaded: 1,
    timedOut: true,
  }), {
    status: 'failed',
    findingReproduced: true,
    detail: 'The exact browser signal was reproduced in this verification run.',
  });
});

test('blocks verification if the run times out without reproducing the signal', () => {
  assert.equal(evaluateVerificationResult({
    findingReproduced: false,
    pagesLoaded: 2,
    timedOut: true,
  }).status, 'blocked');
});

test('blocks verification if no page loaded successfully', () => {
  assert.equal(evaluateVerificationResult({
    findingReproduced: false,
    pagesLoaded: 0,
    timedOut: false,
  }).status, 'blocked');
});

test('passes only after a complete run loads a page without the exact signal', () => {
  assert.deepEqual(evaluateVerificationResult({
    findingReproduced: false,
    pagesLoaded: 1,
    timedOut: false,
  }), {
    status: 'passed',
    findingReproduced: false,
    detail: 'The exact browser signal was not observed during this fresh run.',
  });
});
