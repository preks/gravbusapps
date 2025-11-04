// Customer Account Mapper - Transform base type to enhanced type with computed fields

import { BaseCustomerAccount, CustomerAccount } from '../types'
import { mapCustomerAccountToCommon } from '@/common/data/relations/mappers/accountMapper'

/**
 * Transform BaseCustomerAccount (GraphQL response) to CustomerAccount (enhanced with computed fields)
 * Also maps to CommonAccount structure via accountMapper
 */
export function toCustomerAccount(base: BaseCustomerAccount): CustomerAccount {
  // First, map to CommonAccount structure (handles field name mappings)
  const common = mapCustomerAccountToCommon(base)

  // Extract labels from catalog entries
  const legalFormLabel = base.legalForm?.value || base.legalForm?.code
  const industryClassLabel = base.industry?.value || base.industry?.code
  const companySizeLabel = base.numberOfEmployees?.value || base.numberOfEmployees?.code
  const annualRevenueLabel = base.annualRevenue?.value || base.annualRevenue?.code
  const ownerDisplayName =
    base.ownerEmployee?.displayName ||
    `${base.ownerEmployee?.firstName || ''} ${base.ownerEmployee?.lastName || ''}`.trim()

  // Create computed display name
  const displayName = base.name || base.code || `Account ${base.id}`

  return {
    ...common,

    // Computed UI fields (only those defined in CustomerAccount interface)
    displayName,
    legalFormLabel,
    companySizeLabel,
    industryClassLabel,
    annualRevenueLabel,
    ownerDisplayName
  }
}
