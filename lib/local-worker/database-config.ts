export function getDatabaseConnectionString(
  neonDatabaseUrl = process.env.NEON_DATABASE_URL,
  databaseUrl = process.env.DATABASE_URL,
): string {
  const connectionString = neonDatabaseUrl?.trim() || databaseUrl?.trim();
  if (!connectionString) {
    throw new Error('Set NEON_DATABASE_URL or DATABASE_URL for the local worker database.');
  }
  return connectionString;
}

export function getMigrationConnectionString(
  neonDatabaseUrlUnpooled = process.env.NEON_DATABASE_URL_UNPOOLED,
  databaseUrlUnpooled = process.env.DATABASE_URL_UNPOOLED,
  neonDatabaseUrl = process.env.NEON_DATABASE_URL,
  databaseUrl = process.env.DATABASE_URL,
): string {
  let connectionString = neonDatabaseUrlUnpooled?.trim() || databaseUrlUnpooled?.trim();
  if (!connectionString) {
    const applicationUrl = neonDatabaseUrl?.trim() || databaseUrl?.trim();
    if (applicationUrl) connectionString = deriveDirectNeonUrl(applicationUrl);
  }
  if (!connectionString) {
    throw new Error(
      'Set NEON_DATABASE_URL_UNPOOLED or DATABASE_URL_UNPOOLED to a direct URL, or provide a Neon pooled URL that can be converted for migrations.',
    );
  }

  let hostname: string;
  try {
    hostname = new URL(connectionString).hostname;
  } catch {
    throw new Error('The migration database URL must be a valid PostgreSQL connection URL.');
  }
  if (hostname.includes('-pooler.')) {
    throw new Error('Database migrations require a direct URL without the -pooler endpoint.');
  }

  return connectionString;
}

function deriveDirectNeonUrl(connectionString: string): string {
  let url: URL;
  try {
    url = new URL(connectionString);
  } catch {
    throw new Error('The migration database URL must be a valid PostgreSQL connection URL.');
  }

  // Strip the -pooler. segment from the hostname for any Neon endpoint
  // Works for both plain (.neon.tech) and regional (.aws.neon.tech, .azure.neon.tech, etc.)
  if (!url.hostname.includes('-pooler.')) return connectionString;
  if (!url.hostname.includes('.neon.tech')) return '';
  url.hostname = url.hostname.replace('-pooler.', '.');
  return url.toString();
}
