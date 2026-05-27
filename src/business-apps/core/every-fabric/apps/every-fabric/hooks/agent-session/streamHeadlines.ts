import type {
  AgentChunkEvent,
  AgentStreamEvent,
  DeepAgentSession,
  PlanItem,
  PlanItemStatus
} from '../../types/enterpriseAgent'
import { isTerminalSessionStatus } from './sessionStatus'
import { looksLikeRawPayload } from './streamPayloadGuards'
import { toEpoch } from './traceTurn'

const isSessionTerminalForHeadlines = (status: DeepAgentSession['status'] | undefined): boolean =>
  isTerminalSessionStatus(status)

export function extractStreamingThinking(events: AgentStreamEvent[], mergedSession: DeepAgentSession | null): string {
  const allEvents = events.length > 0 ? events : (mergedSession?.trace ?? [])
  const thinkingSnapshots = allEvents
    .filter(
      (entry): entry is AgentChunkEvent =>
        entry.type === 'agent_chunk' &&
        entry.role === 'ai' &&
        entry.chunk_kind === 'agent_reasoning' &&
        typeof entry.content === 'string' &&
        entry.content.trim().length > 0
    )
    .filter(entry => !looksLikeRawPayload(entry.content, Number.MAX_SAFE_INTEGER))
    .sort((a, b) => toEpoch(a.timestamp) - toEpoch(b.timestamp))

  if (thinkingSnapshots.length > 0) {
    return thinkingSnapshots[thinkingSnapshots.length - 1].content.trim()
  }
  return ''
}

export function extractStatusHeadline(
  events: AgentStreamEvent[],
  mergedStatus: DeepAgentSession['status'] | undefined
): string | null {
  if (isSessionTerminalForHeadlines(mergedStatus)) return null
  if (mergedStatus === 'pending') return 'Preparing your files and starting the session...'
  if (!events || events.length === 0) return null

  const statusEvents = events
    .filter((e): e is AgentChunkEvent => e.type === 'agent_chunk' && e.chunk_kind === 'status')
    .sort((a, b) => toEpoch(b.timestamp) - toEpoch(a.timestamp))

  for (const evt of statusEvents) {
    const text = (evt.content ?? '').replace(/🔄\s*/, '')
    if (!text) continue
    if (looksLikeRawPayload(text)) continue
    return text
  }
  return null
}

export function extractLiveStatusHeadline(
  events: AgentStreamEvent[],
  mergedStatus: DeepAgentSession['status'] | undefined
): string | null {
  if (isSessionTerminalForHeadlines(mergedStatus)) return null
  if (!events || events.length === 0) return null

  const cutoff = Date.now() - 5000
  const liveEvents = events
    .filter((e): e is AgentChunkEvent => e.type === 'agent_chunk' && e.chunk_kind === 'live_status')
    .filter(e => toEpoch(e.timestamp) >= cutoff)
    .sort((a, b) => toEpoch(b.timestamp) - toEpoch(a.timestamp))

  for (const evt of liveEvents) {
    const text = (evt.content ?? '').replace(/🔄\s*/, '')
    if (!text) continue
    if (looksLikeRawPayload(text)) continue
    return text
  }
  return null
}

export function extractAckHeadline(
  events: AgentStreamEvent[],
  mergedStatus: DeepAgentSession['status'] | undefined
): string | null {
  if (isSessionTerminalForHeadlines(mergedStatus)) return null
  if (!events || events.length === 0) return null
  const ackEvents = events
    .filter((e): e is AgentChunkEvent => e.type === 'agent_chunk' && e.chunk_kind === 'ack')
    .sort((a, b) => toEpoch(b.timestamp) - toEpoch(a.timestamp))
  return ackEvents[0]?.content?.trim() || null
}

const normalizePlanStatus = (raw: unknown): PlanItemStatus => {
  const source = typeof raw === 'string' ? raw : 'pending'
  const s = source.toLowerCase().replace(/[-\s]/g, '_')
  if (s === 'in_progress' || s === 'inprogress' || s === 'active' || s === 'running') return 'in_progress'
  if (s === 'done' || s === 'completed' || s === 'finished') return 'done'
  if (s === 'failed' || s === 'error') return 'failed'
  if (s === 'skipped' || s === 'cancelled') return 'skipped'
  return 'pending'
}

export function extractPlanItems(events: AgentStreamEvent[], mergedSession: DeepAgentSession | null): PlanItem[] {
  if (isSessionTerminalForHeadlines(mergedSession?.status)) return []

  const sessionTodos = mergedSession?.todos as unknown as
    | Array<{ id?: string; text?: string; description?: string; content?: string; status?: string }>
    | undefined
  if (Array.isArray(sessionTodos) && sessionTodos.length > 0) {
    const fromTodos = sessionTodos
      .map((t, idx) => {
        const label = String(t?.text || t?.description || t?.content || '').trim()
        if (!label) return null
        return {
          id: String(t?.id || `todo-${idx + 1}`),
          label,
          status: normalizePlanStatus(t?.status)
        }
      })
      .filter((x): x is PlanItem => x !== null)
    if (fromTodos.length > 0) return fromTodos
  }

  if (!events || events.length === 0) return []
  const planEvents = events
    .filter(
      (e): e is AgentChunkEvent =>
        e.type === 'agent_chunk' && (e.chunk_kind === 'plan_reveal' || e.chunk_kind === 'plan_update')
    )
    .sort((a, b) => toEpoch(a.timestamp) - toEpoch(b.timestamp))
  const latest = planEvents[planEvents.length - 1]
  const rawItems = latest?.metadata?.items as
    | Array<{ id?: string; label?: string; text?: string; status?: string }>
    | undefined
  if (!Array.isArray(rawItems)) return []
  return rawItems
    .map((it, idx) => {
      const label = String(it?.label || it?.text || '').trim()
      if (!label) return null
      return {
        id: String(it?.id || `plan-${idx + 1}`),
        label,
        status: normalizePlanStatus(it?.status)
      }
    })
    .filter((x): x is PlanItem => x !== null)
}
