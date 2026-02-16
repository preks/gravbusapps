import { env } from '@/common/env/EnvUtils'

const normalizeUrl = (value: string): string => value.trim().replace(/\/+$/, '')

const isLocalUrl = (url: string): boolean =>
  url.includes('localhost') || url.includes('127.0.0.1')

/**
 * Get the develop (remote) flow engine base URL.
 * Flow engine is always called from develop - never localhost.
 */
const getDevelopFlowEngineBaseUrl = (): string | null => {
  const baseUrl = env('NEXT_PUBLIC_BASE_URL')
  if (baseUrl?.trim() && !isLocalUrl(baseUrl)) {
    return `${normalizeUrl(baseUrl)}/flow-engine`
  }
  return null
}

/**
 * Returns the configured Flow Engine base URL (non-API).
 * Flow engine is always from develop - ignores localhost config.
 */
export const getFlowEngineBaseUrl = (): string => {
  const custom = env('NEXT_PUBLIC_CUSTOM_FLOW_ENGINE_API_URL')
  if (custom?.trim() && !isLocalUrl(custom)) {
    const normalized = normalizeUrl(custom)
    if (normalized.includes('/flow-engine')) {
      const idx = normalized.indexOf('/flow-engine')
      return normalized.slice(0, idx + '/flow-engine'.length)
    }
  }

  const develop = getDevelopFlowEngineBaseUrl()
  if (develop) return develop

  return '/flow-engine'
}

/**
 * Returns the Flow Engine API base URL.
 * Flow engine is always from develop - ignores localhost config.
 */
export const getFlowEngineApiBaseUrl = (): string => {
  const custom = env('NEXT_PUBLIC_CUSTOM_FLOW_ENGINE_API_URL')
  if (custom?.trim() && !isLocalUrl(custom)) {
    const normalized = normalizeUrl(custom)
    if (normalized.includes('/api/')) return normalized
    if (normalized.endsWith('/api')) return normalized
    return `${normalized}/api`
  }

  const developBase = getDevelopFlowEngineBaseUrl()
  if (developBase) return `${developBase}/api`

  return '/flow-engine/api'
}
