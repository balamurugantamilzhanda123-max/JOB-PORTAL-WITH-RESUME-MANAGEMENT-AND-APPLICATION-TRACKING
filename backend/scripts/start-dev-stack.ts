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

async function startStack() {
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

  execSync('npx prisma migrate deploy', { cwd: backendDir, stdio: 'inherit' });
  execSync('npm run prisma:seed', { cwd: backendDir, stdio: 'inherit' });

  const backendProc = spawn('node', ['dist/server.js'], {
    cwd: backendDir,
    stdio: 'inherit',
    shell: true,
  });
  await waitForUrl('http://localhost:4000/api/v1/health');

  const frontendProc = spawn('npm', ['run', 'start'], {
    cwd: frontendDir,
    stdio: 'inherit',
    shell: true,
  });
  await waitForUrl('http://localhost:3000/login');

  console.info('🚀 TalentForge ATS is LIVE:');
  console.info('   🌐 Web App:      http://localhost:3000');
  console.info('   🔌 Backend API:  http://localhost:4000/api/v1');
  console.info('   📚 Swagger Docs: http://localhost:4000/api/v1/docs');

  const shutdown = async () => {
    killTree(frontendProc);
    killTree(backendProc);
    await pg.stop();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());
}

startStack().catch((err) => {
  console.error('❌ Failed to start stack:', err);
  process.exit(1);
});

