/**
 * Investment Account Import Configuration
 * Extends base account fields with investment-specific fields
 * Used by IRM (Investment Relations Management) domain
 */

import { baseAccountImportFields } from '@/common/data/relations/types/accountImportConfig'
import { ImportConfig, TargetFieldDefinition } from '@/common/components/common-relations/apps/data-import/types'

// Currently no IRM-specific account fields, but ready for future extensions
const investmentAccountFields: TargetFieldDefinition[] = []

export const investmentAccountImportConfig: ImportConfig = {
  entityType: 'account',
  domain: 'investment',
  targetFields: [...baseAccountImportFields, ...investmentAccountFields]
}
