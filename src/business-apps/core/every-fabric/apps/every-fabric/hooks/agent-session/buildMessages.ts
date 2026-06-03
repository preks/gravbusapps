import type { ChatMessage, DeepAgentSession } from '../../types/enterpriseAgent'
import { sessionToMessages } from '../../utils/messageUtils'
import { isTerminalStatus } from './sessionStatus'

export interface BuildSessionMessagesInput {
  session: DeepAgentSession | null
  matchedBootstrapSession: DeepAgentSession | null
  mergedSession: DeepAgentSession | null
  streamMessages: ChatMessage[]
  optimisticMessages: ChatMessage[]
  previewUrlByAttachmentId: Map<string, string>
}

export function buildSessionMessages({
  session,
  matchedBootstrapSession,
  mergedSession,
  streamMessages,
  optimisticMessages,
  previewUrlByAttachmentId
}: BuildSessionMessagesInput): ChatMessage[] {
  const restSession = session ?? matchedBootstrapSession
  const isRestTerminal = restSession && isTerminalStatus(restSession.status)

  const rawTraceMessages = mergedSession ? sessionToMessages(mergedSession) : []

  const cachedUrls = previewUrlByAttachmentId
  const traceMessages =
    cachedUrls.size > 0
      ? rawTraceMessages.map(msg => {
          if (!msg.attachments?.length) return msg
          let changed = false
          const enrichedAtts = msg.attachments.map(att => {
            if (att.preview_url) return att
            const url = cachedUrls.get(att.id)
            if (!url) return att
            changed = true
            return { ...att, preview_url: url }
          })
          return changed ? { ...msg, attachments: enrichedAtts } : msg
        })
      : rawTraceMessages

  if (isRestTerminal) {
    return traceMessages
  }

  const traceIds = new Set(traceMessages.map(m => m.id))
  const newStreamMessages = streamMessages.filter(m => !traceIds.has(m.id))

  return [...traceMessages, ...newStreamMessages, ...optimisticMessages]
}
