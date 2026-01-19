import { env } from '@/common/env/EnvUtils'

const DEFAULT_FLOW_ENGINE_BASE_PATH = '/flow-engine'

const normalizeUrl = (value: string): string => value.trim().replace(/\/+$/, '')

/**
 * Returns the configured Flow Engine base URL without the `/api` suffix.
 *
 * - If `NEXT_PUBLIC_CUSTOM_FLOW_ENGINE_API_URL` is configured, it's used.
 * - Otherwise we default to same-origin relative `/flow-engine`.
 *
 * Compatibility: if the configured value already ends with `/api`, we strip that suffix
 * so callers can safely append `/api/...` without ending up with `/api/api/...`.
 */
export const getFlowEngineBaseUrl = (): string => {
  const custom = env('NEXT_PUBLIC_CUSTOM_FLOW_ENGINE_API_URL')
  if (custom?.trim()) {
    const normalized = normalizeUrl(custom)
    return normalized.endsWith('/api') ? normalized.slice(0, -4) : normalized
  }

  return DEFAULT_FLOW_ENGINE_BASE_PATH
}

/**
 * Returns the Flow Engine API base URL (always ends with `/api`).
 */
export const getFlowEngineApiBaseUrl = (): string => `${getFlowEngineBaseUrl()}/api`


