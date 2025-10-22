import { useState, useCallback } from 'react'
import dayjs from 'dayjs'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { GET_EXPENSE_PLAN_STATISTICS, GET_CLOSED_PLANS_STATISTICS } from '../queries/expensePlans'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export interface ExpensePlanStatisticsData {
  currentMonthTotal: number
  previousMonthTotal: number
  totalEstimated: number
  pendingApproval: number
  topDestination: string
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
  const [isLoading, setIsLoading] = useState<boolean>(true)
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
        const activeUserLocale = getCurrentActiveUserLocale()
        const result = await graphqlClient.request<any>(GET_EXPENSE_PLAN_STATISTICS, {
          employeeId,
          startDate,
          endDate,
          activeUserLocale,
          currencyRef
        })
        const count = result?.ExpensePlanAggregate?.aggregate?.count ?? 0
        const totalEstimated = result?.TotalEstimated?.aggregate?.sum?.totalAmount ?? 0
        const pendingApproval = result?.PendingApproval?.aggregate?.count ?? 0
        const destinationPlans = result?.Destinations ?? []
        const allRegions = destinationPlans
          .flatMap((plan: any) =>
            plan.expenseRequestTrip.map((trip: any) => {
              const translation = trip.travelRegion?.translations[0]?.value
              return translation || trip.travelRegion?.value
            })
          )
          .filter(Boolean)

        let topDestination = 'N/A'
        if (allRegions.length > 0) {
          const frequencyMap = allRegions.reduce((acc: Record<string, number>, region: string) => {
            acc[region] = (acc[region] || 0) + 1
            return acc
          }, {})
          topDestination = Object.keys(frequencyMap).reduce((a, b) => (frequencyMap[a] > frequencyMap[b] ? a : b))
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
