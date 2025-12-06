/**
 * Investment (IRM) Catalog Constants
 *
 * Re-exports all Relations Constants and overrides with IRM-specific catalog identifiers.
 * This allows centralized maintenance of common catalogs while providing IRM-specific overrides.
 */

export * from '@/common/constants/commonCatalogs'

// IRM-specific overrides
export const OPPORTUNITY_PIPELINE = 'InvestmentOpportunityPipeline:v1'
export const OPPORTUNITY_PIPELINE_STAGE = 'InvestmentOpportunityPipelineStage:v1'
export const OPPORTUNITY_STATUS = 'InvestmentOpportunityStatus:v1'
export const LEAD_STATUS = 'InvestmentLeadStatus:v1'
export const LEAD_SOURCE = 'InvestmentLeadSource:v1'
export const LEAD_RATING = 'InvestmentLeadRating:v1'
export const COMPANY_SIZE = 'CompanySize:v1'
export const ANNUAL_REVENUE = 'AccountAnnualRevenueBand:v1'
export const OPPORTUNITY_FORECAST = 'InvestmentOpportunityForecast:v1'
export const ACCOUNT_PRIORITY = 'InvestmentAccountPriority:v1'

// Investment catalog identifiers
export const investmentGroup = 'InvestmentGroup:v1'
export const investmentType = 'InvestmentType:v1'
export const investmentLiquidFundType = 'InvestmentLiquidFundType:v1'
