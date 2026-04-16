import type { GenericTask, CalendarActivity } from '../types'

/**
 * Get nested value from object using dot notation path
 * Example: getNestedValue({ leads: { total: 5 } }, 'leads.total') => 5
 */
export const getNestedValue = (obj: any, path: string): any => {
  if (!obj || !path) return undefined

  const keys = path.split('.')
  let current = obj

  for (const key of keys) {
    if (current === null || current === undefined) {
      return undefined
    }
    current = current[key]
  }

  return current
}

/**
 * Transform generic task to calendar activity format
 */
export const transformTaskToCalendarActivity = (task: GenericTask): CalendarActivity => {
  // Use dueDate or startDate or createdAt as the date
  const date = task.dueDate || task.startDate || task.createdAt

  return {
    id: task.id,
    title: task.name,
    date,
    activityType: { value: 'Task' },
    entityType: 'task',
    entityId: task.id,
    entityName: task.name
  }
}

/**
 * Transform generic activity to calendar activity format
 */
export const transformActivityToCalendarActivity = (activity: any): CalendarActivity => {
  // Use occurredAt or createdAt as the date
  const date = activity.occurredAt || activity.createdAt

  return {
    id: activity.id,
    title: activity.title,
    date,
    activityType: activity.activityType || { value: 'Activity' },
    entityType: 'activity',
    entityId: activity.id,
    entityName: activity.title
  }
}
