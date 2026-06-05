import { useMemo } from 'react'
import type { AgentStreamEvent, ChatMessage, DeepAgentSession } from '../../types/enterpriseAgent'
import { buildAgentActivityLines } from './agentActivity'
import { buildSessionMessages } from './buildMessages'
import { mergeRestAndStreamSession } from './mergeSession'
import { deriveFabricIsStreaming, isTerminalSessionStatus } from './sessionStatus'
import {
  extractAckHeadline,
  extractLiveStatusHeadline,
  extractPlanItems,
  extractStatusHeadline,
  extractStreamingThinking
} from './streamHeadlines'
import { computeStreamingDisplayContent, extractStreamingGreeting } from './streamingContent'
import { resolveSessionTraceEvents } from './resolveSessionTraceEvents'
import { currentTurnTrace } from './traceTurn'

export interface UseAgentSessionDerivedInput {
  session: DeepAgentSession | null
  matchedBootstrapSession: DeepAgentSession | null
  events: AgentStreamEvent[]
  streamMessages: ChatMessage[]
  optimisticMessages: ChatMessage[]
  isAgentRunning: boolean
  lastReplyTimestamp: number
  previewUrlByAttachmentId: Map<string, string>
}

export function useAgentSessionDerived({
  session,
  matchedBootstrapSession,
  events,
  streamMessages,
  optimisticMessages,
  isAgentRunning,
  lastReplyTimestamp,
  previewUrlByAttachmentId
}: UseAgentSessionDerivedInput) {
  const mergedSession = useMemo(
    () => mergeRestAndStreamSession(session, matchedBootstrapSession, events),
    [session, matchedBootstrapSession, events]
  )

  const effectiveEvents = useMemo(
    () => resolveSessionTraceEvents(events, mergedSession?.trace),
    [events, mergedSession?.trace]
  )

  const isStreaming = deriveFabricIsStreaming(isAgentRunning, mergedSession?.status)

  const messages = useMemo(
    () =>
      buildSessionMessages({
        session,
        matchedBootstrapSession,
        mergedSession,
        streamMessages,
        optimisticMessages,
        previewUrlByAttachmentId
      }),
    [streamMessages, mergedSession, optimisticMessages, session, matchedBootstrapSession]
  )

  const liveTurnEvents = useMemo(() => currentTurnTrace(effectiveEvents), [effectiveEvents])

  const streamingGreeting = useMemo(
    () => extractStreamingGreeting(effectiveEvents, mergedSession),
    [effectiveEvents, mergedSession]
  )

  const streamingContent = useMemo(
    () => computeStreamingDisplayContent(liveTurnEvents, lastReplyTimestamp, isAgentRunning, mergedSession?.status),
    [isAgentRunning, liveTurnEvents, mergedSession?.status, lastReplyTimestamp]
  )

  const streamingThinking = useMemo(() => extractStreamingThinking(liveTurnEvents), [liveTurnEvents])

  const statusHeadline = useMemo(
    () => extractStatusHeadline(effectiveEvents, mergedSession?.status),
    [effectiveEvents, mergedSession?.status]
  )

  const liveStatusHeadline = useMemo(
    () => extractLiveStatusHeadline(effectiveEvents, mergedSession?.status),
    [effectiveEvents, mergedSession?.status]
  )

  const displayStatus = liveStatusHeadline ?? statusHeadline

  const ackHeadline = useMemo(
    () => extractAckHeadline(effectiveEvents, mergedSession?.status),
    [effectiveEvents, mergedSession?.status]
  )

  const planItems = useMemo(() => extractPlanItems(effectiveEvents, mergedSession), [effectiveEvents, mergedSession])

  const agentActivityLines = useMemo<string[]>(() => {
    if (isTerminalSessionStatus(mergedSession?.status)) return []
    return buildAgentActivityLines(effectiveEvents)
  }, [effectiveEvents, mergedSession?.status])

  return {
    mergedSession,
    isStreaming,
    messages,
    streamingGreeting,
    streamingContent,
    streamingThinking,
    statusHeadline,
    liveStatusHeadline,
    displayStatus,
    ackHeadline,
    planItems,
    agentActivityLines
  }
}
