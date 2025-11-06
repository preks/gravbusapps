// Investment Contact Mappers - Transform base type to enhanced type with field mappings

import { InvestmentContact } from '../types'

/**
 * Transform InvestmentContact (GraphQL response) to InvestmentContact (enhanced with field mappings)
 *
 * Handles IRM-prefixed field name mappings:
 * - investmentAccountContact → accountContacts
 * - investmentLead → leads
 * - investmentOpportunityContact → opportunityContacts
 */
export function toInvestmentContact(base: InvestmentContact): InvestmentContact {
  // Map IRM-prefixed array field names to common naming
  const accountContacts = (base as any).investmentAccountContact
  const leads = (base as any).investmentLead
  const opportunityContacts = (base as any).investmentOpportunityContact

  return {
    ...base,
    // Map IRM-prefixed fields to common naming
    accountContacts,
    leads,
    opportunityContacts
  } as InvestmentContact
}
