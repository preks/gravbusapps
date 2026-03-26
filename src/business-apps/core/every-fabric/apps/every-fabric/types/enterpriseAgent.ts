// Session
export interface DeepAgentSession {
  session_id: string
  input: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'waiting_for_human'
  output?: string
  todos?: TodoItem[]
  trace?: AgentChunkEvent[]
  reflection?: ReflectionResult
  quality_score?: number
  cost_summary?: CostSummary
  created_at: string
  updated_at: string
  config?: SessionConfig
  human_question?: string | null
}

export interface TodoItem {
  id: string
  text: string
  status: 'pending' | 'in_progress' | 'done' | 'failed' | 'skipped'
  tool_used?: string
  duration_ms?: number
}

export type AgentStreamChunkKind = 'thinking' | 'final' | 'tool'

export interface AgentChunkEvent {
  type: 'agent_chunk'
  seq: number
  event_id: string
  role: 'ai' | 'tool' | 'human' | 'system' | 'unknown'
  content: string
  timestamp: string
  chunk_kind?: AgentStreamChunkKind
}

export interface AgentTerminalEvent {
  type: 'terminal'
  seq: number
  event_id: string
  status: 'completed' | 'failed' | 'cancelled' | 'waiting_for_human'
  output?: string | null
  todos?: TodoItem[]
  reflection?: ReflectionResult | null
  human_question?: string | null
}

export interface AgentErrorEvent {
  type: 'error'
  message: string
}

export type AgentStreamEvent = AgentChunkEvent | AgentTerminalEvent | AgentErrorEvent

export interface ReflectionResult {
  complete: boolean
  missing_steps: string[]
  quality_issues: string[]
  recommendation: 'return' | 'continue'
}

export interface CostSummary {
  tokens_used: number
  estimated_cost_usd: number
  budget_pct: number
}

export interface SessionConfig {
  mode: 'deep' | 'autonomous'
  model?: string
  enable_memory: boolean
  enable_reflection: boolean
  max_iterations?: number
}

export type ChatMessageType =
  | 'user_input'
  | 'agent_thinking'
  | 'plan'
  | 'tool_call'
  | 'tool_result'
  | 'expert_call'
  | 'reflection'
  | 'human_interrupt'
  | 'final_answer'
  | 'error'

export interface ChatMessage {
  id: string
  type: ChatMessageType
  timestamp: string
  content: unknown
  isStreaming?: boolean
  isCollapsed?: boolean
}

export interface ActivityEvent {
  id: string
  timestamp: string
  type: 'tool_call' | 'tool_result' | 'plan_update' | 'reflection' | 'subagent_spawn' | 'memory_access'
  agent?: string
  toolName?: string
  summary: string
  durationMs?: number
}

export type TraceEvent = AgentChunkEvent

export interface ActionSummary {
  step: string
  tool?: string
  outcome: string
}

export interface RunningSessionSummary {
  session_id: string
  input: string
  started_at: string
}

export interface WaitingSessionSummary {
  session_id: string
  input: string
  question: string
}
