// Shared hooks
export { useReportFilters } from './useReportFilters'
export type {
  ReportFiltersState,
  ReportFiltersCallbacks,
  UseReportFiltersReturn,
  ColumnConfig
} from './useReportFilters'

export { useReportTabCounts } from './useReportTabCounts'

// Note: useUniversalInvestmentReportsAnalytics has been removed
// All report views now use useGetInvestmentReports from @/common/data/investment-report/hooks directly
