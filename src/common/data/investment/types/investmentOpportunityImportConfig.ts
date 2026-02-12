/**
 * Investment Opportunity Import Configuration
 * Extends base opportunity fields with investment-specific fields
 * Used by IRM (Investment Relations Management) domain
 */

import { baseOpportunityImportFields } from '@/common/data/relations/types/opportunityImportConfig'
import { ImportConfig, TargetFieldDefinition } from '@/common/components/common-relations/apps/data-import/types'

// IRM-specific: investment pipeline + investment fields
const investmentOpportunityFields: TargetFieldDefinition[] = [
  // Pipeline (IRM naming)
  {
    value: 'opportunityPipelineRef',
    label: 'Pipeline (Catalog)',
    type: 'catalog',
    catalog: 'OpportunityPipeline'
  },
  {
    value: 'opportunityPipelineStageRef',
    label: 'Pipeline Stage (Catalog)',
    type: 'catalog',
    catalog: 'OpportunityPipelineStage'
  },

  // Investment-Specific
  { value: 'dealType', label: 'Deal Type', type: 'direct' },
  { value: 'investmentName', label: 'Investment Name', type: 'direct' },
  { value: 'investmentTypeRef', label: 'Investment Type (Catalog)', type: 'catalog', catalog: 'InvestmentType' },
  { value: 'investmentRoleRef', label: 'Investment Role (Catalog)', type: 'catalog', catalog: 'InvestmentRole' },
  {
    value: 'investmentStakeTypeRef',
    label: 'Stake Type (Catalog)',
    type: 'catalog',
    catalog: 'InvestmentStakeType'
  },
  { value: 'stakePercentage', label: 'Stake Percentage', type: 'direct' },

  // Financial Details
  { value: 'initialInvestmentAmount', label: 'Initial Investment Amount', type: 'direct' },
  { value: 'requiredCapitalAmount', label: 'Required Capital', type: 'direct' },
  { value: 'forecastedProfitAmount', label: 'Forecasted Profit', type: 'direct' },
  { value: 'loanAmount', label: 'Loan Amount', type: 'direct' },
  { value: 'loanInterestRate', label: 'Loan Interest Rate', type: 'direct' },
  { value: 'marketValue', label: 'Market Value', type: 'direct' },

  // Property Information
  { value: 'annualNetColdRent', label: 'Annual Net Cold Rent', type: 'direct' },
  { value: 'buildingYear', label: 'Building Year', type: 'direct' },
  { value: 'size', label: 'Size', type: 'direct' },
  { value: 'sizeMeasurementUnitRef', label: 'Size Unit (Catalog)', type: 'catalog', catalog: 'SizeMeasurementUnit' }
]

export const investmentOpportunityImportConfig: ImportConfig = {
  entityType: 'opportunity',
  domain: 'investment',
  targetFields: [...baseOpportunityImportFields, ...investmentOpportunityFields]
}
