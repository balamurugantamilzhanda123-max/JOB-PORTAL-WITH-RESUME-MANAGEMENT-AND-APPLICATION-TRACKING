import fs from 'fs';
import path from 'path';
import EmbeddedPostgres from 'embedded-postgres';

const dataDir = path.resolve(process.cwd(), '.embedded-postgres');

async function startLocalPostgres() {
  const pg = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    port: Number(process.env.POSTGRES_PORT || 5432),
    persistent: true,
    initdbFlags: ['--encoding=UTF8', '--locale=C'],
  });

  if (!fs.existsSync(path.join(dataDir, 'PG_VERSION'))) {
    fs.rmSync(dataDir, { recursive: true, force: true });
    await pg.initialise();
  }
  await pg.start();

  try {
    await pg.createDatabase('ats_platform');
  } catch {
    // Database already exists on subsequent starts
  }

  console.info('✅ Embedded PostgreSQL running on localhost:5432 (database: ats_platform)');

  const shutdown = async () => {
    await pg.stop();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());
}

startLocalPostgres().catch((err) => {
  console.error('❌ Failed to start embedded PostgreSQL:', err);
  process.exit(1);
});
