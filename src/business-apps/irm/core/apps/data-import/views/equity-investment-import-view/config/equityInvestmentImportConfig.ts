/**
 * Equity Investment Import Configuration
 * Combines common investment fields with equity-specific fields
 */

import { TargetFieldDefinition, ImportConfig } from '@/common/components/common-relations/apps/data-import/types'
import { COMMON_INVESTMENT_FIELDS } from '../../../config/commonInvestmentFields'

export const EQUITY_SPECIFIC_FIELDS: TargetFieldDefinition[] = [
  // Company Information
  { value: 'equityInvestment.foundationDate', label: 'Foundation Date', type: 'direct' },

  // Financial Information
  { value: 'equityInvestment.marketValue', label: 'Equity Market Value', type: 'direct' },
  { value: 'equityInvestment.turnoverAmount', label: 'Turnover Amount', type: 'direct' },
  { value: 'equityInvestment.ebitdaAmount', label: 'EBITDA Amount', type: 'direct' }
]

export const equityInvestmentTargetFields: TargetFieldDefinition[] = [
  ...COMMON_INVESTMENT_FIELDS,
  ...EQUITY_SPECIFIC_FIELDS
]

export const equityInvestmentImportConfig: ImportConfig = {
  entityType: 'equity-investment',
  domain: 'investment',
  targetFields: equityInvestmentTargetFields
}
