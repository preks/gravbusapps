/**
 * Wiring domain types for the AI Orchestrator.
 * Defines component wiring and integration functionality.
 */

// Wiring update types
export interface AgentToolUpdate {
  agent_id: string
  agent_name: string
  add_tools: string[]
}

export interface FlowStepUpdate {
  step_index: number
  step_title: string
  function_id?: string
  agent_id?: string
  config_updates?: Record<string, unknown>
}

export interface FlowUpdate {
  flow_id: string
  flow_name: string
  step_updates: FlowStepUpdate[]
}

export interface ScreenUpdate {
  screen_id: string
  screen_name: string
  entity_binding?: string
  graphql_query?: string
  data_model_ids?: string[]
}

export interface WiringPlan {
  job_id: string
  agent_updates: AgentToolUpdate[]
  flow_updates: FlowUpdate[]
  screen_updates: ScreenUpdate[]
  summary: string
}
