import { formatDisplayText } from '@/common/utils/displayText'
import { stepIndexToFlowNodeId } from '@/common/data/flow/templateToFlowGraph'
import type { FlowExecutionState, StepStatus } from '../flow-viewer/types/viewerTypes'
import type { FlowDetailData, FlowStep, HistoryEvent } from './types'

export const calculateRunningTimeFromStart = (startTime: string): number => {
  const start = new Date(startTime)
  const now = new Date()
  return Math.round((now.getTime() - start.getTime()) / (1000 * 60))
}

export const formatDuration = (minutesDuration: number): string => {
  if (minutesDuration < 60) {
    const roundedMinutes = Math.round(minutesDuration)
    return `${roundedMinutes} minute${roundedMinutes === 1 ? '' : 's'}`
  }
  if (minutesDuration < 1440) {
    const hours = Math.floor(minutesDuration / 60)
    const remainingMinutes = Math.round(minutesDuration % 60)
    return remainingMinutes === 0 ? `${hours} hour${hours === 1 ? '' : 's'}` : `${hours}h ${remainingMinutes}m`
  }

  const days = Math.round(minutesDuration / 1440)
  return `${days} day${days === 1 ? '' : 's'}`
}

export const formatFlowDuration = (
  flowData: FlowDetailData,
  minutesRunning: number
): {
  label: string
  duration: string
} => {
  const isCompleted = flowData.status === 'COMPLETED' || Boolean(flowData.endTime)
  return {
    label: isCompleted ? 'Completed in' : 'Running',
    duration: formatDuration(minutesRunning)
  }
}

export const getStatusEndLabel = (status: string): string => {
  if (status === 'COMPLETED') return 'Completed'
  if (status === 'TIMED_OUT') return 'Timed out'
  if (status === 'TERMINATED') return 'Terminated'
  return 'Failed'
}

export const getFlowStatusBadgeClass = (status: string): string => {
  if (status === 'COMPLETED') return 'gba:bg-success gba:text-success-foreground'
  if (status === 'IN_PROGRESS' || status === 'RUNNING') return 'gba:bg-info gba:text-info-foreground'
  if (status === 'TIMED_OUT') return 'gba:bg-warning gba:text-warning-foreground'
  if (status === 'FAILED' || status === 'TERMINATED') return 'gba:bg-destructive gba:text-destructive-foreground'
  return 'gba:bg-offline gba:text-offline-foreground'
}

export function transformFlowStep(step: Record<string, unknown>): FlowStep {
  const rawAssignedTo = step.assignedTo
  const assignedToIds = Array.isArray(rawAssignedTo)
    ? rawAssignedTo.map(value => String(value || '').trim()).filter(Boolean)
    : typeof rawAssignedTo === 'string' && rawAssignedTo.trim()
      ? [rawAssignedTo.trim()]
      : []

  const rawEligibleUsers = step.eligibleUsers
  const eligibleUserIds = Array.isArray(rawEligibleUsers)
    ? rawEligibleUsers.map(value => String(value || '').trim()).filter(Boolean)
    : []

  return {
    id: String(step.id || `step-${step.stepIndex || 0}`),
    title: String(step.title || 'Untitled Step'),
    status: String(step.status || 'QUEUED'),
    stepIndex: Number(step.stepIndex || 0),
    assignedTo: assignedToIds[0],
    assignedToIds: assignedToIds.length ? assignedToIds : undefined,
    eligibleUserIds: eligibleUserIds.length ? eligibleUserIds : undefined,
    completedBy: typeof step.completedBy === 'string' ? step.completedBy : undefined,
    totalForks: typeof step.totalForks === 'number' ? step.totalForks : undefined,
    completedForks: typeof step.completedForks === 'number' ? step.completedForks : undefined,
    totalTasks:
      typeof step.totalTasks === 'number'
        ? step.totalTasks
        : typeof step.total_tasks === 'number'
          ? step.total_tasks
          : undefined,
    completedTasks:
      typeof step.completedTasks === 'number'
        ? step.completedTasks
        : typeof step.completed_tasks === 'number'
          ? step.completed_tasks
          : undefined,
    rejectedForks: typeof step.rejectedForks === 'number' ? step.rejectedForks : undefined,
    inProgressForks: typeof step.inProgressForks === 'number' ? step.inProgressForks : undefined,
    assignmentMode: typeof step.assignmentMode === 'string' ? step.assignmentMode : undefined,
    dueDate: typeof step.dueDate === 'string' ? step.dueDate : undefined,
    completedAt: typeof step.completedAt === 'string' ? step.completedAt : undefined,
    startedAt: typeof step.startedAt === 'string' ? step.startedAt : undefined,
    scheduledAt: typeof step.scheduledAt === 'string' ? step.scheduledAt : undefined,
    availableAt: typeof step.availableAt === 'string' ? step.availableAt : undefined,
    expectedStartAt: typeof step.expectedStartAt === 'string' ? step.expectedStartAt : undefined,
    expectedFinishAt: typeof step.expectedFinishAt === 'string' ? step.expectedFinishAt : undefined,
    completionTimeMinutes: typeof step.completionTimeMinutes === 'number' ? step.completionTimeMinutes : undefined
  }
}

