/**
 * Tenant-environment detection.
 *
 * Used to gate UI surfaces that should ONLY appear on the `newwork-dev`
 * tenant -- e.g. the Developer Settings panel inside My Preferences. Reading
 * straight from the runtime env keeps the check working both in the lowcoder
 * runtime (where `window['nw-envs']` is injected) and in local Vite dev
 * (where `process.env.NEXT_PUBLIC_*` is exposed).
 */

import { env } from '@/common/env/EnvUtils'

/**
 * Returns `true` when the current frontend bundle is talking to a dev
 * tenant. We accept either an explicit `NEXT_PUBLIC_TENANT_ENV=dev` flag,
 * or a `NEXT_PUBLIC_BASE_URL` whose host contains `newwork-dev` (legacy
 * configurations that have not migrated to `TENANT_ENV` yet).
 */
export function isDevTenant(): boolean {
  if ((env('NEXT_PUBLIC_TENANT_ENV') ?? '').toLowerCase() === 'dev') {
    return true
  }

  const baseUrl = env('NEXT_PUBLIC_BASE_URL') ?? ''
  return baseUrl.includes('newwork-dev')
}
