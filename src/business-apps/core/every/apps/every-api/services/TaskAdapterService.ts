/**
 * Task Adapter Service
 *
 * Adapts tasks from different sources (cflow, Kogito) into the unified task format
 */

import { UnifiedTask, TaskStatus } from '../types/UnifiedTask'
import { FlowExecutionTask } from '@/common/network/flow-metrics/FlowMetricsClient'

/**
 * Custom Flow Engine task structure (from TaskInbox.tsx)
 */
interface CflowTask {
  id: string
  flowId?: string
  referenceTaskName?: string
  type?: string
  name?: string
  status: string
  priority?: number
  title?: string
  message?: string
  stepIndex?: number
  // Initiator fields (varies by endpoint/version)
  // Newer payloads: flowInitiatedById (userId) + flowInitiatedBy (display name)
  // Older payloads: flowInitiatedBy (userId) + flowInitiatedByName (display name)
  flowInitiatedById?: string
  flowInitiatedBy?: string
  flowInitiatedByName?: string
  form?: any[]
  inputs?: any[]
  links?: any[]
  taskCategory?: string
  dueDate?: string
  scheduledAt?: string
  completedAt?: string
  availableActions?: {
    canClaim?: boolean
    canComplete?: boolean
    canReassign?: boolean
    canReject?: boolean
    canUnclaim?: boolean
  }
  assignment?: {
    assignmentMode?: string
    currentStatus?: string
    assignedTo?: string
    assignedAt?: string
    isUserOwner?: boolean
    allowReassignment?: boolean
    targets?: any
    assignmentHistory?: Array<{
      action: string
      userId: string
      changedBy: string
      changedAt: string
    }>
    assignmentAction?: string
    assignmentIteration?: number
  }
  workflowMeta?: {
    rootWorkflowId: string
    [key: string]: any
  }
  [key: string]: any
}

/**
 * Kogito task structure (from FlowMetricsClient)
 */
type KogitoTask = FlowExecutionTask

/**
 * Map cflow status to unified status
 */
function mapCflowStatus(status: string): TaskStatus {
  const statusUpper = status.toUpperCase()

  switch (statusUpper) {
    case 'SCHEDULED':
      return 'SCHEDULED'
    case 'IN_PROGRESS':
    case 'INPROGRESS':
    case 'IN PROGRESS':
      return 'IN_PROGRESS'
    case 'COMPLETED':
    case 'COMPLETE':
      return 'COMPLETED'
    case 'FAILED':
    case 'FAILURE':
      return 'FAILED'
    case 'CANCELLED':
    case 'CANCELED':
      return 'CANCELLED'
    default:
      return 'IN_PROGRESS'
  }
}

/**
 * Get priority value from various input types
 */
function getPriorityValue(priority: number | string | undefined): number | undefined {
  if (typeof priority === 'number') return priority
  if (typeof priority === 'string') return Number.parseInt(priority, 10)
  return undefined
}

/**
 * Map Kogito state to unified status
 */
function mapKogitoState(state: string): TaskStatus {
  const stateUpper = state.toUpperCase()

  switch (stateUpper) {
    case 'READY':
    case 'RESERVED':
    case 'OPEN': // Open tasks are ready to be claimed
      return 'SCHEDULED'
    case 'INPROGRESS':
    case 'IN_PROGRESS':
      return 'IN_PROGRESS'
    case 'COMPLETED':
    case 'COMPLETE':
    case 'CLOSED': // Tasks from HISTORY/ALL cockpitPage with filterState=['Closed']
      return 'COMPLETED'
    case 'FAILED':
    case 'ERROR':
    case 'ABORTED':
      return 'FAILED'
    case 'EXITED':
    case 'OBSOLETE':
    case 'SUSPENDED':
    case 'CANCELED': // Alternative spelling
    case 'CANCELLED':
    case 'SKIPPED': // Tasks that were skipped in the workflow
      return 'CANCELLED'
    default:
      return 'SCHEDULED'
  }
}

