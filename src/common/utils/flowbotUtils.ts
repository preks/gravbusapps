import { env } from '@/common/env/EnvUtils'

/**
 * Resolve the base URL for FlowBot.
 *
 * Single source of truth: `NEXT_PUBLIC_FLOWBOT_ENDPOINT` in `.env`.
 *
 * Resolution order:
 *   1. `NEXT_PUBLIC_FLOWBOT_ENDPOINT` from the environment.
 *      - Set to e.g. `http://localhost:8000` to point at a locally running FlowBot.
 *      - Set to a tenant URL (e.g. `https://newwork-dev.newwork.com`) to point
 *        at a remote FlowBot.
 *      - The ad-hoc developer override (`?flowbotEndpoint=…` or the
 *        `flowbot-endpoint-override` localStorage key) is applied transparently
 *        inside `env()` in `EnvUtils.ts` and takes precedence over `.env`.
 *   2. Fallback: `NEXT_PUBLIC_BASE_URL`. Every tenant exposes FlowBot under
 *      `${BASE_URL}/flowbot/...`, so callers append `/flowbot/<path>` themselves.
 *
 * Note: callers must prepend `/flowbot/` to their request paths — this function
 * returns only the host portion (no `/flowbot` suffix), regardless of which
 * branch above is taken.
 */
export function resolveFlowbotBaseUrl(): string {
  const endpoint = env('NEXT_PUBLIC_FLOWBOT_ENDPOINT')
  if (endpoint) return endpoint.replace(/\/+$/, '')

  const base = env('NEXT_PUBLIC_BASE_URL') || ''
  return base.replace(/\/+$/, '')
}
