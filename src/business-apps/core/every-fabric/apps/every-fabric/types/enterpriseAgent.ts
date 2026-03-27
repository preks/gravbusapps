// Session
export interface DeepAgentSession {
  session_id: string
  input: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'waiting_for_human'
  output?: string
  todos?: TodoItem[]
  trace?: AgentStreamEvent[]
  reflection?: ReflectionResult
  quality_score?: number
  cost_summary?: CostSummary
  duration_ms?: number
  created_at: string
  updated_at: string
  started_at?: string
  completed_at?: string
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
  tool_name?: string
  tool_input?: Record<string, unknown>
  step_id?: string
}

export interface AgentTerminalEvent {
  type: 'terminal'
  seq: number
  event_id: string
  timestamp?: string
  status: 'completed' | 'failed' | 'cancelled' | 'waiting_for_human'
  output?: string | null
  todos?: TodoItem[]
  reflection?: ReflectionResult | null
  human_question?: string | null
  duration_ms?: number
  cost_summary?: CostSummary | null
}

export interface AgentErrorEvent {
  type: 'error'
  message: string
}

export interface AgentStepStartedEvent {
  type: 'step_started'
  seq: number
  event_id: string
  step_id: string
  step_type?: 'tool' | 'thinking' | 'subagent'
  name?: string
  input?: Record<string, unknown>
  timestamp: string
}

export interface AgentStepCompletedEvent {
  type: 'step_completed'
  seq: number
  event_id: string
  step_id: string
  status?: 'done' | 'failed'
  output?: string
  duration_ms?: number
  name?: string
  timestamp: string
}

export interface AgentSubagentSpawnedEvent {
  type: 'subagent_spawned'
  seq: number
  event_id: string
  step_id: string
  name?: string
  subagent_id?: string
  parent_step_id?: string
  task_summary?: string
  timestamp: string
}

export interface AgentSubagentCompletedEvent {
  type: 'subagent_completed'
  seq: number
  event_id: string
  step_id: string
  status?: 'done' | 'failed'
  output?: string
  duration_ms?: number
  subagent_id?: string
  name?: string
  timestamp: string
}

export type AgentStreamEvent =
  | AgentChunkEvent
  | AgentTerminalEvent
  | AgentErrorEvent
  | AgentStepStartedEvent
  | AgentStepCompletedEvent
  | AgentSubagentSpawnedEvent
  | AgentSubagentCompletedEvent

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

export interface SpecialistAgent {
  id: string
  name: string
  display_name: string
  description: string
  domain: string
  tags: string[]
  is_active?: boolean
}

export interface SessionConfig {
  mode: 'deep' | 'autonomous'
  model?: string
  enable_memory: boolean
  enable_reflection: boolean
  max_iterations?: number
  selectedAgent?: SpecialistAgent
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

export type TraceEvent = AgentStreamEvent

export interface ActionSummary {
  step: string
  tool?: string
  outcome: string
}

export interface RunningSessionSummary {
  session_id: string
  input: string
  started_at: string
  current_step?: string
  step_count?: number
}

export interface WaitingSessionSummary {
  session_id: string
  input: string
  question: string
}
