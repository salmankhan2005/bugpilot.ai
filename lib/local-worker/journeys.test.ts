import assert from 'node:assert/strict';
import test from 'node:test';
import { JourneyValidationError, parseSavedJourneyInput } from './journeys';

const projectTargetUrl = 'https://example.test/';

test('accepts and normalizes a same-origin saved journey', () => {
  assert.deepEqual(parseSavedJourneyInput({
    name: '  Account review  ',
    startPath: '/account/profile',
    goal: 'Confirm the account page loads.',
  }, projectTargetUrl), {
    name: 'Account review',
    startPath: '/account/profile',
    goal: 'Confirm the account page loads.',
  });
});

test('rejects journey paths that could escape the project origin', () => {
  for (const startPath of ['//other.example/path', 'https://other.example/path', '/account?session=secret', '/account#private']) {
    assert.throws(
      () => parseSavedJourneyInput({
        name: 'Account review',
        startPath,
        goal: 'Check the account page.',
      }, projectTargetUrl),
      JourneyValidationError,
    );
  }
});

test('rejects empty or oversized journey fields', () => {
  assert.throws(
    () => parseSavedJourneyInput({ name: ' ', startPath: '/', goal: 'Check.' }, projectTargetUrl),
    /name/,
  );
  assert.throws(
    () => parseSavedJourneyInput({ name: 'Journey', startPath: '/', goal: 'x'.repeat(2_001) }, projectTargetUrl),
    /objective/,
  );
});
