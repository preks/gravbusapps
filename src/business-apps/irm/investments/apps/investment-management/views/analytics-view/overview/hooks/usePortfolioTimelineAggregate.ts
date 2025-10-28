import { useState, useEffect, useCallback, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetPortfolioTimelineAggregate } from '../queries/PortfolioTimelineAggregateQuery'

export interface PortfolioTimelineChartData {
  year: string
  total: number
  totalMarketValue: number
  count: number
  yoyLabel: string
  [investmentGroup: string]: string | number // Dynamic investment group fields
}

export interface PortfolioTimelineAggregateIntegration {
  timelineData: PortfolioTimelineChartData[]
  investmentGroups: string[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

/**
 * Helper: Calculate YoY percentage change label
 */
function calculateYoYLabel(currentTotal: number, previousTotal: number): string {
  if (previousTotal > 0) {
    const yoyChange = ((currentTotal - previousTotal) / previousTotal) * 100
    return `${yoyChange >= 0 ? '+' : ''}${yoyChange.toFixed(1)}%`
  } else if (currentTotal > 0) {
    return '+100%'
  }
  return '0%'
}

/**
 * Helper: Apply YoY calculations to chart data
 */
function applyYoYCalculations(chartData: PortfolioTimelineChartData[]): void {
  for (let index = 0; index < chartData.length; index++) {
    const entry = chartData[index]
    if (index > 0) {
      const currentTotal = entry.total || 0
      const previousTotal = chartData[index - 1].total || 0
      entry.yoyLabel = calculateYoYLabel(currentTotal, previousTotal)
    } else {
      entry.yoyLabel = '0%'
    }
  }
}

/**
 * Hook to fetch and process portfolio timeline aggregate data
 * Groups by investment group (Equity, Liquid Fund, Real Estate)
 */
export const usePortfolioTimelineAggregate = (
  context: BusinessAppContextProps,
  yearsCount: number = 5,
  currency?: string
): PortfolioTimelineAggregateIntegration => {
  const { fetchTimelineAggregate } = useGetPortfolioTimelineAggregate(context)
  const [timelineData, setTimelineData] = useState<PortfolioTimelineChartData[]>([])
  const [investmentGroups, setInvestmentGroups] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const isLoadingRef = useRef(false) // For query deduplication

  const loadData = useCallback(async () => {
    if (!context.accessToken) {
      return
    }

    if (isLoadingRef.current) {
      return
    }

    isLoadingRef.current = true
    setIsLoading(true)
    setError(null)

    try {
      const { yearlyData } = await fetchTimelineAggregate(yearsCount, currency)
      // Extract unique investment groups
      const uniqueGroups = Array.from(new Set(yearlyData.map(d => d.investmentGroup))).sort((a, b) =>
        a.localeCompare(b)
      )
      setInvestmentGroups(uniqueGroups)

      // Get last N years
      const currentYear = new Date().getFullYear()
      const years = Array.from({ length: yearsCount }, (_, i) => (currentYear - yearsCount + 1 + i).toString())

      // Helper function to create chart key from group name
      const getChartKey = (groupName: string) => groupName.toLowerCase().replaceAll(/\s+/g, '')

      // Build timeline chart data
      const chartData: PortfolioTimelineChartData[] = years.map(year => {
        const entry: PortfolioTimelineChartData = {
          year,
          total: 0,
          totalMarketValue: 0,
          count: 0,
          yoyLabel: '0%'
        }

        // Initialize all investment groups to 0 using chart keys
        for (const group of uniqueGroups) {
          const chartKey = getChartKey(group)
          entry[chartKey] = 0
          entry[`${chartKey}_count`] = 0
          entry[`${chartKey}_marketValue`] = 0
        }

        // Fill in actual values from yearlyData using chart keys
        const filteredYearlyData = yearlyData.filter(d => d.year === year)
        for (const d of filteredYearlyData) {
          const chartKey = getChartKey(d.investmentGroup)
          entry[chartKey] = d.totalAmount
          entry[`${chartKey}_count`] = d.count
          entry[`${chartKey}_marketValue`] = d.marketValue
          entry.total += d.totalAmount
          entry.totalMarketValue += d.marketValue
          entry.count += d.count
        }

        return entry
      })

      // Calculate YoY change for each year
      applyYoYCalculations(chartData)

      setTimelineData(chartData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setIsLoading(false)
      isLoadingRef.current = false
    }
  }, [context.accessToken, yearsCount, currency, fetchTimelineAggregate])

  useEffect(() => {
    void loadData()
  }, [context.accessToken, yearsCount, currency])

  return {
    timelineData,
    investmentGroups,
    isLoading,
    error,
    refetch: () => void loadData()
  }
}
