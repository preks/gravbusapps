// Customer Contact Mapper - Transform base type to enhanced type with computed fields

import { BaseCustomerContact, CustomerContact } from '../types'
import { mapCustomerContactToCommon } from '@/common/data/relations/mappers/contactMapper'

/**
 * Transform BaseCustomerContact (GraphQL response) to CustomerContact (enhanced with computed fields)
 * Also maps to CommonContact structure via contactMapper
 */
export function toCustomerContact(base: BaseCustomerContact): CustomerContact {
  // First, map to CommonContact structure (handles field name mappings)
  const common = mapCustomerContactToCommon(base)

  // Extract labels from catalog entries
  const salutationLabel = base.salutation?.value || base.salutation?.code
  const academicTitleLabel = base.academicTitle?.value || base.academicTitle?.code
  const languageLabel = base.language?.value || base.language?.code
  const ownerDisplayName =
    base.ownerEmployee?.displayName ||
    `${base.ownerEmployee?.firstName || ''} ${base.ownerEmployee?.lastName || ''}`.trim()

  // Create computed names
  const fullName = base.fullName || `${base.firstName || ''} ${base.lastName || ''}`.trim()
  const displayName = fullName || base.code || `Contact ${base.id}`

  return {
    ...common,

    // Computed UI fields (only those defined in CustomerContact interface)
    displayName,
    fullName,
    salutationLabel,
    academicTitleLabel,
    languageLabel,
    ownerDisplayName
  }
}
