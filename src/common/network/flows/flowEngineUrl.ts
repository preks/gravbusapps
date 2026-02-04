import { env } from '@/common/env/EnvUtils'

const DEFAULT_FLOW_ENGINE_BASE_PATH = '/flow-engine'

const normalizeUrl = (value: string): string => value.trim().replace(/\/+$/, '')

/**
 * Returns the configured Flow Engine base URL (non-API).
 *
 * If `NEXT_PUBLIC_CUSTOM_FLOW_ENGINE_API_URL` points to an API gateway URL (e.g. ends with `/api/v1`
 * and does not contain `/flow-engine`), we cannot reliably derive a non-API base URL from it.
 * In that case we keep returning the default `/flow-engine` base path.
 */
export const getFlowEngineBaseUrl = (): string => {
  const custom = env('NEXT_PUBLIC_CUSTOM_FLOW_ENGINE_API_URL')
  if (custom?.trim()) {
    const normalized = normalizeUrl(custom)

    // If the configured URL contains a flow-engine base, we can safely strip the API suffix.
    // Examples:
    // - https://host/flow-engine/api          -> https://host/flow-engine
    // - https://host/flow-engine/api/v1       -> https://host/flow-engine
    // - https://host/flow-engine             -> https://host/flow-engine
    if (normalized.includes('/flow-engine')) {
      const idx = normalized.indexOf('/flow-engine')
      return normalized.slice(0, idx + '/flow-engine'.length)
    }

    // Otherwise (e.g. https://host/api/v1) we can't infer a non-API flow-engine base URL.
    return DEFAULT_FLOW_ENGINE_BASE_PATH
  }

  return DEFAULT_FLOW_ENGINE_BASE_PATH
}

/**
 * Returns the Flow Engine API base URL.
 *
 * - If `NEXT_PUBLIC_CUSTOM_FLOW_ENGINE_API_URL` is configured:
 *   - If it already contains `/api` (e.g. `/api`, `/api/v1`, `/flow-engine/api/v1`), it's treated as the API base URL.
 *   - Otherwise we append `/api` for backward-compatibility with values like `https://host/flow-engine`.
 * - Otherwise we default to same-origin relative `/flow-engine/api`.
 */
export const getFlowEngineApiBaseUrl = (): string => {
  const custom = env('NEXT_PUBLIC_CUSTOM_FLOW_ENGINE_API_URL')
  if (custom?.trim()) {
    const normalized = normalizeUrl(custom)

    // If callers configured an API URL (most common), don't add another `/api`.
    if (normalized.includes('/api/')) return normalized
    if (normalized.endsWith('/api')) return normalized

    // Backward compatibility: callers configured a base URL without `/api`
    return `${normalized}/api`
  }

  return `${DEFAULT_FLOW_ENGINE_BASE_PATH}/api`
}
