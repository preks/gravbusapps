import type { ChatMessage, DeepAgentSession, SessionConfig, StartSessionResponse } from '../../types/enterpriseAgent'

export interface ActiveSkillInfo {
  skill_id: string
  name: string
  category: string
  description: string
  icon?: string
  was_auto_detected: boolean
  version?: number
  published_version?: number | null
  current_version?: number
}

export interface SessionUiStateCache {
  session: DeepAgentSession | null
  isAgentRunning: boolean
  optimisticMessages: ChatMessage[]
  activeSkill: ActiveSkillInfo | null
  lastReplyTimestamp: number
  processedTerminalAt: number
  lastAccess: number
}

export interface AgentExecutionClient {
  startSession: (
    task: string,
    config?: SessionConfig,
    activeExternalConnectionIds?: string[],
    activeEnterpriseSkillId?: string,
    fallbackSkillId?: string
  ) => Promise<StartSessionResponse>
  activateSession: (sessionId: string) => Promise<StartSessionResponse>
  getSession: (sessionId: string, options?: { bypassCache?: boolean }) => Promise<DeepAgentSession>
  replyToInterrupt: (
    sessionId: string,
    message?: string,
    structuredInput?: Record<string, any>,
    attachmentRefs?: Array<{ id: string; name: string; mime_type: string; size: number; indexing_status?: string }>
  ) => Promise<unknown>
}

export const POLL_INTERVAL_MS = 3000
/**
 * While the SSE stream is connected, the periodic full-session re-fetch is just
 * a liveness backstop (the stream already delivers every event, including the
 * terminal one). Poll only every Nth `POLL_INTERVAL_MS` tick in that case to
 * avoid re-downloading + re-parsing the whole growing session document — and
 * the FabricContext re-render it triggers — several times a second mid-stream.
 */
export const SSE_HEALTHY_POLL_DIVISOR = 4
export const REST_SYNC_MAX_MS = 4000
export const REST_SYNC_INTERVAL_MS = 120
