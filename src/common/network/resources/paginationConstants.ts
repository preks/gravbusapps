/**
 * Client-side pagination limits for resource APIs.
 * All request limits are capped at MAX_PAGE_LIMIT; use DEFAULT_PAGE_SIZE for normal lists.
 */
export const MAX_PAGE_LIMIT = 100
export const DEFAULT_PAGE_SIZE = 25

export function capLimit(limit: number | undefined, defaultSize: number = DEFAULT_PAGE_SIZE): number {
  if (limit == null || limit <= 0) return defaultSize
  return Math.min(limit, MAX_PAGE_LIMIT)
}
