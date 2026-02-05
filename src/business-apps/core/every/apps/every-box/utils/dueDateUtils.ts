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

type TranslationFunction = (key: string, params?: Record<string, number | string>) => string

/**
 * Calculate due date criticality based on current time
 * Similar to service portal implementation
 * @param dueDate - The due date to calculate criticality for
 * @param t - Translation function from useTranslation hook
 */
export const calculateDueDateCriticality = (
  dueDate?: string | Date,
  t?: TranslationFunction
): DueDateCriticality | null => {
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
      label = t ? t('due-date-days-overdue', { days: daysOverdue }) : `${daysOverdue}d overdue`
    } else {
      label = t ? t('due-date-hours-overdue', { hours: hoursOverdue }) : `${hoursOverdue}h overdue`
    }
  } else if (hoursLeft < 2) {
    status = 'warning'
    const hours = Math.round(hoursLeft)
    label = t ? t('due-date-hours-left', { hours }) : `${hours}h left`
  } else if (hoursLeft < 24) {
    status = 'warning'
    const hours = Math.round(hoursLeft)
    label = t ? t('due-date-hours-left', { hours }) : `${hours}h left`
  } else {
    status = 'ok'
    label = t ? t('due-date-days-left', { days: daysLeft }) : `${daysLeft}d left`
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