/**
 * Adapt a custom-flow-engine task to unified format
 */
export function adaptCflowTask(cflowTask: CflowTask): UnifiedTask {
  // Use scheduledAt as the creation timestamp for CFlow tasks
  const createdDate = cflowTask.scheduledAt || (cflowTask as any).createdAt || (cflowTask as any).created_at

  // Extract creator information from CFlow task
  // We support both payload shapes:
  // - flowInitiatedById (userId) + flowInitiatedBy (display name)
  // - flowInitiatedBy (userId) + flowInitiatedByName (display name)
  const isUuid = (value: unknown): boolean =>
    typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)

  const rawInitiatedBy: unknown = (cflowTask as any).flowInitiatedBy
  const rawInitiatedById: unknown = (cflowTask as any).flowInitiatedById
  const rawInitiatedByName: unknown = (cflowTask as any).flowInitiatedByName

  const creatorUserId: string | undefined =
    typeof rawInitiatedById === 'string' && isUuid(rawInitiatedById)
      ? rawInitiatedById
      : typeof rawInitiatedBy === 'string' && isUuid(rawInitiatedBy)
        ? rawInitiatedBy
        : undefined

  const creatorName: string | undefined = (() => {
    if (typeof rawInitiatedByName === 'string') {
      const v = rawInitiatedByName.trim()
      if (v) return v
    }
    if (typeof rawInitiatedBy === 'string' && !isUuid(rawInitiatedBy)) {
      const v = rawInitiatedBy.trim()
      if (v) return v
    }
    return undefined
  })()

  // Task completion handling is done in the unified task mapping below

  const unifiedTask: UnifiedTask = {
    id: cflowTask.id,
    flowId: cflowTask.flowId || cflowTask.workflowMeta?.rootWorkflowId || cflowTask.id,
    referenceTaskName: cflowTask.referenceTaskName,
    type: cflowTask.type,
    name: cflowTask.name,
    title: cflowTask.title || cflowTask.name,
    status: mapCflowStatus(cflowTask.status),
    priority: cflowTask.priority,
    dueDate: cflowTask.dueDate,
    createdAt: createdDate, // Use best available date for proper sorting
    scheduledAt: cflowTask.scheduledAt,
    completedAt: (cflowTask as any).completedAt || (cflowTask as any).completed_at, // Map completion timestamp
    message: cflowTask.message,
    taskCategory: cflowTask.taskCategory,
    tags: (cflowTask as any).tags, // Workflow tags for filtering (e.g., blink tasks)
    form: cflowTask.form,
    inputs: cflowTask.inputs,
    links: cflowTask.links,
    assignment: cflowTask.assignment,
    availableActions: cflowTask.availableActions,
    workflowMeta: cflowTask.workflowMeta,
    stepIndex: cflowTask.stepIndex,
    source: 'cflow',
    sourceMetadata: {
      originalStatus: cflowTask.status,
      creatorUserId, // userId (used to resolve employee/avatar)
      creatorName, // fallback if employee lookup fails
      // Keep original initiator fields for downstream UI fallbacks (some screens still read these)
      flowInitiatedById: creatorUserId,
      flowInitiatedByName: creatorName,
      // Best-effort original value (could be either name or id depending on payload)
      flowInitiatedBy: (cflowTask as any).flowInitiatedBy,
      ...Object.keys(cflowTask)
        .filter(
          key =>
            ![
              'id',
              'flowId',
              'referenceTaskName',
              'type',
              'name',
              'status',
              'priority',
              'title',
              'message',
              'stepIndex',
              'form',
              'inputs',
              'links',
              'taskCategory',
              'tags',
              'dueDate',
              'scheduledAt',
              'availableActions',
              'assignment',
              'workflowMeta',
              // already mapped explicitly above
              'flowInitiatedById',
              'flowInitiatedBy',
              'flowInitiatedByName',
              'creatorUserId',
              'creatorName'
            ].includes(key)
        )
        .reduce((acc, key) => ({ ...acc, [key]: cflowTask[key] }), {})
    }
  }

  return unifiedTask
}

