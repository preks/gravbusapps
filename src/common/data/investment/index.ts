// Main export for investment data module
// Based on nw_investment_relations.dbml schema

// Export all types
export * from './types'

// Export all queries
export * from './queries'

// Export all hooks
export * from './hooks'

// Export all mappers
export * from './mappers'

// Export all utilities
export * from './utils'

// Export payload builders
export * from './payloads'

// Note: Components moved to investment-record/components/shared

// Re-export commonly used items for convenience
export type {
  // Core types
  Investment,
  InvestmentAccount,
  InvestmentContact,
  InvestmentLead,
  InvestmentOpportunity,

  // Specific investment types
  EquityInvestment,
  RealEstateInvestment,
  LiquidFundInvestment,

  // Report types
  InvestmentReport,
  InvestmentTransaction,
  EquityInvestmentReport,
  EquityInvestmentRound,
  RealEstateInvestmentReport,
  RealEstateInvestmentRentalUnit,
  LiquidFundInvestmentReport
} from './types'

// Export enums
export {
  SourceTable,
  AddressType,
  ContactType,
  TaskTiming,
  TaskAssigneeType,
  TaskHolidayPolicy,
  ReportScope
} from './types'

// Export commonly used hooks
export {
  // Core hooks
  useGetInvestments,
  useGetInvestmentById,
  useSearchInvestments,
  useGetInvestmentAccounts,
  useGetInvestmentAccountById,
  useGetInvestmentContacts,
  useGetInvestmentContactById,
  useGetInvestmentLeads,
  useGetInvestmentLeadById,
  useGetInvestmentOpportunities,
  useGetInvestmentOpportunityById,

  // Integration hooks
  useInvestmentDataIntegration
} from './hooks'

// Export hook option types for enhanced functionality
export type {
  UseGetInvestmentContactsOptions,
  UseGetInvestmentAccountsOptions,
  SelectOption,
  AccountSelectOption
} from './hooks'

// Report hooks (re-exported from centralized investment-report module)
// @deprecated Import from '@/common/data/investment-report/hooks' directly in new code.
export { useGetInvestmentReports, useGetInvestmentReportById } from '@/common/data/investment-report/hooks'

// Export commonly used queries
export {
  GET_INVESTMENTS,
  GET_INVESTMENT_BY_ID,
  SEARCH_INVESTMENTS,
  GET_INVESTMENT_ACCOUNTS,
  GET_INVESTMENT_ACCOUNT_BY_ID,
  GET_INVESTMENT_CONTACTS,
  GET_INVESTMENT_CONTACT_BY_ID,
  GET_INVESTMENT_LEADS,
  GET_INVESTMENT_LEAD_BY_ID,
  GET_INVESTMENT_OPPORTUNITIES,
  GET_INVESTMENT_OPPORTUNITY_BY_ID
  // MIGRATION NOTE: Investment report queries moved to @/common/data/investment-report/queries
  // Use the centralized investment-report module for all report queries
} from './queries'

// Export commonly used mappers
export {
  toInvestment,
  toEquityInvestment,
  toRealEstateInvestment,
  toLiquidFundInvestment,
  toLiquidFundInvestments
} from './mappers'
