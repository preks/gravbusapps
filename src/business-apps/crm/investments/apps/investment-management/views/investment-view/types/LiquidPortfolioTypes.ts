export interface LiquidFundPortfolioResponse {
  id: string;
  proprietorName: string;
  depositName: string;
  isin: string;
  investmentGroupRef: string;
  investmentTypeRef: string;
  portfolioNumber: string;
  portfolioCode: string;
  uniquePortfolioCode: string;
  positionCode: string;
  positionDescription: string;
  compositePositionDescription: string;
  currencyRef: string;
  portfolioStartDate: string;
  portfolioStartDate2: string;
  portfolioEndDate: string;
  investmentGroup?: {
    id: string;
    code: string;
    value: string;
  };
  investmentType?: {
    id: string;
    code: string;
    value: string;
  };
}

export interface LiquidFundPortfolioReportResponse {
  id: string;
  liquidFundPortfolioId: string;
  reportDate: string;
  startDate: string;
  endDate: string;
  currencyRef: string;
  cashFlowAmount: number;
  positiveCashFlowAmount: number;
  negativeCashFlowAmount: number;
  netIncomeAmount: number;
  incomeAmount: number;
  expensesAmount: number;
  accruedAmount: number;
  accruedInterestRate: number;
  realizedIncomeAmount: number;
  realizedMarketIncomeAmount: number;
  realizedCurrencyExchangeIncomeAmount: number;
  unrealizedIncomeAmount: number;
  unrealizedMarketIncomeAmount: number;
  unrealizedCurrencyExchangeIncomeAmount: number;
  realizedUnrealizedIncomeAmount: number;
  realizedUnrealizedMarketIncomeAmount: number;
  realizedUnrealizedCurrencyExchangeIncomeAmount: number;
  openMarketValueAmount: number;
  closeMarketValueAmount: number;
  changeMarketValueAmount: number;
  timeWeightCompoundYieldPercent: number;
  timeWeightSectorYieldPercent: number;
  benchmarkYieldPercent: number;
  benchmarkNotes: string;
  benchmarkDescription: string;
  benchmarkFromDate: string;
  benchmarkToDate: string;
  depositDescription: string;
  maturityDate: string;
  interestRate: number;
  stocksQuantity: number;
}

export interface EnhancedLiquidPortfolio {
  id: string;
  proprietorName: string;
  depositName: string;
  isin: string;
  portfolioCode: string;
  positionDescription: string;
  currency: string;
  startDate: string;
  endDate: string;
  status: string;
  marketValue: string;
  performance: string;
  performancePercent: number;
  group: string;
  type: string;
  rawData: LiquidFundPortfolioResponse;
  latestReport?: LiquidFundPortfolioReportResponse;
}

export interface LiquidPortfolioMetrics {
  totalPortfolios: number;
  totalMarketValue: string;
  avgPerformance: string;
  activePortfolios: number;
  avgYield: string;
  totalCashFlow: string;
  // Raw numerical values for trend calculation
  avgPerformanceNum?: number;
  avgYieldNum?: number;
  totalMarketValueNum?: number;
}

export interface LiquidPortfolioQueryVariables {
  id?: string;
  offset?: number;
  limit?: number;
  search?: string;
  where?: any;
  orderBy?: any;
}

export interface LiquidPortfolioReportQueryVariables {
  liquidFundPortfolioId?: string;
  offset?: number;
  limit?: number;
  where?: any;
  orderBy?: any;
  startDate?: string;
  endDate?: string;
}


