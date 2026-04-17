import { env, hasActiveFlowbotUserOverride } from '@/common/env/EnvUtils'

const LOCAL_FALLBACK_FLOWBOT_BASE_URL = 'http://localhost:8000'
const LOCAL_FLOWBOT_HOSTS = new Set(['localhost', '127.0.0.1'])

function isLocalUrl(value: string): boolean {
  try {
    const parsed = new URL(value)
    return LOCAL_FLOWBOT_HOSTS.has(parsed.hostname)
  } catch {
    return false
  }
}

/**
 * Resolve the base URL for FlowBot in a consistent way across the app.
 *
 * Priority:
 * 1) Localhost → default to local FlowBot on :8000
 * 2) Localhost + active user override (?flowbotEndpoint=... or localStorage override) → use override
 * 3) Explicit endpoint from env (NEXT_PUBLIC_FLOWBOT_ENDPOINT)
 * 4) Tenant base URL (NEXT_PUBLIC_BASE_URL) — works for all environments
 */
export function resolveFlowbotBaseUrl(): string {
  const explicit = env('NEXT_PUBLIC_FLOWBOT_ENDPOINT')

  // 0) Local development: use local FlowBot by default.
  // Explicit user override can intentionally point to a remote FlowBot.
  if (typeof window !== 'undefined') {
    const host = window.location.hostname
    const isLocalHost = host === 'localhost' || host === '127.0.0.1'
    if (isLocalHost) {
      if (explicit && (isLocalUrl(explicit) || hasActiveFlowbotUserOverride())) {
        return explicit
      }
      return LOCAL_FALLBACK_FLOWBOT_BASE_URL
    }
  }

  // 1) Non-localhost environments → use explicit endpoint when provided
  if (explicit) return explicit

  // 2) Tenant base URL (consistent with serviceResolver.ts and RestClient)
  return env('NEXT_PUBLIC_BASE_URL') || ''
}
