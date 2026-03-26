import { CUSTOM_FLOW_ENGINE_API_URL } from '@/common/utils/serviceResolver'

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
 * Flow engine base URL (.../flow-engine), derived from {@link CUSTOM_FLOW_ENGINE_API_URL}.
 */
export const getFlowEngineBaseUrl = (): string => {
  return resolveFlowEngineBaseFromCustom(CUSTOM_FLOW_ENGINE_API_URL)
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
 * Flow Engine API root (.../flow-engine/api), from {@link CUSTOM_FLOW_ENGINE_API_URL}.
 */
export const getFlowEngineApiBaseUrl = (): string => {
  return resolveFlowEngineApiFromCustom(CUSTOM_FLOW_ENGINE_API_URL)
}

/**
 * Full URL for POST .../templates/execute-dynamic.
 * Callers sometimes pass .../flow-engine (append /api/...) and sometimes .../flow-engine/api
 * ({@link CUSTOM_FLOW_ENGINE_API_URL}) — avoid .../api/api/templates/...
 */
export function resolveExecuteDynamicUrl(apiBaseUrl: string): string {
  const trimmed = normalizeUrl(apiBaseUrl || '')
  const withoutV1 = trimmed.endsWith('/api/v1') ? trimmed.slice(0, -'/api/v1'.length) : trimmed
  if (withoutV1.endsWith('/api')) {
    return `${withoutV1}/templates/execute-dynamic`
  }
  return `${withoutV1}/api/templates/execute-dynamic`
}
