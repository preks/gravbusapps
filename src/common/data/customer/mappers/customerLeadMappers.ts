/**
 * Customer Lead Mappers
 * Transform BaseCustomerLead to CustomerLead with computed UI fields
 */

import type { BaseCustomerLead, CustomerLead } from '../types/customerLeadTypes'
import { mapCustomerLeadToCommon } from '@/common/data/relations/mappers/leadMapper'

/**
 * Transform BaseCustomerLead to CustomerLead
 * Adds computed fields for UI display
 */
export function toCustomerLead(base: BaseCustomerLead): CustomerLead {
  // First map to CommonLead structure
  const common = mapCustomerLeadToCommon(base)

  // Then add computed UI fields
  return {
    ...base,
    ...common,
    displayName: getDisplayName(base),
    salutationLabel: base.salutation?.value,
    academicTitleLabel: base.academicTitle?.value,
    leadRatingLabel: base.leadRating?.value,
    leadStatusLabel: base.leadStatus?.value,
    leadSourceLabel: base.leadSource?.value,
    industryClassLabel: base.industryClass?.value,
    companySizeLabel: base.companySize?.value,
    ownerDisplayName: getOwnerDisplayName(base)
  }
}

function getDisplayName(lead: BaseCustomerLead): string {
  if (lead.fullName) return lead.fullName

  const name = `${lead.firstName || ''} ${lead.lastName || ''}`.trim()
  if (name) return name

  if (lead.companyName) return lead.companyName

  return 'Unnamed Lead'
}

function getOwnerDisplayName(lead: BaseCustomerLead): string | undefined {
  if (!lead.ownerEmployee) return undefined

  if (lead.ownerEmployee.displayName) {
    return lead.ownerEmployee.displayName
  }

  const name = `${lead.ownerEmployee.firstName || ''} ${lead.ownerEmployee.lastName || ''}`.trim()
  return name || undefined
}
