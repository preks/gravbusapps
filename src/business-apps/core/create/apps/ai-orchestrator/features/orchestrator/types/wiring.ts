/**
 * Wiring domain types for the AI Orchestrator.
 * Defines component wiring and integration functionality.
 */

// Wiring update types
export interface AgentToolUpdate {
  agentId: string
  agentName: string
  addTools: string[]
}

export interface FlowStepUpdate {
  stepIndex: number
  stepTitle: string
  functionId?: string
  agentId?: string
  configUpdates?: Record<string, unknown>
}

export interface FlowUpdate {
  flowId: string
  flowName: string
  stepUpdates: FlowStepUpdate[]
}

export interface ScreenUpdate {
  screenId: string
  screenName: string
  entityBinding?: string
  graphqlQuery?: string
  dataModelIds?: string[]
}

export interface WiringPlan {
  jobId: string
  agentUpdates: AgentToolUpdate[]
  flowUpdates: FlowUpdate[]
  screenUpdates: ScreenUpdate[]
  summary: string
}
