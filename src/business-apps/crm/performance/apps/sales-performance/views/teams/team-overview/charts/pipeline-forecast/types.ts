export interface PipelineForecastPoint {
  month: string
  forecastedRevenue: number
  opportunityCount: number
}

export interface PipelineForecastChartProps {
  accessToken: string
  teamMemberIds: string[]
  currencyCode: string
}
