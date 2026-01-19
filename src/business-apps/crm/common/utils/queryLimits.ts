/**
 * Query limit utilities for CRM components
 * Ensures optimal performance by limiting query sizes
 */

/**
 * Maximum number of items that can be fetched in a single query
 * This limit ensures optimal performance and prevents slow queries
 */
export const MAX_QUERY_LIMIT = 50

/**
 * Default page size for list components
 */
export const DEFAULT_PAGE_SIZE = 20

/**
 * Available page size options that comply with the query limit
 */
export const PAGE_SIZE_OPTIONS = [10, 20, 50]

/**
 * Enforces the maximum query limit to ensure optimal performance
 * @param requestedLimit - The requested limit
 * @returns The limit capped at MAX_QUERY_LIMIT
 */
export const enforceQueryLimit = (requestedLimit: number): number => {
  return Math.min(requestedLimit, MAX_QUERY_LIMIT)
}

/**
 * Creates standardized query variables with enforced limits
 * @param page - The page number (1-based)
 * @param pageSize - The requested page size
 * @param filters - Additional filters to apply
 * @returns Query variables with enforced limits
 */
export const createQueryVariables = (page: number, pageSize: number, filters: Record<string, any> = {}) => {
  const safePageSize = enforceQueryLimit(pageSize)
  const offset = (page - 1) * safePageSize

  return {
    offset,
    limit: safePageSize,
    ...filters
  }
}

/**
 * Validates if a page size is within allowed limits
 * @param pageSize - The page size to validate
 * @returns True if valid, false otherwise
 */
export const isValidPageSize = (pageSize: number): boolean => {
  return pageSize > 0 && pageSize <= MAX_QUERY_LIMIT
}
