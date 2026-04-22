/**
 * Equity Investment Import Override
 *
 * Patch applied on top of the default `ImportConfig` produced by
 * `createDefaultImportConfig`. Only fields that genuinely differ from the
 * default belong here — `entityType`, `domain`, `investmentPayloadKey`,
 * and `investmentGroupRef` are derived from the catalog descriptor.
 */

import { TargetFieldDefinition } from '@/common/components/common-relations/apps/data-import/types'
import { COMMON_INVESTMENT_FIELDS } from '../commonInvestmentFields'
import type { InvestmentGroupImportOverridePatch } from '../groupImportConfigurations'

export const EQUITY_SPECIFIC_FIELDS: TargetFieldDefinition[] = [
  // Company Information
  { value: 'equityInvestment.foundationDate', label: 'Foundation Date', type: 'direct' },

  // Financial Information
  { value: 'equityInvestment.marketValue', label: 'Equity Market Value', type: 'direct' },
  { value: 'equityInvestment.turnoverAmount', label: 'Turnover Amount', type: 'direct' },
  { value: 'equityInvestment.ebitdaAmount', label: 'EBITDA Amount', type: 'direct' }
]

const equityInvestmentTargetFields: TargetFieldDefinition[] = [...COMMON_INVESTMENT_FIELDS, ...EQUITY_SPECIFIC_FIELDS]

export const equityInvestmentImportOverride: InvestmentGroupImportOverridePatch = {
  targetFields: equityInvestmentTargetFields
}
