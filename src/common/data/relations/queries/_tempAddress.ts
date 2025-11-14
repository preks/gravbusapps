import { ADDRESS_REF } from '@/common/data/common/queries/addressFragments'

/**
 * Build address fragment for account relations based on entity type
 *
 * @param entityName - GraphQL entity name (e.g., 'Contact' for CRM, 'InvestmentContact' for IRM)
 * @returns Address fragment string with correct field name (city for CRM, locality for IRM)
 */
export const buildAddressFragment = (entityName: string): string => {
  if (entityName.includes('Investment')) {
    // IRM uses "locality"
    return ADDRESS_REF
  }

  // CRM uses "city" instead of "locality"
  return ADDRESS_REF.replaceAll('locality', 'city')
}
