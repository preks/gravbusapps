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
      console.warn('⚠️ Portfolio timeline hook: No access token available')
      return
    }

    if (isLoadingRef.current) {
      console.log('⏭️ Portfolio timeline hook: Already loading, skipping duplicate request')
      return
    }

    console.log('🚀 Portfolio timeline hook: Starting data load...', { yearsCount, currency })
    isLoadingRef.current = true
    setIsLoading(true)
    setError(null)

    try {
      const { yearlyData } = await fetchTimelineAggregate(yearsCount, currency)
      console.log('✅ Portfolio timeline hook: Data fetched successfully, processing...', {
        yearlyDataPoints: yearlyData.length,
        sampleData: yearlyData.slice(0, 3)
      })

      // Extract unique investment groups
      const uniqueGroups = Array.from(new Set(yearlyData.map(d => d.investmentGroup))).sort()
      console.log('📊 Unique groups extracted:', uniqueGroups)
      setInvestmentGroups(uniqueGroups)

      // Get last N years
      const currentYear = new Date().getFullYear()
      const years = Array.from({ length: yearsCount }, (_, i) => (currentYear - yearsCount + 1 + i).toString())

      // Helper function to create chart key from group name
      const getChartKey = (groupName: string) => groupName.toLowerCase().replace(/\s+/g, '')

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
        uniqueGroups.forEach(group => {
          const chartKey = getChartKey(group)
          entry[chartKey] = 0
          entry[`${chartKey}_count`] = 0
          entry[`${chartKey}_marketValue`] = 0
        })

        // Fill in actual values from yearlyData using chart keys
        yearlyData
          .filter(d => d.year === year)
          .forEach(d => {
            const chartKey = getChartKey(d.investmentGroup)
            entry[chartKey] = d.totalAmount
            entry[`${chartKey}_count`] = d.count
            entry[`${chartKey}_marketValue`] = d.marketValue
            entry.total += d.totalAmount
            entry.totalMarketValue += d.marketValue
            entry.count += d.count
          })

        return entry
      })

      // Calculate YoY change for each year
      chartData.forEach((entry, index) => {
        if (index > 0) {
          const currentTotal = entry.total || 0
          const previousTotal = chartData[index - 1].total || 0
          if (previousTotal > 0) {
            const yoyChange = ((currentTotal - previousTotal) / previousTotal) * 100
            entry.yoyLabel = `${yoyChange >= 0 ? '+' : ''}${yoyChange.toFixed(1)}%`
          } else if (currentTotal > 0) {
            entry.yoyLabel = '+100%'
          } else {
            entry.yoyLabel = '0%'
          }
        } else {
          entry.yoyLabel = '0%'
        }
      })

      setTimelineData(chartData)
      console.log('✅ Portfolio timeline hook: Data processed and set successfully', {
        dataPoints: chartData.length,
        groups: uniqueGroups.length,
        chartDataSample: chartData.map(d => ({
          year: d.year,
          total: d.total,
          count: d.count,
          groups: uniqueGroups.reduce(
            (acc, g) => {
              const chartKey = getChartKey(g)
              acc[chartKey] = d[chartKey]
              return acc
            },
            {} as Record<string, any>
          )
        }))
      })
    } catch (err) {
      console.error('❌ Portfolio timeline hook: Error loading portfolio timeline aggregate:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setIsLoading(false)
      isLoadingRef.current = false
      console.log('🏁 Portfolio timeline hook: Load completed', { hasError: error !== null })
    }
  }, [context.accessToken, yearsCount, currency, fetchTimelineAggregate])

  useEffect(() => {
    loadData()
  }, [loadData])

  return {
    timelineData,
    investmentGroups,
    isLoading,
    error,
    refetch: loadData
  }
}
