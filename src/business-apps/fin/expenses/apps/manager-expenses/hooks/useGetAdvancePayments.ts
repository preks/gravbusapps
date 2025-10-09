import { useState, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { GET_ADVANCE_PAYMENTS_REPORT_BY_MANAGER, GET_ADVANCE_PAYMENT_STATISTICS } from '../queries/advancePayments'
import { env } from '@/common/env/EnvUtils'

// Define types for the hook
export interface AdvancePaymentItem {
  id: string
  code?: string
  description?: string
  status: string
  title?: string // From expensePlan.title
  employeeDisplayName?: string // From expensePlan.employee.displayName
  employeeFullName?: string // From expensePlan.employee.fullName
  employeePictureThumbnail?: string // From expensePlan.employee.pictureThumbnail
  startDate?: string // From expensePlan.startDate
  endDate?: string // From expensePlan.endDate
  amount?: number // From AdvancePayment.amount
  // Add other relevant fields from the query if needed for the UI
}

// New type for statistics data
export interface AdvancePaymentStatisticsData {
  totalAmount: number | null
}

export interface AdvancePaymentsResult {
  payments: AdvancePaymentItem[]
  isLoading: boolean
  error: string | null
  totalCount: number
  fetchPayments: (searchTerm?: string, page?: number, pageSize?: number, status?: string) => Promise<void>
  advancePaymentStats: AdvancePaymentStatisticsData | null
  statsLoading: boolean
  statsError: string | null
  fetchAdvancePaymentStatistics: () => Promise<void>
}

/**
 * Hook to fetch advance payments for team members managed by the current user.
 * Supports pagination, search, and status filtering.
 * @param context Business app context containing user info and access token
 * @returns Object containing advance payments, loading state, error, total count, and fetch function
 */
export const useGetAdvancePayments = (context?: BusinessAppContextProps): AdvancePaymentsResult => {
  const [payments, setPayments] = useState<AdvancePaymentItem[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState<number>(0)

  // State for statistics
  const [advancePaymentStats, setAdvancePaymentStats] = useState<AdvancePaymentStatisticsData | null>(null)
  const [statsLoading, setStatsLoading] = useState<boolean>(false)
  const [statsError, setStatsError] = useState<string | null>(null)

  // --- Helpers to reduce cognitive complexity ---
  const getManagerIdFromContext = (): string | undefined =>
    context?.userInfo?.employeeDetails?.employeeId ?? context?.userInfo?.id

  const requestGraphQL = async (accessToken: string, query: string, variables: Record<string, any>) => {
    const response = await fetch(env('NEXT_PUBLIC_GRAPHQL_ENDPOINT_NEWWORK')!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({ query, variables })
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`)
    }

    const result = await response.json()
    if (result.errors?.length) {
      throw new Error(result.errors.map((e: any) => e.message).join(', '))
    }
    if (!result.data) {
      throw new Error('No data returned from query.')
    }
    return result.data
  }

  const buildQueryVariables = (
    managerId: string,
    searchTerm: string,
    page: number,
    pageSize: number,
    status?: string
  ) => {
    const formattedSearchTerm = searchTerm === '' ? undefined : `%${searchTerm}%`
    const offset = (page - 1) * pageSize

    const variables: Record<string, any> = {
      managerId,
      limit: pageSize,
      offset: offset
    }

    if (formattedSearchTerm) {
      variables.searchTerm = formattedSearchTerm
    }

    if (status && status !== 'all') {
      variables.status = status
    }
    return variables
  }

  const mapResponseToPayments = (data: any): AdvancePaymentItem[] => {
    const fetchedPayments = data?.AdvancePayment ?? []
    return fetchedPayments.map((payment: any) => ({
      id: payment.id,
      code: payment.code,
      description: payment.description,
      status: payment.status ?? 'PENDING',
      title: payment.expensePlan?.title,
      employeeDisplayName: payment.expensePlan?.employee?.displayName,
      employeeFullName: payment.expensePlan?.employee?.fullName,
      employeePictureThumbnail: payment.expensePlan?.employee?.pictureThumbnail,
      amount: payment.amount,
      startDate: payment.expensePlan?.startDate,
      endDate: payment.expensePlan?.endDate
    }))
  }

  const fetchPayments = useCallback(
    async (searchTerm: string = '', page: number = 1, pageSize: number = 10, status?: string) => {
      const managerId = getManagerIdFromContext()
      const accessToken = context?.accessToken || ''

      if (managerId && accessToken) {
        setIsLoading(true)
        setError(null)

        try {
          const variables = buildQueryVariables(managerId, searchTerm, page, pageSize, status)
          const data = await requestGraphQL(accessToken, GET_ADVANCE_PAYMENTS_REPORT_BY_MANAGER, variables)
          const mappedPayments = mapResponseToPayments(data)
          setPayments(mappedPayments)
          setTotalCount(data.AdvancePaymentAggregate?.aggregate?.count ?? 0)
        } catch (err: any) {
          setError(err.message ?? 'Failed to fetch advance payments.')
          setPayments([])
          setTotalCount(0)
        } finally {
          setIsLoading(false)
        }
      } else {
        const missingCredsMessage = managerId
          ? 'Access token not found. Cannot fetch advance payments.'
          : 'Manager ID not found. Cannot fetch advance payments.'
        setError(missingCredsMessage)
        setPayments([])
        setTotalCount(0)
        setIsLoading(false)
      }
    },
    [context]
  )

  const fetchAdvancePaymentStatistics = useCallback(async () => {
    const managerId = getManagerIdFromContext()
    const accessToken = context?.accessToken || ''

    if (managerId && accessToken) {
      setStatsLoading(true)
      setStatsError(null)

      try {
        const variables = { employeeId: managerId }
        const data = await requestGraphQL(accessToken, GET_ADVANCE_PAYMENT_STATISTICS, variables)

        const sumNode = data?.advancePaymentStats?.aggregate?.sum
        if (!sumNode || typeof sumNode.amount !== 'number') {
          setAdvancePaymentStats({ totalAmount: null })
        } else {
          setAdvancePaymentStats({ totalAmount: sumNode.amount })
        }
      } catch (err: any) {
        setStatsError(err.message ?? 'Failed to fetch advance payment statistics.')
        setAdvancePaymentStats(null)
      } finally {
        setStatsLoading(false)
      }
    } else {
      const missingCredsMessage = managerId
        ? 'Access token not found. Cannot fetch advance payment statistics.'
        : 'Manager ID not found. Cannot fetch advance payment statistics.'
      setStatsError(missingCredsMessage)
      setAdvancePaymentStats(null)
      setStatsLoading(false)
    }
  }, [context])

  return {
    payments,
    isLoading,
    error,
    totalCount,
    fetchPayments,
    advancePaymentStats,
    statsLoading,
    statsError,
    fetchAdvancePaymentStatistics
  }
}
