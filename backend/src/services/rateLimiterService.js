export class RateLimiterService {
  constructor(windowMs = 60000, maxRequests = 60) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.requests = new Map();
  }

  isRateLimited(key) {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    let timestamps = this.requests.get(key) || [];
    timestamps = timestamps.filter(ts => ts > windowStart);

    if (timestamps.length >= this.maxRequests) {
      return true;
    }

    timestamps.push(now);
    this.requests.set(key, timestamps);
    return false;
  }
}

export const rateLimiterService = new RateLimiterService();
export default rateLimiterService;
