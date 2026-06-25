import type { AgentStreamEvent } from '../../types/enterpriseAgent'

export const toEpoch = (timestamp: string): number => {
  const parsed = Date.parse(timestamp)
  return Number.isNaN(parsed) ? 0 : parsed
}

export function epochFromStreamEvent(event: AgentStreamEvent): number | null {
  if (!('timestamp' in event) || typeof event.timestamp !== 'string') {
    return null
  }
  return toEpoch(event.timestamp)
}

export const currentTurnTrace = (events: AgentStreamEvent[]): AgentStreamEvent[] => {
  if (events.length === 0) return events

  let latestHumanSeq = -1
  for (const event of events) {
    if (event.type === 'agent_chunk' && event.role === 'human' && typeof event.seq === 'number') {
      latestHumanSeq = Math.max(latestHumanSeq, event.seq)
    }
  }

  if (latestHumanSeq < 0) return events
  return events.filter(event => !('seq' in event) || typeof event.seq !== 'number' || event.seq >= latestHumanSeq)
}

export const currentTurnTraceSince = (events: AgentStreamEvent[], turnStartedAt: number): AgentStreamEvent[] => {
  if (events.length === 0) return events
  if (turnStartedAt <= 0) return currentTurnTrace(events)

  let latestHumanSeq = -1
  for (const event of events) {
    if (event.type !== 'agent_chunk' || event.role !== 'human' || typeof event.seq !== 'number') continue
    const eventTime = epochFromStreamEvent(event)
    if (eventTime !== null && eventTime >= turnStartedAt) {
      latestHumanSeq = Math.max(latestHumanSeq, event.seq)
    }
  }

  if (latestHumanSeq < 0) return []
  return events.filter(event => !('seq' in event) || typeof event.seq !== 'number' || event.seq >= latestHumanSeq)
}

export const maxSeqFromTrace = (trace: AgentStreamEvent[] | undefined): number => {
  let max = 0
  for (const ev of trace ?? []) {
    if ('seq' in ev && typeof ev.seq === 'number' && ev.seq > max) {
      max = ev.seq
    }
  }
  return max
}

/** Last terminal status in the event stream (same overlay rule as mergedSession). */
export const streamOverlayTerminalStatus = (events: AgentStreamEvent[]): string | null => {
  let status: string | null = null
  for (const ev of events) {
    if (ev.type === 'terminal') status = ev.status
  }
  return status
}

export function sessionTraceOrEmpty(
  mergedSession: { trace?: AgentStreamEvent[] } | null | undefined
): AgentStreamEvent[] {
  return mergedSession?.trace ?? []
}

export const findTurnStartEpoch = (events: AgentStreamEvent[]): number => {
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const e = events[i]
    if (e.type === 'agent_chunk' && e.role === 'human') return toEpoch(e.timestamp)
  }
  return 0
}
