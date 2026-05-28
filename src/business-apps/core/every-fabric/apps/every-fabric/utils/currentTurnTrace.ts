import type { AgentStreamEvent } from '../types/enterpriseAgent'

const epochFromStreamEvent = (event: AgentStreamEvent): number | null => {
  if (!('timestamp' in event) || typeof event.timestamp !== 'string') {
    return null
  }
  const parsed = Date.parse(event.timestamp)
  return Number.isNaN(parsed) ? null : parsed
}

/** Events at or after the latest human turn (avoids stale previews from prior prompts). */
export const currentTurnTrace = (
  events: AgentStreamEvent[],
  options?: { replyAfterMs?: number }
): AgentStreamEvent[] => {
  if (events.length === 0) return events

  let latestHumanSeq = -1
  for (const event of events) {
    if (event.type === 'agent_chunk' && event.role === 'human' && typeof event.seq === 'number') {
      latestHumanSeq = Math.max(latestHumanSeq, event.seq)
    }
  }

  if (latestHumanSeq < 0) {
    const replyAfterMs = options?.replyAfterMs ?? 0
    if (replyAfterMs > 0) {
      return events.filter(event => {
        const t = epochFromStreamEvent(event)
        return t === null || t >= replyAfterMs
      })
    }
    return events
  }
  return events.filter(event => !('seq' in event) || typeof event.seq !== 'number' || event.seq >= latestHumanSeq)
}
