/**
 * Hand-off to the EveryFabric agent workspace.
 *
 * Unlike `openEveryAI` (which opens the EveryAI assistant sidebar), this starts
 * a real EveryFabric session: the prompt travels as a URL query param and the
 * EveryFabric app picks it up on mount to kick off a brand-new session (see the
 * auto-start effect in EveryFabricApp).
 *
 * A URL param is used (instead of sessionStorage) because the platform host can
 * load each screen in its own browsing context, so storage is not guaranteed to
 * be shared across the navigation — the query string always is.
 */
import { navigateTo, buildPlatformUrl, Navigation } from './navigationUtils'

export const EVERY_FABRIC_PROMPT_PARAM = 'fabricPrompt'

export interface OpenEveryFabricOptions {
  /** Initial task/prompt that should start a new EveryFabric session. */
  prompt?: string
}

export function openEveryFabric(options?: OpenEveryFabricOptions): void {
  if (typeof window === 'undefined') return

  const prompt = options?.prompt?.trim()
  const url = prompt
    ? buildPlatformUrl(Navigation.EVERY_FABRIC, { [EVERY_FABRIC_PROMPT_PARAM]: prompt })
    : Navigation.EVERY_FABRIC

  navigateTo(url)
}
