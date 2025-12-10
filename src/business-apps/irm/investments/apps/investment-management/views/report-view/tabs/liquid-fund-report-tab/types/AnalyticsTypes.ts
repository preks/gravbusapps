// Base interfaces for analytics data
export interface AnalyticsQueryVariables {
  limit?: number
  offset?: number
  where?: any
  orderBy?: any[]
}

// Interface for analytics filters
export interface AnalyticsFilters {
  startDate?: string
  endDate?: string
  currencyIds?: string[]
  investmentType?: string // Filter for "Bank Deposits"
  search?: string
  onCurrenciesChange?: (currencies: string[]) => void // Callback to report available currencies
}

// Raw data from GraphQL for liquid fund portfolio with reports
export interface LiquidFundPortfolioAnalyticsResponse {
  id: string
  proprietorName: string
  depositName: string
  isin: string
  portfolioNumber?: string
  portfolioCode?: string
  uniquePortfolioCode?: string
  positionCode?: string
  investmentTypeRef: string
  currencyRef: string
  portfolioStartDate: string
  portfolioEndDate?: string
  investmentType?: {
    id: string
    code: string
    value: string
  }
  // Latest and historical reports for the analytics period
  portfolioReports: LiquidFundPortfolioReportAnalyticsResponse[]
}

// Raw report data from GraphQL for analytics
export interface LiquidFundPortfolioReportAnalyticsResponse {
  id: string
  liquidFundPortfolioId: string
  reportDate: string
  startDate: string
  endDate: string
  currencyRef: string
  // Financial data points
  openMarketValueAmount: number
  closeMarketValueAmount: number
  changeMarketValueAmount: number
  cashFlowAmount: number
  positiveCashFlowAmount: number
  negativeCashFlowAmount: number
  netIncomeAmount: number
  incomeAmount: number
  expensesAmount: number
  accruedAmount: number
  realizedIncomeAmount: number
  realizedMarketIncomeAmount: number
  realizedCurrencyExchangeIncomeAmount: number
  unrealizedIncomeAmount: number
  unrealizedMarketIncomeAmount: number
  unrealizedCurrencyExchangeIncomeAmount: number
  realizedUnrealizedIncomeAmount: number
  realizedUnrealizedMarketIncomeAmount: number
  realizedUnrealizedCurrencyExchangeIncomeAmount: number
  timeWeightCompoundYieldPercent: number
  timeWeightSectorYieldPercent: number
  // Fixed-Term Deposit specific fields
  maturityDate?: string
  interestRate?: number
}

// Processed data for display in analytics table
export interface AnalyticsRowData {
  id: string
  cashBankIdentifier: string
  proprietorName: string
  originalCurrency: string
  // Report date for display
  reportDate?: string
  // Additional fields for Fixed-Term Deposits
  maturityDate?: string
  interestRate?: number
  // Investment navigation fields
  investmentId?: string
  investmentName?: string
  // Additional fields for Multiple Investment Types (Tab 3)
  depositName?: string
  isin?: string
  stocksQuantity?: number
  // Calculated values for the analytics period
  openingBalance: number
  incoming: number
  outgoing: number
  realizedGainsLosses: number
  unrealizedGainsLosses: number
  closingBalance: number
  timeWeightedPerformance: number
  // Metadata
  portfolioId: string
  investmentType: string
  reportCount: number
  reportId?: string // InvestmentReport ID for actions column

  // IMPORTANT: Full data structures for dynamic column access
  // These ensure the getValue functions in dynamic columns can access all nested data
  investment?: any // The investment entity with all its properties
  liquidFundInvestment?: any[] // Array of liquid fund investment data
  liquidFundReport?: any // The liquid fund report data
}

// Summary totals for analytics display
export interface AnalyticsTotals {
  openingBalance: number
  incoming: number
  outgoing: number
  realizedGainsLosses: number
  unrealizedGainsLosses: number
  closingBalance: number
  totalPerformance?: number
}

// Response wrapper for analytics data
export interface AnalyticsResponse {
  data: AnalyticsRowData[]
  totals: AnalyticsTotals
  totalCount: number
  filters: AnalyticsFilters
}

// Hook state interface
export interface AnalyticsState {
  data: AnalyticsRowData[]
  totals: AnalyticsTotals
  isLoading: boolean
  error: string | null
  totalCount: number
  currentFilters: AnalyticsFilters
}

// Analytics transformation options
export interface AnalyticsTransformOptions {
  startDate: string
  endDate: string
  targetCurrency: string
  aggregateBy?: 'portfolio' | 'proprietor' | 'bank'
}

// All types are exported individually above
