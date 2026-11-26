import { execSync, spawn, ChildProcess } from 'child_process';
import fs from 'fs';
import path from 'path';
import EmbeddedPostgres from 'embedded-postgres';

const backendDir = process.cwd();
const frontendDir = path.resolve(backendDir, '../frontend');
const dataDir = path.resolve(backendDir, '.embedded-postgres');

async function waitForUrl(url: string, timeoutMs = 45000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function killTree(child: ChildProcess | undefined) {
  if (!child || !child.pid) return;
  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /pid ${child.pid} /T /F`, { stdio: 'ignore' });
    } else {
      child.kill('SIGTERM');
    }
  } catch {
    // already exited
  }
}

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
    // already exists
  }

  let backendProc: ChildProcess | undefined;
  let frontendProc: ChildProcess | undefined;
  let exitCode = 0;

  try {
    execSync('npx prisma migrate deploy', { cwd: backendDir, stdio: 'inherit' });
    execSync('npm run prisma:seed', { cwd: backendDir, stdio: 'inherit' });

    console.info('▶ Starting Backend Express server on port 4000...');
    backendProc = spawn('node', ['dist/server.js'], {
      cwd: backendDir,
      stdio: 'inherit',
      shell: true,
    });
    await waitForUrl('http://localhost:4000/api/v1/health');
    console.info('✅ Backend healthy.');

    console.info('▶ Starting Frontend Next.js server on port 3000...');
    frontendProc = spawn('npm', ['run', 'start'], {
      cwd: frontendDir,
      stdio: 'inherit',
      shell: true,
    });
    await waitForUrl('http://localhost:3000/login');
    console.info('✅ Frontend healthy.');

    console.info('▶ Running Playwright E2E test suite...');
    execSync('npx playwright test', { cwd: frontendDir, stdio: 'inherit' });
  } catch (err) {
    exitCode = 1;
    console.error('❌ E2E run failed:', err);
  } finally {
    killTree(frontendProc);
    killTree(backendProc);
    await pg.stop();
  }

  process.exit(exitCode);
}

main().catch((err) => {
  console.error('❌ E2E orchestrator crashed:', err);
  process.exit(1);
});

