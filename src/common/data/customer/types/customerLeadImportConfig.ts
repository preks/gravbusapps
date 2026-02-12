/**
 * Customer Lead Import Configuration
 * Extends base lead fields with customer-specific fields
 * Used by CRM (Customer Relations Management) domain
 */

import { baseLeadImportFields } from '@/common/data/relations/types/leadImportConfig'
import { ImportConfig } from '@/common/components/common-relations/apps/data-import/types'

// CRM uses base fields only (no extensions)
export const customerLeadImportConfig: ImportConfig = {
  entityType: 'lead',
  domain: 'customer',
  targetFields: baseLeadImportFields
}
