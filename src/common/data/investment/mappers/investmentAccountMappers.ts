// Investment Account Mapper - Transform base type to enhanced type with computed fields

import { BaseInvestmentAccount, InvestmentAccount } from '../types'
import { mapInvestmentAccountToCommon } from '@/common/data/relations/mappers/accountMapper'

/**
 * Transform BaseInvestmentAccount (GraphQL response) to InvestmentAccount (enhanced with computed fields)
 * Also maps to CommonAccount structure via accountMapper
 */
export function toInvestmentAccount(base: BaseInvestmentAccount): InvestmentAccount {
  // First, map to CommonAccount structure (handles field name mappings)
  const common = mapInvestmentAccountToCommon(base)

  // Extract labels from catalog entries
  const legalFormLabel = base.legalForm?.value || base.legalForm?.code
  const industryLabel = base.industryClass?.value || base.industryClass?.code
  const companySizeLabel = base.companySize?.value || base.companySize?.code
  const revenueLabel = base.accountAnnualRevenueBand?.value || base.accountAnnualRevenueBand?.code
  const timeZoneLabel = base.timeZone?.value || base.timeZone?.code
  const ownerDisplayName =
    base.ownerEmployee?.displayName ||
    `${base.ownerEmployee?.firstName || ''} ${base.ownerEmployee?.lastName || ''}`.trim()

  // Create computed display name
  const displayName = base.name || base.code || `Account ${base.id}`

  return {
    ...common,

    // Computed UI fields (only those defined in InvestmentAccount interface)
    displayName,
    legalFormLabel,
    companySizeLabel,
    industryClassLabel: industryLabel,
    accountAnnualRevenueBandLabel: revenueLabel,
    timeZoneLabel,
    ownerDisplayName
  }
}
