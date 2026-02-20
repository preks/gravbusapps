import type { AnalyticsDataTableColumn } from './AnalyticsDataTable'

/**
 * Shared row shape for analytics tables (period/value and optional change).
 * Used by Employment, HeadcountTrends, TurnoverRetention and related tabs.
 */
export interface AnalyticsTableData {
  period: string
  value: number | string
  change?: number
}

/**
 * Config for one chart + its associated table used in analytics tabs.
 */
export interface AnalyticsChartConfig<T = AnalyticsTableData> {
  testId: string
  title: string
  description: string
  tag: string
  tableData: T[]
  exportColumns: AnalyticsDataTableColumn[]
}