/**
 * Adapt a Kogito task to unified format
 */
export function adaptKogitoTask(kogitoTask: KogitoTask, userId?: string): UnifiedTask {
  // Determine available actions based on task state and ownership
  const taskState = kogitoTask.state || kogitoTask.status || 'UNKNOWN'
  const isOwner = kogitoTask.actualOwner === userId
  const stateUpper = taskState.toUpperCase()

  // Task can be claimed if it's not assigned and in a claimable state
  const canClaim = !kogitoTask.actualOwner && (stateUpper === 'READY' || stateUpper === 'OPEN')

  // Task can be completed if user is owner and task is in progress
  const canComplete =
    isOwner && (stateUpper === 'RESERVED' || stateUpper === 'INPROGRESS' || stateUpper === 'IN_PROGRESS')

  // Task can be unclaimed if user is owner and task is reserved
  const canUnclaim = isOwner && stateUpper === 'RESERVED'

  // Use started timestamp as creation date for Kogito tasks
  const createdDate = kogitoTask.started || kogitoTask.createdAt

  const unifiedTask: UnifiedTask = {
    id: kogitoTask.id,
    flowId: kogitoTask.processInstanceId || kogitoTask.customFlowId || kogitoTask.id,
    referenceTaskName: kogitoTask.referenceName || kogitoTask.name,
    type: kogitoTask.processDefinitionId,
    name: kogitoTask.name,
    title: kogitoTask.name,
    status: mapKogitoState(taskState),
    priority: getPriorityValue(kogitoTask.priority),
    createdAt: createdDate, // Use createdAt or started for proper sorting
    scheduledAt: kogitoTask.started || kogitoTask.createdAt,
    completedAt: kogitoTask.completed,
    description: kogitoTask.description,
    dueDate: kogitoTask.dueDate,
    assignment: {
      assignedTo: kogitoTask.actualOwner,
      isUserOwner: isOwner,
      currentStatus: taskState,
      targets: {
        users: kogitoTask.potentialUsers || [],
        groups: []
      }
    },
    availableActions: {
      canClaim,
      canComplete,
      canUnclaim,
      canReassign: isOwner,
      canReject: isOwner
    },
    workflowMeta: {
      rootWorkflowId: kogitoTask.processInstanceId || kogitoTask.customFlowId || kogitoTask.id,
      processId: kogitoTask.processDefinitionId,
      taskDefinitionId: kogitoTask.taskDefinitionId
    },
    source: 'kogito',
    sourceMetadata: {
      originalState: taskState,
      processInstanceId: kogitoTask.processInstanceId,
      lastUpdate: kogitoTask.lastUpdate,
      ownerName: kogitoTask.ownerName,
      creatorUserId: kogitoTask.creatorUserId,
      creatorName: kogitoTask.creatorName,
      assigneeNames: kogitoTask.assigneeNames,
      endpoint: kogitoTask.endpoint,
      customFlowId: kogitoTask.customFlowId,
      nodeName: kogitoTask.nodeName,
      inputs: kogitoTask.inputs,
      variables: kogitoTask.variables
    }
  }

  return unifiedTask
}

/**
 * Adapt an array of cflow tasks
 */
export function adaptCflowTasks(cflowTasks: CflowTask[]): UnifiedTask[] {
  return cflowTasks.map(task => adaptCflowTask(task))
}

/**
 * Adapt an array of Kogito tasks
 */
export function adaptKogitoTasks(kogitoTasks: KogitoTask[], userId?: string): UnifiedTask[] {
  return kogitoTasks.map(task => adaptKogitoTask(task, userId))
}

/**
 * Type guard to check if a task is from cflow
 */
export function isCflowTask(task: UnifiedTask): boolean {
  return task.source === 'cflow'
}

/**
 * Type guard to check if a task is from Kogito
 */
export function isKogitoTask(task: UnifiedTask): boolean {
  return task.source === 'kogito'
}
