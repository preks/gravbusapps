// Base interfaces for equity investment analytics data
export interface EquityAnalyticsQueryVariables {
  limit?: number;
  offset?: number;
  where?: any;
  orderBy?: any[];
}

// Interface for equity analytics filters
export interface EquityAnalyticsFilters {
  startDate?: string;
  endDate?: string;
  currency?: string;
  investmentType?: string;
  fundManagerName?: string;
}

// Raw data from GraphQL for equity investments
export interface EquityInvestmentAnalyticsResponse {
  id: string;
  marketValue: number;
  ebitdaAmount: number;
  foundationDate: string;
  investmentId: string;
  investment: {
    id: string;
    name: string;
    code: string;
    fundManagerName: string;
    acquisitionDate: string;
    forecastedProfitAmount: number;
    forecastedRevenueAmount: number;
    currencyRef: string;
  };
  equityInvestmentReport: EquityInvestmentReportAnalyticsResponse[];
}

// Raw report data from GraphQL for equity analytics
export interface EquityInvestmentReportAnalyticsResponse {
  id: string;
  date: string;
  marketValue: number;
  ebitdaAmount: number;
  turnoverAmount: number;
  equityInvestmentId: string;
}

// Processed data for display in equity analytics table
export interface EquityAnalyticsRowData {
  id: string;
  investmentCode: string;
  investmentName: string;
  fundManagerName: string;
  currency: string;
  acquisitionDate: string;
  foundationDate: string;
  // Financial metrics
  currentMarketValue: number;
  currentEbitda: number;
  forecastedProfit: number;
  forecastedRevenue: number;
  // Performance calculations
  unrealizedGain: number;
  ebitdaMargin: number;
  // Metadata
  equityInvestmentId: string;
  investmentId: string;
  reportCount: number;
}

// Summary totals for equity analytics display
export interface EquityAnalyticsTotals {
  totalMarketValue: number;
  totalEbitda: number;
  totalForecastedProfit: number;
  totalForecastedRevenue: number;
  totalUnrealizedGain: number;
  averageEbitdaMargin: number;
}

// Response wrapper for equity analytics data
export interface EquityAnalyticsResponse {
  data: EquityAnalyticsRowData[];
  totals: EquityAnalyticsTotals;
  totalCount: number;
  filters: EquityAnalyticsFilters;
}

// Hook state interface
export interface EquityAnalyticsState {
  data: EquityAnalyticsRowData[];
  totals: EquityAnalyticsTotals;
  isLoading: boolean;
  error: string | null;
  totalCount: number;
  currentFilters: EquityAnalyticsFilters;
}

// Equity analytics transformation options
export interface EquityAnalyticsTransformOptions {
  startDate: string;
  endDate: string;
  targetCurrency: string;
  aggregateBy?: 'investment' | 'fundManager';
}

export default {
  EquityAnalyticsQueryVariables,
  EquityAnalyticsFilters,
  EquityInvestmentAnalyticsResponse,
  EquityInvestmentReportAnalyticsResponse,
  EquityAnalyticsRowData,
  EquityAnalyticsTotals,
  EquityAnalyticsResponse,
  EquityAnalyticsState,
  EquityAnalyticsTransformOptions
};
