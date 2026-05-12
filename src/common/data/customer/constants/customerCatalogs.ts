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
export const COMPANY_SIZE = 'CompanySize:v1'
export const ANNUAL_REVENUE = 'AccountAnnualRevenueBand:v1'
export const OPPORTUNITY_FORECAST = 'CustomerOpportunityForecast:v1'
export const ACCOUNT_PRIORITY = 'CustomerAccountPriority:v1'
export const CUSTOMER_ACCOUNT_TYPE = 'CustomerAccountType:v1'
export const CAMPAIGN_TYPE = 'CustomerCampaignType:v1'

// Task and activity catalogs (CRM)
export const TASK_TYPE = 'SalesTaskType:v1'
export const TASK_PRIORITY = 'SalesTaskPriority:v1'
export const ACTIVITY_TYPE = 'SalesActivityType:v1'

/** Ideal customer profiles for AI ICP scoring (catalog entries hold criteria in `objectValue`). */
export const IDEAL_CUSTOMER_PROFILES_CATALOG = 'CRMIdealCustomerProfiles'
