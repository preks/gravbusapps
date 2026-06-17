// Shared task/approval mapping utilities for all record types
import type { TaskReference } from '@/common/components/common-relations/detail-sheets/task-detail-sheet'
import type { TaskItem } from '../TaskSection'

/**
 * Source data structure from GraphQL queries
 * Flexible interface that accommodates both tasks and approvals from various entities
 */
export interface TaskOrApprovalSource {
  id: string
  name?: string
  displayName?: string
  description?: string
  createdAt?: string
  dueDate?: string
  // Multiple assignees (many-to-many via TaskAssignee)
  taskAssignees?: Array<{
    id?: string
    version?: number
    taskStatus?: string | null
    completedAt?: string | null
    assignedUserId?: string | null
    assignedEmployee?: {
      id: string
      displayName?: string
      firstName?: string
      lastName?: string
      fullName?: string
      pictureThumbnail?: string
      userId?: string
    }
  }>
  taskStatus?: any // CatalogEntry
  taskPriority?: any // CatalogEntry
  taskType?: any // CatalogEntry
  taskTiming?: 'DEADLINE' | 'SCHEDULED' | 'UNKNOWN_TIMING_TYPE'
  startDate?: string
  creatorEmployee?: {
    id: string
    displayName?: string
    firstName?: string
    lastName?: string
    pictureThumbnail?: string
  }
  documents?: any[]
  // Entity relationships - tasks can be related to various entities
  lead?: { id: string; firstName?: string; lastName?: string; code?: string }
  account?: { id: string; name?: string; code?: string }
  contact?: { id: string; firstName?: string; lastName?: string; code?: string }
  opportunity?: { id: string; name?: string; code?: string }
  investment?: { id: string; name?: string; code?: string }
}

/**
 * Build a TaskReference object from task entity relationships
 * @param item - Task or approval with entity relationships
 * @returns TaskReference or undefined if no reference exists
 */
export const buildTaskReference = (item: TaskOrApprovalSource): TaskReference | undefined => {
  if (item.lead) {
    return {
      type: 'lead' as const,
      id: item.lead.id,
      name: `${item.lead.firstName || ''} ${item.lead.lastName || ''}`.trim() || 'Unnamed Lead'
    }
  }

  if (item.account) {
    return {
      type: 'account' as const,
      id: item.account.id,
      name: item.account.name || 'Unnamed Account'
    }
  }

  if (item.contact) {
    return {
      type: 'contact' as const,
      id: item.contact.id,
      name: `${item.contact.firstName || ''} ${item.contact.lastName || ''}`.trim() || 'Unnamed Contact'
    }
  }

  if (item.opportunity) {
    return {
      type: 'opportunity' as const,
      id: item.opportunity.id,
      name: item.opportunity.name || 'Unnamed Opportunity'
    }
  }

  if (item.investment) {
    return {
      type: 'investment' as const,
      id: item.investment.id,
      name: item.investment.name || 'Unnamed Investment'
    }
  }

  return undefined
}

/**
 * Transform a task or approval from GraphQL format to TaskItem format
 * This eliminates duplication across all record components
 *
 * @param item - The task or approval object from GraphQL query
 * @param untitledFallback - Fallback text if name/displayName is missing
 * @returns TaskItem ready for UI consumption
 *
 * @example
 * ```typescript
 * tasks: tasks.map(task =>
 *   transformTaskOrApproval(task, 'Untitled Task')
 * )
 * ```
 */
export const transformTaskOrApproval = (
  item: TaskOrApprovalSource,
  untitledFallback: string = 'Untitled Task'
): TaskItem => {
  // Extract assignees from taskAssignees array (can be 0, 1, or many)
  const assignees = item.taskAssignees?.map(ta => ta.assignedEmployee).filter(Boolean) || []
  const assigneeEmployee = assignees.length > 0 ? assignees : undefined
  const assignee =
    assignees
      .map(emp => emp?.displayName || emp?.fullName)
      .filter(Boolean)
      .join(', ') || undefined

  return {
    id: item.id,
    title: item.name || item.displayName || untitledFallback,
    description: item.description,
    createdAt: item.createdAt,
    due: item.dueDate,
    assignee,
    statusCode: (item.taskStatus?.value?.toUpperCase() || undefined) as
      | 'PENDING'
      | 'IN_PROGRESS'
      | 'OVERDUE'
      | 'COMPLETED'
      | undefined,
    taskStatus: item.taskStatus,
    taskPriority: item.taskPriority,
    taskType: item.taskType,
    assigneeEmployee, // Array of employees (or undefined)
    taskAssignees: item.taskAssignees, // Full junction table data with statuses
    taskTiming: item.taskTiming,
    startDate: item.startDate,
    creatorEmployee: item.creatorEmployee,
    documents: item.documents,
    reference: buildTaskReference(item),
    rawTask: item as any // Pass through for detail sheet
  }
}
