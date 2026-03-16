// ⚡ PERFORMANCE OPTIMIZED: Combined Plan vs Request Data Hook
// Replaces 4 separate hooks with 1 consolidated query

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { generateCombinedPlanVsRequestQuery } from '../queries/getCombinedPlanVsRequestData'
import { extractCurrencyCode } from '../../../../../utils/currencyUtils'
import dayjs from 'dayjs'

export interface CategoryStatData {
  id: string
  name: string
  code: string
  currentPeriodAmount: number
  previousPeriodAmount: number
  variance: number
}

export interface PeriodStatisticsData {
  expensePlanTotal: number
  expenseRequestTotal: number
  monthlyData?: Array<{
    month: string
    expensePlanTotal: number
    expenseRequestTotal: number
  }>
}

export interface CombinedPlanVsRequestData {
  periodStats: PeriodStatisticsData
  categoryStats: CategoryStatData[]
  overduePlansCount: number
  mostUsedCurrency: string | null
}

interface UseCombinedPlanVsRequestDataProps {
  accessToken: string | null | undefined
  period: 'month' | 'quarter' | 'year'
  currencyRef: string
  selectedDepartment?: string
  requestTypes?: string[]
  isActive?: boolean
}

export const useCombinedPlanVsRequestData = ({
  accessToken,
  period,
  currencyRef,
  selectedDepartment,
  requestTypes,
  isActive = true
}: UseCombinedPlanVsRequestDataProps) => {
  const [data, setData] = useState<CombinedPlanVsRequestData>({
    periodStats: {
      expensePlanTotal: 0,
      expenseRequestTotal: 0
    },
    categoryStats: [],
    overduePlansCount: 0,
    mostUsedCurrency: null
  })
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  // ⚡ PERFORMANCE: Request deduplication
  const lastRequestKey = useRef<string>('')
  const isLoadingRef = useRef<boolean>(false)

  const client = useGraphQLClient(accessToken)

  // Helper: Process current and previous period categories (reduces cognitive complexity)
  const processCategoryData = useCallback(
    (
      currentPeriodCategories: Array<{ expenseGroupRef: string; reimbursableAmount: number }> | undefined,
      previousPeriodCategories: Array<{ expenseGroupRef: string; reimbursableAmount: number }> | undefined
    ): Map<string, { current: number; previous: number }> => {
      const categoryMap = new Map<string, { current: number; previous: number }>()

      // Process current period
      if (currentPeriodCategories) {
        for (const item of currentPeriodCategories) {
          const groupRef = item.expenseGroupRef
          if (groupRef) {
            const existing = categoryMap.get(groupRef) || { current: 0, previous: 0 }
            existing.current += item.reimbursableAmount || 0
            categoryMap.set(groupRef, existing)
          }
        }
      }

      // Process previous period
      if (previousPeriodCategories) {
        for (const item of previousPeriodCategories) {
          const groupRef = item.expenseGroupRef
          if (groupRef) {
            const existing = categoryMap.get(groupRef) || { current: 0, previous: 0 }
            existing.previous += item.reimbursableAmount || 0
            categoryMap.set(groupRef, existing)
          }
        }
      }

      return categoryMap
    },
    []
  )

  // Helper: Convert category map to array with variance (reduces cognitive complexity)
  const buildCategoryStats = useCallback(
    (categoryMap: Map<string, { current: number; previous: number }>): CategoryStatData[] => {
      return Array.from(categoryMap.entries()).map(([id, amounts]) => {
        const variance = amounts.previous > 0 ? ((amounts.current - amounts.previous) / amounts.previous) * 100 : 0

        return {
          id,
          name: id, // Keep full expense group ID for matching with catalog
          code: id,
          currentPeriodAmount: amounts.current,
          previousPeriodAmount: amounts.previous,
          variance: Math.round(variance * 10) / 10
        }
      })
    },
    []
  )

  // Helper: Process most used currency (reduces cognitive complexity)
  const processMostUsedCurrency = useCallback(
    (currencyUsage: Array<{ currencyRef: string }> | undefined): string | null => {
      if (!currencyUsage) {
        return null
      }

      const currencyUsageMap = new Map<string, number>()
      for (const item of currencyUsage) {
        const code = extractCurrencyCode(item.currencyRef)
        if (code) {
          currencyUsageMap.set(code, (currencyUsageMap.get(code) || 0) + 1)
        }
      }

      const sortedCurrencies = Array.from(currencyUsageMap.entries()).sort((a, b) => b[1] - a[1])

      return sortedCurrencies.length > 0 ? `Currency:v1:${sortedCurrencies[0][0]}` : null
    },
    []
  )

  // Calculate date ranges based on period
  const dateRanges = useMemo(() => {
    const now = dayjs()
    let startDate = ''
    let endDate = ''
    let previousStartDate = ''
    let previousEndDate = ''

    switch (period) {
      case 'month':
        startDate = now.startOf('month').format('YYYY-MM-DDTHH:mm:ss')
        endDate = now.endOf('month').format('YYYY-MM-DDTHH:mm:ss')
        previousStartDate = now.subtract(1, 'month').startOf('month').format('YYYY-MM-DDTHH:mm:ss')
        previousEndDate = now.subtract(1, 'month').endOf('month').format('YYYY-MM-DDTHH:mm:ss')
        break
      case 'quarter': {
        const currentQuarter = Math.floor(now.month() / 3)
        startDate = now
          .month(currentQuarter * 3)
          .startOf('month')
          .format('YYYY-MM-DDTHH:mm:ss')
        endDate = now
          .month(currentQuarter * 3 + 2)
          .endOf('month')
          .format('YYYY-MM-DDTHH:mm:ss')
        previousStartDate = now
          .subtract(3, 'month')
          .month(currentQuarter * 3)
          .startOf('month')
          .format('YYYY-MM-DDTHH:mm:ss')
        previousEndDate = now
          .subtract(3, 'month')
          .month(currentQuarter * 3 + 2)
          .endOf('month')
          .format('YYYY-MM-DDTHH:mm:ss')
        break
      }
      case 'year':
        startDate = now.startOf('year').format('YYYY-MM-DDTHH:mm:ss')
        endDate = now.endOf('year').format('YYYY-MM-DDTHH:mm:ss')
        previousStartDate = now.subtract(1, 'year').startOf('year').format('YYYY-MM-DDTHH:mm:ss')
        previousEndDate = now.subtract(1, 'year').endOf('year').format('YYYY-MM-DDTHH:mm:ss')
        break
    }

    return { startDate, endDate, previousStartDate, previousEndDate }
  }, [period])

  const fetchCombinedData = useCallback(async () => {
    if (!client || !accessToken || !isActive) {
      setLoading(false)
      return
    }

    // ⚡ PERFORMANCE: Build deduplication key
    const requestKey = [period, currencyRef, selectedDepartment || '', (requestTypes || []).join(',')].join('|')

    // Skip if same request is already in progress
    if (isLoadingRef.current && requestKey === lastRequestKey.current) {
      return
    }

    // Skip if same request just completed
    if (!isLoadingRef.current && requestKey === lastRequestKey.current) {
      return
    }

    try {
      isLoadingRef.current = true
      lastRequestKey.current = requestKey
      setLoading(true)
      setError(null)

      // Generate the combined query
      const query = generateCombinedPlanVsRequestQuery(selectedDepartment, requestTypes)

      const variables: Record<string, any> = {
        currency: currencyRef,
        startDate: dateRanges.startDate,
        endDate: dateRanges.endDate,
        previousStartDate: dateRanges.previousStartDate,
        previousEndDate: dateRanges.previousEndDate,
        currentDate: dayjs().format('YYYY-MM-DDT00:00:00')
      }

      if (selectedDepartment) {
        variables.selectedDepartment = selectedDepartment
      }

      // Execute the combined query
      const response = await client.request(query, variables)

      // Process period statistics
      const planTotal = response?.planTotal?.aggregate?.sum?.totalAmount || 0
      const requestTotal = response?.requestTotal?.aggregate?.sum?.reimbursableAmount || 0

      // Process category statistics using helper
      const categoryMap = processCategoryData(response?.currentPeriodCategories, response?.previousPeriodCategories)
      const categoryStats = buildCategoryStats(categoryMap)

      const overduePlansCount = response?.overduePlans?.aggregate?.count || 0

      // Process most used currency using helper
      const mostUsedCurrency = processMostUsedCurrency(response?.currencyUsage)

      // Update state with all processed data
      setData({
        periodStats: {
          expensePlanTotal: planTotal,
          expenseRequestTotal: requestTotal
        },
        categoryStats,
        overduePlansCount,
        mostUsedCurrency
      })
    } catch (err) {
      console.error('Error fetching combined Plan vs Request data:', err)
      setError(err instanceof Error ? err : new Error('Unknown error occurred'))
    } finally {
      isLoadingRef.current = false
      setLoading(false)
    }
  }, [
    client,
    accessToken,
    period,
    currencyRef,
    selectedDepartment,
    requestTypes,
    isActive,
    dateRanges,
    processCategoryData,
    buildCategoryStats,
    processMostUsedCurrency
  ])

  useEffect(() => {
    fetchCombinedData()
  }, [fetchCombinedData])

  return {
    data,
    loading,
    error,
    refetch: fetchCombinedData
  }
}
