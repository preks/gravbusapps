import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { type PipelineForecastData } from '../types'

interface UsePipelineForecastResult {
  forecastData: PipelineForecastData[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

/**
 * Generates the next 3 months as time periods for forecasting
 */
function generateForecastPeriods() {
  const currentDate = new Date()
  const periods = []

  for (let i = 0; i < 3; i++) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1)
    const monthStart = date.toISOString()
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 1).toISOString()
    const monthName = date.toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric'
    })

    periods.push({
      start: monthStart,
      end: monthEnd,
      label: monthName
    })
  }

  return periods
}

/**
 * Hook to fetch pipeline forecast data for the next 3 months
 * Only includes OPEN opportunities (WON opportunities go to Revenue Trends)
 * Calculates forecasted revenue based on closeDate x estimatedAmount
 * @param accessToken - The access token for API authentication
 * @param selectedPipelineId - Optional pipeline ID to filter by
 * @param selectedCurrencyId - Optional currency ID to filter by (e.g., "Currency:v1:EUR")
 */
export const usePipelineForecast = (
  accessToken: string,
  selectedPipelineId?: string,
  selectedCurrencyId?: string
): UsePipelineForecastResult => {
  const [forecastData, setForecastData] = useState<PipelineForecastData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const graphqlClient = useGraphQLClient(accessToken)

  const fetchForecast = useCallback(async () => {
    if (!accessToken) {
      setError('Access token is required')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Generate the next 3 months
      const periods = generateForecastPeriods()

      // Build the base where clause - only include OPEN opportunities
      const pipelineFilter = selectedPipelineId ? `salesPipelineRef: {_eq: "${selectedPipelineId}"}` : ''
      const currencyFilter = selectedCurrencyId ? `currencyRef: {_eq: "${selectedCurrencyId}"}` : ''

      let baseWhere = `isDeleted: {_eq: false}
            opportunityStatus: {code: {_eq: "OPEN"}}`
      if (pipelineFilter) baseWhere += '\n            ' + pipelineFilter
      if (currencyFilter) baseWhere += '\n            ' + currencyFilter

      // Query for each month's forecasted revenue based on closeDate
      const queries = periods.map(
        (period, index) => `
        forecast${index}: OpportunityAggregate(
          where: {
            ${baseWhere}
            closeDate: {_gte: "${period.start}", _lt: "${period.end}"}
          }
        ) {
          aggregate {
            count
            sum { estimatedAmount }
          }
        }
      `
      )

      const query = `
        query GetPipelineForecast {
          ${queries.join('\n')}
        }
      `

      const result = await graphqlClient.request<Record<string, any>>(query)

      const forecast = periods.map((period, index) => {
        const forecastedRevenue = result[`forecast${index}`]?.aggregate?.sum?.estimatedAmount || 0
        const opportunityCount = result[`forecast${index}`]?.aggregate?.count || 0

        return {
          month: period.label,
          forecastedRevenue,
          opportunityCount
        }
      })

      setForecastData(forecast)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, graphqlClient, selectedPipelineId, selectedCurrencyId])

  useEffect(() => {
    void fetchForecast()
  }, [fetchForecast])

  return {
    forecastData,
    isLoading,
    error,
    refetch: () => void fetchForecast()
  }
}
