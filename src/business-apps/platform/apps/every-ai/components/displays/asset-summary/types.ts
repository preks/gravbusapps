/**
 * Asset summary display types (aligned with flowbot AssetSummaryData).
 */

export type AssetPieSlice = {
  key: string
  label: string
  count: number
  totalValue: number
}

export type AssetStatusTrendPoint = {
  month: string
  count: number
}

export type AssetStatusTrendSeries = {
  status: string
  points: AssetStatusTrendPoint[]
}

export type AssetSummaryData = {
  type: 'assetSummary'
  title: string
  description: string
  categories: AssetPieSlice[]
  statuses: AssetPieSlice[]
  statusTrend: AssetStatusTrendSeries[]
  months: string[]
}
