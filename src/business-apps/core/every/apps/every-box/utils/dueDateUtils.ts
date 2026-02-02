/**
 * Due Date Utilities
 * Calculate criticality and format due date information
 */

export type CriticalityStatus = 'overdue' | 'warning' | 'ok'

export interface DueDateCriticality {
  status: CriticalityStatus
  hoursLeft: number
  daysLeft: number
  isOverdue: boolean
  label: string
}

/**
 * Calculate due date criticality based on current time
 * Similar to service portal implementation
 */
export const calculateDueDateCriticality = (dueDate?: string | Date): DueDateCriticality | null => {
  if (!dueDate) {
    return null
  }

  const now = new Date()
  const due = new Date(dueDate)
  const timeDiff = due.getTime() - now.getTime()
  const hoursLeft = timeDiff / (1000 * 60 * 60)
  const daysLeft = Math.floor(hoursLeft / 24)

  let status: CriticalityStatus = 'ok'
  let label = ''

  if (hoursLeft < 0) {
    status = 'overdue'
    const hoursOverdue = Math.abs(Math.floor(hoursLeft))
    const daysOverdue = Math.abs(daysLeft)

    if (daysOverdue > 0) {
      label = `${daysOverdue}d overdue`
    } else {
      label = `${hoursOverdue}h overdue`
    }
  } else if (hoursLeft < 2) {
    status = 'warning'
    label = `${Math.round(hoursLeft)}h left`
  } else if (hoursLeft < 24) {
    status = 'warning'
    label = `${Math.round(hoursLeft)}h left`
  } else {
    status = 'ok'
    label = `${daysLeft}d left`
  }

  return {
    status,
    hoursLeft,
    daysLeft,
    isOverdue: hoursLeft < 0,
    label
  }
}

/**
 * Get badge variant based on criticality status
 */
export const getCriticalityBadgeVariant = (status: CriticalityStatus): 'destructive' | 'warning' | 'info' => {
  switch (status) {
    case 'overdue':
      return 'destructive'
    case 'warning':
      return 'warning'
    case 'ok':
    default:
      return 'info'
  }
}
