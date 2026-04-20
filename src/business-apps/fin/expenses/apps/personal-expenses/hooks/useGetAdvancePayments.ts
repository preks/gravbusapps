import { useCallback, useEffect, useState, useRef } from 'react'
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
    startDate?: string | null
    endDate?: string | null
    totalAmount?: number | null
    currency?: { code?: string } | null
    costCenter?: { name?: string } | null
    project?: { name?: string } | null
    employee?: {
      id?: string
      code?: string
      firstName?: string | null
      lastName?: string | null
      fullName?: string | null
      employeePosition?: {
        jobPosition?: { name?: string | null } | null
        organizationalUnit?: { name?: string | null } | null
      } | null
    } | null
    expenseRequestTrip?: Array<{
      id?: string
      address?: string | null
      pointType?: string | null
      countryRef?: string | null
      tripDateTime?: string | null
      tripOrder?: number | null
      tripDirection?: string | null
      travelRegion?: { value?: string | null } | null
      country?: { value?: string | null } | null
    }> | null
    expenseRequest?: Array<{
      id?: string | null
      code?: string | null
      expenseRequestTrip?: Array<{
        id?: string
        address?: string | null
        pointType?: string | null
        countryRef?: string | null
        tripDateTime?: string | null
        tripOrder?: number | null
        tripDirection?: string | null
        travelRegion?: { value?: string | null } | null
        country?: { value?: string | null } | null
      }> | null
    }> | null
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
  createdAtRange?: { gte: string; lte: string } | null
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
  const itemsRef = useRef<AdvancePayment[]>([]) // For checking existing data (avoid loading flash on sort/pagination, same as items table)

  const generateCacheKey = useCallback(
    (params: {
      searchTerm: string
      page: number
      pageSize: number
      statusFilter: string[]
      amountRange: { min?: number; max?: number } | null
      advanceRange: { min?: number; max?: number } | null
      createdAtRange: { gte: string; lte: string } | null
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
          createdAtRange: params.createdAtRange,
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

  // Helper function to build sort order (maps UI column ids to AdvancePaymentOrderBy field names)
  const buildOrderBy = (sortField?: SortField, sortOrder?: SortOrder): any[] => {
    if (sortField && sortOrder) {
      const direction = sortOrder === 'ascend' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'
      // expensePlan is a relation; AdvancePaymentOrderBy expects ExpensePlanOrderBy object, not a string
      if (sortField === 'expensePlan') {
        return [{ expensePlan: { title: direction } }]
      }
      // Plan Number column shows expensePlan.code, so sort by nested relation
      if (sortField === 'planNumber') {
        return [{ expensePlan: { code: direction } }]
      }
      // Amount column shows expensePlan.totalAmount (plan total), so sort by nested relation
      if (sortField === 'amount') {
        return [{ expensePlan: { totalAmount: direction } }]
      }
      const fieldMap: Record<string, string> = {
        status: 'status',
        advance: 'amount', // Advance column = AdvancePayment.amount
        paymentMethod: 'paymentMethod',
        createdAt: 'createdAt',
        updatedAt: 'updatedAt',
        description: 'description',
        currencyRef: 'currencyRef',
        code: 'code'
      }
      const gqlField = fieldMap[sortField] || sortField
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

    if (filterState.hasCreatedAtRange && filters.createdAtRange?.gte && filters.createdAtRange?.lte) {
      variables.createdAtGte = filters.createdAtRange.gte
      variables.createdAtLte = filters.createdAtRange.lte
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
    createdAtGte?: string
    createdAtLte?: string
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

  const performRequest = useCallback(
    async (
      controller: AbortController,
      requestKey: string,
      cacheKey: string,
      query: string,
      variables: GraphQLVariables
    ): Promise<void> => {
      const baseRequestPromise = graphqlClient.request<any>(query, variables)
      const requestPromise = makeCancellableRequest(baseRequestPromise, controller).finally(() => {
        inflightRef.current.delete(requestKey)
      })
      inflightRef.current.set(requestKey, requestPromise)
      try {
        const result = await requestPromise
        if (abortControllerRef.current !== controller) return
        processResponseData(result, cacheKey)
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
        if (abortControllerRef.current !== controller) return
        setError(err instanceof Error ? err : new Error(String(err)))
        setItems([])
        setTotalCount(0)
      } finally {
        if (abortControllerRef.current === controller) {
          setIsLoading(false)
        }
      }
    },
    [graphqlClient, processResponseData]
  )

  const fetchItems = useCallback(
    async (options: FetchItemsOptions = {}) => {
      const {
        searchTerm = '',
        page = 1,
        pageSize = 20,
        statusFilter = [],
        amountRange = null,
        advanceRange = null,
        createdAtRange = null,
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
        createdAtRange: createdAtRange ?? null,
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
        createdAtRange,
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

      if (itemsRef.current.length === 0) {
        setIsLoading(true)
      }
      setError(null)

      const filters: AdvancePaymentFilters = {
        statusFilter: statusFilter.length > 0 ? statusFilter : undefined,
        amountRange: amountRange || undefined,
        advanceRange: advanceRange || undefined,
        currencyRef: currencyRef || undefined,
        createdAtRange: createdAtRange ?? undefined
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
      await performRequest(controller, requestKey, cacheKey, query, variables)
    },
    [
      context?.userInfo?.employeeDetails?.employeeId,
      context?.accessToken,
      generateCacheKey,
      validateAndGetValues,
      handleCachedData,
      checkCallSignature,
      handleInflightRequest,
      buildVariables,
      performRequest
    ]
  )

  useEffect(() => {
    itemsRef.current = items
  }, [items])

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
