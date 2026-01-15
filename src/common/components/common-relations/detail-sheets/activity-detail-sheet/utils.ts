import type { Activity } from './types'

type BadgeVariant =
  | 'default'
  | 'destructive'
  | 'outline'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'info'
  | 'pending'
  | 'running'
  | 'paid'
  | 'overdue'
  | 'offline'
  | 'aiGenerated'
  | 'aiModified'
  | 'action'

export const getActivityTypeBadgeVariant = (type: string): BadgeVariant => {
  if (!type) return 'default'

  switch (type.toLowerCase()) {
    case 'call':
      return 'info'
    case 'email':
      return 'success'
    case 'meeting':
      return 'warning'
    case 'task':
      return 'pending'
    default:
      return 'default'
  }
}

export const getReferenceTypeBadgeVariant = (type: string): BadgeVariant => {
  if (!type) return 'default'

  switch (type.toLowerCase()) {
    case 'opportunity':
      return 'success'
    case 'account':
      return 'info'
    case 'lead':
      return 'warning'
    case 'contact':
      return 'secondary'
    case 'investment':
      return 'action'
    default:
      return 'default'
  }
}

export const getActivityReferenceType = (activity: Activity): string => {
  if (activity.accountId && activity.account) return 'Account'
  if (activity.contactId && activity.contact) return 'Contact'
  if (activity.leadId && activity.lead) return 'Lead'
  if (activity.opportunityId && activity.opportunity) return 'Opportunity'
  return 'No Reference'
}

export const getActivityReferenceName = (activity: Activity): string => {
  if (activity.account?.name) return activity.account.name
  if (activity.contact) {
    const name = `${activity.contact.firstName || ''} ${activity.contact.lastName || ''}`.trim()
    if (name) return name
  }
  if (activity.lead) {
    return (
      activity.lead.companyName ||
      `${activity.lead.firstName || ''} ${activity.lead.lastName || ''}`.trim() ||
      'Unknown Lead'
    )
  }
  if (activity.opportunity?.name) return activity.opportunity.name
  return 'General'
}
