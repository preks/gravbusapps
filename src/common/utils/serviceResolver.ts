/**
 * Service URL resolution for NEWWORK platform services.
 *
 * Resolution priority:
 * 1. Environment variable override (for local development) - used as-is
 * 2. Base URL + service path (for published components)
 */

import { env } from '@/common/env/EnvUtils'

/**
 * Resolve service URL based on environment.
 *
 * @param envVar - Environment variable name (e.g., 'NEXT_PUBLIC_REST_ENDPOINT_ORGCHART')
 * @param servicePath - Service path (e.g., '/orgchart/api/v1')
 * @returns Fully qualified service URL
 *
 * @example
 * // Local dev with explicit env var:
 * // NEXT_PUBLIC_AI_BUILDER_API_URL=http://localhost:3001
 * // -> http://localhost:3001
 *
 * // Production (no env var):
 * // NEXT_PUBLIC_BASE_URL=https://newwork-dev.newwork.com
 * // -> https://newwork-dev.newwork.com/ai-builder/api
 */
export function resolveServiceUrl(envVar: string, servicePath: string): string {
  // Priority 1: Explicit ENV (local dev) - use as-is without modification
  const explicitUrl = env(envVar)
  if (explicitUrl) {
    return explicitUrl
  }

  // Priority 2: Construct from base URL (published components) - trim trailing slashes without ReDoS
  let baseUrl = env('NEXT_PUBLIC_BASE_URL') || ''
  while (baseUrl.length > 0 && baseUrl.endsWith('/')) {
    baseUrl = baseUrl.slice(0, -1)
  }
  const cleanPath = servicePath.startsWith('/') ? servicePath : `/${servicePath}`

  return `${baseUrl}${cleanPath}`
}

// ============================================================================
// Pre-resolved Service URLs (Central Configuration)
// ============================================================================

export const AI_BUILDER_API_URL = resolveServiceUrl('NEXT_PUBLIC_AI_BUILDER_API_URL', '/ai-builder/api')

export const ORGCHART_API_URL = resolveServiceUrl('NEXT_PUBLIC_REST_ENDPOINT_ORGCHART', '/orgchart/api/v1')

export const GRAPHQL_API_URL = resolveServiceUrl('NEXT_PUBLIC_GRAPHQL_ENDPOINT_NEWWORK', '/v1/graphql')

export const CATALOG_API_URL = resolveServiceUrl('NEXT_PUBLIC_CATALOG_API', '/catalog-manager')

export const CUSTOM_FLOW_ENGINE_API_URL = resolveServiceUrl(
  'NEXT_PUBLIC_CUSTOM_FLOW_ENGINE_API_URL',
  '/flow-engine/api'
)
