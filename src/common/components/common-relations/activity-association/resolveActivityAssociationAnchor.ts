import type { EntityOption } from '@/common/components/common-relations/form-segments/activity-segment/ActivitySegment'
import type { ActivityAssociationAnchor, ActivityAssociationFormValues } from './types'

export function primaryIdFieldForEntityType(
  type: EntityOption['type']
): 'accountId' | 'contactId' | 'opportunityId' | 'leadId' | 'investmentId' | null {
  switch (type) {
    case 'account':
      return 'accountId'
    case 'contact':
      return 'contactId'
    case 'opportunity':
      return 'opportunityId'
    case 'lead':
      return 'leadId'
    case 'investment':
      return 'investmentId'
    default:
      return null
  }
}

/**
 * Resolves which primary related entity drives secondary pickers.
 * Lead (and investment when not in IRM mode) yields no secondary row.
 */
export function resolveActivityAssociationAnchor(
  values: ActivityAssociationFormValues,
  entitySearchOptions: EntityOption[] | undefined,
  supportsInvestment: boolean
): ActivityAssociationAnchor | null {
  const rid = values.relatedEntityId || ''

  if (rid && values.accountId === rid) {
    return { type: 'account', id: rid }
  }
  if (rid && values.contactId === rid) {
    return { type: 'contact', id: rid }
  }
  if (rid && values.opportunityId === rid) {
    return { type: 'opportunity', id: rid }
  }
  if (rid && values.leadId === rid) {
    return null
  }
  if (supportsInvestment && rid && values.investmentId === rid) {
    return { type: 'investment', id: rid }
  }

  if (rid && entitySearchOptions?.length) {
    const hit = entitySearchOptions.find(e => e.id === rid)
    if (hit?.type === 'account') {
      return { type: 'account', id: rid }
    }
    if (hit?.type === 'contact') {
      return { type: 'contact', id: rid }
    }
    if (hit?.type === 'opportunity') {
      return { type: 'opportunity', id: rid }
    }
    if (hit?.type === 'lead') {
      return null
    }
    if (supportsInvestment && hit?.type === 'investment') {
      return { type: 'investment', id: rid }
    }
  }

  if (values.accountId) {
    return { type: 'account', id: values.accountId }
  }
  if (values.contactId) {
    return { type: 'contact', id: values.contactId }
  }
  if (values.opportunityId) {
    return { type: 'opportunity', id: values.opportunityId }
  }
  if (supportsInvestment && values.investmentId) {
    return { type: 'investment', id: values.investmentId }
  }

  return null
}
