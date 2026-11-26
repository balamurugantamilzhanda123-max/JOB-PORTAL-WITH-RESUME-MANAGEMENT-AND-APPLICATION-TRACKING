import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import EmbeddedPostgres from 'embedded-postgres';

const dataDir = path.resolve(process.cwd(), '.embedded-postgres');

async function main() {
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
    // Database already exists
  }

  let exitCode = 0;
  try {
    console.info('▶ Running Prisma migrations against real PostgreSQL...');
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });

    console.info('▶ Running Admin bootstrap seed...');
    execSync('npm run prisma:seed', { stdio: 'inherit' });

    console.info('▶ Running Demo dataset seed...');
    execSync('npm run prisma:demo-seed', { stdio: 'inherit' });

    console.info('▶ Running Vitest integration, RBAC, DB & Phases 2–6 tests...');
    execSync('npx vitest run', { stdio: 'inherit' });
  } catch (err) {
    exitCode = 1;
    console.error('❌ Verification step failed:', err);
  } finally {
    await pg.stop();
  }

  process.exit(exitCode);
}

main().catch((err) => {
  console.error('❌ Failed verification runner:', err);
  process.exit(1);
});
