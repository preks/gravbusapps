export interface TeamRevenueTrendPoint {
  periodLabel: string
  startDate: string
  endDate: string
  revenue: number
}

export interface TeamRevenueTrendChartProps {
  accessToken: string
  teamMemberIds: string[]
  currencyCode: string
}
