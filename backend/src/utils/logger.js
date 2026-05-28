/**
 * logger.js — Lightweight structured request and application logger
 */

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const MIN_LEVEL = LEVELS[process.env.LOG_LEVEL] ?? LEVELS.info;

function timestamp() {
  return new Date().toISOString();
}

function format(level, message, meta = {}) {
  if (process.env.NODE_ENV === 'production') {
    return JSON.stringify({ timestamp: timestamp(), level, message, ...meta });
  }
  const colour = { debug: '\x1b[36m', info: '\x1b[32m', warn: '\x1b[33m', error: '\x1b[31m' }[level] || '';
  const reset = '\x1b[0m';
  const metaStr = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
  return `${colour}[${level.toUpperCase()}]${reset} ${timestamp()} ${message}${metaStr}`;
}

function log(level, message, meta) {
  if (LEVELS[level] < MIN_LEVEL) return;
  const line = format(level, message, meta);
  if (level === 'error') console.error(line);
  else console.log(line);
}

export const logger = {
  debug: (msg, meta) => log('debug', msg, meta),
  info:  (msg, meta) => log('info',  msg, meta),
  warn:  (msg, meta) => log('warn',  msg, meta),
  error: (msg, meta) => log('error', msg, meta)
};

/**
 * requestLogger — Express middleware for structured request logging
 */
export function requestLogger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    log(level, `${req.method} ${req.originalUrl} ${res.statusCode}`, {
      ms,
      ip: req.ip,
      ua: req.get('user-agent')?.slice(0, 80)
    });
  });
  next();
}
