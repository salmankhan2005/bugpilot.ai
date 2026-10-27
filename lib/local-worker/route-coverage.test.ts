import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeRoutePath } from './route-coverage';

test('normalizes coverage to same-origin paths without query strings or fragments', () => {
  assert.equal(
    normalizeRoutePath('https://example.test/account?session=private#settings', 'https://example.test'),
    '/account',
  );
});

test('redacts long path identifiers before storing route coverage', () => {
  assert.equal(
    normalizeRoutePath(`https://example.test/users/${'a'.repeat(36)}`, 'https://example.test'),
    '/users/[REDACTED]',
  );
});

test('rejects cross-origin and invalid route URLs', () => {
  assert.throws(
    () => normalizeRoutePath('https://other.example.test/path', 'https://example.test'),
    /same-origin/,
  );
  assert.throws(
    () => normalizeRoutePath('/relative/path', 'https://example.test'),
    TypeError,
  );
});
