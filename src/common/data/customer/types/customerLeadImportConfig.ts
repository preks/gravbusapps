/**
 * Customer Lead Import Configuration
 * Extends base lead fields with customer-specific fields
 * Used by CRM (Customer Relations Management) domain
 */

import { baseLeadImportFields } from '@/common/data/relations/types/leadImportConfig'
import { ImportConfig } from '@/common/components/common-relations/apps/data-import/types'

const customerLeadImportFields = baseLeadImportFields.map(field => {
  if (field.type !== 'catalog') return field

  switch (field.value) {
    case 'leadStatusRef':
      return { ...field, catalog: 'SalesLeadStatus' }
    case 'leadSourceRef':
      return { ...field, catalog: 'SalesLeadSource' }
    case 'leadRatingRef':
      return { ...field, catalog: 'SalesLeadRating' }
    default:
      return field
  }
})

// CRM uses base fields only (no extensions)
export const customerLeadImportConfig: ImportConfig = {
  entityType: 'lead',
  domain: 'customer',
  targetFields: customerLeadImportFields
}
