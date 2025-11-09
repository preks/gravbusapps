/**
 * Customer Lead Mappers
 *
 * Transforms CRM Lead (GraphQL response) into standardized Lead structure.
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
 * Handles CRM-specific field naming inconsistencies by mapping them to Lead standards.
 */
export function toCustomerLead(base: CustomerLead): CustomerLead {
  // Map CRM catalog field names to Lead standard (IRM naming)
  const accountAnnualRevenueBand = base.annualRevenue
  const accountAnnualRevenueBandRef = base.annualRevenueRef

  const locality = base.city

  const industryClass = base.industry
  const industryClassRef = base.industryRef

  const companySize = base.numberOfEmployees
  const companySizeRef = base.numberOfEmployeesRef

  return {
    ...base,
    // Mapped catalog fields (CRM names → Lead standard)
    accountAnnualRevenueBand,
    accountAnnualRevenueBandRef,
    locality,
    industryClass,
    industryClassRef,
    companySize,
    companySizeRef
  }
}
