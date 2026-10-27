import assert from 'node:assert/strict';
import test from 'node:test';
import { getDatabaseConnectionString, getMigrationConnectionString } from './database-config';

test('prefers the explicit Neon database variable', () => {
  assert.equal(
    getDatabaseConnectionString(' postgresql://neon.example/db ', 'postgresql://legacy.example/db'),
    'postgresql://neon.example/db',
  );
});

test('falls back to the legacy database variable when Neon is empty', () => {
  assert.equal(getDatabaseConnectionString('  ', ' postgresql://legacy.example/db '), 'postgresql://legacy.example/db');
});

test('requires a database connection variable', () => {
  assert.throws(() => getDatabaseConnectionString('', ''), /NEON_DATABASE_URL or DATABASE_URL/);
});

test('prefers the explicit Neon unpooled URL for migrations', () => {
  assert.equal(
    getMigrationConnectionString(
      ' postgresql://neon.example/db ',
      'postgresql://legacy.example/db',
    ),
    'postgresql://neon.example/db',
  );
});

test('falls back to the legacy unpooled URL for migrations', () => {
  assert.equal(
    getMigrationConnectionString('', ' postgresql://legacy.example/db '),
    'postgresql://legacy.example/db',
  );
});

test('derives a direct Neon migration URL from the configured pooler without changing the app URL', () => {
  assert.equal(
    getMigrationConnectionString(
      '',
      '',
      'postgresql://ep-example-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
    ),
    'postgresql://ep-example.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
  );
});

test('rejects pooled and missing migration URLs', () => {
  assert.throws(
    () => getMigrationConnectionString('postgresql://ep-pooler.example/db', ''),
    /direct URL without the -pooler endpoint/,
  );
  assert.throws(() => getMigrationConnectionString('', '', '', ''), /direct URL/);
});
