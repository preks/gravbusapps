// Trace Lens — unified run rows (chat sessions + workforce runs).
//
// Chat sessions come from `GET /deep-agent/sessions` (the caller's own
// sessions); workforce runs come from the cross-agent compact listing
// `GET /workforce/runs`. Both map onto one `TraceLensRunRow` shape so the
// runs list can render them uniformly with an origin/source badge.

import { PROMPT_MANAGER_API_URL } from '@/common/utils/serviceResolver'
import { setAccessTokenToAuthorizationHeader } from '@/common/network/HeaderUtils'
import type { DeepAgentSession } from '../../types/enterpriseAgent'

export type TraceLensRunOrigin = 'chat' | 'workforce'

export interface TraceLensRunRow {
  sessionId: string
  origin: TraceLensRunOrigin
  status: string
  input: string
  createdAt?: string
  /** Workforce agent display name (workforce runs only). */
  agentName?: string
  /** Run source: manual | schedule | webhook | inbound_email (workforce only). */
  source?: string
  traceCount?: number
}

/** Compact row returned by `GET /workforce/runs` (prompt-manager). */
interface WorkforceRunSummaryRow {
  session_id: string
  agent_id: string
  agent_name?: string | null
  status: string
  source?: string | null
  input?: string
  created_at?: string
  trace_count?: number
}

const promptManagerBase = (): string =>
  PROMPT_MANAGER_API_URL.endsWith('/') ? PROMPT_MANAGER_API_URL.slice(0, -1) : PROMPT_MANAGER_API_URL

export function chatSessionToRunRow(session: DeepAgentSession): TraceLensRunRow {
  return {
    sessionId: session.session_id,
    origin: 'chat',
    status: session.status,
    input: session.input || '',
    createdAt: session.created_at,
    traceCount: Array.isArray(session.trace) ? session.trace.length : undefined
  }
}

export function workforceRunToRunRow(run: WorkforceRunSummaryRow): TraceLensRunRow {
  return {
    sessionId: run.session_id,
    origin: 'workforce',
    status: run.status,
    input: run.input || '',
    createdAt: run.created_at,
    agentName: run.agent_name ?? undefined,
    source: run.source ?? undefined,
    traceCount: run.trace_count
  }
}

/**
 * Merge chat + workforce rows: dedupe by session id (a manual workforce run
 * started by the current user can appear in both lists — the workforce row
 * wins because it carries agent/source attribution), newest first.
 */
export function mergeRunRows(chat: TraceLensRunRow[], workforce: TraceLensRunRow[]): TraceLensRunRow[] {
  const byId = new Map<string, TraceLensRunRow>()
  for (const row of chat) byId.set(row.sessionId, row)
  for (const row of workforce) byId.set(row.sessionId, row)
  return [...byId.values()].sort((a, b) => {
    const ta = a.createdAt ? Date.parse(a.createdAt) : 0
    const tb = b.createdAt ? Date.parse(b.createdAt) : 0
    return tb - ta
  })
}

/**
 * Fetch the cross-agent workforce run listing. Best-effort: older backends
 * without `GET /workforce/runs` (404) degrade to a chat-only list.
 */
export async function fetchWorkforceRunRows(accessToken: string, limit = 100): Promise<TraceLensRunRow[]> {
  try {
    const headers: Record<string, string> = { Accept: 'application/json' }
    if (accessToken) headers.Authorization = setAccessTokenToAuthorizationHeader(accessToken)
    const response = await fetch(`${promptManagerBase()}/workforce/runs?limit=${limit}`, {
      method: 'GET',
      headers,
      credentials: 'same-origin',
      mode: 'cors'
    })
    if (!response.ok) return []
    const payload = (await response.json()) as { data?: WorkforceRunSummaryRow[] }
    const rows = Array.isArray(payload?.data) ? payload.data : []
    return rows.filter(r => Boolean(r?.session_id)).map(workforceRunToRunRow)
  } catch {
    // Workforce listing is additive — TraceLens still works with chat runs.
    return []
  }
}
