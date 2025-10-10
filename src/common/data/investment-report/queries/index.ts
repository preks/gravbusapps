// Investment Report Queries - Index exports
// This mirrors the investment queries index but for InvestmentReport tables

// Export query builders and types
export {
  GET_INVESTMENT_REPORTS,
  GET_INVESTMENT_REPORT_BY_ID,
  GET_INVESTMENT_REPORTS_BY_INVESTMENT_ID,
  SEARCH_INVESTMENT_REPORTS,
  buildInvestmentReportWhereCondition,
  type InvestmentReportQueryVariables
} from './investmentReportQueries'

// Export fragments for reuse
export {
  INVESTMENT_REPORT,
  EQUITY_INVESTMENT_REPORT,
  LIQUID_FUND_INVESTMENT_REPORT,
  REAL_ESTATE_INVESTMENT_REPORT
} from './fragments/investmentReportFragments'
