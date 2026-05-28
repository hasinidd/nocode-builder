export class SimpleCache {
  constructor(options = {}) {
    this.maxSize = options.maxSize || 500;
    this.defaultTtl = options.ttl || 300000;
    this.store = new Map();
  }

  set(key, value, ttlMs = this.defaultTtl) {
    if (this.store.size >= this.maxSize) {
      const firstKey = this.store.keys().next().value;
      this.store.delete(firstKey);
    }
    const expiresAt = Date.now() + ttlMs;
    this.store.set(key, { value, expiresAt });
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  delete(key) {
    return this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }

  size() {
    return this.store.size;
  }
}

export const cache = new SimpleCache();
export default cache;
