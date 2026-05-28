import fetch from 'node-fetch';

const FIRECRAWL_BASE = 'https://api.firecrawl.dev/v1';
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;
const TIMEOUT_MS = 20000;

// ── Scrape a single URL ───────────────────────────────────────────────────────
export const scrapeWithFirecrawl = async (url, attempt = 0) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${FIRECRAWL_BASE}/scrape`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url, formats: ['markdown'], onlyMainContent: true }),
      signal: controller.signal
    });

    clearTimeout(timer);

    if (res.status === 429) {
      const retryAfter = parseInt(res.headers.get('retry-after') || '5', 10);
      await sleep(retryAfter * 1000);
      return scrapeWithFirecrawl(url, attempt);
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw Object.assign(new Error(body.error || `Firecrawl HTTP ${res.status}`), { status: res.status });
    }

    const data = await res.json();
    return data.data?.markdown || data.data?.content || '';
  } catch (err) {
    clearTimeout(timer);

    const isRetryable = err.name === 'AbortError' || [408, 429, 500, 502, 503, 504].includes(err.status);

    if (isRetryable && attempt < MAX_RETRIES) {
      const delay = BASE_DELAY_MS * Math.pow(2, attempt);
      console.warn(`[Firecrawl] Retry ${attempt + 1}/${MAX_RETRIES} for ${url} in ${delay}ms — ${err.message}`);
      await sleep(delay);
      return scrapeWithFirecrawl(url, attempt + 1);
    }

    throw err;
  }
};

// ── Crawl a whole site (up to maxPages) ──────────────────────────────────────
export const crawlSite = async (url, maxPages = 10) => {
  const res = await fetch(`${FIRECRAWL_BASE}/crawl`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.FIRECRAWL_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ url, limit: maxPages, scrapeOptions: { formats: ['markdown'], onlyMainContent: true } })
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Crawl failed with HTTP ${res.status}`);
  }

  const { id } = await res.json();

  // Poll for completion
  for (let i = 0; i < 30; i++) {
    await sleep(3000);
    const poll = await fetch(`${FIRECRAWL_BASE}/crawl/${id}`, {
      headers: { 'Authorization': `Bearer ${process.env.FIRECRAWL_API_KEY}` }
    });
    const status = await poll.json();
    if (status.status === 'completed') {
      return status.data.map(d => d.markdown || d.content || '').join('\n\n---\n\n');
    }
    if (status.status === 'failed') throw new Error('Crawl job failed');
  }
  throw new Error('Crawl timed out after 90 seconds');
};

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
