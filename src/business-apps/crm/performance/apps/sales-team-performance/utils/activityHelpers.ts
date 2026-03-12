/**
 * Shared helper functions for activity-related components
 * Consolidates duplicated code from activityColumns.tsx and teamActivitiesColumns.tsx
 */

/**
 * Get entity name from activity data
 */
export const getEntityName = (activity: {
  account?: { name?: string } | null
  contact?: { firstName?: string; lastName?: string } | null
  lead?: {
    name?: string
    contact?: { firstName?: string; lastName?: string } | null
  } | null
  opportunity?: { name?: string } | null
}): string => {
  if (activity.account?.name) {
    return activity.account.name
  }

  if (activity.contact?.firstName || activity.contact?.lastName) {
    const firstName = activity.contact.firstName || ''
    const lastName = activity.contact.lastName || ''
    return `${firstName} ${lastName}`.trim()
  }

  if (activity.lead?.name) {
    return activity.lead.name
  }

  if (activity.lead?.contact?.firstName || activity.lead?.contact?.lastName) {
    const firstName = activity.lead.contact.firstName || ''
    const lastName = activity.lead.contact.lastName || ''
    return `${firstName} ${lastName}`.trim()
  }

  if (activity.opportunity?.name) {
    return activity.opportunity.name
  }

  return 'No reference'
}

/**
 * Get entity type from activity data
 */
export const getEntityType = (activity: {
  account?: { name?: string } | null
  contact?: { firstName?: string; lastName?: string } | null
  lead?: {
    name?: string
    contact?: { firstName?: string; lastName?: string } | null
  } | null
  opportunity?: { name?: string } | null
}): string => {
  if (activity.account?.name) return 'Account'
  if (activity.contact?.firstName || activity.contact?.lastName) return 'Contact'
  if (activity.lead?.name) return 'Lead'
  if (activity.lead?.contact?.firstName || activity.lead?.contact?.lastName) return 'Lead'
  if (activity.opportunity?.name) return 'Opportunity'

  return 'No reference'
}

/**
 * Get activity score badge variant based on score value
 */
export const getActivityScoreBadgeVariant = (score?: number): 'default' | 'secondary' | 'destructive' | 'outline' => {
  if (!score) return 'outline'
  if (score >= 90) return 'default'
  if (score >= 70) return 'secondary'
  if (score >= 50) return 'outline'
  return 'destructive'
}

/**
 * Get activity type badge variant based on type
 */
export const getActivityTypeVariant = (
  type: string
): 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'destructive' => {
  switch (type) {
    case 'Call':
      return 'success'
    case 'Email':
      return 'outline'
    case 'Meeting':
      return 'warning'
    case 'Task':
      return 'secondary'
    default:
      return 'secondary'
  }
}

/**
 * Safe string conversion helper
 */
export const safeString = (value: any): string => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'object') return ''
  return String(value)
}
