/**
 * Utility functions for determining reference entity types in CRM forms
 */

export type CustomerReferenceEntityType = 'account' | 'contact' | 'lead' | 'opportunity' | 'unknown'

export interface CustomerReferenceEntityData {
  accountId?: string
  contactId?: string
  leadId?: string
  opportunityId?: string
}

/**
 * Determines the reference entity type from form data based on which ID fields are present.
 * Priority order: account > contact > lead > opportunity
 *
 * @param data - Form data containing optional entity ID fields
 * @returns The reference entity type, or 'unknown' if no valid ID is found
 */
export const getReferenceEntityType = (data: CustomerReferenceEntityData): CustomerReferenceEntityType => {
  if (data.accountId) return 'account'
  if (data.contactId) return 'contact'
  if (data.leadId) return 'lead'
  if (data.opportunityId) return 'opportunity'
  return 'unknown'
}
