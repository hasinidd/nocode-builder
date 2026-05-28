import fetch from 'node-fetch';

const BASE_URL = process.env.TARGET_URL || 'http://localhost:3000/api';

async function benchmarkHealth(concurrency = 10, totalRequests = 100) {
  console.log(`🚀 Starting benchmark: ${totalRequests} requests (${concurrency} concurrent) to /health`);

  const start = Date.now();
  let completed = 0;
  let errors = 0;
  const latencies = [];

  async function worker() {
    while (completed + errors < totalRequests) {
      completed++;
      const reqStart = Date.now();
      try {
        const res = await fetch(`${BASE_URL}/health`);
        latencies.push(Date.now() - reqStart);
        if (!res.ok) errors++;
      } catch {
        errors++;
      }
    }
  }

  await Promise.all(Array(concurrency).fill(null).map(() => worker()));

  const totalTime = Date.now() - start;
  const rps = (totalRequests / (totalTime / 1000)).toFixed(2);
  const avgMs = (latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(1);
  const p95Ms = latencies.sort((a, b) => a - b)[Math.floor(latencies.length * 0.95)] || 0;

  console.log(`
✅ Benchmark Complete!
  Total Time:    ${totalTime}ms
  Requests/sec:  ${rps}
  Avg Latency:   ${avgMs}ms
  P95 Latency:   ${p95Ms}ms
  Errors:        ${errors}
`);
}

benchmarkHealth();
