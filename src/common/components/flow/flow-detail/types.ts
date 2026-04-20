import type { FlowExecutionState } from '../flow-viewer/types/viewerTypes'

export interface StepStatusSummary {
  completed: number
  total: number
  remaining: number
}

export interface ProcessHealth {
  isOnTrack: boolean
  hasFailures: boolean
  isStalled: boolean
  statusMessage: string
}

export interface TimeInsights {
  avgStepDurationMinutes?: number
  avgTaskCompletionMinutes?: number
  estimatedCompletionDate?: string
  isOverdue: boolean
  minutesRunning: number
  minutesSinceLastUpdate: number
  workflowStartTime: string
  lastActivityTime?: string
}

export interface FlowDetailData {
  flowId: string
  flowName: string
  templateId: string
  templateVersion?: number | null
  status: string
  startTime: string
  updateTime: string
  endTime?: string
  initiatedBy?: string
  initiatedById?: string
  progressPercentage: number
  stepStatus: StepStatusSummary
  currentStep: number
  processHealth: ProcessHealth
  timeInsights: TimeInsights
  durationHours?: number
  durationMinutes?: number
}

export interface FlowStep {
  id: string
  title: string
  status: string
  stepIndex: number
  assignedTo?: string
  assignedToIds?: string[]
  eligibleUserIds?: string[]
  completedBy?: string
  totalForks?: number
  completedForks?: number
  totalTasks?: number
  completedTasks?: number
  rejectedForks?: number
  inProgressForks?: number
  assignmentMode?: string
  dueDate?: string
  completedAt?: string
  startedAt?: string
  scheduledAt?: string
  availableAt?: string
  expectedStartAt?: string
  expectedFinishAt?: string
  completionTimeMinutes?: number
}

export interface HistoryEvent {
  type: 'step' | 'assignment' | 'comment' | 'flow' | 'status'
  timestamp: string
  stepIndex: number
  stepTitle: string
  eventTitle: string
  description: string
  action?: string
  userId?: string
  userName?: string
  comment?: string
  metadata?: Record<string, unknown>
}

export interface HistorySummary {
  totalSteps: number
  completedSteps: number
  totalAssignmentEvents: number
  totalComments: number
  participants: string[]
}

export interface StepAssignmentInfo {
  assignedUserIds: string[]
}

export interface FlowDetailState {
  flowData: FlowDetailData | null
  flowSteps: FlowStep[]
  stepAssignmentsByStepIndex: Record<number, StepAssignmentInfo>
  executionState: FlowExecutionState
  isLoading: boolean
  isRefreshing: boolean
  error: string | null
  historyEvents: HistoryEvent[]
  historySummary: HistorySummary | null
  historyLoading: boolean
  historyError: string | null
  filteredEvents: HistoryEvent[]
  activeFilters: Set<string>
  loadHistoryData: () => Promise<void>
  refreshAllData: () => Promise<void>
  toggleFilter: (filterType: string) => void
  clearAllFilters: () => void
}
