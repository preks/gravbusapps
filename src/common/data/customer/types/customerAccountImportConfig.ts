/**
 * Customer Account Import Configuration
 * Extends base account fields with customer-specific fields
 * Used by CRM (Customer Relations Management) domain
 */

import { baseAccountImportFields } from '@/common/data/relations/types/accountImportConfig'
import { accountPreviewConfig } from '@/common/data/relations/types/entityPreviewConfigs'
import { ImportConfig, TargetFieldDefinition } from '@/common/components/common-relations/apps/data-import/types'

// Currently no CRM-specific account fields, but ready for future extensions
const customerAccountFields: TargetFieldDefinition[] = []

export const customerAccountImportConfig: ImportConfig = {
  entityType: 'account',
  domain: 'customer',
  targetFields: [...baseAccountImportFields, ...customerAccountFields],
  preview: accountPreviewConfig
}
