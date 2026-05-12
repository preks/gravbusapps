import { CUSTOM_FLOW_ENGINE_API_URL } from '@/common/utils/serviceResolver'

const normalizeUrl = (value: string): string => value.trim().replace(/\/+$/, '')

/**
 * Flow engine base URL derived from the required API base in {@link CUSTOM_FLOW_ENGINE_API_URL}.
 *
 * @deprecated Use {@link CUSTOM_FLOW_ENGINE_API_URL} from the service resolver directly for new code.
 */
export const getFlowEngineBaseUrl = (): string => {
  const apiBaseUrl = getFlowEngineApiBaseUrl()
  if (!apiBaseUrl.endsWith('/api')) {
    throw new Error('CUSTOM_FLOW_ENGINE_API_URL must end with /api')
  }
  return apiBaseUrl.slice(0, -'/api'.length)
}

/**
 * Flow Engine API root from {@link CUSTOM_FLOW_ENGINE_API_URL}.
 *
 * @deprecated Use {@link CUSTOM_FLOW_ENGINE_API_URL} from the service resolver directly for new code.
 */
export const getFlowEngineApiBaseUrl = (): string => {
  return normalizeUrl(CUSTOM_FLOW_ENGINE_API_URL)
}

/**
 * Full URL for POST .../templates/execute-dynamic.
 *
 * @deprecated Use {@link CUSTOM_FLOW_ENGINE_API_URL} from the service resolver directly for new code.
 */
export function resolveExecuteDynamicUrl(apiBaseUrl: string): string {
  const normalizedApiBaseUrl = normalizeUrl(apiBaseUrl)
  if (!normalizedApiBaseUrl.endsWith('/api')) {
    throw new Error('apiBaseUrl must end with /api')
  }
  return `${normalizedApiBaseUrl}/templates/execute-dynamic`
}
