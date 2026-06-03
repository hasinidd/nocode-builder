import { execSync } from 'child_process';
import fetch from 'node-fetch';

async function deploy() {
  console.log('🚀 Starting NoCode Builder deployment pipeline...');

  console.log('  Running backend tests...');
  execSync('npm test', { cwd: './backend', stdio: 'inherit' });

  console.log('  Running database migrations...');
  execSync('node scripts/migrate.js up', { cwd: './backend', stdio: 'inherit' });

  console.log('  Checking production API health...');
  const healthUrl = process.env.HEALTH_CHECK_URL || 'http://localhost:3000/health';
  try {
    const res = await fetch(healthUrl);
    if (res.ok) console.log('  ✅ API health check passed!');
    else console.warn('  ⚠️ Health check returned non-200 status');
  } catch (err) {
    console.error('  ❌ Health check error:', err.message);
  }

  console.log('🎉 Deployment complete!');
}

deploy();
