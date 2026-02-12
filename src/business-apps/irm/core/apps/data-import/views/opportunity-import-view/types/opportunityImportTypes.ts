/**
 * Opportunity-specific import types for IRM
 */

import { ConvertedEntity } from '@/common/components/common-relations/apps/data-import/types'

// Converted opportunity structure ready for API (IRM)
export interface ConvertedOpportunity extends ConvertedEntity {
  // Basic Information
  name?: string | null
  description?: string | null

  // Status & Pipeline (IRM field names)
  opportunityStatusRef?: string | null
  opportunityForecastRef?: string | null
  opportunityPipelineRef?: string | null
  opportunityPipelineStageRef?: string | null

  // Financial Information
  estimatedAmount?: number | null
  currencyRef?: string | null
  closeDate?: string | null
  probability?: number | null

  // Investment-Specific Fields (IRM)
  dealType?: string | null
  investmentName?: string | null
  investmentTypeRef?: string | null
  investmentRoleRef?: string | null
  investmentStakeTypeRef?: string | null
  stakePercentage?: number | null

  // Financial Details (IRM)
  initialInvestmentAmount?: number | null
  requiredCapitalAmount?: number | null
  forecastedProfitAmount?: number | null
  loanAmount?: number | null
  loanInterestRate?: number | null
  marketValue?: number | null

  // Property Information (IRM)
  annualNetColdRent?: number | null
  buildingYear?: number | null
  size?: number | null
  sizeMeasurementUnitRef?: string | null

  // Owner & Additional
  ownerEmployeeId?: string | null
  source?: string | null
}
