// Main export for investment data module
// Based on nw_investment_relations.dbml schema

// Export all types
export * from './types';

// Export all queries
export * from './queries';

// Export all hooks
export * from './hooks';

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
} from './types';

// Export enums
export {
  SourceTable,
  AddressType,
  ContactType,
  TaskTiming,
  TaskAssigneeType,
  TaskHolidayPolicy,
  ReportScope
} from './types';

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
  
  // Report hooks
  useGetInvestmentReports,
  useGetInvestmentReportById,
  useGetInvestmentTransactions,
  useGetInvestmentTransactionById,
  useGetEquityInvestmentReports,
  useGetEquityInvestmentRounds,
  useGetRealEstateInvestmentReports,
  useGetRealEstateInvestmentRentalUnits,
  useGetLiquidFundInvestmentReports,
  
  // Integration hooks
  useInvestmentDataIntegration
} from './hooks';

// Export commonly used queries
export {
  GET_INVESTMENTS,
  GET_INVESTMENT_BY_ID,
  SEARCH_INVESTMENTS,
  GET_INVESTMENT_ACCOUNTS,
  GET_INVESTMENT_ACCOUNT_BY_ID,
  SEARCH_INVESTMENT_ACCOUNTS,
  GET_INVESTMENT_CONTACTS,
  GET_INVESTMENT_CONTACT_BY_ID,
  GET_INVESTMENT_LEADS,
  GET_INVESTMENT_LEAD_BY_ID,
  GET_INVESTMENT_OPPORTUNITIES,
  GET_INVESTMENT_OPPORTUNITY_BY_ID,
  GET_INVESTMENT_REPORTS,
  GET_INVESTMENT_REPORT_BY_ID,
  GET_INVESTMENT_TRANSACTIONS,
  GET_INVESTMENT_TRANSACTION_BY_ID,
  GET_EQUITY_INVESTMENT_REPORTS,
  GET_EQUITY_INVESTMENT_ROUNDS,
  GET_REAL_ESTATE_INVESTMENT_REPORTS,
  GET_REAL_ESTATE_INVESTMENT_RENTAL_UNITS,
  GET_LIQUID_FUND_INVESTMENT_REPORTS
} from './queries';




