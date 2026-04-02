import { env, hasActiveFlowbotUserOverride } from '@/common/env/EnvUtils'

const LOCAL_FALLBACK_FLOWBOT_BASE_URL = 'http://localhost:8000'

/**
 * Resolve the base URL for FlowBot in a consistent way across the app.
 *
 * On localhost the default is always localhost:8000 so developers talk to
 * their local FlowBot instance.  Only an explicit user override
 * (?flowbotEndpoint= query param or localStorage) can redirect localhost
 * to a remote URL; the baked NEXT_PUBLIC_FLOWBOT_ENDPOINT from .env is
 * intentionally ignored on localhost because it points to newwork-dev.
 *
 * On deployed environments the standard resolution applies:
 *   NEXT_PUBLIC_FLOWBOT_ENDPOINT → NEXT_PUBLIC_BASE_URL
 */
export function resolveFlowbotBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname
    const isLocalHost = host === 'localhost' || host === '127.0.0.1'
    if (isLocalHost) {
      if (hasActiveFlowbotUserOverride()) {
        return env('NEXT_PUBLIC_FLOWBOT_ENDPOINT') || LOCAL_FALLBACK_FLOWBOT_BASE_URL
      }
      return LOCAL_FALLBACK_FLOWBOT_BASE_URL
    }
  }

  const explicit = env('NEXT_PUBLIC_FLOWBOT_ENDPOINT')
  if (explicit) return explicit

  return env('NEXT_PUBLIC_BASE_URL') || ''
}
