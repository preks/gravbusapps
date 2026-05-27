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
import { currentTurnTrace, sessionTraceOrEmpty } from './traceTurn'

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

  const liveTurnEvents = useMemo(() => {
    if (events.length > 0) return currentTurnTrace(events)
    return currentTurnTrace(sessionTraceOrEmpty(mergedSession))
  }, [events, mergedSession])

  const streamingGreeting = useMemo(() => extractStreamingGreeting(events, mergedSession), [events, mergedSession])

  const streamingContent = useMemo(
    () => computeStreamingDisplayContent(liveTurnEvents, lastReplyTimestamp, isAgentRunning, mergedSession?.status),
    [isAgentRunning, liveTurnEvents, mergedSession?.status, lastReplyTimestamp]
  )

  const streamingThinking = useMemo(() => extractStreamingThinking(events, mergedSession), [events, mergedSession])

  const statusHeadline = useMemo(
    () => extractStatusHeadline(events, mergedSession?.status),
    [events, mergedSession?.status]
  )

  const liveStatusHeadline = useMemo(
    () => extractLiveStatusHeadline(events, mergedSession?.status),
    [events, mergedSession?.status]
  )

  const displayStatus = liveStatusHeadline ?? statusHeadline

  const ackHeadline = useMemo(() => extractAckHeadline(events, mergedSession?.status), [events, mergedSession?.status])

  const planItems = useMemo(() => extractPlanItems(events, mergedSession), [events, mergedSession])

  const agentActivityLines = useMemo<string[]>(() => {
    if (isTerminalSessionStatus(mergedSession?.status)) return []
    return buildAgentActivityLines(events)
  }, [events, mergedSession?.status])

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
