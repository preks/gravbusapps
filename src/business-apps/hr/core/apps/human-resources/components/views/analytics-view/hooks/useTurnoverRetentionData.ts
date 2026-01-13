import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { QueryType, Services, useQueryExecutionClient } from '@/common/network/dataset'
import { useTurnoverRate } from './useTurnoverRate'
import { useAverageTenure } from './useAverageTenure'

export interface TurnoverRetentionData {
  turnoverRateOverTime: Array<{
    category: string
    dateCategory: string
    value: number
  }>
  tenureDistribution: Array<{
    category: string
    value: number
  }>
  retentionByDepartment: Array<{
    category: string
    value: number
  }>
}

export interface TurnoverRetentionStatistics {
  currentTurnoverRate: number
  turnoverChange: number
  averageTenure: string
  atRiskDepartments: number
  retentionTarget: number
}

interface UseTurnoverRetentionDataResponse {
  turnoverRateOverTime: TurnoverRetentionData['turnoverRateOverTime']
  tenureDistribution: TurnoverRetentionData['tenureDistribution']
  retentionByDepartment: TurnoverRetentionData['retentionByDepartment']
  statistics: TurnoverRetentionStatistics
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export const useTurnoverRetentionData = (context: BusinessAppContextProps): UseTurnoverRetentionDataResponse => {
  const [data, setData] = useState<TurnoverRetentionData>({
    turnoverRateOverTime: [],
    tenureDistribution: [],
    retentionByDepartment: []
  })

  const [statistics, setStatistics] = useState<TurnoverRetentionStatistics>({
    currentTurnoverRate: 0,
    turnoverChange: 0,
    averageTenure: '-',
    atRiskDepartments: 0,
    retentionTarget: 85
  })

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Use existing GraphQL hooks from Dashboard
  const {
    rate: currentTurnoverRate,
    change: turnoverChange,
    loading: turnoverLoading
  } = useTurnoverRate(context.accessToken)

  const { formattedTenure, loading: tenureLoading } = useAverageTenure(context.accessToken)

  const queryClient = useQueryExecutionClient(context.accessToken, Services.EMPLOYEE)

  const calculateStatistics = useCallback(
    (
      loadedData: TurnoverRetentionData,
      turnoverRate: number,
      tenure: string,
      change: number
    ): TurnoverRetentionStatistics => {
      // Count departments with retention below target (85%) using real data
      const atRiskDepartments = loadedData.retentionByDepartment.filter(dept => dept.value < 85).length

      return {
        currentTurnoverRate: turnoverRate,
        turnoverChange: change,
        averageTenure: tenure,
        atRiskDepartments,
        retentionTarget: 85 // Company target retention rate
      }
    },
    []
  )

  const loadTurnoverRetentionData = useCallback(async () => {
    if (!context.accessToken) return

    setIsLoading(true)
    setError(null)

    try {
      // Calculate date range (last 5 years to capture more exit data)
      const endDate = new Date()
      const startDate = new Date()
      startDate.setFullYear(endDate.getFullYear() - 5)

      const formattedStartDate = startDate.toISOString().split('T')[0]
      const formattedEndDate = endDate.toISOString().split('T')[0]

      console.log('[useTurnoverRetentionData] Fetching real data with date range:', {
        startDate: formattedStartDate,
        endDate: formattedEndDate
      })

      // Execute NEW real queries in parallel
      const [turnoverOverTimeData, tenureDistributionData, retentionByDepartmentData] = await Promise.all([
        // Monthly turnover rates over time (using NEW real percentage query)
        queryClient.executeQuery('monthlyTurnoverRatePercentage', QueryType.TIMESERIES, {
          startDate: formattedStartDate,
          endDate: formattedEndDate
        }),

        // Tenure distribution (using existing query)
        queryClient.executeQuery('tenureDistribution', QueryType.DATASET, {}),

        // Real retention rates by department (using NEW query)
        queryClient.executeQuery('retentionRateByDepartment', QueryType.DATASET, {
          startDate: formattedStartDate,
          endDate: formattedEndDate
        })
      ])

      console.log('[useTurnoverRetentionData] Real API responses:', {
        turnoverOverTimeData: turnoverOverTimeData.data?.slice(0, 2),
        tenureDistributionData: tenureDistributionData.data?.slice(0, 2),
        retentionByDepartmentData: retentionByDepartmentData.data?.slice(0, 2)
      })

      // Transform turnover data (already in percentage format from new query)
      const transformedTurnoverData =
        turnoverOverTimeData.data?.map((item: any) => ({
          category: item.category,
          dateCategory: item.dateCategory || item.date_category,
          value: item.value // Already percentage from monthlyTurnoverRatePercentage query
        })) || []

      // Use real retention by department data (already in percentage format)
      const transformedRetentionData =
        retentionByDepartmentData.data?.map((item: any) => ({
          category: item.category,
          value: item.value // Real retention rates from retentionRateByDepartment query
        })) || []

      const loadedData: TurnoverRetentionData = {
        turnoverRateOverTime: transformedTurnoverData,
        tenureDistribution:
          tenureDistributionData.data?.map((item: any) => ({
            category: item.category,
            value: item.value
          })) || [],
        retentionByDepartment: transformedRetentionData
      }

      setData(loadedData)
      setStatistics(calculateStatistics(loadedData, currentTurnoverRate, formattedTenure, turnoverChange ?? 0))
    } catch (err) {
      console.error('[useTurnoverRetentionData] Error loading real data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load turnover & retention data')
    } finally {
      setIsLoading(false)
    }
  }, [queryClient, context.accessToken, calculateStatistics, currentTurnoverRate, formattedTenure])

  useEffect(() => {
    // Only load when GraphQL hooks are done loading
    if (context.accessToken && !turnoverLoading && !tenureLoading) {
      loadTurnoverRetentionData()
    }
  }, [context.accessToken, loadTurnoverRetentionData, turnoverLoading, tenureLoading])

  return {
    turnoverRateOverTime: data.turnoverRateOverTime,
    tenureDistribution: data.tenureDistribution,
    retentionByDepartment: data.retentionByDepartment,
    statistics,
    isLoading: isLoading || turnoverLoading || tenureLoading,
    error,
    refetch: loadTurnoverRetentionData
  }
}
