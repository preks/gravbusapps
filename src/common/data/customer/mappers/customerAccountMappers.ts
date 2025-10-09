// Customer Account Mapper - Transform base type to enhanced type with computed fields

import { BaseCustomerAccount, CustomerAccount } from '../types'

/**
 * Transform BaseCustomerAccount (GraphQL response) to CustomerAccount (enhanced with computed fields)
 */
export function toCustomerAccount(base: BaseCustomerAccount): CustomerAccount {
  // Extract labels from catalog entries
  const legalFormLabel = base.legalForm?.value || base.legalForm?.code
  const industryClassLabel = base.industryClass?.value || base.industryClass?.code
  const companySizeLabel = base.companySize?.value || base.companySize?.code
  const annualRevenueLabel = base.annualRevenue?.value || base.annualRevenue?.code
  const ownerDisplayName =
    base.ownerEmployee?.displayName ||
    `${base.ownerEmployee?.firstName || ''} ${base.ownerEmployee?.lastName || ''}`.trim()

  // Create computed display name
  const displayName = base.name || base.code || `Account ${base.id}`

  return {
    ...base,

    // Computed UI fields (only those defined in CustomerAccount interface)
    displayName,
    legalFormLabel,
    companySizeLabel,
    industryClassLabel,
    annualRevenueLabel,
    ownerDisplayName
  }
}
