import { useState, useEffect, useCallback, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetEquityTimelineAggregate } from '../queries/EquityTimelineAggregateQuery'

export interface TimelineChartData {
  year: string
  total: number
  yoyLabel: string
  [investmentType: string]: string | number // Dynamic investment type fields
}

export interface EquityTimelineAggregateIntegration {
  timelineData: TimelineChartData[]
  investmentTypes: string[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

/**
 * Hook to fetch and process equity timeline aggregate data
 */
export const useEquityTimelineAggregate = (
  context: BusinessAppContextProps,
  yearsCount: number = 5,
  currency?: string
): EquityTimelineAggregateIntegration => {
  const { fetchTimelineAggregate } = useGetEquityTimelineAggregate(context)
  const [timelineData, setTimelineData] = useState<TimelineChartData[]>([])
  const [investmentTypes, setInvestmentTypes] = useState<string[]>([])
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

      // Extract unique investment types
      const uniqueTypes = Array.from(new Set(yearlyData.map(d => d.investmentType))).sort((a, b) => a.localeCompare(b))
      setInvestmentTypes(uniqueTypes)

      // Get last N years
      const currentYear = new Date().getFullYear()
      const years = Array.from({ length: yearsCount }, (_, i) => (currentYear - yearsCount + 1 + i).toString())

      // Build timeline chart data
      const chartData: TimelineChartData[] = years.map(year => {
        const entry: TimelineChartData = {
          year,
          total: 0,
          yoyLabel: '0%'
        }

        // Initialize all investment types to 0
        for (const type of uniqueTypes) {
          entry[type] = 0
        }

        // Fill in actual values from yearlyData
        for (const d of yearlyData.filter(d => d.year === year)) {
          entry[d.investmentType] = d.totalAmount
          entry.total += d.totalAmount
        }

        return entry
      })

      // Calculate YoY change for each year
      for (const [index, entry] of chartData.entries()) {
        if (index === 0) {
          entry.yoyLabel = '0%'
          continue
        }

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
      }

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
  }, [loadData])

  return {
    timelineData,
    investmentTypes,
    isLoading,
    error,
    refetch: () => void loadData()
  }
}
