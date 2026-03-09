import { useState, useCallback, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import {
  GET_ADVANCE_PAYMENTS,
  GET_ADVANCE_PAYMENT_STATUSES,
  GET_ADVANCE_PAYMENT_REPORTERS
} from '../queries/advancePayment.queries'
import { AdvancePaymentItem, AdvancePaymentStatisticsData } from '../types'
import {
  buildNumericRangeCondition,
  buildSearchCondition as buildSearchConditionBase,
  buildStatusFilterCondition
} from './queryFilterUtils'

import { enforceQueryLimit, extractUniqueStatuses } from '../utils/sharedUtils'
import { buildEmployeeDisplayName } from './backofficeReportUtils'

// Type definition for GraphQL orderBy clause
type OrderDirection = 'ASC' | 'DESC'
type OrderByValue = OrderDirection | { [field: string]: OrderByValue }
type OrderByEntry = { [field: string]: OrderByValue }
type OrderByClause = OrderByEntry[]

interface FetchPaymentsOptions {
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
  departmentId?: string
  dateFrom?: string
  dateTo?: string
}

interface AdvancePaymentsResult {
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

interface UseAdvancePaymentsProps extends BusinessAppContextProps {
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

  // Helper: Build search condition (reduces cognitive complexity)
  const buildSearchCondition = (searchTerm: string): any[] => {
    return buildSearchConditionBase(searchTerm, searchValue => [
      { code: { _ilike: searchValue } },
      { description: { _ilike: searchValue } },
      { expensePlan: { code: { _ilike: searchValue } } },
      { expensePlan: { title: { _ilike: searchValue } } },
      { expensePlan: { employee: { firstName: { _ilike: searchValue } } } },
      { expensePlan: { employee: { lastName: { _ilike: searchValue } } } },
      { expensePlan: { employee: { employeePosition: { organizationalUnit: { name: { _ilike: searchValue } } } } } },
      { expensePlan: { employee: { employeePosition: { costCenter: { name: { _ilike: searchValue } } } } } },
      { paymentMethod: { _ilike: searchValue } }
    ])
  }

  // Helper: Build amount filter condition (reduces cognitive complexity)
  const buildAmountFilterCondition = (amountMin?: string, amountMax?: string): any[] => {
    return buildNumericRangeCondition(amountMin, amountMax, amountConditions => ({
      expensePlan: {
        totalAmount: amountConditions
      }
    }))
  }

  const buildAdvanceFilterCondition = (advanceMin?: string, advanceMax?: string): any[] => {
    return buildNumericRangeCondition(advanceMin, advanceMax, range => ({ amount: range }))
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
            { expensePlan: { employee: { lastName: { _ilike: partValue } } } }
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
    currencyRef?: string,
    departmentId?: string,
    dateFrom?: string,
    dateTo?: string
  ) => {
    const offset = (page - 1) * pageSize

    const hasExplicitStatusFilter = status && status !== 'all' && status !== ''
    const defaultStatusExclusion = hasExplicitStatusFilter
      ? [{ status: { _nin: ['CREATED', 'DISCARDED'] } }]
      : [{ status: { _nin: ['CREATED', 'RETURNED', 'REJECTED', 'DISCARDED'] } }]

    const conditions: any[] = [
      { isDeleted: { _eq: false } },
      ...defaultStatusExclusion,
      ...buildStatusFilterCondition(status),
      ...buildSearchCondition(searchTerm),
      ...buildAmountFilterCondition(amountMin, amountMax),
      ...buildAdvanceFilterCondition(advanceMin, advanceMax),
      ...buildReporterFilterCondition(reporter)
    ]

    if (currencyRef && currencyRef.trim() !== '') {
      conditions.push({
        expensePlan: {
          currencyRef: { _eq: currencyRef }
        }
      })
    }

    if (departmentId && departmentId.trim() !== '') {
      conditions.push({
        expensePlan: {
          employee: {
            employeePosition: {
              organizationalUnitId: { _eq: departmentId }
            }
          }
        }
      })
    }

    if (dateFrom || dateTo) {
      const dateConditions: any = {}
      if (dateFrom) dateConditions._gte = dateFrom
      if (dateTo) dateConditions._lte = dateTo
      conditions.push({
        expensePlan: { startDate: dateConditions }
      })
    }

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
      employeeDisplayName: buildEmployeeDisplayName(payment.expensePlan?.employee) || 'N/A',
      employeeFullName: buildEmployeeDisplayName(payment.expensePlan?.employee) || 'N/A',
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
        currencyRef,
        departmentId,
        dateFrom,
        dateTo
      } = options
      if (!accessToken) {
        setError(new Error('Access token not found.'))
        setIsLoading(false)
        return
      }

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
        currencyRef,
        departmentId,
        dateFrom,
        dateTo
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
          currencyRef,
          departmentId,
          dateFrom,
          dateTo
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
            const name = buildEmployeeDisplayName(payment.expensePlan.employee)
            if (name) reporters.add(name)
          }
        })

        return Array.from(reporters).sort()
      } catch {
        return []
      }
    },
    [client, accessToken]
  )

  const searchStatuses = useCallback(async (): Promise<string[]> => {
    if (!accessToken) throw new Error('Access token not found.')
    try {
      const data = await client.request(GET_ADVANCE_PAYMENT_STATUSES, {})
      return extractUniqueStatuses(data?.AdvancePayment || [])
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
