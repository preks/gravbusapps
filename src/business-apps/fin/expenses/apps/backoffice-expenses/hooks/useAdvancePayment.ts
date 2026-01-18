import { useState, useCallback, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import {
  GET_ADVANCE_PAYMENTS,
  GET_ADVANCE_PAYMENT_STATUSES,
  GET_ADVANCE_PAYMENT_REPORTERS
} from '../queries/advancePayment.queries'
import { AdvancePaymentItem, AdvancePaymentStatisticsData } from '../types'

// ⚡ BEST PRACTICE: Query limit enforcement for safety (like leads)
const MAX_QUERY_LIMIT = 1000
const enforceQueryLimit = (limit: number): number => {
  return Math.min(limit, MAX_QUERY_LIMIT)
}

// Type definition for GraphQL orderBy clause
type OrderDirection = 'ASC' | 'DESC'
type OrderByValue = OrderDirection | { [field: string]: OrderByValue }
type OrderByEntry = { [field: string]: OrderByValue }
type OrderByClause = OrderByEntry[]

export interface FetchPaymentsOptions {
  searchTerm?: string
  page?: number
  pageSize?: number
  status?: string
  amountMin?: string
  amountMax?: string
  advanceMin?: string
  advanceMax?: string
  reporter?: string
  currencyRef?: string
}

export interface AdvancePaymentsResult {
  payments: AdvancePaymentItem[]
  isLoading: boolean
  error: any
  totalCount: number
  fetchPayments: (options?: FetchPaymentsOptions) => Promise<void>
  advancePaymentStats: AdvancePaymentStatisticsData | null
  /** @deprecated Statistics are now automatically fetched with fetchPayments(). This function is a no-op. */
  fetchAdvancePaymentStatistics: () => Promise<void>
  searchReporters: (searchTerm: string) => Promise<string[]>
  searchStatuses: () => Promise<string[]>
  setOrderBy: (orderBy: OrderByClause) => void
}

export interface UseAdvancePaymentsProps extends BusinessAppContextProps {
  isActive?: boolean // ⚡ PERFORMANCE: Only initialize loading state when tab is active
}

export const useAdvancePayments = (props?: UseAdvancePaymentsProps): AdvancePaymentsResult => {
  const { isActive = true, accessToken = '' } = props || {}

  const [payments, setPayments] = useState<AdvancePaymentItem[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(isActive) // Only set loading if tab is active
  const [error, setError] = useState<any>(null)
  const [totalCount, setTotalCount] = useState<number>(0)

  const [advancePaymentStats, setAdvancePaymentStats] = useState<AdvancePaymentStatisticsData | null>(null)

  // Request deduplication - prevent duplicate queries
  const lastRequestKey = useRef<string>('')
  const isLoadingRef = useRef<boolean>(false)

  // CRITICAL: Do NOT pass empty string - it sets empty token on singleton client!
  const client = useGraphqlClient(accessToken)
  const [orderBy, setOrderBy] = useState<OrderByClause>([{ createdAt: 'DESC' }])

  // Helper: Build status filter condition (reduces cognitive complexity)
  const buildStatusCondition = (status?: string): any[] => {
    if (!status || status === 'all' || status === '') return []

    if (status.includes(',')) {
      const statusArray = status
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
      return statusArray.length > 0 ? [{ status: { _in: statusArray } }] : []
    }

    return [{ status: { _eq: status } }]
  }

  // Helper: Build search condition (reduces cognitive complexity)
  const buildSearchCondition = (searchTerm: string): any[] => {
    if (!searchTerm || searchTerm.trim() === '') return []

    const searchValue = `%${searchTerm.trim()}%`
    return [
      {
        _or: [
          { code: { _ilike: searchValue } },
          { description: { _ilike: searchValue } },
          { expensePlan: { code: { _ilike: searchValue } } },
          { expensePlan: { title: { _ilike: searchValue } } },
          { expensePlan: { employee: { firstName: { _ilike: searchValue } } } },
          { expensePlan: { employee: { lastName: { _ilike: searchValue } } } }
        ]
      }
    ]
  }

  // Helper: Build amount filter condition (reduces cognitive complexity)
  const buildAmountFilterCondition = (amountMin?: string, amountMax?: string): any[] => {
    if (!amountMin && !amountMax) return []

    const amountConditions: any = {}
    if (amountMin) amountConditions._gte = Number.parseFloat(amountMin)
    if (amountMax) amountConditions._lte = Number.parseFloat(amountMax)

    if (Object.keys(amountConditions).length === 0) return []

    return [
      {
        expensePlan: {
          totalAmount: amountConditions
        }
      }
    ]
  }

  // Helper: Build advance filter condition (reduces cognitive complexity)
  const buildAdvanceFilterCondition = (advanceMin?: string, advanceMax?: string): any[] => {
    if (!advanceMin && !advanceMax) return []

    const advanceConditions: any = {}
    if (advanceMin) advanceConditions._gte = Number.parseFloat(advanceMin)
    if (advanceMax) advanceConditions._lte = Number.parseFloat(advanceMax)

    if (Object.keys(advanceConditions).length === 0) return []

    return [{ amount: advanceConditions }]
  }

  // Helper: Build reporter filter condition (reduces cognitive complexity)
  const buildReporterFilterCondition = (reporter?: string): any[] => {
    if (!reporter || reporter.trim() === '') return []

    const reporterNames = reporter
      .split(',')
      .map(name => name.trim())
      .filter(Boolean)
    if (reporterNames.length === 0) return []

    const reporterConditions = reporterNames.map(reporterName => {
      const nameParts = reporterName.split(' ').filter(part => part.length > 0)
      const namePartConditions = nameParts.map(part => {
        const partValue = `%${part.trim()}%`
        return {
          _or: [
            { expensePlan: { employee: { firstName: { _ilike: partValue } } } },
            { expensePlan: { employee: { lastName: { _ilike: partValue } } } },
            { expensePlan: { employee: { displayName: { _ilike: partValue } } } }
          ]
        }
      })

      return { _and: namePartConditions }
    })

    return [{ _or: reporterConditions }]
  }

  // ⚡ OPTIMIZED: Build proper where clause for better performance
  const buildQueryVariables = (
    searchTerm: string,
    page: number,
    pageSize: number,
    status?: string,
    amountMin?: string,
    amountMax?: string,
    advanceMin?: string,
    advanceMax?: string,
    reporter?: string,
    currencyRef?: string
  ) => {
    const offset = (page - 1) * pageSize

    // Build conditions array using extracted helpers
    const conditions: any[] = [
      { isDeleted: { _eq: false } },
      { status: { _nin: ['CREATED', 'RETURNED', 'REJECTED', 'DISCARDED'] } },
      ...buildStatusCondition(status),
      ...buildSearchCondition(searchTerm),
      ...buildAmountFilterCondition(amountMin, amountMax),
      ...buildAdvanceFilterCondition(advanceMin, advanceMax),
      ...buildReporterFilterCondition(reporter)
    ]

    // Add currency filter if provided
    if (currencyRef && currencyRef.trim() !== '') {
      conditions.push({
        expensePlan: {
          currencyRef: { _eq: currencyRef }
        }
      })
    }

    // Build the where clause
    const whereClause = conditions.length > 0 ? { _and: conditions } : {}

    return {
      where: whereClause,
      limit: enforceQueryLimit(pageSize),
      offset: offset,
      orderBy: orderBy && orderBy.length > 0 ? orderBy : [{ createdAt: 'DESC' }]
    }
  }

  const mapResponseToPayments = (data: any): AdvancePaymentItem[] => {
    const fetchedPayments = data?.AdvancePayment ?? []
    return fetchedPayments.map((payment: any) => ({
      id: payment.id,
      code: payment.expensePlan?.code || payment.code, // Use expense plan code first, fallback to payment code
      description: payment.description,
      status: payment.status ?? 'PENDING',
      title: payment.expensePlan?.title,
      employeeDisplayName: payment.expensePlan?.employee
        ? `${payment.expensePlan.employee.firstName || ''} ${payment.expensePlan.employee.lastName || ''}`.trim()
        : 'N/A',
      employeeFullName:
        payment.expensePlan?.employee?.fullName ||
        (payment.expensePlan?.employee
          ? `${payment.expensePlan.employee.firstName || ''} ${payment.expensePlan.employee.lastName || ''}`.trim()
          : 'N/A'),
      amount: payment.amount,
      startDate: payment.expensePlan?.startDate,
      paymentMethod: payment.paymentMethod,
      currency: payment.currency,
      costCenter: payment.costCenter,
      expensePlan: {
        ...payment.expensePlan,
        // Ensure all fields are properly mapped
        id: payment.expensePlan?.id,
        code: payment.expensePlan?.code,
        title: payment.expensePlan?.title,
        startDate: payment.expensePlan?.startDate,
        endDate: payment.expensePlan?.endDate,
        planDate: payment.expensePlan?.planDate,
        decisionDate: payment.expensePlan?.decisionDate,
        description: payment.expensePlan?.description,
        totalAmount: payment.expensePlan?.totalAmount,
        advancePaymentPaidAmount: payment.expensePlan?.advancePaymentPaidAmount,
        status: payment.expensePlan?.status,
        requestType: payment.expensePlan?.requestType,
        additionalProperties: payment.expensePlan?.additionalProperties,
        employee: payment.expensePlan?.employee,
        costCenter: payment.expensePlan?.costCenter,
        project: payment.expensePlan?.project,
        currency: payment.expensePlan?.currency,
        expenseRequest: payment.expensePlan?.expenseRequest
      }
    }))
  }

  const fetchPayments = useCallback(
    async (options: FetchPaymentsOptions = {}) => {
      const {
        searchTerm = '',
        page = 1,
        pageSize = 10,
        status,
        amountMin,
        amountMax,
        advanceMin,
        advanceMax,
        reporter,
        currencyRef
      } = options
      if (!accessToken) {
        setError(new Error('Access token not found.'))
        setIsLoading(false)
        return
      }

      // Build request key from all parameters
      const requestKey = JSON.stringify({
        searchTerm,
        page,
        pageSize,
        status,
        amountMin,
        amountMax,
        advanceMin,
        advanceMax,
        reporter,
        orderBy,
        currencyRef
      })

      // ⚡ DEDUPLICATION: Only block identical requests, not all requests while loading
      // This allows different filter/search/page changes to proceed even if a request is in flight
      if (isLoadingRef.current && requestKey === lastRequestKey.current) {
        // Same request is already loading - skip duplicate
        return
      }

      lastRequestKey.current = requestKey
      isLoadingRef.current = true

      setIsLoading(true)
      setError(null)

      try {
        const variables = buildQueryVariables(
          searchTerm,
          page,
          pageSize,
          status,
          amountMin,
          amountMax,
          advanceMin,
          advanceMax,
          reporter,
          currencyRef
        )

        const data = await client.request(GET_ADVANCE_PAYMENTS, variables)

        const mappedPayments = mapResponseToPayments(data)
        setPayments(mappedPayments)
        setTotalCount(data.AdvancePaymentAggregate?.aggregate?.count ?? 0)

        // ⚡ OPTIMIZATION: Extract statistics from the same response (no separate query needed)
        if (data?.advancePaymentStats?.aggregate?.sum) {
          setAdvancePaymentStats({
            totalAmount: data.advancePaymentStats.aggregate.sum.amount
          })
        } else {
          setAdvancePaymentStats({ totalAmount: null })
        }
      } catch (err: any) {
        setError(err)
        setPayments([])
        setTotalCount(0)
      } finally {
        setIsLoading(false)
        isLoadingRef.current = false // Reset loading ref
      }
    },
    [client, accessToken, orderBy]
  )

  // ⚡ OPTIMIZATION: Statistics are now fetched with the main query (fetchPayments)
  // This function is kept for backward compatibility but does nothing
  /**
   * @deprecated Statistics are now automatically fetched with fetchPayments(). This function is a no-op.
   * To refresh statistics, call fetchPayments() instead.
   */
  const fetchAdvancePaymentStatistics = useCallback(async () => {
    // Statistics are automatically fetched in fetchPayments() - no action needed
  }, [])

  // ⚡ OPTIMIZED: Use lightweight query that only fetches employee names
  const searchReporters = useCallback(
    async (searchTerm: string): Promise<string[]> => {
      if (!accessToken) {
        throw new Error('Access token not found.')
      }

      if (!searchTerm.trim()) {
        return []
      }

      try {
        const searchValue = `%${searchTerm.trim()}%`
        const data = await client.request(GET_ADVANCE_PAYMENT_REPORTERS, { searchTerm: searchValue })

        // Extract unique reporter names from the results
        const reporters = new Set<string>()
        data?.AdvancePayment?.forEach((payment: any) => {
          if (payment.expensePlan?.employee) {
            const firstName = payment.expensePlan.employee.firstName || ''
            const lastName = payment.expensePlan.employee.lastName || ''
            const displayName = payment.expensePlan.employee.displayName || ''

            const fullName = `${firstName} ${lastName}`.trim()
            if (fullName) {
              reporters.add(fullName)
            }
            if (displayName) {
              reporters.add(displayName)
            }
          }
        })

        return Array.from(reporters).sort()
      } catch {
        return []
      }
    },
    [client, accessToken]
  )

  // ⚡ OPTIMIZED: Use lightweight query with distinct_on to get unique statuses
  const searchStatuses = useCallback(async (): Promise<string[]> => {
    if (!accessToken) {
      throw new Error('Access token not found.')
    }

    try {
      const data = await client.request(GET_ADVANCE_PAYMENT_STATUSES, {})

      // Extract unique statuses from the results
      const statuses = new Set<string>()
      data?.AdvancePayment?.forEach((payment: any) => {
        if (payment.status) {
          statuses.add(payment.status)
        }
      })

      // Filter out CREATED (draft) status from the filter options
      return Array.from(statuses)
        .filter(status => status !== 'CREATED')
        .sort((a, b) => a.localeCompare(b))
    } catch {
      return []
    }
  }, [client, accessToken])

  return {
    payments,
    isLoading,
    error,
    totalCount,
    fetchPayments,
    advancePaymentStats,
    fetchAdvancePaymentStatistics,
    searchReporters,
    searchStatuses,
    setOrderBy
  }
}
