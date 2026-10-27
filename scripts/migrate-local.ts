import { config } from 'dotenv';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Pool } from 'pg';
import { getMigrationConnectionString } from '../lib/local-worker/database-config';

// Load .env before anything else so env vars are available
config({ path: resolve(process.cwd(), '.env') });

async function main(): Promise<void> {
  const connectionString = getMigrationConnectionString();

  const pool = new Pool({
    connectionString,
    max: 1,
  });

  const client = await pool.connect();
  try {
    const migrationsPath = resolve(process.cwd(), 'db/migrations');
    const migrations = (await readdir(migrationsPath))
      .filter((file) => /^\d+_.+\.sql$/.test(file))
      .sort();
    if (migrations.length === 0) throw new Error('No SQL migrations were found.');

    await client.query('SELECT pg_advisory_lock(hashtext($1))', ['bugpilot.local.schema.migrations']);
    await client.query(`
      CREATE TABLE IF NOT EXISTS bp_local_schema_migrations (
        name text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    let appliedCount = 0;
    for (const migrationName of migrations) {
      const migration = await readFile(resolve(migrationsPath, migrationName), 'utf8');
      await client.query('BEGIN');
      try {
        const applied = await client.query(
          'SELECT 1 FROM bp_local_schema_migrations WHERE name = $1',
          [migrationName],
        );
        if (applied.rowCount === 0) {
          await client.query(migration);
          await client.query('INSERT INTO bp_local_schema_migrations (name) VALUES ($1)', [migrationName]);
          appliedCount += 1;
        }
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
    console.log(`Local database schema is ready (${appliedCount} migrations applied).`);
  } finally {
    await client.query(
      'SELECT pg_advisory_unlock(hashtext($1))',
      ['bugpilot.local.schema.migrations'],
    ).catch(() => undefined);
    client.release();
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error('Local database migration failed:', error);
  process.exitCode = 1;
});
