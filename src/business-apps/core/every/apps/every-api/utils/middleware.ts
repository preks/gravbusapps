/**
 * Middleware utilities for Every API
 */

/**
 * Normalize .json suffix in paths
 *
 * Allows endpoints to work with or without .json suffix
 * Example: /tasks/user/123.json -> /tasks/user/123
 */
export function normalizeJsonPath(path: string): string {
  if (path.endsWith('.json')) {
    return path.replace(/\.json$/, '')
  }
  return path
}

/**
 * Check if request is for JSON format
 */
export function isJsonRequest(path: string): boolean {
  return path.endsWith('.json')
}

/**
 * Parse query parameters from URL search params
 */
export function parseQueryParams(searchParams: URLSearchParams): Record<string, string> {
  const params: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    params[key] = value
  })
  return params
}

/**
 * Create JSON response with proper headers
 */
export function createJsonResponse(data: any, status: number = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  })
}

/**
 * Create error JSON response
 */
export function createErrorResponse(message: string, status: number = 500, details?: any): Response {
  return createJsonResponse(
    {
      status: 'error',
      message,
      details
    },
    status
  )
}

/**
 * Validate required query parameter
 */
export function requireQueryParam(params: Record<string, string>, paramName: string): string {
  const value = params[paramName]
  if (!value) {
    throw new Error(`Missing required query parameter: ${paramName}`)
  }
  return value
}

/**
 * Extract user ID from path parameter
 */
export function extractUserId(pathname: string): string | null {
  // Match pattern: /tasks/user/:userId or /tasks/user/:userId.json
  const match = /\/tasks\/user\/([^/.]+)/.exec(pathname)
  return match ? match[1] : null
}

/**
 * Extract task ID from path parameter
 */
export function extractTaskId(pathname: string): string | null {
  // Match pattern: /tasks/:taskId or /tasks/:taskId.json
  const match = /\/tasks\/([^/.]+)(?:\.json)?$/.exec(pathname)
  return match ? match[1] : null
}

/**
 * Enable debug logging for API requests/errors
 * Set to true for local debugging, false for production
 */
const DEBUG_LOGGING = false

/**
 * Log API request
 */
export function logRequest(method: string, path: string, params?: Record<string, unknown>): void {
  if (DEBUG_LOGGING) {
    console.log(`[API] ${method} ${path}`, params)
  }
}

/**
 * Log API error
 */
export function logError(method: string, path: string, error: unknown): void {
  if (DEBUG_LOGGING) {
    console.error(`[API Error] ${method} ${path}`, error)
  }
}
