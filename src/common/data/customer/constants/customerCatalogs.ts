/**
 * Customer (CRM) Catalog Constants
 *
 * Re-exports all Relations Constants and overrides with CRM-specific catalog identifiers.
 * This allows centralized maintenance of common catalogs while providing CRM-specific overrides.
 */

export * from '@/common/constants/commonCatalogs'

// CRM-specific overrides
export const OPPORTUNITY_PIPELINE = 'SalesPipeline:v1'
export const OPPORTUNITY_PIPELINE_STAGE = 'SalesPipelineStage:v1'
export const OPPORTUNITY_STATUS = 'SalesOpportunityStatus:v1'
export const LEAD_STATUS = 'SalesLeadStatus:v1'
export const LEAD_SOURCE = 'SalesLeadSource:v1'
export const LEAD_RATING = 'SalesLeadRating:v1'
export const COMPANY_SIZE = 'EmployeeSize:v1'
export const ANNUAL_REVENUE = 'RevenueSize:v1'
export const OPPORTUNITY_FORECAST = 'CustomerOpportunityForecast:v1'
export const ACCOUNT_PRIORITY = 'CustomerAccountPriority:v1'
