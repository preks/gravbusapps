import { env } from '@/common/env/EnvUtils'

const normalizeUrl = (value: string): string => value.trim().replace(/\/+$/, '')

/**
 * Build flow-engine base URL from a custom env value.
 * Accepts:
 * - full api URLs (.../flow-engine/api or .../flow-engine/api/v1)
 * - flow-engine base URLs (.../flow-engine)
 * - plain host URLs (...), which are converted to .../flow-engine
 */
const resolveFlowEngineBaseFromCustom = (customUrl: string): string => {
  const normalized = normalizeUrl(customUrl)

  if (normalized.includes('/flow-engine')) {
    const idx = normalized.indexOf('/flow-engine')
    return normalized.slice(0, idx + '/flow-engine'.length)
  }

  // Handle api-only custom URLs (e.g. host/api or host/api/v1)
  const withoutVersion = normalized.replace(/\/v\d+$/, '')
  if (withoutVersion.endsWith('/api')) {
    return `${withoutVersion.slice(0, -4)}/flow-engine`
  }

  return `${normalized}/flow-engine`
}

/**
 * Get the develop (remote) flow engine base URL.
 */
export const getFlowEngineBaseUrl = (): string => {
  const custom = env('NEXT_PUBLIC_CUSTOM_FLOW_ENGINE_API_URL')
  if (custom?.trim()) return resolveFlowEngineBaseFromCustom(custom)

  const baseUrl = env('NEXT_PUBLIC_BASE_URL')
  const develop = baseUrl?.trim() ? `${normalizeUrl(baseUrl)}/flow-engine` : null
  if (develop) return develop

  return '/flow-engine'
}

/**
 * Build flow-engine API URL from a custom env value.
 * Accepts:
 * - full api URLs (.../flow-engine/api or .../flow-engine/api/v1)
 * - flow-engine base URLs (.../flow-engine)
 * - plain host URLs (...), which are converted to .../flow-engine/api
 */
const resolveFlowEngineApiFromCustom = (customUrl: string): string => {
  const normalized = normalizeUrl(customUrl)
  if (normalized.includes('/api/')) return normalized
  if (normalized.endsWith('/api')) return normalized

  if (normalized.includes('/flow-engine')) {
    const idx = normalized.indexOf('/flow-engine')
    const flowBase = normalized.slice(0, idx + '/flow-engine'.length)
    return `${flowBase}/api`
  }

  return `${normalized}/flow-engine/api`
}

/**
 * Returns the Flow Engine API base URL.
 */
export const getFlowEngineApiBaseUrl = (): string => {
  const custom = env('NEXT_PUBLIC_CUSTOM_FLOW_ENGINE_API_URL')
  if (custom?.trim()) return resolveFlowEngineApiFromCustom(custom)

  const baseUrl = env('NEXT_PUBLIC_BASE_URL')
  const developBase = baseUrl?.trim() ? `${normalizeUrl(baseUrl)}/flow-engine` : null
  if (developBase) return `${developBase}/api`

  return '/flow-engine/api'
}
