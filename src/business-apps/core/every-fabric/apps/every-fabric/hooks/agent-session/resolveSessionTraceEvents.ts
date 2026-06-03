import type { AgentStreamEvent } from '../../types/enterpriseAgent'

/**
 * Prefer live SSE events when present; otherwise fall back to the REST session
 * trace (completed sessions, refresh, streamSuppressed). Same contract as artifact
 * preview sourcing in FabricContext.
 */
export function resolveSessionTraceEvents(
  liveEvents: AgentStreamEvent[],
  sessionTrace: AgentStreamEvent[] | undefined
): AgentStreamEvent[] {
  if (liveEvents.length > 0) return liveEvents
  return sessionTrace ?? []
}
