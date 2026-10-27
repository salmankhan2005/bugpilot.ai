import { Pool, type QueryResultRow } from 'pg';
import { getDatabaseConnectionString } from './database-config';

declare global {
  var bugPilotLocalPool: Pool | undefined;
}

export function getLocalDatabase(): Pool {
  const connectionString = getDatabaseConnectionString();

  if (!global.bugPilotLocalPool) {
    const pool = new Pool({
      connectionString,
      max: 4,
      connectionTimeoutMillis: 8_000,
      idleTimeoutMillis: 30_000,
    });
    pool.on('error', (error) => {
      console.error('Local worker database connection error:', error.message);
    });
    global.bugPilotLocalPool = pool;
  }

  return global.bugPilotLocalPool;
}

export async function queryLocalDatabase<Row extends QueryResultRow>(
  query: string,
  values: unknown[] = [],
) {
  return getLocalDatabase().query<Row>(query, values);
}
