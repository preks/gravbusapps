export interface FlowSuccessStepStatus {
  completed: number
  total: number
  remaining: number
}

export interface FlowSuccessProcessHealth {
  isOnTrack: boolean
  hasFailures: boolean
  isStalled: boolean
  statusMessage: string
}

export interface FlowSuccessTimeInsights {
  avgStepDurationHours?: number
  estimatedCompletionDate?: string
  isOverdue: boolean
  daysRunning: number
  daysSinceLastUpdate: number
}

export interface FlowSuccessFlowListItem {
  flowId: string
  flowName: string
  templateId: string
  status: string
  startTime: string
  updateTime: string
  endTime?: string
  lastActivityTime?: string
  progressPercentage: number
  stepStatus: FlowSuccessStepStatus
  currentStep: number
  processHealth: FlowSuccessProcessHealth
  timeInsights: FlowSuccessTimeInsights
  durationHours?: number
  durationMinutes?: number
}
