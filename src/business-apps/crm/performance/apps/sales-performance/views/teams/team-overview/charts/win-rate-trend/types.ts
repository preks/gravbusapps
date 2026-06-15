export interface WinRateTrendPoint {
  periodLabel: string
  startDate: string
  endDate: string
  wonCount: number
  closedCount: number
  winRate: number
}

export interface WinRateTrendChartProps {
  accessToken: string
  teamMemberIds: string[]
  currencyCode: string
}
