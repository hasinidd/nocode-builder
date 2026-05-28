/**
 * errors.js — Custom application error classes
 */

export class AppError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.name = 'AppError';
    this.status = status;
  }
}

export class ValidationError extends AppError {
  constructor(message) { super(message, 422); this.name = 'ValidationError'; }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') { super(`${resource} not found`, 404); this.name = 'NotFoundError'; }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') { super(message, 401); this.name = 'UnauthorizedError'; }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') { super(message, 403); this.name = 'ForbiddenError'; }
}

export class ConflictError extends AppError {
  constructor(message) { super(message, 409); this.name = 'ConflictError'; }
}

/**
 * asyncHandler — wraps an async route handler to catch errors and forward to next()
 */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
