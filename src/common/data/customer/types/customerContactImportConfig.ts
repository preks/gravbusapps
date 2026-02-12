/**
 * Customer Contact Import Configuration
 * Extends base contact fields with customer-specific fields
 * Used by CRM (Customer Relations Management) domain
 */

import { baseContactImportFields } from '@/common/data/relations/types/contactImportConfig'
import { ImportConfig } from '@/common/components/common-relations/apps/data-import/types'

// CRM uses base fields only (no extensions)
export const customerContactImportConfig: ImportConfig = {
  entityType: 'contact',
  domain: 'customer',
  targetFields: baseContactImportFields
}
