/**
 * Investment Lead Mappers
 *
 * Transforms IRM InvestmentLead (GraphQL response) into standardized InvestmentLead structure.
 *
 * NOTE: IRM field naming already matches CommonLead standards.
 * No catalog field mappings needed (unlike CRM).
 */

import { InvestmentLead } from '../types'

/**
 * Transform InvestmentLead (raw GraphQL) to InvestmentLead (enhanced/standardized)
 *
 * IRM fields already use the correct naming (accountAnnualRevenueBand, etc.),
 * so this mapper is essentially a passthrough with proper typing.
 */
export function toInvestmentLead(base: InvestmentLead): InvestmentLead {
  // IRM uses correct field names, no mapping needed for common fields
  // Just return raw data with proper typing
  return {
    ...base
  } as InvestmentLead
}
