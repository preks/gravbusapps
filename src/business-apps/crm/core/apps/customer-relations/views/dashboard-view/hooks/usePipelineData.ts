import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { PipelineInfo, DateRange, PipelineData } from '../types/dashboardTypes'
import { useDashboardQueries } from '../queries/DashboardQueries'
import { transformPipelineData, extractCurrencyCode } from '../utils/dashboardUtils'
import dayjs from 'dayjs'
import quarterOfYear from 'dayjs/plugin/quarterOfYear'

export interface UsePipelineDataReturn {
  pipelineData: PipelineData | null
  isLoading: boolean
  error: string | null
  refetch: () => void
  availableCurrencies: string[]
}

export const usePipelineData = (
  context: BusinessAppContextProps,
  pipeline: PipelineInfo | null,
  dateRange: DateRange,
  selectedCurrency?: string
): UsePipelineDataReturn => {
  const [pipelineData, setPipelineData] = useState<PipelineData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [availableCurrencies, setAvailableCurrencies] = useState<string[]>(['EUR'])

  const {
    fetchPipelineStages,
    fetchPipelineOpportunities,
    fetchSalesActivities,
    fetchWinRateData,
    fetchSalesRepPerformance
  } = useDashboardQueries(context)

  const loadPipelineData = useCallback(async () => {
    if (!context.accessToken || !pipeline || !pipeline.ref) {
      setError(!pipeline ? 'No pipeline selected' : 'Missing access token or pipeline reference')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Extend dayjs with quarter plugin
      dayjs.extend(quarterOfYear)

      const startDate = dayjs(dateRange.startDate).toISOString()
      const endDate = dayjs(dateRange.endDate).toISOString()

      // Fetch all data in parallel
      // Note: pipeline.ref is the full reference string like "SalesPipeline:v1:STANDARD"
      // This works for both parentEntryId and salesPipelineRef queries
      const [stages, opportunities, activities, , salesRepData] = await Promise.all([
        fetchPipelineStages(pipeline.ref),
        fetchPipelineOpportunities({
          pipelineRef: pipeline.ref,
          limit: 100 // Fetch more opportunities for accurate KPIs
        }),
        fetchSalesActivities({
          startDate,
          endDate,
          pipelineRef: pipeline.ref
        }),
        fetchWinRateData({
          pipelineRef: pipeline.ref
        }),
        fetchSalesRepPerformance({
          pipelineRef: pipeline.ref,
          activityStartDate: startDate,
          activityEndDate: endDate
        })
      ])

      // Extract unique currencies from opportunities
      const currencies = [
        ...new Set(opportunities.map((opp: any) => extractCurrencyCode(opp.currencyRef || 'Currency:v1:EUR')))
      ].sort()
      setAvailableCurrencies(currencies.length > 0 ? currencies : ['EUR'])

      // Filter opportunities by selected currency if provided
      const filteredOpportunities = selectedCurrency
        ? opportunities.filter(
            (opp: any) => extractCurrencyCode(opp.currencyRef || 'Currency:v1:EUR') === selectedCurrency
          )
        : opportunities

      // Transform the data with filtered opportunities
      const transformedData = transformPipelineData(
        {
          id: pipeline.id,
          name: pipeline.name,
          code: pipeline.ref,
          description: pipeline.description,
          additionalProperties: { color: pipeline.color }
        },
        filteredOpportunities,
        activities,
        stages
      )

      // Use the SAME filteredOpportunities for win rate - consistent with KPIs and leaderboard
      // Helper functions to check opportunity status (CRM uses status or opportunityStatusRef)
      const isWonOpp = (opp: any) => opp.status === 'Won' || opp.opportunityStatusRef?.includes(':WON')
      const isLostOpp = (opp: any) => opp.status === 'Lost' || opp.opportunityStatusRef?.includes(':LOST')
      const isClosedOpp = (opp: any) => isWonOpp(opp) || isLostOpp(opp)

      // Get closed opportunities from the same data source as KPIs
      const closedOpportunities = filteredOpportunities.filter(isClosedOpp)
      const wonOpportunities = filteredOpportunities.filter(isWonOpp)
      const lostOpportunities = filteredOpportunities.filter(isLostOpp)

      // Calculate win rate
      const totalClosed = closedOpportunities.length
      const winRate = totalClosed > 0 ? (wonOpportunities.length / totalClosed) * 100 : 0

      // Enhance with win rate and sales rep data
      const enhancedData: PipelineData = {
        ...transformedData,
        winRateMetrics: {
          // Use same data for month and quarter (all-time stats for consistency)
          monthToDate: {
            won: wonOpportunities.length,
            lost: lostOpportunities.length,
            winRate
          },
          quarterToDate: {
            won: wonOpportunities.length,
            lost: lostOpportunities.length,
            winRate
          }
        },
        leaderboard: (() => {
          const repMap = new Map<string, any>()

          // Use the SAME filteredOpportunities as KPI cards for consistency
          filteredOpportunities.forEach((opp: any) => {
            const empId = opp.ownerEmployeeId
            if (!empId) return

            if (!repMap.has(empId)) {
              repMap.set(empId, {
                employeeId: empId,
                firstName: opp.ownerEmployee?.firstName || '',
                lastName: opp.ownerEmployee?.lastName || '',
                displayName: `${opp.ownerEmployee?.firstName || ''} ${opp.ownerEmployee?.lastName || ''}`.trim(),
                dealsWon: 0,
                dealsLost: 0,
                totalDeals: 0,
                totalValue: 0,
                winRate: 0,
                activitiesCount: 0
              })
            }

            const rep = repMap.get(empId)
            rep.totalDeals++
            rep.totalValue += opp.estimatedAmount || 0

            if (isWonOpp(opp)) {
              rep.dealsWon++
            } else if (isLostOpp(opp)) {
              rep.dealsLost++
            }
          })

          // Process activities for leaderboard
          salesRepData.activities.forEach((activity: any) => {
            const empId = activity.ownerEmployeeId
            if (!empId) return

            if (repMap.has(empId)) {
              const rep = repMap.get(empId)
              rep.activitiesCount++
            }
          })

          // Calculate win rates and sort by total value
          const leaderboard = Array.from(repMap.values()).map((rep: any) => ({
            ...rep,
            winRate: rep.dealsWon + rep.dealsLost > 0 ? (rep.dealsWon / (rep.dealsWon + rep.dealsLost)) * 100 : 0
          }))

          // Sort by deals won (primary), then total value (secondary)
          return leaderboard.sort((a: any, b: any) => b.dealsWon - a.dealsWon || b.totalValue - a.totalValue)
        })()
      }

      setPipelineData(enhancedData)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load pipeline data'
      setError(errorMessage)
      // Error handled by state management
    } finally {
      setIsLoading(false)
    }
  }, [
    context.accessToken,
    pipeline?.ref,
    pipeline?.id,
    pipeline?.name,
    pipeline?.description,
    pipeline?.color,
    dateRange.startDate,
    dateRange.endDate,
    selectedCurrency,
    fetchPipelineStages,
    fetchPipelineOpportunities,
    fetchSalesActivities,
    fetchWinRateData,
    fetchSalesRepPerformance
  ])

  const refetch = useCallback(() => {
    loadPipelineData()
  }, [loadPipelineData])

  useEffect(() => {
    loadPipelineData()
  }, [loadPipelineData])

  return {
    pipelineData,
    isLoading,
    error,
    refetch,
    availableCurrencies
  }
}
