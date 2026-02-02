/**
 * Case Management Type Definitions
 *
 * Types for cases, flows, metadata, and analytics
 */

// Status and priority types (defined first)
export type CaseStatus = 'open' | 'in_progress' | 'blocked' | 'completed' | 'cancelled'

export type CasePriority = 'low' | 'medium' | 'high' | 'critical'

export interface Case {
  caseId: string
  state: CaseState
  createdAt: string
  updatedAt: string
}

export interface CaseState {
  linkedFlows: LinkedFlow[]
  createdAt: string
  metadata?: CaseMetadata
}

export interface LinkedFlow {
  workflowId: string
  workflowName?: string
  templateId?: string
  addedAt: string
  addedBy: string
  removedAt?: string | null
  removedBy?: string | null
  status?: string // From nw_flows (COMPLETED, IN_PROGRESS, etc.)
  flowStatus?: string
  initiator?: string
  startTime?: string
  updateTime?: string
  createdAt?: string
  updatedAt?: string
  // Progress info
  totalSteps?: number
  completedSteps?: number
  totalTasks?: number
  completedTasks?: number
  progressPercentage?: number
  // Current step info
  currentStepName?: string
  currentStepReference?: string
  currentStepStatus?: string
  currentTaskId?: string
  currentAssignee?: string
  // Participants - all unique assignees from this flow
  participants?: string[]
}

export interface CaseMetadata {
  title: string
  description?: string
  status?: CaseStatus
  priority?: CasePriority
  assignedTo?: string
  dueDate?: string
  linkedEntities?: LinkedEntity[]
  notes?: CaseNote[]
}

export interface LinkedEntity {
  type: 'user' | 'employee' | 'organizationalUnit'
  id: string
  name: string
  metadata?: any
}

export interface CaseNote {
  id: string
  content: string
  createdBy: string
  createdAt: string
  visibility: 'internal' | 'external'
}

export interface CaseFilters {
  tags: Record<string, string>
  status?: CaseStatus[]
  assignedTo?: string
  dateRange?: { from: Date; to: Date }
  linkedEntityId?: string
  search?: string
}

export interface CaseAnalytics {
  totalCases: number
  activeCases: number
  completedCases: number
  averageCompletionTime: number
  casesRequiringAttention: number
  statusDistribution: Record<CaseStatus, number>
}

// Activity types for audit log
export type CaseActivityType =
  | 'case_created'
  | 'case_updated'
  | 'case_completed'
  | 'flow_added'
  | 'flow_linked'
  | 'flow_removed'
  | 'note_added'
  | 'entity_linked'
  | 'entity_unlinked'
  | 'status_changed'
  | 'priority_changed'
  | 'due_date_changed'
  | 'assignee_changed'
  | 'other'

export interface CaseActivity {
  id: number
  type: CaseActivityType
  action: string
  description: string
  userId: string
  timestamp: string
  metadata?: {
    workflowId?: string
    templateId?: string
    visibility?: string
    preview?: string
    entityType?: string
    entityId?: string
    status?: string
    title?: string
    priority?: string
  }
}

// API Request/Response types
export interface CreateCaseRequest {
  initiator?: string
  correlationId?: string
  tags?: Record<string, string>
  metadata?: Partial<CaseMetadata>
}

export interface UpdateCaseRequest {
  metadata?: Partial<CaseMetadata>
}

export interface AddFlowRequest {
  templateId: string
  inputValues?: Record<string, any>
  initiator?: string
  correlationIdOverride?: string
}

// Search result for existing flows
export interface SearchFlowResult {
  workflowId: string
  workflowName: string
  templateId?: string
  status: string
  flowStatus?: string
  initiatedBy?: string
  createdAt?: string
  updatedAt?: string
  totalSteps?: number
  completedSteps?: number
  totalTasks?: number
  completedTasks?: number
  progressPercentage?: number
}

// Column configuration for DataTable
export interface CaseColumnConfig {
  key: string
  label: string
  visible: boolean
  sortable?: boolean
}

// Status option for customization
export interface StatusOption {
  value: CaseStatus
  label: string
  color: string
}
