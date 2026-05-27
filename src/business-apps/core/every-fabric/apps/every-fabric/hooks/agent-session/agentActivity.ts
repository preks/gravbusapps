import type { AgentStreamEvent } from '../../types/enterpriseAgent'
import { looksLikeRawPayload } from './streamPayloadGuards'
import { findTurnStartEpoch, toEpoch } from './traceTurn'

const humanizeActivityIdentifier = (raw: string): string => {
  const trimmed = raw.trim().replace(/^newwork[_-]/i, '')
  if (!trimmed) return raw.trim()
  const spaced = trimmed
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
  if (!spaced) return raw.trim()
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

const isResponseStreamStart = (e: AgentStreamEvent): boolean =>
  e.type === 'agent_chunk' && e.role === 'ai' && e.chunk_kind === 'response_stream'

const stepStartedActivityText = (e: AgentStreamEvent): string | null => {
  if (e.type !== 'step_started') return null
  const stepType = (e as { step_type?: string }).step_type
  if (stepType === 'thinking') return 'Thinking through the next step'
  const name = (e as { name?: string }).name
  if (!name) return null
  const friendly = humanizeActivityIdentifier(name)
  return stepType === 'subagent' ? `Delegating to ${friendly}` : `Calling ${friendly}`
}

const eventActivityText = (e: AgentStreamEvent): string | null => {
  let raw: string | null = null
  if (e.type === 'agent_chunk' && (e.chunk_kind === 'status' || e.chunk_kind === 'live_status')) {
    raw = e.content ?? null
  } else if (e.type === 'step_started') {
    raw = stepStartedActivityText(e)
  } else if (e.type === 'expert_called') {
    const name = (e as { name?: string; expert_name?: string }).expert_name ?? (e as { name?: string }).name
    raw = name ? `Consulting ${humanizeActivityIdentifier(name)}` : null
  } else if (e.type === 'decision') {
    const title = (e as { title?: string }).title
    raw = title ?? null
  }

  if (!raw) return null
  if (looksLikeRawPayload(raw)) return null
  return raw
}

interface ActivityRow {
  ts: number
  text: string
}

interface CollectedActivity {
  rows: ActivityRow[]
  responseStarted: boolean
}

const collectAgentActivityRows = (events: AgentStreamEvent[], turnStartEpoch: number): CollectedActivity => {
  const rows: ActivityRow[] = []
  let responseStarted = false
  for (const e of events) {
    const tsRaw = (e as { timestamp?: string }).timestamp
    const ts = typeof tsRaw === 'string' ? toEpoch(tsRaw) : 0
    if (ts < turnStartEpoch) continue
    if (isResponseStreamStart(e)) {
      responseStarted = true
      continue
    }
    const text = eventActivityText(e)?.trim()
    if (!text || looksLikeRawPayload(text)) continue
    rows.push({ ts, text })
  }
  return { rows, responseStarted }
}

const dedupeConsecutive = (values: string[]): string[] => {
  const out: string[] = []
  for (const v of values) {
    if (out[out.length - 1] === v) continue
    out.push(v)
  }
  return out
}

export function buildAgentActivityLines(events: AgentStreamEvent[]): string[] {
  if (!events || events.length === 0) return []

  const turnStartEpoch = findTurnStartEpoch(events)
  const collected = collectAgentActivityRows(events, turnStartEpoch)
  if (collected.responseStarted) return []

  collected.rows.sort((a, b) => a.ts - b.ts)
  return dedupeConsecutive(collected.rows.map(r => r.text)).slice(-3)
}
