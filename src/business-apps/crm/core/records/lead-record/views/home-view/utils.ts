// Utility functions for HomeView component
import type { TaskReference } from '@/common/components/common-relations/detail-sheets/task-detail-sheet'

/**
 * Build a TaskReference object from a task entity relationships
 */
export const buildTaskReference = (item: any): TaskReference | undefined => {
  if (item.lead) {
    return {
      type: 'lead' as const,
      id: item.lead.id || item.lead,
      name: item.lead.companyName || item.lead.name || 'Lead'
    }
  }

  if (item.account) {
    return {
      type: 'account' as const,
      id: item.account.id || item.account,
      name: item.account.name || 'Account'
    }
  }

  if (item.contact) {
    return {
      type: 'contact' as const,
      id: item.contact.id || item.contact,
      name: `${item.contact.firstName || ''} ${item.contact.lastName || ''}`.trim() || 'Contact'
    }
  }

  if (item.opportunity) {
    return {
      type: 'opportunity' as const,
      id: item.opportunity.id || item.opportunity,
      name: item.opportunity.name || 'Opportunity'
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
export const transformTaskOrApproval = (item: any, untitledFallback: string) => {
  // Extract assignees from taskAssignees array (can be 0, 1, or many)
  const assignees = item.taskAssignees?.map((ta: any) => ta.assignedEmployee).filter(Boolean) || []
  const assigneeEmployee = assignees.length > 0 ? assignees : undefined
  const assignee =
    assignees.length === 0
      ? undefined
      : assignees.length === 1
        ? assignees[0]?.displayName || assignees[0]?.fullName
        : assignees
            .map((emp: any) => emp?.displayName || emp?.fullName)
            .filter(Boolean)
            .join(', ') || undefined

  return {
    id: item.id,
    title: item.name || item.displayName || untitledFallback,
    description: item.description,
    createdAt: item.createdAt,
    due: item.dueDate,
    assignee,
    statusCode: item.status?.value?.toUpperCase() as 'PENDING' | 'IN_PROGRESS' | 'OVERDUE' | 'COMPLETED' | undefined,
    taskStatus: item.status,
    taskType: item.taskType,
    taskPriority: item.priority,
    assigneeEmployee, // Array of employees (or undefined)
    taskTiming: item.taskTiming,
    startDate: item.startDate,
    creatorEmployee: item.creatorEmployee,
    reference: buildTaskReference(item),
    documents: item.documents || []
  }
}
