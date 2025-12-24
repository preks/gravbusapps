import { useCallback, useState, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import {
  buildAdvancePaymentsQuery,
  validateFilters,
  AdvancePaymentFilters
} from '../../personal-expenses/utils/advancePaymentsQueryBuilder'

export interface AdvancePayment {
  id: string
  code: string
  description: string | null
  amount: number
  currencyRef: string
  currency: {
    code: string
  }
  costCenter: {
    name: string
  }
  status: string
  paymentMethod: string
  expensePlan: {
    id: string
    code: string
    reimbursableAmount: number
    startDate: string | null
    endDate: string | null
    planDate: string | null
    decisionDate: string | null
    status: string
    title: string
    totalAmount: number
    requestTypeRef: any
    createdAt: string
    employeeDocumentId: string | null
    advancePaymentPaidAmount: number
    advancePaymentInTransitAmount: number
    currencyRef: any
    description: string
    currency: {
      type: string
      translations: Array<{
        localeCode: string
        value: string
      }>
      catalog: {
        defaultLocale: string
      }
      value: string
      id: string
      code: string
    }
    requestType: {
      value: string
      translations: Array<{
        localeCode: string
        value: string
      }>
      catalog: {
        defaultLocale: string
      }
    }
    expensePlanItem: Array<{
      title: string
      status: string
      totalAmount: number
      expenseDate: string
    }>
    advancePayment: Array<{
      id: string
      amount: number
      status: string
      currency: {
        code: string
        translations: Array<{
          localeCode: string
          value: string
        }>
        catalog: {
          defaultLocale: string
        }
      }
    }>
    expenseRequestTrip: Array<{
      tripDateTime: string
    }>
    expenseRequest?: Array<{
      id: string
      code: string
      title: string
      description: string
      startDate: string | null
      endDate: string | null
      requestDate: string | null
      decisionDate: string | null
      totalAmount: number
      currencyRef: string
      status: string
      reimbursableAmount: number
      nonReimbursableAmount: number
      additionalProperties: any
      currency: {
        value: string
        translations: Array<{
          localeCode: string
          value: string
        }>
        catalog: {
          defaultLocale: string
        }
      }
      requestType: {
        value: string
        translations: Array<{
          localeCode: string
          value: string
        }>
        catalog: {
          defaultLocale: string
        }
      }
      costCenter: {
        name: string
      }
      project: {
        name: string
      }
      employee: {
        fullName: string
        employeePosition: {
          supervisor: {
            fullName: string
          }
        }
      }
    }>
    employee: {
      id: string
      code: string
      firstName: string
      lastName: string
      employeePosition: {
        siteLocation: {
          name: string
        }
        organizationalUnit: {
          name: string
        }
        firstName: string
        lastName: string
      }
    }
  } | null
  expensePlanId: string
}

export interface AdvancePaymentsDataView {
  items: AdvancePayment[]
  isLoading: boolean
  error: string | null
  totalCount: number
  fetchItems: (
    searchTerm?: string,
    page?: number,
    pageSize?: number,
    statusFilter?: string[],
    amountRange?: { min?: number; max?: number } | null,
    advanceRange?: { min?: number; max?: number } | null,
    sortField?: string | null,
    sortOrder?: 'ascend' | 'descend' | null,
    currencyRef?: string | null,
    options?: { force?: boolean }
  ) => Promise<void>
  invalidateCache?: () => void
}

export const useGetAdvancePayments = (context?: BusinessAppContextProps): AdvancePaymentsDataView => {
  const [items, setItems] = useState<AdvancePayment[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const graphqlClient = useGraphQLClient(context?.accessToken || '')
  // Prevent duplicate in-flight calls with the exact same parameters (e.g., StrictMode)
  const lastCallSignatureRef = useRef<string>('')
  const abortControllerRef = useRef<AbortController | null>(null) // For request cancellation
  // Page cache: stores results by cache key (search, filters, page, pageSize, sortField, sortOrder, currencyRef)
  const pageCacheRef = useRef<Map<string, { items: AdvancePayment[]; totalCount: number }>>(new Map())
  const inflightRef = useRef<Map<string, Promise<any>>>(new Map()) // Track in-flight requests

  // Helper to normalize objects for stable cache keys
  const normalize = useCallback((val: any): any => {
    if (Array.isArray(val)) {
      return val.map(normalize)
    }
    if (val && typeof val === 'object') {
      const sorted: any = {}
      Object.keys(val)
        .sort()
        .forEach(k => {
          sorted[k] = normalize(val[k])
        })
      return sorted
    }
    return val
  }, [])

  // Generate cache key for a specific page (includes all parameters that affect the query)
  // Cache key includes all filters, so different filters = different key = automatic cache miss
  // No need for explicit cache invalidation - cache key mismatch handles it naturally
  const generateCacheKey = useCallback(
    (
      searchTerm: string,
      page: number,
      pageSize: number,
      statusFilter: string[],
      amountRange: { min?: number; max?: number } | null,
      advanceRange: { min?: number; max?: number } | null,
      sortField: string | null,
      sortOrder: 'ascend' | 'descend' | null,
      currencyRef: string | null
    ) => {
      return `cache:${JSON.stringify(
        normalize({
          searchTerm,
          page,
          pageSize,
          statusFilter,
          amountRange,
          advanceRange,
          sortField,
          sortOrder,
          currencyRef
        })
      )}`
    },
    [normalize]
  )

  const fetchItems = useCallback(
    async (
      searchTerm: string = '',
      page: number = 1,
      pageSize: number = 20,
      statusFilter: string[] = [],
      amountRange: { min?: number; max?: number } | null = null,
      advanceRange: { min?: number; max?: number } | null = null,
      sortField?: string | null,
      sortOrder?: 'ascend' | 'descend' | null,
      currencyRef?: string | null,
      options?: { force?: boolean }
    ) => {
      const employeeId = context?.userInfo?.employeeDetails?.employeeId
      const accessToken = context?.accessToken

      if (!employeeId || !accessToken) {
        console.warn('Missing employeeId or accessToken for advance payments query')
        return
      }

      // Generate cache key (includes all parameters that affect the query)
      // Note: The existing duplicate call signature check (lastCallSignatureRef) can be kept
      // for extra safety, but caching and in-flight request deduplication handle this efficiently
      const cacheKey = generateCacheKey(
        searchTerm,
        page,
        pageSize,
        statusFilter,
        amountRange,
        advanceRange,
        sortField || null,
        sortOrder || null,
        currencyRef || null
      )

      // Check cache first - if page is cached and not forcing refresh, return immediately
      // Cache key includes all filters, so different filters = different key = automatic cache miss
      const cachedData = pageCacheRef.current.get(cacheKey)
      if (cachedData && !options?.force) {
        // Return cached data immediately - no loading state
        setItems(cachedData.items)
        setTotalCount(cachedData.totalCount)
        setIsLoading(false)
        setError(null)
        return
      }

      const callSignature = JSON.stringify({
        searchTerm,
        page,
        pageSize,
        statusFilter,
        amountRange,
        advanceRange,
        sortField,
        sortOrder,
        currencyRef,
        employeeId
      })
      if (!options?.force && callSignature === lastCallSignatureRef.current) {
        // Skip duplicate identical request unless force-refresh is requested
        return
      }
      lastCallSignatureRef.current = callSignature

      // Cancel previous request if it exists (only cancel if we're making a new request)
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      // Create new AbortController for this request
      const controller = new AbortController()
      abortControllerRef.current = controller

      // Check for in-flight request - reuse existing request to avoid duplicates
      const requestKey = `request:${cacheKey}`
      if (inflightRef.current.has(requestKey)) {
        try {
          const result = await inflightRef.current.get(requestKey)
          const fetchedItems = result?.AdvancePayment ?? []
          const count = result?.AdvancePaymentAggregate?.aggregate?.count ?? 0

          // Cache the result
          pageCacheRef.current.set(cacheKey, { items: fetchedItems, totalCount: count })

          setItems(fetchedItems)
          setTotalCount(count)
          setIsLoading(false)
          setError(null)
          return
        } catch {
          // If in-flight request failed, continue with new request
        }
      }

      setIsLoading(true)
      setError(null)

      try {
        // Add % wildcard for LIKE query if not already present
        const formattedSearchTerm = searchTerm === '' ? '%' : `%${searchTerm}%`
        const offset = (page - 1) * pageSize

        // Create filters object
        const filters: AdvancePaymentFilters = {
          statusFilter: statusFilter.length > 0 ? statusFilter : undefined,
          amountRange: amountRange || undefined,
          advanceRange: advanceRange || undefined,
          currencyRef: currencyRef || undefined
        }

        // Get active filters using utility function
        const filterState = validateFilters(filters)

        // Use dynamic query builder for better error handling
        const query = buildAdvancePaymentsQuery(filters)

        const variables: any = {
          employeeId,
          searchTerm: formattedSearchTerm,
          limit: pageSize,
          offset: offset
        }

        // Add orderBy for server-side sorting
        if (sortField && sortOrder) {
          // Map UI sort field to GraphQL field names - only include fields that exist directly on AdvancePayment
          const fieldMap: Record<string, string> = {
            status: 'status',
            amount: 'amount',
            paymentMethod: 'paymentMethod',
            createdAt: 'createdAt',
            updatedAt: 'updatedAt',
            description: 'description',
            currencyRef: 'currencyRef'
          }
          const gqlField = fieldMap[sortField] || sortField
          // Use proper null handling for better sorting, especially for numeric fields that can be null
          const direction = sortOrder === 'ascend' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'
          variables.orderBy = [{ [gqlField]: direction }]
        } else {
          // Default sorting by creation date descending
          variables.orderBy = [{ createdAt: 'DESC_NULLS_LAST' }]
        }

        // Add filter variables only if they exist
        if (filterState.hasStatusFilter && filters.statusFilter) {
          variables.statusFilter = filters.statusFilter
        }

        if (filterState.hasAmountRange && filters.amountRange) {
          const { min, max } = filters.amountRange
          if (min !== undefined) {
            variables.amountMin = min
          }
          if (max !== undefined) {
            variables.amountMax = max
          }
        }

        if (filterState.hasAdvanceRange && filters.advanceRange) {
          const { min, max } = filters.advanceRange
          if (min !== undefined) {
            variables.advanceMin = min
          }
          if (max !== undefined) {
            variables.advanceMax = max
          }
        }

        if (filterState.hasCurrencyRef && filters.currencyRef) {
          variables.currencyRef = filters.currencyRef
        }

        const requestPromise = graphqlClient
          .request<any>(query, variables, { signal: controller.signal })
          .finally(() => {
            inflightRef.current.delete(requestKey)
          })

        inflightRef.current.set(requestKey, requestPromise)
        const result = await requestPromise

        const fetchedItems = result?.AdvancePayment ?? []
        const count = result?.AdvancePaymentAggregate?.aggregate?.count ?? 0

        // Cache the result
        pageCacheRef.current.set(cacheKey, { items: fetchedItems, totalCount: count })

        setTotalCount(count)
        setItems(fetchedItems)
      } catch (err) {
        // Ignore AbortError - it means the request was cancelled intentionally
        if (err instanceof Error && err.name === 'AbortError') {
          return
        }
        console.error('Error fetching advance payments:', err)
        setError(err instanceof Error ? err : new Error(String(err)))
        setItems([]) // Clear items on error
        setTotalCount(0)
      } finally {
        setIsLoading(false)
      }
    },
    [context?.userInfo?.employeeDetails?.employeeId, context?.accessToken, graphqlClient, generateCacheKey]
  )

  // Manual cache invalidation (for manual refresh or mutations)
  const invalidateAllCache = useCallback(() => {
    pageCacheRef.current.clear()
  }, [])

  return {
    items,
    isLoading,
    error: error?.message || null,
    totalCount,
    fetchItems,
    invalidateCache: invalidateAllCache // Expose for manual refresh
  }
}
