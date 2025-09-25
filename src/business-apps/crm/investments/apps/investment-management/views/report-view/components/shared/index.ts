// Shared components for investment reports
export { ReportFilterPanel } from './ReportFilterPanel';
export type { ReportFilterPanelProps } from './ReportFilterPanel';

export { TableStateWrapper } from './TableStateWrapper';
export type { TableStateWrapperProps } from './TableStateWrapper';

// Shared hooks
export { useReportFilters } from './hooks/useReportFilters';
export type { 
  ReportFiltersState, 
  ReportFiltersCallbacks, 
  UseReportFiltersReturn 
} from './hooks/useReportFilters';

// Universal Investment Reports Analytics Hook
export { 
  useUniversalInvestmentReportsAnalytics,
  useRealEstateReportsDataUniversal,
  useEquityReportsDataUniversal,
  useLiquidFundAnalyticsIntegrationUniversal
} from './hooks/useUniversalInvestmentReportsAnalytics';
export type {
  CommonAnalyticsFilters,
  InvestmentGroupType,
  UseUniversalInvestmentReportsAnalyticsProps,
  UniversalInvestmentReportsReturn
} from './hooks/useUniversalInvestmentReportsAnalytics';