export function generateFallbackSteps(total: number, completed: number, currentStep: number): FlowStep[] {
  const steps: FlowStep[] = []
  for (let i = 1; i <= total; i += 1) {
    let stepStatus = 'QUEUED'
    if (i <= completed) stepStatus = 'COMPLETED'
    else if (i === currentStep) stepStatus = 'IN_PROGRESS'

    steps.push({
      id: `step-${i}`,
      title: `Step ${i}`,
      status: stepStatus,
      stepIndex: i - 1,
      completedAt:
        i <= completed ? new Date(Date.now() - (completed - i) * 24 * 60 * 60 * 1000).toISOString() : undefined
    })
  }
  return steps
}

export function transformAuditEntry(entry: Record<string, any>, index: number): HistoryEvent {
  let eventType: HistoryEvent['type'] = 'step'
  const stepTitle = formatDisplayText(entry.taskName, 'Unknown Step')
  let eventTitle = entry.action || 'Unknown Action'
  let description = `${entry.userName || entry.userId || 'Unknown User'} performed ${entry.action}`
  const stepMatch = stepTitle.match(/Step (\d+)/i)
  let stepIndex = stepMatch ? Number.parseInt(stepMatch[1], 10) - 1 : index

  if (entry.action === 'WORKFLOW_STARTED' || entry.action === 'WORKFLOW_COMPLETED') {
    eventType = 'flow'
    stepIndex = entry.action === 'WORKFLOW_STARTED' ? -1 : 999
    eventTitle = entry.action === 'WORKFLOW_STARTED' ? 'Flow Started' : 'Flow Completed'
    description =
      entry.action === 'WORKFLOW_STARTED' ? 'Workflow was initiated by the system' : 'Workflow completed successfully'
  } else if (entry.action === 'CLAIM') {
    eventType = 'assignment'
    eventTitle = `${stepTitle} claimed`
    description = `${entry.userName || 'User'} claimed the task "${stepTitle}"`
  } else if (entry.action === 'UNCLAIM') {
    eventType = 'assignment'
    eventTitle = `${stepTitle} released`
    description = `${entry.userName || 'User'} released the task "${stepTitle}" back to available pool`
  } else if (entry.action === 'COMPLETE') {
    eventTitle = `${stepTitle} completed`
    description = `${entry.userName || 'User'} completed the step "${stepTitle}"`
  } else if (entry.details?.comment) {
    eventType = 'comment'
    eventTitle = `Comment on ${stepTitle}`
    description = entry.details.comment
  }

  return {
    type: eventType,
    timestamp: entry.timestamp,
    stepIndex,
    stepTitle:
      entry.action === 'WORKFLOW_STARTED' || entry.action === 'WORKFLOW_COMPLETED' ? 'Flow Execution' : stepTitle,
    eventTitle,
    description,
    action: entry.action,
    userId: entry.userId,
    userName: entry.userName || entry.userId,
    taskId: typeof entry.taskId === 'string' ? entry.taskId : undefined,
    taskName: typeof entry.taskName === 'string' ? entry.taskName : stepTitle,
    comment: entry.details?.comment,
    metadata: entry.details || {}
  }
}

const ACTIVE_STEP_STATUSES = new Set(['IN_PROGRESS', 'RUNNING', 'CLAIMED', 'ACTIVE'])
const COMPLETED_STEP_STATUSES = new Set(['COMPLETED', 'DONE'])
const FAILED_STEP_STATUSES = new Set(['FAILED', 'TIMED_OUT', 'TERMINATED', 'REJECTED', 'ERROR'])
const SKIPPED_STEP_STATUSES = new Set(['SKIPPED', 'CANCELLED'])

export const mapStepStatusToExecutionStatus = (status: string): StepStatus => {
  const normalizedStatus = status.toUpperCase()
  if (ACTIVE_STEP_STATUSES.has(normalizedStatus)) return 'active'
  if (COMPLETED_STEP_STATUSES.has(normalizedStatus)) return 'completed'
  if (FAILED_STEP_STATUSES.has(normalizedStatus)) return 'failed'
  if (SKIPPED_STEP_STATUSES.has(normalizedStatus)) return 'skipped'
  return 'pending'
}

export const buildExecutionState = (
  flowSteps: FlowStep[],
  workflowStatus: string,
  currentStep?: number
): FlowExecutionState => {
  const nodeStates: Record<string, StepStatus> = {}
  const activeNodeIds: string[] = []

  flowSteps.forEach(step => {
    const nodeId = stepIndexToFlowNodeId(step.stepIndex)
    const status = mapStepStatusToExecutionStatus(step.status)
    nodeStates[nodeId] = status
    if (status === 'active') activeNodeIds.push(nodeId)
  })

  if (workflowStatus !== 'QUEUED') {
    nodeStates.start = 'completed'
  }
  if (['COMPLETED', 'FAILED', 'TIMED_OUT', 'TERMINATED'].includes(workflowStatus)) {
    nodeStates.end = workflowStatus === 'COMPLETED' ? 'completed' : 'failed'
  }

  if (activeNodeIds.length === 0 && typeof currentStep === 'number') {
    const fallbackNodeId = stepIndexToFlowNodeId(Math.max(currentStep - 1, 0))
    if (nodeStates[fallbackNodeId] === 'pending') {
      nodeStates[fallbackNodeId] = 'active'
      activeNodeIds.push(fallbackNodeId)
    }
  }

  return {
    nodeStates,
    activeNodeId: activeNodeIds[0]
  }
}
