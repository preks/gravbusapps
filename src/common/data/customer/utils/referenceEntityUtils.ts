/**
 * Utility functions for determining reference entity types in CRM forms
 */

export type CustomerReferenceEntityType = 'account' | 'contact' | 'lead' | 'opportunity' | 'unknown'

export interface CustomerReferenceEntityData {
  accountId?: string
  contactId?: string
  leadId?: string
  opportunityId?: string
  /** When set, identifies the primary related entity (e.g. activity anchor) when multiple IDs are present */
  relatedEntityId?: string | null
}

/**
 * Determines the reference entity type from form data.
 * When `relatedEntityId` matches one of the entity IDs, that entity is the reference (e.g. opportunity
 * with optional account/contact). Otherwise falls back to: account > contact > lead > opportunity.
 */
export const getReferenceEntityType = (data: CustomerReferenceEntityData): CustomerReferenceEntityType => {
  const rid = data.relatedEntityId
  if (rid) {
    if (data.opportunityId === rid) return 'opportunity'
    if (data.leadId === rid) return 'lead'
    if (data.contactId === rid) return 'contact'
    if (data.accountId === rid) return 'account'
  }
  if (data.accountId) return 'account'
  if (data.contactId) return 'contact'
  if (data.leadId) return 'lead'
  if (data.opportunityId) return 'opportunity'
  return 'unknown'
}
