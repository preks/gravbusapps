import { env } from '@/common/env/EnvUtils'

const DEFAULT_FLOWBOT_BASE_URL = 'https://newwork-dev.newwork.com'
const LOCAL_FALLBACK_FLOWBOT_BASE_URL = 'http://localhost:8000'

/**
 * Resolve the base URL for FlowBot in a consistent way across the app.
 *
 * Priority:
 * 1) Localhost → always talk to local FlowBot on :8000 (for dev convenience)
 * 2) Explicit endpoint from env (DEV / PROD)
 * 3) Fallback to hardcoded DEV URL
 */
export function resolveFlowbotBaseUrl(): string {
  // 1) Local development → ALWAYS use local FlowBot
  if (typeof window !== 'undefined') {
    const host = window.location.hostname
    const isLocalHost = host === 'localhost' || host === '127.0.0.1'
    if (isLocalHost) {
      return LOCAL_FALLBACK_FLOWBOT_BASE_URL
    }
  }

  // 2) Explicit endpoint from env (DEV / PROD)
  const fromEnv = env('NEXT_PUBLIC_FLOWBOT_ENDPOINT') || env('NEXT_PUBLIC_BASE_URL')
  if (fromEnv) {
    return fromEnv
  }

  // 3) DEV fallback
  return DEFAULT_FLOWBOT_BASE_URL
}
