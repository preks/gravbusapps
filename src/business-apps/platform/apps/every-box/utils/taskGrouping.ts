/**
 * Task Grouping Utilities
 * Group tasks by priority, source, status, etc.
 */

import { UnifiedTask, Flow, TaskSource, TaskStatus, FlowStatus } from '../types'
import { isOverdue, isDueSoon } from './taskFormatters'

/**
 * Group tasks by priority
 */
export const groupTasksByPriority = (tasks: UnifiedTask[]): Record<string, UnifiedTask[]> => {
  const overdue: UnifiedTask[] = []
  const dueSoon: UnifiedTask[] = []
  const high: UnifiedTask[] = []
  const medium: UnifiedTask[] = []
  const low: UnifiedTask[] = []
  const noPriority: UnifiedTask[] = []

  tasks.forEach(task => {
    if (isOverdue(task.dueDate)) {
      overdue.push(task)
    } else if (isDueSoon(task.dueDate)) {
      dueSoon.push(task)
    } else if (task.priority === 'HIGH') {
      high.push(task)
    } else if (task.priority === 'MEDIUM') {
      medium.push(task)
    } else if (task.priority === 'LOW') {
      low.push(task)
    } else {
      noPriority.push(task)
    }
  })

  return {
    overdue,
    dueSoon,
    high,
    medium,
    low,
    noPriority
  }
}

/**
 * Group tasks by source
 */
export const groupTasksBySource = (tasks: UnifiedTask[]): Record<TaskSource, UnifiedTask[]> => {
  const groups: Record<TaskSource, UnifiedTask[]> = {
    'flow-engine': [],
    'crm-opportunity': [],
    'crm-lead': [],
    approval: []
  }

  tasks.forEach(task => {
    groups[task.source].push(task)
  })

  return groups
}

/**
 * Group tasks by status
 */
export const groupTasksByStatus = (tasks: UnifiedTask[]): Record<TaskStatus, UnifiedTask[]> => {
  const groups: Record<TaskStatus, UnifiedTask[]> = {
    SCHEDULED: [],
    IN_PROGRESS: [],
    COMPLETED: [],
    FAILED: []
  }

  tasks.forEach(task => {
    groups[task.status].push(task)
  })

  return groups
}

/**
 * Group flows by status
 */
export const groupFlowsByStatus = (flows: Flow[]): Record<FlowStatus, Flow[]> => {
  const groups: Record<FlowStatus, Flow[]> = {
    RUNNING: [],
    COMPLETED: [],
    FAILED: [],
    TERMINATED: []
  }

  flows.forEach(flow => {
    groups[flow.status].push(flow)
  })

  return groups
}

/**
 * Sort tasks by priority (overdue first, then due soon, then by priority)
 */
export const sortTasksByPriority = (tasks: UnifiedTask[]): UnifiedTask[] => {
  return [...tasks].sort((a, b) => {
    const aOverdue = isOverdue(a.dueDate)
    const bOverdue = isOverdue(b.dueDate)

    if (aOverdue && !bOverdue) return -1
    if (!aOverdue && bOverdue) return 1

    const aDueSoon = isDueSoon(a.dueDate)
    const bDueSoon = isDueSoon(b.dueDate)

    if (aDueSoon && !bDueSoon) return -1
    if (!aDueSoon && bDueSoon) return 1

    const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 }
    return priorityOrder[a.priority] - priorityOrder[b.priority]
  })
}

/**
 * Sort tasks by date (most recent first)
 */
export const sortTasksByDate = (tasks: UnifiedTask[]): UnifiedTask[] => {
  return [...tasks].sort((a, b) => {
    return new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime()
  })
}

/**
 * Sort flows by date (most recent first)
 */
export const sortFlowsByDate = (flows: Flow[]): Flow[] => {
  return [...flows].sort((a, b) => {
    return new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
  })
}

// Employee avatar data interface (for search by sender name)
interface EmployeeData {
  firstName: string
  lastName: string
  displayName: string
}

/**
 * Filter tasks by search query
 * Includes search by sender name if employeeMap is provided
 */
export const filterTasksBySearch = (
  tasks: UnifiedTask[],
  query: string,
  employeeMap?: Map<string, EmployeeData>
): UnifiedTask[] => {
  if (!query.trim()) return tasks

  const lowerQuery = query.toLowerCase()
  return tasks.filter(task => {
    // Search in task fields
    const matchesTaskData =
      task.title?.toLowerCase().includes(lowerQuery) ||
      task.description?.toLowerCase().includes(lowerQuery) ||
      task.type?.toLowerCase().includes(lowerQuery) ||
      task.name?.toLowerCase().includes(lowerQuery) ||
      task.referenceTaskName?.toLowerCase().includes(lowerQuery) ||
      task.sourceMetadata?.nodeName?.toLowerCase().includes(lowerQuery)

    // Search by sender name if employeeMap is available
    if (employeeMap && task.sourceMetadata?.creatorUserId) {
      const creatorData = employeeMap.get(task.sourceMetadata.creatorUserId)
      if (creatorData) {
        const matchesSenderName =
          creatorData.firstName?.toLowerCase().includes(lowerQuery) ||
          creatorData.lastName?.toLowerCase().includes(lowerQuery) ||
          creatorData.displayName?.toLowerCase().includes(lowerQuery)

        if (matchesSenderName) return true
      }
    }

    return matchesTaskData
  })
}

/**
 * Filter flows by search query
 */
export const filterFlowsBySearch = (flows: Flow[], query: string): Flow[] => {
  if (!query.trim()) return flows

  const lowerQuery = query.toLowerCase()
  return flows.filter(flow => {
    return flow.templateName.toLowerCase().includes(lowerQuery) || flow.id.toLowerCase().includes(lowerQuery)
  })
}

/**
 * Get task counts by status
 */
export const getTaskStatusCounts = (tasks: UnifiedTask[]): Record<TaskStatus, number> => {
  const counts: Record<TaskStatus, number> = {
    SCHEDULED: 0,
    IN_PROGRESS: 0,
    COMPLETED: 0,
    FAILED: 0
  }

  tasks.forEach(task => {
    counts[task.status]++
  })

  return counts
}

/**
 * Get flow counts by status
 */
export const getFlowStatusCounts = (flows: Flow[]): Record<FlowStatus, number> => {
  const counts: Record<FlowStatus, number> = {
    RUNNING: 0,
    COMPLETED: 0,
    FAILED: 0,
    TERMINATED: 0
  }

  flows.forEach(flow => {
    counts[flow.status]++
  })

  return counts
}
