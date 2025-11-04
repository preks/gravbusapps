/**
 * Investment Lead Mappers
 * Transform BaseInvestmentLead to InvestmentLead with computed UI fields
 */

import type { BaseInvestmentLead, InvestmentLead } from '../types/investmentLeadTypes'
import { mapInvestmentLeadToCommon } from '@/common/data/relations/mappers/leadMapper'

/**
 * Transform BaseInvestmentLead to InvestmentLead
 * Adds computed fields for UI display
 */
export function toInvestmentLead(base: BaseInvestmentLead): InvestmentLead {
  // First map to CommonLead structure
  const common = mapInvestmentLeadToCommon(base)

  // Then add computed UI fields
  return {
    ...base,
    ...common,
    displayName: getDisplayName(base),
    salutationLabel: base.salutation?.value,
    leadRatingLabel: base.leadRating?.value,
    leadStatusLabel: base.leadStatus?.value,
    leadSourceLabel: base.leadSource?.value,
    industryClassLabel: base.industryClass?.value,
    ownerDisplayName: getOwnerDisplayName(base)
  }
}

function getDisplayName(lead: BaseInvestmentLead): string {
  if (lead.fullName) return lead.fullName

  const name = `${lead.firstName || ''} ${lead.lastName || ''}`.trim()
  if (name) return name

  if (lead.companyName) return lead.companyName

  return 'Unnamed Lead'
}

function getOwnerDisplayName(lead: BaseInvestmentLead): string | undefined {
  if (!lead.ownerEmployee) return undefined

  if (lead.ownerEmployee.displayName) {
    return lead.ownerEmployee.displayName
  }

  const name = `${lead.ownerEmployee.firstName || ''} ${lead.ownerEmployee.lastName || ''}`.trim()
  return name || undefined
}
