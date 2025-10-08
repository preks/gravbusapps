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
  UseReportFiltersReturn,
  ColumnConfig
} from './hooks/useReportFilters';

// Note: useUniversalInvestmentReportsAnalytics has been removed
// All report views now use useGetInvestmentReports from @/common/data/investment-report/hooks directly
