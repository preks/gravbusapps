export interface OpportunityOutcomesPoint {
  periodLabel: string
  startDate: string
  endDate: string
  wonCount: number
  lostCount: number
}

export interface OpportunityOutcomesChartProps {
  accessToken: string
  teamMemberIds: string[]
  currencyCode: string
}
