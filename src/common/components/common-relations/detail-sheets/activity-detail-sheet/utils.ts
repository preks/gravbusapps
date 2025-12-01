/**
 * Utility functions for Activity Detail Sheet
 */

import { Activity } from './types'

/**
 * Get entity name from activity
 */
export const getActivityEntityName = (activity: Activity): string => {
  if (activity.account?.name) return activity.account.name
  if (activity.contact?.firstName || activity.contact?.lastName) {
    return `${activity.contact.firstName || ''} ${activity.contact.lastName || ''}`.trim()
  }
  if (activity.lead?.name) return activity.lead.name
  if (activity.lead?.contact?.firstName || activity.lead?.contact?.lastName) {
    return `${activity.lead.contact.firstName || ''} ${activity.lead.contact.lastName || ''}`.trim()
  }
  if (activity.opportunity?.name) return activity.opportunity.name
  return 'Unknown'
}

/**
 * Get entity type from activity
 */
export const getActivityElementType = (activity: Activity): string => {
  if (activity.accountId) return 'Account'
  if (activity.contactId) return 'Contact'
  if (activity.leadId) return 'Lead'
  if (activity.opportunityId) return 'Opportunity'
  return 'Unknown'
}

/**
 * Get activity type color (used for badges and backgrounds)
 */
export const getActivityTypeColor = (activityType: string): string => {
  const ACTIVITY_TYPE_COLORS: Record<string, string> = {
    Call: '#10b981',
    Email: '#3b82f6',
    Meeting: '#f59e0b',
    Task: '#8b5cf6',
    Note: '#6366f1',
    Other: '#64748b'
  }
  const normalizedType = activityType?.trim() || 'Task'
  return ACTIVITY_TYPE_COLORS[normalizedType] || ACTIVITY_TYPE_COLORS['Task']
}
