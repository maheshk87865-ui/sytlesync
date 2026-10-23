/**
 * Pagination Utility — consistent pagination metadata for all list endpoints.
 * ------------------------------------------------------------
 * Usage in route handlers:
 *   const { page, limit } = parsePagination(req.query);
 *   const [items, total] = await Promise.all([
 *     db.model.findMany({ take: limit, skip: (page - 1) * limit }),
 *     db.model.count({ where }),
 *   ]);
 *   return sendSuccess(res, paginate(items, total, page, limit));
 *
 * Returns:
 *   {
 *     data: [...],
 *     pagination: { page, limit, total, totalPages, hasNext, hasPrevious }
 *   }
 */

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

/**
 * Parse page/limit from query string.
 * Supports both ?page=1&limit=20 (new style) and ?offset=0&limit=20 (legacy).
 */
export function parsePagination(query: any): { page: number; limit: number; offset: number } {
  const limit = Math.min(Math.max(parseInt(query?.limit ?? "20", 10) || 20, 1), 100);
  const page = Math.min(Math.max(parseInt(query?.page ?? "1", 10) || 1, 1), 1000);

  // Support legacy offset
  const offset = query?.offset !== undefined
    ? Math.max(parseInt(query.offset, 10) || 0, 0)
    : (page - 1) * limit;

  return { page, limit, offset };
}

/**
 * Build a paginated response with metadata.
 */
export function paginate<T>(items: T[], total: number, page: number, limit: number): PaginatedResponse<T> {
  const totalPages = Math.ceil(total / limit);
  return {
    data: items,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    },
  };
}

/**
 * Convenience: parse + paginate in one call.
 * Usage:
 *   const { page, limit, offset } = parsePagination(req.query);
 *   const items = await db.model.findMany({ take: limit, skip: offset });
 *   const total = await db.model.count({ where });
 *   return sendSuccess(res, paginateResult(items, total, req.query));
 */
export function paginateResult<T>(items: T[], total: number, query: any): PaginatedResponse<T> {
  const { page, limit } = parsePagination(query);
  return paginate(items, total, page, limit);
}
