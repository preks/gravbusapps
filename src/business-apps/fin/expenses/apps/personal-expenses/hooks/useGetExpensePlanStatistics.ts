import { useState, useCallback } from 'react'
import dayjs from 'dayjs'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getCatalogValue } from '@/common/utils/windowUtils'
import { GET_EXPENSE_PLAN_STATISTICS, GET_CLOSED_PLANS_STATISTICS } from '../queries/expensePlans'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export interface ExpensePlanStatisticsData {
  currentMonthTotal: number
  previousMonthTotal: number
  totalEstimated: number
  pendingApproval: number
  topDestination: string | any // Can be string or catalog entry object
  // Add closed plans data
  currentMonthClosedPlans: number
  previousMonthClosedPlans: number
}

export interface ExpensePlanStatisticsDataView {
  statistics: ExpensePlanStatisticsData
  isLoading: boolean
  error: string | null
  fetchStatistics: () => Promise<void>
}

export const useGetExpensePlanStatistics = (
  context?: BusinessAppContextProps,
  currencyRef: string = 'Currency:v1:EUR'
): ExpensePlanStatisticsDataView => {
  const accessToken = context?.accessToken
  const employeeId = context?.userInfo?.employeeDetails?.employeeId
  const graphqlClient = useGraphQLClient(accessToken)
  const [statistics, setStatistics] = useState<ExpensePlanStatisticsData>({
    currentMonthTotal: 0,
    previousMonthTotal: 0,
    totalEstimated: 0,
    pendingApproval: 0,
    topDestination: 'N/A',
    currentMonthClosedPlans: 0,
    previousMonthClosedPlans: 0
  })
  // Start as not loading; only show skeletons while an actual request is in flight.
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchStatistics = useCallback(async () => {
    if (!employeeId || !accessToken) {
      setError(new Error('Employee ID or Access Token not found.'))
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const now = dayjs()
      // Use timestamp format for planDate queries (no timezone)
      const currentMonthStart = now.startOf('month').format('YYYY-MM-DD HH:mm:ss')
      const currentMonthEnd = now.endOf('month').format('YYYY-MM-DD HH:mm:ss')
      const previousMonthStart = now.subtract(1, 'month').startOf('month').format('YYYY-MM-DD HH:mm:ss')
      const previousMonthEnd = now.subtract(1, 'month').endOf('month').format('YYYY-MM-DD HH:mm:ss')

      const fetchCount = async (startDate: string, endDate: string) => {
        const result = await graphqlClient.request<any>(GET_EXPENSE_PLAN_STATISTICS, {
          employeeId,
          startDate,
          endDate,
          currencyRef
        })
        const count = result?.ExpensePlanAggregate?.aggregate?.count ?? 0
        const totalEstimated = result?.TotalEstimated?.aggregate?.sum?.totalAmount ?? 0
        const pendingApproval = result?.PendingApproval?.aggregate?.count ?? 0
        const destinationPlans = result?.Destinations ?? []
        const allRegionObjects = destinationPlans.flatMap((plan: any) =>
          plan.expenseRequestTrip.map((trip: any) => trip.travelRegion).filter(Boolean)
        )

        let topDestination: string | any = 'N/A'
        if (allRegionObjects.length > 0) {
          // Count frequency using getCatalogValue for consistent translation handling
          const frequencyMap = allRegionObjects.reduce(
            (acc: Record<string, { count: number; catalog: any }>, catalog: any) => {
              const translatedValue = getCatalogValue(catalog)
              if (!acc[translatedValue]) {
                acc[translatedValue] = { count: 0, catalog }
              }
              acc[translatedValue].count += 1
              return acc
            },
            {}
          )

          // Find the most frequent value
          const frequencyEntries = Object.values(frequencyMap) as Array<{ count: number; catalog: any }>
          const mostFrequent = frequencyEntries.reduce((a, b) => (a.count > b.count ? a : b))

          // Return the catalog object for proper translation display
          topDestination = mostFrequent?.catalog || 'N/A'
        }

        return { count, totalEstimated, pendingApproval, topDestination }
      }

      const fetchClosedPlansCount = async (startDate: string, endDate: string) => {
        const result = await graphqlClient.request<any>(GET_CLOSED_PLANS_STATISTICS, {
          employeeId,
          startDate,
          endDate
        })
        return result?.ClosedPlans?.aggregate?.count ?? 0
      }

      // Fetch all statistics in parallel
      const [currentMonthData, previousMonthData, currentMonthClosedPlans, previousMonthClosedPlans] =
        await Promise.all([
          fetchCount(currentMonthStart, currentMonthEnd),
          fetchCount(previousMonthStart, previousMonthEnd),
          fetchClosedPlansCount(currentMonthStart, currentMonthEnd),
          fetchClosedPlansCount(previousMonthStart, previousMonthEnd)
        ])

      setStatistics({
        currentMonthTotal: currentMonthData.count,
        previousMonthTotal: previousMonthData.count,
        totalEstimated: currentMonthData.totalEstimated,
        pendingApproval: currentMonthData.pendingApproval,
        topDestination: currentMonthData.topDestination,
        currentMonthClosedPlans,
        previousMonthClosedPlans
      })
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
      setStatistics({
        currentMonthTotal: 0,
        previousMonthTotal: 0,
        totalEstimated: 0,
        pendingApproval: 0,
        topDestination: 'N/A',
        currentMonthClosedPlans: 0,
        previousMonthClosedPlans: 0
      })
    } finally {
      setIsLoading(false)
    }
  }, [employeeId, accessToken, currencyRef])

  return { statistics, isLoading, error: error?.message ?? null, fetchStatistics }
}
