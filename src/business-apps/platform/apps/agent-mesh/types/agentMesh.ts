// Agent Mesh Types - aligned with prompt-manager backend models

export interface AgentCard {
  division?: string
  data_domains: string[]
  capabilities: string[]
  access_policy: 'public' | 'division_only' | 'steering_only'
  allowed_callers: string[]
  version: string
}

export interface KnowledgeSourceEntry {
  id?: string
  type: string
  name: string
  description?: string
  url?: string
  fileId?: string
  fileName?: string
  lastUpdated?: string
  createdAt?: string
}

export interface AgentRegistryEntry {
  id: string
  name: string
  description: string
  agent_type: string | null
  specialty: string | null
  avatar: string | null
  color: string | null
  is_public: boolean | null
  tags: string[]
  agent_card: AgentCard | null
  tools_count: number
  knowledge_sources_count: number
  outgoing_connections: ConnectionRef[]
  incoming_connections: ConnectionRef[]
  created_at: string | null
  // Detail-only fields (returned by GET /registry/{id}, not by list)
  tools?: string[]
  knowledge_sources?: KnowledgeSourceEntry[]
  response_style?: string | null
  citation_mode?: string | null
}

export interface ConnectionRef {
  connection_id: string
  target_id?: string
  target_name?: string
  source_id?: string
  source_name?: string
  status: string
}

export interface ConnectionConfig {
  direction: 'caller_to_callee' | 'bidirectional'
  data_domains: string[]
  timeout_seconds: number
  rate_limit_per_hour: number
  retry_attempts: number
}

export interface ConnectionStats {
  total_calls: number
  success_rate: number
  avg_duration_ms: number
  p95_duration_ms: number
  last_call_at: string | null
  errors_last_24h: number
}

export interface Connection {
  connection_id: string
  caller_id: string
  caller_name: string
  callee_id: string
  callee_name: string
  config: ConnectionConfig
  status: 'active' | 'paused' | 'error'
  stats: ConnectionStats | null
  created_at: string
  updated_at: string
}

export interface ConnectionCreateRequest {
  caller_id: string
  caller_name: string
  callee_id: string
  callee_name: string
  config?: Partial<ConnectionConfig>
}

export interface ToolCallLog {
  tool_name: string
  input_args: Record<string, unknown>
  output_data: string
  duration_ms: number
  status: string
}

export interface ExecutionLog {
  execution_id: string
  correlation_id: string
  parent_execution_id: string | null
  connection_id: string | null
  prompt_id: string
  prompt_name: string
  caller_id: string | null
  caller_name: string | null
  status: 'success' | 'error' | 'timeout'
  duration_ms: number
  input_message: string
  output_message: string
  input_preview: string
  output_preview: string
  tool_calls: ToolCallLog[]
  knowledge_chunks: Record<string, unknown>[]
  token_usage: Record<string, number>
  timing: Record<string, number>
  created_at: string
}

export interface ExecutionListItem {
  execution_id: string
  correlation_id: string
  prompt_id: string
  prompt_name: string
  caller_id: string | null
  caller_name: string | null
  connection_id: string | null
  status: string
  duration_ms: number
  input_preview: string
  output_preview: string
  input_message: string
  output_message: string
  tool_calls_count: number
  token_usage: Record<string, number>
  created_at: string | null
}

export interface ExecutionTrace {
  correlation_id: string
  total_duration_ms: number
  total_tokens: number
  agent_count: number
  execution_count: number
  tree: ExecutionTraceNode
}

export interface ExecutionTraceNode {
  execution_id: string
  correlation_id: string
  prompt_name: string
  status: string
  duration_ms: number
  input_preview: string
  output_preview: string
  children: ExecutionTraceNode[]
}

export interface ExecutionAnalytics {
  period_days: number
  total_calls: number
  avg_per_day: number
  error_rate: number
  avg_duration_ms: number
  p50_ms: number
  p95_ms: number
  p99_ms: number
  top_pairs: { pair: string; count: number }[]
  daily_volume: { date: string; count: number }[]
}

export interface ConnectionAnalytics {
  connection_id: string
  period_days: number
  total_calls: number
  success_rate: number
  avg_duration_ms: number
  p95_duration_ms: number
  errors: number
}

export interface AlertAction {
  type: 'dashboard' | 'notification' | 'flow'
  config: Record<string, unknown>
}

export interface AlertRule {
  rule_id: string
  name: string
  agent_id: string | null
  connection_id: string | null
  metric: 'response_time_p95' | 'error_rate' | 'token_usage' | 'availability'
  operator: 'gt' | 'lt' | 'eq'
  threshold: number
  window_minutes: number
  status: 'active' | 'paused'
  actions: AlertAction[]
  last_triggered: string | null
  created_at: string
}

export interface AlertRuleCreateRequest {
  name: string
  agent_id?: string
  connection_id?: string
  metric: string
  operator: string
  threshold: number
  window_minutes?: number
  actions?: AlertAction[]
}

export interface ActiveAlert {
  rule_id: string
  name: string
  agent_id: string | null
  connection_id: string | null
  metric: string
  current_value: number
  threshold: number
  operator: string
  actions: AlertAction[]
}

export type MeshView = 'dashboard' | 'registry' | 'console' | 'traces'

// --- Sessions ---
export interface SessionMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface SessionCommEvent {
  id: string
  type: 'dispatch' | 'response' | 'thinking'
  fromAgent: string
  toAgent: string
  query?: string
  response?: string
  status: 'pending' | 'running' | 'success' | 'error'
  durationMs?: number
  timestamp: number
}

export interface MeshSession {
  session_id: string
  user_id: string
  agent_id: string
  agent_name: string
  title: string
  messages: SessionMessage[]
  comm_events: SessionCommEvent[]
  result: string | null
  created_at: string
  updated_at: string
}
