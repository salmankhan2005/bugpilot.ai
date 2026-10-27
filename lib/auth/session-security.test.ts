import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getSafeRedirectPath,
  isRecentAuthenticationTime,
  isSameOriginRequest,
} from './session-security';

test('accepts only same-origin session requests', () => {
  const sameOrigin = new Request('http://localhost:3000/api/auth/session', {
    method: 'POST',
    headers: { origin: 'http://localhost:3000' },
  });
  const crossOrigin = new Request('http://localhost:3000/api/auth/session', {
    method: 'POST',
    headers: { origin: 'https://attacker.example' },
  });
  const missingOrigin = new Request('http://localhost:3000/api/auth/session', { method: 'POST' });

  assert.equal(isSameOriginRequest(sameOrigin), true);
  assert.equal(isSameOriginRequest(crossOrigin), false);
  assert.equal(isSameOriginRequest(missingOrigin), false);
});

test('accepts internal return paths and rejects open redirects', () => {
  assert.equal(getSafeRedirectPath('/app/project/runs?filter=open'), '/app/project/runs?filter=open');
  assert.equal(getSafeRedirectPath('/app'), '/app');
  assert.equal(getSafeRedirectPath('/'), '/app');
  assert.equal(getSafeRedirectPath('/api/auth/session'), '/app');
  assert.equal(getSafeRedirectPath('https://attacker.example'), '/app');
  assert.equal(getSafeRedirectPath('//attacker.example'), '/app');
  assert.equal(getSafeRedirectPath('/sign-in'), '/app');
});

test('requires a recent authentication time before issuing a session', () => {
  const now = 1_800_000_000_000;
  assert.equal(isRecentAuthenticationTime((now - 60_000) / 1000, now), true);
  assert.equal(isRecentAuthenticationTime((now - 6 * 60_000) / 1000, now), false);
  assert.equal(isRecentAuthenticationTime((now + 60_000) / 1000, now), false);
  assert.equal(isRecentAuthenticationTime('not-a-time', now), false);
});
