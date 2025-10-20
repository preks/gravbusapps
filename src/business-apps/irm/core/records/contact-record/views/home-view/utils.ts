// Utility functions for HomeView component
import type { TaskReference } from '@/common/components/common-relations/detail-sheets/task-detail-sheet'
import type { TaskOrApproval, MappedTaskItem } from './types'

/**
 * Build a TaskReference object from a task or approval entity relationships
 */
export const buildTaskReference = (item: TaskOrApproval): TaskReference | undefined => {
  if (item.lead) {
    return {
      type: 'lead' as const,
      id: item.lead.id,
      name: `${item.lead.firstName || ''} ${item.lead.lastName || ''}`.trim() || item.lead.code || 'Lead'
    }
  }

  if (item.account) {
    return {
      type: 'account' as const,
      id: item.account.id,
      name: item.account.name || item.account.code || 'Account'
    }
  }

  if (item.contact) {
    return {
      type: 'contact' as const,
      id: item.contact.id,
      name: `${item.contact.firstName || ''} ${item.contact.lastName || ''}`.trim() || item.contact.code || 'Contact'
    }
  }

  if (item.opportunity) {
    return {
      type: 'opportunity' as const,
      id: item.opportunity.id,
      name: item.opportunity.name || item.opportunity.code || 'Opportunity'
    }
  }

  if (item.investment) {
    return {
      type: 'investment' as const,
      id: item.investment.id,
      name: item.investment.name || item.investment.code || 'Investment'
    }
  }

  return undefined
}

/**
 * Transform a task or approval object into the mapped UI shape
 * @param item - The task or approval object from GraphQL
 * @param untitledFallback - Fallback string if name/displayName is missing
 * @returns Mapped task item ready for UI consumption
 */
export const transformTaskOrApproval = (item: TaskOrApproval, untitledFallback: string): MappedTaskItem => {
  return {
    id: item.id,
    title: item.name || item.displayName || untitledFallback,
    description: item.description,
    createdAt: item.createdAt,
    due: item.dueDate,
    assignee: item.assignedEmployee?.displayName || item.assignedEmployee?.fullName,
    statusCode: item.taskStatus?.value?.toUpperCase() as
      | 'PENDING'
      | 'IN_PROGRESS'
      | 'OVERDUE'
      | 'COMPLETED'
      | undefined,
    taskStatus: item.taskStatus,
    taskPriority: item.taskPriority,
    assigneeEmployee: item.assignedEmployee,
    taskTiming: item.taskTiming,
    startDate: item.startDate,
    creatorEmployee: item.creatorEmployee,
    reference: buildTaskReference(item)
  }
}
