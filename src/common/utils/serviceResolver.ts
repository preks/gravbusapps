/**
 * Service URL resolution for NEWWORK platform services.
 *
 * Resolution priority:
 * 1. Environment variable override (for local development) - used as-is
 * 2. Base URL + service path + api path (for published components)
 */

import { env } from '@/common/env/EnvUtils'

export interface ServicePathConfig {
  servicePath: string
  apiPath: string
}

function buildFullPath(servicePath: string, apiPath: string): string {
  const s = servicePath.startsWith('/') ? servicePath : `/${servicePath}`
  const trimmed = s.endsWith('/') ? s.slice(0, -1) : s
  if (!apiPath) return trimmed
  const a = apiPath.startsWith('/') ? apiPath : `/${apiPath}`
  return `${trimmed}${a}`
}

// ============================================================================
// Gravity Platform (Next `gravity-platform` app: JSON under `/api/*`, static under `/platform/*`)
// Used by remote bundles `platform/apps/setup` and `platform/apps/setup-add-employees`.
// ============================================================================

/** Host: `NEXT_PUBLIC_BASE_URL` → `NEXT_PUBLIC_PLATFORM_URL` → `window.location.origin` (same host as the embedded screen). */
export function resolveGravityPlatformAppOrigin(): string {
  const explicit = env('NEXT_PUBLIC_BASE_URL') || env('NEXT_PUBLIC_PLATFORM_URL')
  if (explicit) {
    return explicit.replace(/\/$/, '')
  }
  if (typeof globalThis.window !== 'undefined' && globalThis.window.location?.origin) {
    return globalThis.window.location.origin
  }
  return ''
}

/** Gravity Platform route handlers (`/api/active-structure`, `/api/setup`, …). */
export function resolveGravityPlatformApiRoot(): string {
  const base = resolveGravityPlatformAppOrigin().replace(/\/$/, '')
  return `${base}/api`
}

export function resolveGravityPlatformWordmarkUrl(): string {
  const base = resolveGravityPlatformAppOrigin().replace(/\/$/, '')
  return `${base}/platform/wordmark.svg`
}

/**
 * Resolve service URL based on environment.
 *
 * @param envVar - Environment variable name (e.g., 'NEXT_PUBLIC_ORGCHART_API_URL')
 * @param config - servicePath (e.g. '/orgchart') and apiPath (e.g. '/api/v1'); full path = servicePath + apiPath
 * @returns Fully qualified service URL
 */
export function resolveServiceUrl(envVar: string, config: ServicePathConfig): string {
  const serviceUrl = env(envVar)
  if (serviceUrl) {
    return serviceUrl
  }

  let baseUrl = env('NEXT_PUBLIC_BASE_URL') || ''
  while (baseUrl.length > 0 && baseUrl.endsWith('/')) {
    baseUrl = baseUrl.slice(0, -1)
  }
  const fullPath = buildFullPath(config.servicePath, config.apiPath)

  return `${baseUrl}${fullPath}`
}

// ============================================================================
// Pre-resolved Service URLs (Central Configuration)
// Naming: NAME_API_URL. Alphabetically sorted; env vars and paths match .env.example.new (base-URL services only).
// ============================================================================

