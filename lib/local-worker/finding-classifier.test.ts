import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyBrowserFindingSignal } from './finding-classifier';

test('does not turn routine browser activity into findings', () => {
  assert.equal(
    classifyBrowserFindingSignal('browser.action', 'Page loaded.', {}),
    null,
  );
  assert.equal(
    classifyBrowserFindingSignal('network.request.failed', 'net::ERR_BLOCKED_BY_CLIENT', {}),
    null,
  );
});

test('classifies server errors as high severity and preserves their source URL', () => {
  const finding = classifyBrowserFindingSignal('network.request.failed', 'HTTP 503 response.', {
    status: 503,
    url: 'https://example.test/api',
  });

  assert.ok(finding);
  assert.equal(finding.category, 'network');
  assert.equal(finding.severity, 'high');
  assert.match(finding.fingerprint, /^[a-f0-9]{64}$/);
  assert.equal(finding.title, 'HTTP 503 response');
  assert.equal(finding.observed, 'HTTP 503 response.');
  assert.equal(finding.sourceUrl, 'https://example.test/api');
});

test('deduplicates equivalent signals and labels client errors as low severity', () => {
  const first = classifyBrowserFindingSignal('network.request.failed', 'HTTP 404 response.', {
    status: 404,
    url: 'https://example.test/missing',
  });
  const second = classifyBrowserFindingSignal('network.request.failed', 'HTTP 404   response.', {
    status: 404,
    url: 'https://example.test/missing',
  });

  assert.ok(first);
  assert.ok(second);
  assert.equal(first.severity, 'low');
  assert.equal(first.fingerprint, second.fingerprint);
});

test('classifies JavaScript errors for review without claiming a root cause', () => {
  const finding = classifyBrowserFindingSignal('console.error', 'TypeError: Cannot read property.', {
    url: 'https://example.test/',
  });

  assert.ok(finding);
  assert.equal(finding.category, 'console');
  assert.equal(finding.severity, 'medium');
  assert.equal(finding.title, 'JavaScript console error');
});
