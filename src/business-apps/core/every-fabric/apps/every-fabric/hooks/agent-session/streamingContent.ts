import type { AgentChunkEvent, AgentStreamEvent, DeepAgentSession } from '../../types/enterpriseAgent'
import { isTerminalStatus } from './sessionStatus'
import { looksLikeDashboardJson, looksLikeInternalErrorLeak } from './streamPayloadGuards'
import { epochFromStreamEvent, toEpoch } from './traceTurn'

const chunkStreamKey = (chunk: AgentChunkEvent): string | null => {
  const raw = chunk.metadata?.stream_key
  return typeof raw === 'string' && raw.trim().length > 0 ? raw : null
}

function buildStreamingContentFromSnapshots(events: AgentStreamEvent[]): string | null {
  const responseSnapshots = events
    .filter(
      (entry): entry is AgentChunkEvent =>
        entry.type === 'agent_chunk' &&
        entry.role === 'ai' &&
        entry.chunk_kind === 'response_stream' &&
        typeof entry.content === 'string' &&
        entry.content.trim().length > 0
    )
    .sort((a, b) => toEpoch(a.timestamp) - toEpoch(b.timestamp))

  if (responseSnapshots.length === 0) {
    return null
  }

  const primarySnapshots = responseSnapshots.filter(snapshot => chunkStreamKey(snapshot) !== 'continuation')
  const preferredSnapshots = primarySnapshots.length > 0 ? primarySnapshots : responseSnapshots
  const safeSnapshots = preferredSnapshots.filter(snapshot => {
    const text = snapshot.content.trim()
    return !looksLikeInternalErrorLeak(text) && !looksLikeDashboardJson(text)
  })
  if (safeSnapshots.length === 0) {
    return ''
  }

  let stableContent = ''
  for (const snapshot of safeSnapshots) {
    const nextContent = snapshot.content.trim()
    if (!nextContent) continue
    if (!stableContent) {
      stableContent = nextContent
      continue
    }
    if (nextContent.length >= stableContent.length && nextContent.startsWith(stableContent)) {
      stableContent = nextContent
    }
  }

  return stableContent || safeSnapshots[safeSnapshots.length - 1].content.trim()
}

function buildStreamingContentFromLegacyThinking(events: AgentStreamEvent[]): string {
  const legacyThinking = events
    .filter(
      (entry): entry is AgentChunkEvent =>
        entry.type === 'agent_chunk' &&
        entry.role === 'ai' &&
        entry.chunk_kind === 'thinking' &&
        typeof entry.content === 'string' &&
        entry.content.trim().length > 0
    )
    .sort((a, b) => toEpoch(a.timestamp) - toEpoch(b.timestamp))

  if (legacyThinking.length === 0) {
    return ''
  }

  return legacyThinking
    .map(e => e.content.trim())
    .filter(Boolean)
    .join('\n\n')
}

export function computeStreamingDisplayContent(
  liveTurnEvents: AgentStreamEvent[],
  lastReplyTimestamp: number,
  isAgentRunning: boolean,
  mergedStatus: DeepAgentSession['status'] | undefined
): string {
  if (mergedStatus && isTerminalStatus(mergedStatus)) {
    return ''
  }
  const isActivelyRunning = isAgentRunning || mergedStatus === 'running' || mergedStatus === 'pending'
  if (!isActivelyRunning) {
    return ''
  }

  if (lastReplyTimestamp > 0) {
    const hasRecentEvents = liveTurnEvents.some(event => {
      const t = epochFromStreamEvent(event)
      return t !== null && t >= lastReplyTimestamp
    })
    if (!hasRecentEvents) {
      return ''
    }
  }

  const fromSnapshots = buildStreamingContentFromSnapshots(liveTurnEvents)
  if (fromSnapshots !== null) {
    if (looksLikeDashboardJson(fromSnapshots)) {
      return 'Generating chart…'
    }
    return fromSnapshots
  }

  return buildStreamingContentFromLegacyThinking(liveTurnEvents)
}

export function extractStreamingGreeting(events: AgentStreamEvent[], mergedSession: DeepAgentSession | null): string {
  const allEvents = events.length > 0 ? events : (mergedSession?.trace ?? [])
  const greetingEvents = allEvents
    .filter(
      (entry): entry is AgentChunkEvent =>
        entry.type === 'agent_chunk' &&
        entry.role === 'ai' &&
        entry.chunk_kind === 'final' &&
        typeof entry.content === 'string' &&
        entry.content.trim().length > 0
    )
    .sort((a, b) => toEpoch(a.timestamp) - toEpoch(b.timestamp))

  return greetingEvents[0]?.content.trim() ?? ''
}
