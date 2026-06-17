import type { Activity } from '@/common/data/relations/types/activityTypes'

export type ActivityRelatedEntityKind = 'account' | 'contact' | 'opportunity' | 'lead' | 'investment'

export type ActivityRelatedEntity = {
  key: string
  kind: ActivityRelatedEntityKind
  name: string
  pictureThumbnail?: string | null
  /** Set when parent supplies {@link ActivityRelatedEntitiesContext.getRelatedRecordUrl}. */
  href?: string
}

export type ActivityRelatedEntitiesContext = {
  accountId?: string
  contactId?: string
  opportunityId?: string
  leadId?: string
  investmentId?: string
  /**
   * When true, lists every linked entity on each row, including the one that matches the current record
   * (accountId, contactId, etc.). When false or omitted, chips that match the section’s context IDs are omitted
   * so the timeline does not repeat the record you are already viewing.
   */
  showAllRelatedEntityChips?: boolean
  /** Optional URLs for linked records; keeps ActivitySection agnostic of CRM vs IRM. */
  getRelatedRecordUrl?: (kind: ActivityRelatedEntityKind, id: string) => string | undefined
}

export type ActivityWithInvestment = Activity & {
  investment?: { id?: string; name?: string; pictureThumbnail?: string | null }
  investmentId?: string | null
}

const KIND_ORDER: ActivityRelatedEntityKind[] = ['account', 'contact', 'lead', 'opportunity', 'investment']

function contactDisplayName(contact?: { firstName?: string | null; lastName?: string | null } | null): string {
  if (!contact) return ''
  return `${contact.firstName || ''} ${contact.lastName || ''}`.trim()
}

function leadDisplayName(
  lead?: {
    companyName?: string | null
    firstName?: string | null
    lastName?: string | null
  } | null
): string {
  if (!lead) return ''
  if (lead.companyName?.trim()) return lead.companyName.trim()
  // No `code` fallback: an unnamed lead renders as "Unnamed Lead" in the reference cell.
  return `${lead.firstName || ''} ${lead.lastName || ''}`.trim()
}

function shouldHideKind(
  kind: ActivityRelatedEntityKind,
  context: Pick<
    ActivityRelatedEntitiesContext,
    'accountId' | 'contactId' | 'opportunityId' | 'leadId' | 'investmentId'
  >,
  showAllRelatedEntityChips: boolean | undefined
): boolean {
  if (showAllRelatedEntityChips === true) return false

  const hasAnyContext = !!(
    context.accountId ||
    context.contactId ||
    context.opportunityId ||
    context.leadId ||
    context.investmentId
  )
  if (!hasAnyContext) return false

  if (kind === 'account' && context.accountId) return true
  if (kind === 'contact' && context.contactId) return true
  if (kind === 'opportunity' && context.opportunityId) return true
  if (kind === 'lead' && context.leadId) return true
  if (kind === 'investment' && context.investmentId) return true
  return false
}

function resolveHref(
  kind: ActivityRelatedEntityKind,
  id: string,
  getRelatedRecordUrl?: ActivityRelatedEntitiesContext['getRelatedRecordUrl']
): string | undefined {
  const url = getRelatedRecordUrl?.(kind, id)
  return url && url.length > 0 ? url : undefined
}

/**
 * Derives linked entities for an activity row from fields already loaded with the activity
 * (IDs and nested account, contact, opportunity, lead, investment).
 */
export function getActivityRelatedEntities(
  activity: ActivityWithInvestment,
  context: ActivityRelatedEntitiesContext
): ActivityRelatedEntity[] {
  const entities: ActivityRelatedEntity[] = []
  const { getRelatedRecordUrl, showAllRelatedEntityChips } = context

  if (!shouldHideKind('account', context, showAllRelatedEntityChips) && activity.accountId) {
    const name = activity.account?.name?.trim() || ''
    entities.push({
      key: `account-${activity.accountId}`,
      kind: 'account',
      name,
      pictureThumbnail: activity.account?.pictureThumbnail ?? null,
      href: resolveHref('account', activity.accountId, getRelatedRecordUrl)
    })
  }

  if (!shouldHideKind('contact', context, showAllRelatedEntityChips) && activity.contactId) {
    const name = contactDisplayName(activity.contact)
    entities.push({
      key: `contact-${activity.contactId}`,
      kind: 'contact',
      name,
      pictureThumbnail: activity.contact?.pictureThumbnail ?? null,
      href: resolveHref('contact', activity.contactId, getRelatedRecordUrl)
    })
  }

  if (!shouldHideKind('lead', context, showAllRelatedEntityChips) && activity.leadId) {
    const name = leadDisplayName(activity.lead)
    entities.push({
      key: `lead-${activity.leadId}`,
      kind: 'lead',
      name,
      pictureThumbnail: null,
      href: resolveHref('lead', activity.leadId, getRelatedRecordUrl)
    })
  }

  if (!shouldHideKind('opportunity', context, showAllRelatedEntityChips) && activity.opportunityId) {
    const name = activity.opportunity?.name?.trim() || ''
    entities.push({
      key: `opportunity-${activity.opportunityId}`,
      kind: 'opportunity',
      name,
      pictureThumbnail: null,
      href: resolveHref('opportunity', activity.opportunityId, getRelatedRecordUrl)
    })
  }

  if (!shouldHideKind('investment', context, showAllRelatedEntityChips) && activity.investmentId) {
    const name = activity.investment?.name?.trim() || ''
    entities.push({
      key: `investment-${activity.investmentId}`,
      kind: 'investment',
      name,
      pictureThumbnail: activity.investment?.pictureThumbnail ?? null,
      href: resolveHref('investment', activity.investmentId, getRelatedRecordUrl)
    })
  }

  const orderIndex = (k: ActivityRelatedEntityKind) => {
    const idx = KIND_ORDER.indexOf(k)
    return idx === -1 ? KIND_ORDER.length : idx
  }

  return entities.sort((a, b) => orderIndex(a.kind) - orderIndex(b.kind))
}
