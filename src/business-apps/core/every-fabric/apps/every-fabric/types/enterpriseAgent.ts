// Session
export interface DeepAgentSession {
  session_id: string
  input: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'waiting_for_human'
  output?: string
  todos?: TodoItem[]
  trace?: AgentStreamEvent[]
  artifacts?: SessionArtifactMeta[]
  workspace_documents?: WorkspaceDocument[]
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
  structured_input_request?: StructuredInputRequestEvent | null
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
  structured_input_request?: StructuredInputRequestEvent | null
  duration_ms?: number
  cost_summary?: CostSummary | null
  artifacts?: SessionArtifactMeta[]
  workspace_documents?: WorkspaceDocument[]
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
  /** Normalized snapshot from prompt-manager for write_todos / update_todos */
  todos?: TodoItem[]
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
  agent_name?: string
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
  agent_name?: string
  task_summary?: string
  parent_step_id?: string
  timestamp: string
}

export interface AgentExpertCalledEvent {
  type: 'expert_called'
  seq: number
  event_id: string
  step_id: string
  expert_name?: string
  subagent_id?: string
  task_summary?: string
  timestamp: string
}

export interface AgentExpertCompletedEvent {
  type: 'expert_completed'
  seq: number
  event_id: string
  step_id: string
  expert_name?: string
  subagent_id?: string
  output?: string
  duration_ms?: number
  status?: 'done' | 'failed'
  timestamp: string
}

export interface AgentArtifactCreatedEvent {
  type: 'artifact_created'
  seq: number
  event_id: string
  timestamp: string
  name: string
  path: string
  mime_type: string
  size: number
}

export interface StructuredInputRequestEvent {
  type: 'structured_input_request'
  seq: number
  event_id: string
  timestamp: string
  form_id: string
  title: string
  description: string
  fields: InputFieldSchema[]
  allow_partial_submit: boolean
}

export interface InputFieldSchema {
  field_id: string
  label: string
  field_type: 'text' | 'textarea' | 'select' | 'multiselect' | 'number' | 'employee_search'
  description?: string
  required: boolean
  default_value?: any
  options?: string[]
  placeholder?: string
  ai_generated?: boolean
  validation_pattern?: string
  metadata?: Record<string, any>
}

export interface SkillLoadedEvent {
  type: 'skill_loaded'
  seq: number
  event_id: string
  timestamp: string
  skill: {
    skill_id: string
    name: string
    category: string
    description: string
    icon?: string
  }
  was_auto_detected: boolean
}

export interface SkillDetectionSkippedEvent {
  type: 'skill_detection_skipped'
  seq: number
  event_id: string
  timestamp: string
  reason: string
}

export type AgentStreamEvent =
  | AgentChunkEvent
  | AgentTerminalEvent
  | AgentErrorEvent
  | AgentStepStartedEvent
  | AgentStepCompletedEvent
  | AgentExpertCalledEvent
  | AgentExpertCompletedEvent
  | AgentSubagentSpawnedEvent
  | AgentSubagentCompletedEvent
  | AgentArtifactCreatedEvent
  | StructuredInputRequestEvent
  | SkillLoadedEvent
  | SkillDetectionSkippedEvent

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

export interface SessionArtifactMeta {
  name: string
  path: string
  mime_type: string
  size: number
  created_at?: string
  modified_at?: string
}

export interface WorkspaceDocument {
  type: 'document' | 'slides' | 'note'
  id: string
  title: string
  url: string
}

export interface SessionConfig {
  mode: 'deep' | 'autonomous'
  model?: string
  enable_memory: boolean
  enable_reflection: boolean | undefined
  max_iterations?: number
  selectedAgent?: SpecialistAgent
  selectedEnterpriseSkill?: EnterpriseSkill
}

export interface EnterpriseSkill {
  id: string
  skill_id: string
  name: string
  category: string
  description: string
  icon?: string
  color?: string
  version: string
  is_active: boolean
  publisher: string
  install_count: number
  rating?: number
  onboarding_steps: string[]
  estimated_setup_time?: string
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
  | 'structured_input_request'
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

/** Present on `subagent_spawn` rows: lifecycle of the delegated expert/sub-agent. */
export type ActivityDelegationStatus = 'running' | 'done' | 'failed'

export interface ActivityEvent {
  id: string
  timestamp: string
  type: 'tool_call' | 'tool_result' | 'plan_update' | 'reflection' | 'subagent_spawn' | 'memory_access'
  agent?: string
  toolName?: string
  summary: string
  durationMs?: number
  /** When `type === 'subagent_spawn'`, whether the delegated step has finished (from SSE completions). */
  delegationStatus?: ActivityDelegationStatus
}

export interface ActionSummary {
  step: string
  tool?: string
  outcome: string
}
