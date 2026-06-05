/**
 * Investment Opportunity Import Configuration (IRM)
 * Full explicit field list for InvestmentOpportunity schema.
 *
 * Key differences from CRM Opportunity:
 * - opportunityStatusRef   → InvestmentOpportunityStatus   (not OpportunityStatus)
 * - opportunityForecastRef → InvestmentOpportunityForecast (not OpportunityForecast)
 * - opportunityPipelineRef → InvestmentOpportunityPipeline
 * - opportunityPipelineStageRef → InvestmentOpportunityPipelineStage
 */

import { ImportConfig, TargetFieldDefinition } from '@/common/components/common-relations/apps/data-import/types'
import { opportunityPreviewConfig } from '@/common/data/relations/types/entityPreviewConfigs'

const irmOpportunityFields: TargetFieldDefinition[] = [
  // Basic Information
  { value: 'name', label: 'Opportunity Name', type: 'direct' },
  { value: 'description', label: 'Description', type: 'direct' },

  // Status & Forecast — IRM catalog identifiers
  {
    value: 'opportunityStatusRef',
    label: 'Status (Catalog)',
    type: 'catalog',
    catalog: 'InvestmentOpportunityStatus'
  },
  {
    value: 'opportunityForecastRef',
    label: 'Forecast (Catalog)',
    type: 'catalog',
    catalog: 'InvestmentOpportunityForecast'
  },

  // Pipeline — IRM catalog identifiers
  {
    value: 'opportunityPipelineRef',
    label: 'Pipeline (Catalog)',
    type: 'catalog',
    catalog: 'InvestmentOpportunityPipeline'
  },
  {
    value: 'opportunityPipelineStageRef',
    label: 'Pipeline Stage (Catalog)',
    type: 'catalog',
    catalog: 'InvestmentOpportunityPipelineStage'
  },

  // Financial Information
  { value: 'estimatedAmount', label: 'Estimated Amount', type: 'direct' },
  { value: 'currencyRef', label: 'Currency (Catalog)', type: 'catalog', catalog: 'Currency' },
  { value: 'closeDate', label: 'Expected Close Date', type: 'direct' },
  { value: 'probability', label: 'Probability (%)', type: 'direct' },

  // Owner
  { value: 'ownerEmployeeId', label: 'Owner Employee ID', type: 'direct' },
  { value: 'source', label: 'Source', type: 'direct' },

  // Investment-Specific
  { value: 'investmentCompanyId', label: 'Investment Company ID', type: 'direct' },
  { value: 'dealType', label: 'Opportunity Type', type: 'direct' },
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
  targetFields: irmOpportunityFields,
  preview: opportunityPreviewConfig
}
