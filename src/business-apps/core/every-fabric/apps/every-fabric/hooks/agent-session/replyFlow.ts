import type { Dispatch, SetStateAction } from 'react'
import type { AgentStreamEvent, ChatMessage, DeepAgentSession, MessageAttachmentRef } from '../../types/enterpriseAgent'
import { advanceSessionStreamCursor } from '../sessionStreamRegistry'
import { invalidateDeepAgentSessionEtagCache } from '../useEnterpriseAgentClient'
import { isFlowBotFabricRuntime } from '../../utils/fabricRuntime'
import { isRestTerminalForCurrentTurn } from './sessionStatus'
import type { AgentExecutionClient } from './types'
import { REST_SYNC_INTERVAL_MS, REST_SYNC_MAX_MS } from './types'
import { maxSeqFromTrace, streamOverlayTerminalStatus } from './traceTurn'

export async function waitForRestSyncWithWaitingHumanStream(
  eventsSnapshot: AgentStreamEvent[],
  readRestStatus: () => DeepAgentSession['status'] | undefined,
  fetchSession: () => Promise<DeepAgentSession | null>
): Promise<void> {
  const overlay = streamOverlayTerminalStatus(eventsSnapshot)
  if (overlay !== 'waiting_for_human' || readRestStatus() !== 'running') return
  const deadline = Date.now() + REST_SYNC_MAX_MS
  while (Date.now() < deadline) {
    await fetchSession()
    const st = readRestStatus()
    if (st === 'waiting_for_human') break
    if (st !== 'running') break
    await new Promise(r => setTimeout(r, REST_SYNC_INTERVAL_MS))
  }
}

export async function postInterruptWith409Retry(
  postInterrupt: () => Promise<unknown>,
  fetchSession: () => Promise<DeepAgentSession | null>
): Promise<void> {
  let attempts = 0
  while (true) {
    try {
      await postInterrupt()
      return
    } catch (error) {
      const msg = error instanceof Error ? error.message : ''
      const isConflict = /409/.test(msg) && /Session is still running|waiting_for_human/i.test(msg)
      if (isConflict && attempts < 1) {
        attempts++
        await fetchSession()
        await new Promise(r => setTimeout(r, REST_SYNC_INTERVAL_MS))
        continue
      }
      throw error
    }
  }
}

export async function postSessionReply(params: {
  sessionId: string
  client: AgentExecutionClient
  message?: string
  structuredInput?: Record<string, unknown>
  attachments?: MessageAttachmentRef[]
  previewUrlByAttachmentId: Map<string, string>
  eventsSnapshot: AgentStreamEvent[]
  readRestStatus: () => DeepAgentSession['status'] | undefined
  fetchSession: (options?: { bypassCache?: boolean }) => Promise<DeepAgentSession | null>
  setOptimisticMessages: Dispatch<SetStateAction<ChatMessage[]>>
  setIsAgentRunning: (running: boolean) => void
  setLastReplyTimestamp: (timestamp: number) => void
  setStreamVersion: Dispatch<SetStateAction<number>>
}): Promise<void> {
  const {
    sessionId,
    client,
    message,
    structuredInput,
    attachments,
    previewUrlByAttachmentId,
    eventsSnapshot,
    readRestStatus,
    fetchSession,
    setOptimisticMessages,
    setIsAgentRunning,
    setLastReplyTimestamp,
    setStreamVersion
  } = params

  if (attachments) {
    for (const att of attachments) {
      if (att.preview_url) {
        previewUrlByAttachmentId.set(att.id, att.preview_url)
      }
    }
  }

  const optimisticId = `optimistic-${Date.now()}`
  if (message && !structuredInput) {
    setOptimisticMessages(prev => [
      ...prev,
      {
        id: optimisticId,
        type: 'user_input',
        timestamp: new Date().toISOString(),
        content: message,
        ...(attachments && attachments.length > 0 ? { attachments } : {})
      }
    ])
  }

  await waitForRestSyncWithWaitingHumanStream(eventsSnapshot, readRestStatus, fetchSession)
  const cursorBeforeReply = maxSeqFromTrace(eventsSnapshot)
  if (cursorBeforeReply > 0) {
    advanceSessionStreamCursor(sessionId, cursorBeforeReply)
  }
  invalidateDeepAgentSessionEtagCache(sessionId)
  setIsAgentRunning(true)
  const replyStartedAt = Date.now()
  setLastReplyTimestamp(replyStartedAt)

  const attachmentRefs = attachments?.map(a => ({
    id: a.id,
    name: a.name,
    mime_type: a.mime_type,
    size: a.size,
    indexing_status: a.indexing_status
  }))

  try {
    await postInterruptWith409Retry(
      () => client.replyToInterrupt(sessionId, message, structuredInput, attachmentRefs),
      fetchSession
    )
    invalidateDeepAgentSessionEtagCache(sessionId)
    const updated = await fetchSession({ bypassCache: true })
    if (!isFlowBotFabricRuntime()) {
      setStreamVersion(v => v + 1)
    }
    // Only treat the post-reply snapshot as terminal when it belongs to *this*
    // turn. Right after posting, REST can still echo the previous turn's
    // `completed` status; acting on it would stop the live turn before it runs.
    if (isRestTerminalForCurrentTurn(updated, replyStartedAt)) {
      setIsAgentRunning(false)
      setLastReplyTimestamp(0)
    }
    setOptimisticMessages(prev => prev.filter(m => m.id !== optimisticId))
  } catch (error) {
    console.error('[reply] Error sending to backend:', error instanceof Error ? error.message : 'Request failed')
    setIsAgentRunning(false)
    setOptimisticMessages(prev => prev.filter(m => m.id !== optimisticId))
    throw error
  }
}
