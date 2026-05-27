import type { AgentStreamEvent, DeepAgentSession } from '../../types/enterpriseAgent'
import { isRestTerminalStatus } from './sessionStatus'

function pickMergedSessionAttachments(
  restAttachments: DeepAgentSession['session_attachments'],
  bootstrapAttachments: DeepAgentSession['session_attachments']
): DeepAgentSession['session_attachments'] {
  if (restAttachments && restAttachments.length > 0) {
    return restAttachments
  }
  if (bootstrapAttachments && bootstrapAttachments.length > 0) {
    return bootstrapAttachments
  }
  return restAttachments
}

export function mergeRestAndStreamSession(
  session: DeepAgentSession | null,
  matchedBootstrapSession: DeepAgentSession | null,
  events: AgentStreamEvent[]
): DeepAgentSession | null {
  const restSession = session ?? matchedBootstrapSession
  if (!restSession) return null

  const mergedAttachments = pickMergedSessionAttachments(
    session?.session_attachments,
    matchedBootstrapSession?.session_attachments
  )

  const restStatus = restSession.status
  if (isRestTerminalStatus(restStatus)) {
    return { ...restSession, session_attachments: mergedAttachments }
  }

  let status: DeepAgentSession['status'] = restStatus
  for (const ev of events) {
    if (ev.type === 'terminal') status = ev.status
  }
  return { ...restSession, status, session_attachments: mergedAttachments }
}
