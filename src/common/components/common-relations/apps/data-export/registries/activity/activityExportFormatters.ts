import type { Activity } from '@/common/data/relations/types/activityTypes'
import {
  getActivityRelatedEntities,
  type ActivityRelatedEntityKind
} from '@/common/components/common-relations/record-sections/activity-section/getActivityRelatedEntities'
import { formatExportText } from '../../utils/exportFormatHelpers'

const REFERENCE_TYPE_LABELS: Record<ActivityRelatedEntityKind, string> = {
  account: 'Account',
  contact: 'Contact',
  lead: 'Lead',
  opportunity: 'Opportunity',
  investment: 'Investment'
}

function getRelatedEntities(activity: Activity) {
  return getActivityRelatedEntities(activity, { showAllRelatedEntityChips: true })
}

export function formatActivityReference(activity: Activity): string {
  const entities = getRelatedEntities(activity)
  if (entities.length === 0) {
    return 'General'
  }
  if (entities.length > 1) {
    return 'Multiple'
  }
  return formatExportText(entities[0]?.name || undefined) || '-'
}

export function formatActivityReferenceType(activity: Activity): string {
  const entities = getRelatedEntities(activity)
  if (entities.length === 0) {
    return 'General'
  }
  if (entities.length > 1) {
    return 'Multiple'
  }
  return REFERENCE_TYPE_LABELS[entities[0]?.kind] ?? '-'
}

export function formatActivityLinkedAccount(activity: Activity): string {
  return formatExportText(activity.account?.name)
}

export function formatActivityLinkedContact(activity: Activity): string {
  const contact = activity.contact
  if (!contact) {
    return '-'
  }
  const fullName = `${contact.firstName || ''} ${contact.lastName || ''}`.trim()
  return formatExportText(fullName || contact.code)
}

export function formatActivityLinkedLead(activity: Activity): string {
  const lead = activity.lead
  if (!lead) {
    return '-'
  }
  if (lead.companyName?.trim()) {
    return formatExportText(lead.companyName)
  }
  const person = `${lead.firstName || ''} ${lead.lastName || ''}`.trim()
  return formatExportText(person || lead.code)
}

export function formatActivityLinkedOpportunity(activity: Activity): string {
  return formatExportText(activity.opportunity?.name)
}

export function formatActivityLinkedInvestment(activity: ActivityWithInvestment): string {
  return formatExportText(activity.investment?.name)
}
