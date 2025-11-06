/**
 * Customer Lead Mappers
 *
 * Transforms CRM Lead (GraphQL response) into standardized CommonLead structure.
 *
 * Key Mappings:
 * - annualRevenue → accountAnnualRevenueBand
 * - city → locality
 * - industry → industryClass
 * - numberOfEmployees → companySize
 */

import { CustomerLead } from '../types'

/**
 * Transform CustomerLead (raw GraphQL) to CustomerLead (enhanced/standardized)
 *
 * Handles CRM-specific field naming inconsistencies by mapping them to CommonLead standards.
 */
export function toCustomerLead(base: CustomerLead): CustomerLead {
  // Map CRM catalog field names to CommonLead standard (IRM naming)
  const accountAnnualRevenueBand = base.annualRevenue
  const accountAnnualRevenueBandRef = base.annualRevenueRef

  const locality = base.city

  const industryClass = base.industry
  const industryClassRef = base.industryRef

  const companySize = base.numberOfEmployees
  const companySizeRef = base.numberOfEmployeesRef

  return {
    ...base,
    // Mapped catalog fields (CRM names → CommonLead standard)
    accountAnnualRevenueBand,
    accountAnnualRevenueBandRef,
    locality,
    industryClass,
    industryClassRef,
    companySize,
    companySizeRef
  }
}
