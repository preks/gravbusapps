/**
 * Shared types for the board-apps Flow Engine integration.
 */

export type FlowEntityKind = 'flows' | 'tasks'

export interface FlowEngineTagFilter {
  key: string
  value: string
}

export interface FlowDataSourceConfig {
  id: string
  enabled: boolean
  provider: 'flowEngine'
  flowEntity: FlowEntityKind
  entityDisplayName: string

  templateIds?: string[]
  tags?: FlowEngineTagFilter[]

  scope: 'all' | 'byUser'
  participationType?: 'initiated' | 'participated'
  userId?: string
  includeAssigned?: boolean
  includeClaimable?: boolean

  status?: string
  customStatus?: string
  priority?: string
  search?: string

  limit: number
  refreshMode: 'manual' | 'onOpen' | 'periodic'
  refreshInterval?: number

  lastSyncAt?: string
  lastSyncCount?: number
  lastSyncError?: string

  syncMode: 'replace' | 'append' | 'merge'
  mergeKey?: string
}

export interface FlowTemplateSummary {
  id: string
  name: string
  description?: string
  type?: string
  version?: number
  tags?: Record<string, unknown>
}

export interface FlowSummaryRecord {
  flowId: string
  flowName: string
  templateId: string
  templateName: string
  status: string
  startTime: string
  updateTime: string
  endTime?: string
  progressPercentage: number
  currentStep: number
  totalSteps: number
  initiatedBy: string
  initiatedById?: string
  participants: string[]
  priority?: string
  isOverdue?: boolean
  durationMinutes?: number
}

export interface FlowTaskRecord {
  id: string
  flowId: string
  flowName?: string
  stepIndex?: number
  title: string
  name: string
  status: string
  priority?: string
  customStatus?: string
  dueDate?: string
  scheduledAt?: string
  completedAt?: string
  assignedTo?: string
  claimedBy?: string
  assignmentStatus?: string
  message?: string
  templateId?: string
  templateName?: string
}

export interface FlowProgressStep {
  stepIndex: number
  stepKey: string
  title: string
  type: string
  status: string
  assignedTo?: string
  claimedBy?: string
  startedAt?: string
  completedAt?: string
  dueDate?: string
}

export interface FlowProgressComplete {
  flowId: string
  flowName: string
  status: string
  progressPercentage: number
  steps: FlowProgressStep[]
}

export interface FlowTemplateBranch {
  condition: string
  nextStep: number
}

export interface FlowTemplateStep {
  name?: string
  title?: string
  type?: string
  nextStep?: number | null
  defaultNextStep?: number | null
  branches?: FlowTemplateBranch[]
}

export interface FlowTemplateDefinition {
  id: string
  name: string
  steps: FlowTemplateStep[]
}