export const AI_BUILDER_API_URL = resolveServiceUrl('NEXT_PUBLIC_AI_BUILDER_API_URL', {
  servicePath: '/ai-builder',
  apiPath: '/api'
})
export const CATALOG_API_URL = resolveServiceUrl('NEXT_PUBLIC_CATALOG_API_URL', {
  servicePath: '/catalog-manager',
  apiPath: ''
})
export const CHAT_API_URL = resolveServiceUrl('NEXT_PUBLIC_CHAT_API_URL', {
  servicePath: '/chat-service',
  apiPath: '/api/v1'
})
export const CHAT_WEB_SOCKET_URL = resolveServiceUrl('NEXT_PUBLIC_CHAT_WEB_SOCKET_URL', {
  servicePath: '/chat-service',
  apiPath: ''
})
export const CUSTOM_FLOW_ENGINE_API_URL = resolveServiceUrl('NEXT_PUBLIC_CUSTOM_FLOW_ENGINE_API_URL', {
  servicePath: '/flow-engine',
  apiPath: '/api'
})
export const CONTENT_API_URL = resolveServiceUrl('NEXT_PUBLIC_CONTENT_API_URL', {
  servicePath: '/processes/content',
  apiPath: ''
})
export const CUSTOMER_RELATIONS_API_URL = resolveServiceUrl('NEXT_PUBLIC_CUSTOMER_RELATIONS_API_URL', {
  servicePath: '/processes/customer-relations',
  apiPath: ''
})
export const DOCUMENT_API_URL = resolveServiceUrl('NEXT_PUBLIC_DOCUMENT_API_URL', {
  servicePath: '/document',
  apiPath: '/api/v1'
})
export const DOCUMENT_WEB_SOCKET_URL = resolveServiceUrl('NEXT_PUBLIC_DOCUMENT_WEB_SOCKET_URL', {
  servicePath: '/document',
  apiPath: ''
})
export const EMPLOYEE_EXPENSE_API_URL = resolveServiceUrl('NEXT_PUBLIC_EMPLOYEE_EXPENSE_API_URL', {
  servicePath: '/processes/employee-expense',
  apiPath: ''
})
// TODO: This custom expense process service should be removed as soon as the Selgros flow is migrated to the standard expense backend.
export const CS_SELGROS_API_URL = resolveServiceUrl('NEXT_PUBLIC_CS_SELGROS_API_URL', {
  servicePath: '/processes/cs-selgros',
  apiPath: ''
})
export const EMPLOYEES_API_URL = resolveServiceUrl('NEXT_PUBLIC_EMPLOYEES_API_URL', {
  servicePath: '/processes/employee',
  apiPath: ''
})
export const EMPLOYEE_TIME_API_URL = resolveServiceUrl('NEXT_PUBLIC_EMPLOYEE_TIME_API_URL', {
  servicePath: '/processes/employee-time',
  apiPath: ''
})
export const EVERY_API_URL = resolveServiceUrl('NEXT_PUBLIC_EVERY_API_URL', {
  servicePath: '/every-api',
  apiPath: '/v1'
})
export const EVERYBOX_API_URL = resolveServiceUrl('NEXT_PUBLIC_EVERYBOX_API_URL', {
  servicePath: '/everybox',
  apiPath: '/api/v1'
})
export const FILES_API_URL = resolveServiceUrl('NEXT_PUBLIC_FILES_API_URL', {
  servicePath: '/files',
  apiPath: '/api/v1'
})
export const FLOW_MANAGER_API_URL = resolveServiceUrl('NEXT_PUBLIC_FLOW_MANAGER_API_URL', {
  servicePath: '/flow-manager',
  apiPath: '/api/v1'
})
export const FLOW_METRICS_API_URL = resolveServiceUrl('NEXT_PUBLIC_FLOW_METRICS_API_URL', {
  servicePath: '/flow-metrics',
  apiPath: '/api/v1'
})
export const FLOW_REGISTRY_API_URL = resolveServiceUrl('NEXT_PUBLIC_FLOW_REGISTRY_API_URL', {
  servicePath: '/flow-registry',
  apiPath: '/api/v1'
})
export const GRAPHQL_API_URL = resolveServiceUrl('NEXT_PUBLIC_GRAPHQL_API_URL', {
  servicePath: '',
  apiPath: '/v1'
})
export const INVESTMENT_RELATIONS_API_URL = resolveServiceUrl('NEXT_PUBLIC_INVESTMENT_RELATIONS_API_URL', {
  servicePath: '/processes/investment-relations',
  apiPath: ''
})
export const NAVIGATION_API_URL = resolveServiceUrl('NEXT_PUBLIC_NAVIGATION_API_URL', {
  servicePath: '/navigation',
  apiPath: '/api/v1'
})
export const ORGCHART_API_URL = resolveServiceUrl('NEXT_PUBLIC_ORGCHART_API_URL', {
  servicePath: '/orgchart',
  apiPath: '/api/v1'
})
export const AUTHORIZATION_API_URL = resolveServiceUrl('NEXT_PUBLIC_AUTHORIZATION_API_URL', {
  servicePath: '/authorization',
  apiPath: '/api/v1'
})
export const PROMPT_MANAGER_API_URL = resolveServiceUrl('NEXT_PUBLIC_PROMPT_MANAGER_API_URL', {
  servicePath: '/prompt-manager',
  apiPath: '/api/v1'
})
/** Spreadsheet AI menu (formula / analyze / review / insights) → Flowbot-embedded Prompt Manager. */
export const SPREADSHEET_PROMPT_MANAGER_API_URL = resolveServiceUrl('NEXT_PUBLIC_SPREADSHEET_PROMPT_MANAGER_API_URL', {
  servicePath: '/flowbot/prompt-manager',
  apiPath: '/api/v1'
})
/** Processes base (base + /processes). No env override; for FlowClient / useKogitoProcess only. */
export const PROCESSES_BASE_URL = (() => {
  let base = env('NEXT_PUBLIC_BASE_URL') || ''
  while (base.length > 0 && base.endsWith('/')) base = base.slice(0, -1)
  return `${base}/processes`
})()
export const SCREEN_MANAGEMENT_API_URL = resolveServiceUrl('NEXT_PUBLIC_SCREEN_MANAGEMENT_API_URL', {
  servicePath: '/screen-management',
  apiPath: '/api/v1'
})
export const USER_MANAGEMENT_API_URL = resolveServiceUrl('NEXT_PUBLIC_USER_MANAGEMENT_API', {
  servicePath: '/usermanagement',
  apiPath: '/api/v1'
})
