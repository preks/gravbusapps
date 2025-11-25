/**
 * Utility functions for determining reference entity types in IRM forms
 */

export type InvestmentReferenceEntityType = 'account' | 'contact' | 'lead' | 'opportunity' | 'investment' | 'unknown'

export interface InvestmentReferenceEntityData {
  investmentId?: string
  accountId?: string
  contactId?: string
  leadId?: string
  opportunityId?: string
}

/**
 * Determines the reference entity type from form data based on which ID fields are present.
 * Priority order: investment > account > contact > lead > opportunity
 * IRM forms include investmentId as the highest priority entity type.
 *
 * @param data - Form data containing optional entity ID fields (including investmentId)
 * @returns The reference entity type, or 'unknown' if no valid ID is found
 */
export const getReferenceEntityType = (data: InvestmentReferenceEntityData): InvestmentReferenceEntityType => {
  if (data.investmentId) return 'investment'
  if (data.accountId) return 'account'
  if (data.contactId) return 'contact'
  if (data.leadId) return 'lead'
  if (data.opportunityId) return 'opportunity'
  return 'unknown'
}
