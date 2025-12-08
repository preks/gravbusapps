/**
 * Personal AI Agents - Type Definitions
 *
 * Allows users to create autonomous agents that monitor events,
 * run scheduled tasks, and send notifications via Blink.
 */

// Agent trigger types
export type AgentTriggerType = 'schedule' | 'event' | 'manual'

// Schedule configuration (cron-like)
export interface ScheduleConfig {
  type: 'daily' | 'weekly' | 'monthly' | 'custom'
  time?: string // HH:mm format
  dayOfWeek?: number // 0-6 (Sunday-Saturday)
  dayOfMonth?: number // 1-31
  cronExpression?: string // For custom schedules
}

// Event configuration
export interface EventConfig {
  entityType: 'account' | 'opportunity' | 'lead' | 'contact' | 'employee' | 'expense' | 'investment'
  eventType: 'created' | 'updated' | 'deleted' | 'status_changed'
  filters?: Record<string, any> // Entity-specific filters
}

// Action types the agent can perform
export type AgentActionType = 'query' | 'notify' | 'update' | 'custom'

// GraphQL query action
export interface QueryAction {
  type: 'query'
  entityType: string
  query: string // GraphQL query
  variables?: Record<string, any>
}

// Notification action
export interface NotifyAction {
  type: 'notify'
  channel: 'blink' | 'email' | 'chat'
  template: string // Message template with variables
  priority?: 'low' | 'normal' | 'high' | 'urgent'
}

// Agent action
export type AgentAction = QueryAction | NotifyAction

// Complete agent definition
export interface PersonalAgent {
  id: string
  userId: string // Owner of the agent
  name: string // User-friendly name
  description: string // What the agent does

  // Trigger configuration
  triggerType: AgentTriggerType
  scheduleConfig?: ScheduleConfig
  eventConfig?: EventConfig

  // Actions to perform
  actions: AgentAction[]

  // Status and metadata
  status: 'active' | 'paused' | 'error'
  createdAt: string
  updatedAt: string
  lastExecutedAt?: string
  executionCount: number
  errorCount: number
  lastError?: string

  // AI parsing metadata
  originalPrompt: string // User's original natural language request
  parsedBy: 'ai' | 'manual' // How the agent was created
}

// Agent execution result
export interface AgentExecutionResult {
  agentId: string
  executionId: string
  startTime: string
  endTime: string
  status: 'success' | 'error' | 'partial'
  data?: any
  error?: string
  notificationsSent: number
}

// Natural language parsing result
export interface AgentParseResult {
  success: boolean
  confidence: number // 0-1
  agent: Partial<PersonalAgent>
  suggestions?: string[] // If confidence is low
  error?: string
  createdAgent?: PersonalAgent // The created agent after automatic creation
}

// Agent creation request
export interface CreateAgentRequest {
  prompt: string // Natural language description
  preview?: boolean // If true, just parse without creating
}

// Agent management responses
export interface AgentListResponse {
  agents: PersonalAgent[]
  total: number
}

export interface AgentExecutionHistoryResponse {
  executions: AgentExecutionResult[]
  total: number
}
