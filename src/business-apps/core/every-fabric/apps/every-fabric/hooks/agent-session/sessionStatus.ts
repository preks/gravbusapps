import type { DeepAgentSession } from '../../types/enterpriseAgent'

export const isTerminalStatus = (status: string) => status !== 'running' && status !== 'pending'

/** Exported for tests — matches deployed streaming UX semantics. */
export const deriveFabricIsStreaming = (
  isAgentRunning: boolean,
  sessionStatus: DeepAgentSession['status'] | undefined
): boolean => isAgentRunning || sessionStatus === 'pending' || sessionStatus === 'running'

export const isTerminalSessionStatus = (status: DeepAgentSession['status'] | undefined): boolean =>
  status === 'completed' || status === 'failed' || status === 'cancelled'

export const isRestTerminalStatus = (status: DeepAgentSession['status']): boolean =>
  status === 'completed' || status === 'failed' || status === 'cancelled'

/** Suppress live SSE only when REST is final; waiting_for_human should keep the stream warm for replies. */
export const deriveStreamSuppressed = (
  restSession: Pick<DeepAgentSession, 'status'> | null | undefined,
  isAgentRunning: boolean
): boolean => !!(restSession && isRestTerminalStatus(restSession.status) && !isAgentRunning)

const parseSessionTimestamp = (value: string): number => {
  const normalized = /(?:z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : `${value}Z`
  return Date.parse(normalized)
}

/**
 * Whether a REST snapshot's terminal status belongs to the *current* turn.
 *
 * During a follow-up turn REST can briefly replay the previous turn's
 * `completed` snapshot (terminal `status` + a stale `completed_at`) before it
 * catches up to the new `running` turn. Acting on that stale snapshot would
 * suppress the live SSE stream and flip streaming off mid-turn — the bubble
 * then thrashes (connect → kill → reconnect) and never renders live tokens,
 * only the final answer once REST finally syncs.
 *
 * This mirrors the staleness guard already applied to SSE `terminal` events:
 * a terminal is only honored when its completion time is at/after the moment
 * the in-flight reply was sent. When no reply is in flight
 * (`lastReplyTimestamp <= 0`) every terminal snapshot is current.
 */
export const isRestTerminalForCurrentTurn = (
  session: Pick<DeepAgentSession, 'status' | 'completed_at' | 'updated_at'> | null | undefined,
  lastReplyTimestamp: number
): boolean => {
  if (!session || !isRestTerminalStatus(session.status)) return false
  if (lastReplyTimestamp <= 0) return true
  const stamp = session.completed_at || session.updated_at
  if (!stamp) return false
  const parsed = parseSessionTimestamp(stamp)
  if (Number.isNaN(parsed)) return false
  return parsed >= lastReplyTimestamp
}
