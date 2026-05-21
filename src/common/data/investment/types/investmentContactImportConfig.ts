/**
 * Investment Contact Import Configuration
 * Extends base contact fields with investment-specific fields
 * Used by IRM (Investment Relations Management) domain
 */

import { baseContactImportFields } from '@/common/data/relations/types/contactImportConfig'
import { contactPreviewConfig } from '@/common/data/relations/types/entityPreviewConfigs'
import { ImportConfig, TargetFieldDefinition } from '@/common/components/common-relations/apps/data-import/types'

// IRM-specific field
const investmentContactFields: TargetFieldDefinition[] = [{ value: 'userId', label: 'Portal User ID', type: 'direct' }]

export const investmentContactImportConfig: ImportConfig = {
  entityType: 'contact',
  domain: 'investment',
  targetFields: [...baseContactImportFields, ...investmentContactFields],
  preview: contactPreviewConfig
}
