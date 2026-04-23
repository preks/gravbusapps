/**
 * Active sessions overview (multi-session dashboard).
 *
 * Backend shape shipped in `prompt-manager/src/api/routes/deep_agent/handlers.py`:
 *   GET /deep-agent/sessions/active
 *   GET /deep-agent/sessions/active/summary
 *   GET /deep-agent/sessions/active/stream (multiplexed SSE)
 */

/** Coarse classification of what the agent is doing right now. */
export type CurrentActivityStep = 'thinking' | 'tool_call' | 'subagent' | 'expert' | 'awaiting_human' | 'idle'

export interface CurrentActivity {
  step: CurrentActivityStep
  label: string
  started_at?: string | null
  tool_name?: string | null
  subagent_name?: string | null
  expert_name?: string | null
}

export interface ActiveSessionSkill {
  id: string
  name: string | null
  icon?: string | null
  category?: string | null
}

export interface ActiveSessionTodosSummary {
  done: number
  total: number
  current_label?: string | null
}

/** Trimmed session projection surfaced by `/deep-agent/sessions/active`. */
export interface ActiveSessionSnapshot {
  session_id: string
  input: string
  status: 'pending' | 'running' | 'waiting_for_human'
  skill: ActiveSessionSkill | null
  current_activity: CurrentActivity
  todos_summary: ActiveSessionTodosSummary
  pending_human_question?: string | null
  pending_structured_input?: Record<string, unknown> | null
  trace_count: number
  next_event_seq: number
  /**
   * Last seq we've surfaced for this session. Lets the single-session SSE
   * reconnect from the right point without refetching the full trace.
   */
  last_event_seq?: number
  started_at?: string | null
  updated_at?: string | null
  created_at?: string | null
}

export interface ActiveSessionsStatusCounts {
  running: number
  pending: number
  waiting_for_human: number
}

export interface ActiveSessionsListResponse {
  user_id: string
  count: number
  status_counts: ActiveSessionsStatusCounts
  sessions: ActiveSessionSnapshot[]
}

export interface ActiveSessionsSummaryBySkill {
  skill_id: string | null
  name: string
  icon?: string | null
  category?: string | null
  count: number
}

export interface ActiveSessionsWaitingItem {
  session_id: string
  pending_human_question?: string | null
  updated_at?: string | null
}

export interface ActiveSessionsSummaryResponse {
  user_id: string
  total: number
  by_status: ActiveSessionsStatusCounts
  by_skill: ActiveSessionsSummaryBySkill[]
  waiting_for_human_sessions: ActiveSessionsWaitingItem[]
}

// ─── SSE stream payloads ─────────────────────────────────────────────────────
// The stream multiplexes per-session events; every non-overview payload has a
// `session_id` field attached by the backend.

export interface ActiveStreamOverviewEvent {
  type: 'overview'
  timestamp: string
  user_id: string
  sessions: ActiveSessionSnapshot[]
}

export interface ActiveStreamHeartbeatEvent {
  type: 'heartbeat'
  timestamp?: string
}

/** A new active session appeared mid-stream (e.g. user opened a second chat). */
export interface ActiveStreamSessionAddedEvent {
  type: 'session_added'
  session_id: string
  timestamp?: string
  session: ActiveSessionSnapshot
}

/** A session was deleted or otherwise dropped from the active set without a terminal. */
export interface ActiveStreamSessionRemovedEvent {
  type: 'session_removed'
  session_id: string
  timestamp?: string
}

/** A session transitioned status (e.g. running -> waiting_for_human). */
export interface ActiveStreamStatusChangedEvent {
  type: 'status_changed'
  session_id: string
  status: ActiveSessionSnapshot['status']
  current_activity?: CurrentActivity
  todos_summary?: ActiveSessionTodosSummary
  pending_human_question?: string | null
  pending_structured_input?: Record<string, unknown> | null
  updated_at?: string | null
  timestamp?: string
  /** Full fresh snapshot included for convenience; FE may prefer to merge fields above. */
  session?: ActiveSessionSnapshot
}

/**
 * Per-session chunk / terminal event reused from the single-session stream but
 * extended with `session_id` so the sidebar can route it.
 */
export interface ActiveStreamSessionEvent {
  type: string
  session_id: string
  seq?: number
  event_id?: string
  timestamp?: string
  status?: string
  [key: string]: unknown
}

export type ActiveStreamEvent =
  | ActiveStreamOverviewEvent
  | ActiveStreamHeartbeatEvent
  | ActiveStreamSessionAddedEvent
  | ActiveStreamSessionRemovedEvent
  | ActiveStreamStatusChangedEvent
  | ActiveStreamSessionEvent
