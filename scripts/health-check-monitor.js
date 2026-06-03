import fetch from 'node-fetch';

async function monitor() {
  const url = process.env.MONITOR_URL || 'http://localhost:3000/health';
  try {
    const res = await fetch(url);
    console.log(`[${new Date().toISOString()}] Health status: ${res.status}`);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Health check failed:`, err.message);
  }
}

monitor();
