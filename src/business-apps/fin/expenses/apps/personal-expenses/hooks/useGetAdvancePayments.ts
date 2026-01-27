import { useCallback, useState, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import {
  buildAdvancePaymentsListQuery,
  validateFilters,
  AdvancePaymentFilters
} from '../../personal-expenses/utils/advancePaymentsQueryBuilder'
import { makeCancellableRequest } from '../utils/cancellableRequest'
import { normalize, handleCachedData as handleCachedDataUtil } from '../utils/cacheUtils'

// Type aliases for union types
type SortField = string | null
type SortOrder = 'ascend' | 'descend' | null

export interface AdvancePayment {
  id: string
  code: string
  description: string | null
  amount: number
  currencyRef: string
  currency?: { code?: string } | null
  status: string
  paymentMethod?: unknown
  costCenter?: { name?: string } | null
  project?: { name?: string } | null
  expensePlan?: {
    id?: string
    code?: string
    title?: string
    totalAmount?: number | null
    currency?: { code?: string } | null
    costCenter?: { name?: string } | null
    project?: { name?: string } | null
    expenseRequest?: Array<{ id?: string | null }> | null
  } | null
  expensePlanId?: string | null
}

export interface FetchItemsOptions {
  searchTerm?: string
  page?: number
  pageSize?: number
  statusFilter?: string[]
  amountRange?: { min?: number; max?: number } | null
  advanceRange?: { min?: number; max?: number } | null
  sortField?: SortField
  sortOrder?: SortOrder
  currencyRef?: string | null
  force?: boolean
}

export interface AdvancePaymentsDataView {
  items: AdvancePayment[]
  isLoading: boolean
  error: string | null
  totalCount: number
  fetchItems: (options?: FetchItemsOptions) => Promise<void>
  invalidateCache?: () => void
}

export const useGetAdvancePayments = (context?: BusinessAppContextProps): AdvancePaymentsDataView => {
  const [items, setItems] = useState<AdvancePayment[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const graphqlClient = useGraphQLClient(context?.accessToken || '')
  const lastCallSignatureRef = useRef<string>('')
  const abortControllerRef = useRef<AbortController | null>(null)
  const pageCacheRef = useRef<Map<string, { items: AdvancePayment[]; totalCount: number }>>(new Map())
  const inflightRef = useRef<Map<string, Promise<any>>>(new Map())

  const generateCacheKey = useCallback(
    (params: {
      searchTerm: string
      page: number
      pageSize: number
      statusFilter: string[]
      amountRange: { min?: number; max?: number } | null
      advanceRange: { min?: number; max?: number } | null
      sortField: SortField
      sortOrder: SortOrder
      currencyRef: string | null
    }) => {
      return `cache:${JSON.stringify(
        normalize({
          searchTerm: params.searchTerm,
          page: params.page,
          pageSize: params.pageSize,
          statusFilter: params.statusFilter,
          amountRange: params.amountRange,
          advanceRange: params.advanceRange,
          sortField: params.sortField,
          sortOrder: params.sortOrder,
          currencyRef: params.currencyRef
        })
      )}`
    },
    []
  )

  // Helper function to validate and get required values
  const validateAndGetValues = (): { employeeId: string; accessToken: string } | null => {
    const employeeId = context?.userInfo?.employeeDetails?.employeeId
    const accessToken = context?.accessToken

    if (!employeeId || !accessToken) {
      return null
    }

    return { employeeId, accessToken }
  }

  // Helper function to handle cached data
  const handleCachedData = useCallback((cacheKey: string, options?: { force?: boolean }): boolean => {
    return handleCachedDataUtil(
      cacheKey,
      pageCacheRef.current,
      options,
      setItems,
      setTotalCount,
      setIsLoading,
      setError
    )
  }, [])

  // Helper function to check and update call signature
  const checkCallSignature = (callSignature: string, options?: { force?: boolean }): boolean => {
    if (!options?.force && callSignature === lastCallSignatureRef.current) {
      return true
    }
    lastCallSignatureRef.current = callSignature
    return false
  }

  // Helper function to handle inflight requests
  const handleInflightRequest = async (requestKey: string, cacheKey: string): Promise<boolean> => {
    if (!inflightRef.current.has(requestKey)) {
      return false
    }
    try {
      const result = await inflightRef.current.get(requestKey)
      const fetchedItems = result?.AdvancePayment ?? []
      const count = result?.AdvancePaymentAggregate?.aggregate?.count ?? 0

      pageCacheRef.current.set(cacheKey, { items: fetchedItems, totalCount: count })
      setItems(fetchedItems)
      setTotalCount(count)
      setIsLoading(false)
      setError(null)
    } catch {
      // Continue with new request if in-flight request failed
    }
    return true
  }

  // Helper function to build sort order
  const buildOrderBy = (sortField?: SortField, sortOrder?: SortOrder): any[] => {
    if (sortField && sortOrder) {
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
      const direction = sortOrder === 'ascend' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'
      return [{ [gqlField]: direction }]
    }
    return [{ createdAt: 'DESC_NULLS_LAST' }]
  }

  // Helper function to add range filter to variables
  const addRangeFilter = (
    variables: Record<string, any>,
    range: { min?: number; max?: number } | null | undefined,
    minKey: string,
    maxKey: string
  ): void => {
    if (!range) return
    if (range.min !== undefined) {
      variables[minKey] = range.min
    }
    if (range.max !== undefined) {
      variables[maxKey] = range.max
    }
  }

  // Helper function to add filter conditions to variables
  const addFilterConditions = (
    variables: Record<string, any>,
    filters: AdvancePaymentFilters,
    filterState: ReturnType<typeof validateFilters>
  ): void => {
    if (filterState.hasStatusFilter && filters.statusFilter) {
      variables.statusFilter = filters.statusFilter
    }

    if (filterState.hasAmountRange && filters.amountRange) {
      addRangeFilter(variables, filters.amountRange, 'amountMin', 'amountMax')
    }

    if (filterState.hasAdvanceRange && filters.advanceRange) {
      addRangeFilter(variables, filters.advanceRange, 'advanceMin', 'advanceMax')
    }

    if (filterState.hasCurrencyRef && filters.currencyRef) {
      variables.currencyRef = filters.currencyRef
    }
  }

  // Helper function to build GraphQL variables
  interface BuildVariablesOptions {
    employeeId: string
    searchTerm: string
    includeSearch: boolean
    page: number
    pageSize: number
    sortField?: SortField
    sortOrder?: SortOrder
    filters?: AdvancePaymentFilters
    filterState?: ReturnType<typeof validateFilters>
  }

  interface GraphQLVariables {
    employeeId: string
    limit: number
    offset: number
    orderBy: Array<Record<string, string>>
    searchTerm?: string
    statusFilter?: string[]
    amountMin?: number
    amountMax?: number
    advanceMin?: number
    advanceMax?: number
    currencyRef?: string
  }

  const buildVariables = useCallback((options: BuildVariablesOptions): GraphQLVariables => {
    const { employeeId, searchTerm, includeSearch, page, pageSize, sortField, sortOrder, filters, filterState } =
      options
    const offset = (page - 1) * pageSize

    const variables: GraphQLVariables = {
      employeeId,
      limit: pageSize,
      offset: offset,
      orderBy: buildOrderBy(sortField, sortOrder)
    }

    if (includeSearch) {
      variables.searchTerm = `%${searchTerm}%`
    }

    if (filterState && filters) {
      addFilterConditions(variables, filters, filterState)
    }

    return variables
  }, [])

  // Helper function to process and cache response data
  interface GraphQLResponse {
    AdvancePayment?: AdvancePayment[]
    AdvancePaymentAggregate?: {
      aggregate?: {
        count?: number
      }
    }
  }

  const processResponseData = (result: GraphQLResponse, cacheKey: string): void => {
    const fetchedItems = result?.AdvancePayment ?? []
    const count = result?.AdvancePaymentAggregate?.aggregate?.count ?? 0

    pageCacheRef.current.set(cacheKey, { items: fetchedItems, totalCount: count })
    setTotalCount(count)
    setItems(fetchedItems)
  }

  const fetchItems = useCallback(
    async (options: FetchItemsOptions = {}) => {
      const {
        searchTerm = '',
        page = 1,
        pageSize = 20,
        statusFilter = [],
        amountRange = null,
        advanceRange = null,
        sortField,
        sortOrder,
        currencyRef,
        force = false
      } = options
      const validated = validateAndGetValues()
      if (!validated) {
        return
      }

      const { employeeId } = validated
      const includeSearch = (searchTerm || '').trim() !== ''
      const cacheKey = generateCacheKey({
        searchTerm,
        page,
        pageSize,
        statusFilter,
        amountRange,
        advanceRange,
        sortField: sortField || null,
        sortOrder: sortOrder || null,
        currencyRef: currencyRef || null
      })

      if (handleCachedData(cacheKey, { force })) {
        return
      }

      const callSignature = JSON.stringify({
        searchTerm,
        includeSearch,
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
      if (checkCallSignature(callSignature, { force })) {
        return
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      const controller = new AbortController()
      abortControllerRef.current = controller

      const requestKey = `request:${cacheKey}`
      const handledInflight = await handleInflightRequest(requestKey, cacheKey)
      if (handledInflight) {
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const filters: AdvancePaymentFilters = {
          statusFilter: statusFilter.length > 0 ? statusFilter : undefined,
          amountRange: amountRange || undefined,
          advanceRange: advanceRange || undefined,
          currencyRef: currencyRef || undefined
        }

        const filterState = validateFilters(filters)
        const query = buildAdvancePaymentsListQuery(filters, { includeSearch })
        const variables = buildVariables({
          employeeId,
          searchTerm,
          includeSearch,
          page,
          pageSize,
          sortField: sortField || null,
          sortOrder: sortOrder || null,
          filters,
          filterState
        })

        const baseRequestPromise = graphqlClient.request<any>(query, variables)
        const requestPromise = makeCancellableRequest(baseRequestPromise, controller).finally(() => {
          inflightRef.current.delete(requestKey)
        })

        inflightRef.current.set(requestKey, requestPromise)
        const result = await requestPromise

        // If a newer request started, ignore this response.
        if (abortControllerRef.current !== controller) {
          return
        }

        processResponseData(result, cacheKey)
      } catch (err) {
        // Ignore errors from cancelled/stale requests
        if (err instanceof Error && err.name === 'AbortError') {
          return
        }
        if (abortControllerRef.current !== controller) {
          return
        }
        setError(err instanceof Error ? err : new Error(String(err)))
        setItems([])
        setTotalCount(0)
      } finally {
        if (abortControllerRef.current === controller) {
          setIsLoading(false)
        }
      }
    },
    [
      context?.userInfo?.employeeDetails?.employeeId,
      context?.accessToken,
      graphqlClient,
      generateCacheKey,
      validateAndGetValues,
      handleCachedData,
      checkCallSignature,
      handleInflightRequest,
      buildVariables,
      processResponseData
    ]
  )

  const invalidateAllCache = useCallback(() => {
    pageCacheRef.current.clear()
  }, [])

  return {
    items,
    isLoading,
    error: error?.message || null,
    totalCount,
    fetchItems,
    invalidateCache: invalidateAllCache
  }
}
