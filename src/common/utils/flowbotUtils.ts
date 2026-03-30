import { env } from '@/common/env/EnvUtils'

const LOCAL_FALLBACK_FLOWBOT_BASE_URL = 'http://localhost:8000'

/**
 * Resolve the base URL for FlowBot in a consistent way across the app.
 *
 * LLM routing (e.g. Azure OpenAI vs public OpenAI) is configured on the FlowBot server
 * (`USE_AZURE_OPENAI`, `AZURE_OPENAI_*`), not in this frontend.
 *
 * Priority:
 * 1) Localhost → always talk to local FlowBot on :8000 (for dev convenience)
 * 2) Explicit endpoint from env (NEXT_PUBLIC_FLOWBOT_ENDPOINT)
 * 3) Tenant base URL (NEXT_PUBLIC_BASE_URL) — works for all environments
 */
export function resolveFlowbotBaseUrl(): string {
  const explicit = env('NEXT_PUBLIC_FLOWBOT_ENDPOINT')

  // 0) Local development → default to local FlowBot (unless explicitly overridden)
  if (typeof window !== 'undefined') {
    const host = window.location.hostname
    const isLocalHost = host === 'localhost' || host === '127.0.0.1'
    if (isLocalHost) {
      return explicit || LOCAL_FALLBACK_FLOWBOT_BASE_URL
    }
  }

  // 1) Non-localhost environments → use explicit endpoint when provided
  if (explicit) return explicit

  // 2) Tenant base URL (consistent with serviceResolver.ts and RestClient)
  return env('NEXT_PUBLIC_BASE_URL') || ''
}
