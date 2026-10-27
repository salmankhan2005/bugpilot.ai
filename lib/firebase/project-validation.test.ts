import assert from 'node:assert/strict';
import test from 'node:test';
import { parseProjectInput, ProjectValidationError } from './project-validation';

const originalAllowedOrigins = process.env.LOCAL_WORKER_ALLOWED_ORIGINS;

test.before(() => {
  process.env.LOCAL_WORKER_ALLOWED_ORIGINS = 'http://localhost:3000,https://qa.example.test';
});

test.after(() => {
  if (originalAllowedOrigins === undefined) {
    delete process.env.LOCAL_WORKER_ALLOWED_ORIGINS;
  } else {
    process.env.LOCAL_WORKER_ALLOWED_ORIGINS = originalAllowedOrigins;
  }
});

test('normalizes valid project details and keeps only supported fields', () => {
  assert.deepEqual(parseProjectInput({
    name: '  Checkout QA  ',
    targetUrl: 'https://qa.example.test',
    environment: 'staging',
    ignored: 'untrusted input',
  }), {
    name: 'Checkout QA',
    targetUrl: 'https://qa.example.test/',
    environment: 'staging',
  });
});

test('rejects invalid names and environments', () => {
  for (const input of [
    { name: '', targetUrl: 'https://qa.example.test', environment: 'staging' },
    { name: 'x'.repeat(101), targetUrl: 'https://qa.example.test', environment: 'staging' },
    { name: 'Project', targetUrl: 'https://qa.example.test', environment: 'demo' },
    null,
    [],
  ]) {
    assert.throws(() => parseProjectInput(input), ProjectValidationError);
  }
});

test('parses external target URLs before authorization is checked separately', () => {
  assert.deepEqual(parseProjectInput({
    name: 'Untrusted target',
    targetUrl: 'https://outside.example.test',
    environment: 'staging',
  }), {
    name: 'Untrusted target',
    targetUrl: 'https://outside.example.test/',
    environment: 'staging',
  });
});

test('rejects target credentials, query strings, and fragments', () => {
  for (const targetUrl of [
    'https://user:password@qa.example.test',
    'https://qa.example.test/?token=secret',
    'https://qa.example.test/#private',
  ]) {
    assert.throws(() => parseProjectInput({
      name: 'Project',
      targetUrl,
      environment: 'staging',
    }), ProjectValidationError);
  }
});

test('allows an empty environment origin list when verified origins are used', () => {
  process.env.LOCAL_WORKER_ALLOWED_ORIGINS = '';
  assert.deepEqual(parseProjectInput({
    name: 'Project',
    targetUrl: 'https://qa.example.test',
    environment: 'staging',
  }).targetUrl, 'https://qa.example.test/');
  process.env.LOCAL_WORKER_ALLOWED_ORIGINS = 'http://localhost:3000,https://qa.example.test';
});
