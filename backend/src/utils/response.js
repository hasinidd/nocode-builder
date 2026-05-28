/**
 * response.js — Standardised HTTP response helpers
 */

export const ok = (res, data, status = 200) =>
  res.status(status).json(data);

export const created = (res, data) =>
  res.status(201).json(data);

export const noContent = (res) =>
  res.status(204).send();

export const badRequest = (res, message) =>
  res.status(400).json({ error: message });

export const unauthorized = (res, message = 'Unauthorized') =>
  res.status(401).json({ error: message });

export const forbidden = (res, message = 'Forbidden') =>
  res.status(403).json({ error: message });

export const notFound = (res, resource = 'Resource') =>
  res.status(404).json({ error: `${resource} not found` });

export const conflict = (res, message) =>
  res.status(409).json({ error: message });

export const unprocessable = (res, message) =>
  res.status(422).json({ error: message });

export const serverError = (res, message = 'Internal server error') =>
  res.status(500).json({ error: message });

/**
 * paginate — build a paginated response envelope
 * @param {Array}  data    - Array of results
 * @param {number} total   - Total count from DB
 * @param {number} page    - Current page (1-indexed)
 * @param {number} limit   - Page size
 */
export const paginate = (res, data, total, page, limit) => {
  const totalPages = Math.ceil(total / limit);
  res.json({
    data,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  });
};
