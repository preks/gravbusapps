// Investment Contact Mappers - Transform base type to enhanced type with computed fields

import { BaseInvestmentContact, InvestmentContact } from '../types'
import { mapInvestmentContactToCommon } from '@/common/data/relations/mappers/contactMapper'

/**
 * Transform BaseInvestmentContact (GraphQL response) to InvestmentContact (enhanced with computed fields)
 * Also maps to CommonContact structure via contactMapper
 */
export function toInvestmentContact(base: BaseInvestmentContact): InvestmentContact {
  // First, map to CommonContact structure (handles field name mappings)
  const common = mapInvestmentContactToCommon(base)

  // Extract labels from catalog entries
  const salutationLabel = base.salutation?.value || base.salutation?.code
  const academicTitleLabel = base.academicTitle?.value || base.academicTitle?.code
  const languageLabel = base.language?.value || base.language?.code

  // Employee label
  const ownerDisplayName =
    base.ownerEmployee?.displayName ||
    `${base.ownerEmployee?.firstName || ''} ${base.ownerEmployee?.lastName || ''}`.trim()

  // Create computed fields
  const fullName = [salutationLabel, academicTitleLabel, base.firstName, base.lastName].filter(Boolean).join(' ').trim()

  const displayName = fullName || base.email || `Contact ${base.id}`

  return {
    ...common,

    // Computed UI fields (only those defined in InvestmentContact interface)
    displayName,
    fullName,
    salutationLabel,
    academicTitleLabel,
    languageLabel,
    ownerDisplayName
  }
}
