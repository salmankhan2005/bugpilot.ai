import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import {
  getAllowedOrigins,
  isAllowedBrowserRequest,
  parseTargetUrl,
  validateTargetUrl,
} from './security';

const originalOrigins = process.env.LOCAL_WORKER_ALLOWED_ORIGINS;

afterEach(() => {
  if (originalOrigins === undefined) delete process.env.LOCAL_WORKER_ALLOWED_ORIGINS;
  else process.env.LOCAL_WORKER_ALLOWED_ORIGINS = originalOrigins;
});

test('validates only explicitly allowed HTTP origins', () => {
  process.env.LOCAL_WORKER_ALLOWED_ORIGINS = 'http://localhost:3001,https://example.com';
  assert.equal(validateTargetUrl('http://localhost:3001/').origin, 'http://localhost:3001');
  assert.throws(() => validateTargetUrl('https://unlisted.example/'), /not in LOCAL_WORKER_ALLOWED_ORIGINS/);
});

test('allows parsing an external target for separate ownership authorization', () => {
  process.env.LOCAL_WORKER_ALLOWED_ORIGINS = '';
  assert.equal(parseTargetUrl('https://customer-owned.example/path').origin, 'https://customer-owned.example');
});

test('allows an empty static allowlist for verified public origins', () => {
  process.env.LOCAL_WORKER_ALLOWED_ORIGINS = '';
  assert.deepEqual([...getAllowedOrigins()], []);
});

test('rejects credentials, query strings, and fragments in target URLs', () => {
  process.env.LOCAL_WORKER_ALLOWED_ORIGINS = 'https://example.com';
  assert.throws(() => validateTargetUrl('https://user:pass@example.com/'), /without credentials/);
  assert.throws(() => validateTargetUrl('https://example.com/?token=secret'), /query parameters/);
  assert.throws(() => validateTargetUrl('https://example.com/#section'), /fragment/);
});

test('blocks private network addresses even when explicitly listed', async () => {
  process.env.LOCAL_WORKER_ALLOWED_ORIGINS = 'http://10.0.0.4:8080,http://localhost:3001';
  const origins = getAllowedOrigins();
  assert.equal(await isAllowedBrowserRequest('http://10.0.0.4:8080/', origins), false);
  assert.equal(await isAllowedBrowserRequest('http://localhost:3001/', origins), true);
});
