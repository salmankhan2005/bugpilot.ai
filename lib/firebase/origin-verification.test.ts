import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getVerificationTxtName,
  getVerifiedOriginId,
  hasVerificationTxt,
  parseVerifiableOrigin,
} from './origin-verification';

test('accepts a normalized HTTPS origin for verification', () => {
  assert.equal(parseVerifiableOrigin('https://www.example.com').origin, 'https://www.example.com');
});

test('rejects origins that cannot be verified as public HTTPS domains', () => {
  for (const value of [
    'http://example.com',
    'https://localhost',
    'https://127.0.0.1',
    'https://example.com:8443',
    'https://example.com/path',
    'https://example.com/?token=secret',
    'https://user:pass@example.com',
  ]) {
    assert.throws(() => parseVerifiableOrigin(value));
  }
});

test('uses a deterministic DNS record name and joins segmented TXT data', () => {
  assert.equal(getVerificationTxtName('www.example.com'), '_bugpilot-verification.www.example.com');
  assert.equal(hasVerificationTxt([['bugpilot-verification=', 'proof']], 'bugpilot-verification=proof'), true);
  assert.equal(hasVerificationTxt([['bugpilot-verification=other']], 'bugpilot-verification=proof'), false);
  assert.equal(getVerifiedOriginId('https://example.com').length, 64);
});
