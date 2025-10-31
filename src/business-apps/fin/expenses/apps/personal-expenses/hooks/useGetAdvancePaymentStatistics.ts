import { useState, useCallback, useEffect, useRef } from 'react'
import dayjs from 'dayjs'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { GET_ADVANCE_PAYMENT_STATISTICS_CONSOLIDATED } from '../queries/advancePayments'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export interface AdvancePaymentStatisticsData {
  currentMonthPayments: number
  previousMonthPayments: number
  currentMonthAmount: number
  previousMonthAmount: number
  pendingPayments: number
  approvedPayments: number
}

export interface AdvancePaymentStatisticsDataView {
  statistics: AdvancePaymentStatisticsData
  isLoading: boolean
  error: string | null
  fetchStatistics: () => Promise<void>
}

export const useGetAdvancePaymentStatistics = (
  context?: BusinessAppContextProps,
  currencyRef: string = 'Currency:v1:EUR'
): AdvancePaymentStatisticsDataView => {
  const accessToken = context?.accessToken
  const employeeId = context?.userInfo?.employeeDetails?.employeeId
  const graphqlClient = useGraphQLClient(accessToken || '')
  const [statistics, setStatistics] = useState<AdvancePaymentStatisticsData>({
    currentMonthPayments: 0,
    previousMonthPayments: 0,
    currentMonthAmount: 0,
    previousMonthAmount: 0,
    pendingPayments: 0,
    approvedPayments: 0
  })
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const lastSignatureRef = useRef<string>('')

  const fetchStatistics = useCallback(async () => {
    if (!employeeId || !accessToken) {
      setError('Employee ID or Access Token not found.')
      setIsLoading(false)
      return
    }

    const now = dayjs()
    const currentMonthStart = now.startOf('month').toISOString()
    const currentMonthEnd = now.endOf('month').toISOString()
    const previousMonthStart = now.subtract(1, 'month').startOf('month').toISOString()
    const previousMonthEnd = now.subtract(1, 'month').endOf('month').toISOString()

    // Skip duplicate identical requests
    const signature = JSON.stringify({
      employeeId,
      currencyRef,
      currentMonthStart,
      currentMonthEnd,
      previousMonthStart,
      previousMonthEnd
    })
    if (signature === lastSignatureRef.current) {
      return
    }
    lastSignatureRef.current = signature

    setIsLoading(true)
    setError(null)

    try {
      const data = await graphqlClient.request<any>(GET_ADVANCE_PAYMENT_STATISTICS_CONSOLIDATED, {
        employeeId,
        currentStart: currentMonthStart,
        currentEnd: currentMonthEnd,
        previousStart: previousMonthStart,
        previousEnd: previousMonthEnd,
        currencyRef
      })

      const currentCount = data?.Current?.aggregate?.count ?? 0
      const currentAmount = data?.Current?.aggregate?.sum?.amount ?? 0
      const previousCount = data?.Previous?.aggregate?.count ?? 0
      const previousAmount = data?.Previous?.aggregate?.sum?.amount ?? 0
      const pendingCount = data?.PendingAdvancePayments?.aggregate?.count ?? 0
      const approvedCount = data?.ApprovedAdvancePayments?.aggregate?.count ?? 0

      setStatistics({
        currentMonthPayments: currentCount,
        previousMonthPayments: previousCount,
        currentMonthAmount: currentAmount,
        previousMonthAmount: previousAmount,
        pendingPayments: pendingCount,
        approvedPayments: approvedCount
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setStatistics({
        currentMonthPayments: 0,
        previousMonthPayments: 0,
        currentMonthAmount: 0,
        previousMonthAmount: 0,
        pendingPayments: 0,
        approvedPayments: 0
      })
    } finally {
      setIsLoading(false)
    }
  }, [employeeId, accessToken, currencyRef, graphqlClient])

  // Automatically fetch statistics when the hook is initialized or currency changes
  useEffect(() => {
    if (employeeId && accessToken) {
      fetchStatistics()
    }
  }, [employeeId, accessToken, currencyRef, fetchStatistics])

  // Add a timeout to prevent infinite loading
  useEffect(() => {
    if (isLoading) {
      const timeout = setTimeout(() => {
        setIsLoading(false)
      }, 10000) // 10 second timeout

      return () => clearTimeout(timeout)
    }
  }, [isLoading])

  return { statistics, isLoading, error, fetchStatistics }
}
