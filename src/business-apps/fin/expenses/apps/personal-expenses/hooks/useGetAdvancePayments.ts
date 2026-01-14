import { useCallback, useState, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import {
  buildAdvancePaymentsQuery,
  validateFilters,
  AdvancePaymentFilters
} from '../../personal-expenses/utils/advancePaymentsQueryBuilder'

// Type aliases for union types
type SortField = string | null
type SortOrder = 'ascend' | 'descend' | null

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

  const normalize = useCallback((val: any): any => {
    if (Array.isArray(val)) {
      return val.map(normalize)
    }
    if (val && typeof val === 'object') {
      const sorted: any = {}
      Object.keys(val)
        .sort((a, b) => a.localeCompare(b))
        .forEach(k => {
          sorted[k] = normalize(val[k])
        })
      return sorted
    }
    return val
  }, [])

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
    [normalize]
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
  const handleCachedData = (cacheKey: string, options?: { force?: boolean }): boolean => {
    const cachedData = pageCacheRef.current.get(cacheKey)
    if (cachedData && !options?.force) {
      setItems(cachedData.items)
      setTotalCount(cachedData.totalCount)
      setIsLoading(false)
      setError(null)
      return true
    }
    return false
  }

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
    page: number
    pageSize: number
    sortField?: SortField
    sortOrder?: SortOrder
    filters?: AdvancePaymentFilters
    filterState?: ReturnType<typeof validateFilters>
  }

  const buildVariables = useCallback((options: BuildVariablesOptions): any => {
    const { employeeId, searchTerm, page, pageSize, sortField, sortOrder, filters, filterState } = options
    const formattedSearchTerm = searchTerm === '' ? '%' : `%${searchTerm}%`
    const offset = (page - 1) * pageSize

    const variables: any = {
      employeeId,
      searchTerm: formattedSearchTerm,
      limit: pageSize,
      offset: offset,
      orderBy: buildOrderBy(sortField, sortOrder)
    }

    if (filterState && filters) {
      addFilterConditions(variables, filters, filterState)
    }

    return variables
  }, [])

  // Helper function to process and cache response data
  const processResponseData = (result: any, cacheKey: string): void => {
    const fetchedItems = result?.AdvancePayment ?? []
    const count = result?.AdvancePaymentAggregate?.aggregate?.count ?? 0

    pageCacheRef.current.set(cacheKey, { items: fetchedItems, totalCount: count })
    setTotalCount(count)
    setItems(fetchedItems)
  }

  interface FetchItemsOptions {
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
        const query = buildAdvancePaymentsQuery(filters)
        const variables = buildVariables({
          employeeId,
          searchTerm,
          page,
          pageSize,
          sortField: sortField || null,
          sortOrder: sortOrder || null,
          filters,
          filterState
        })

        const requestPromise = graphqlClient.request<any>(query, variables).finally(() => {
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
        // We can't abort the underlying fetch without client support; ignore stale results instead.
        if (abortControllerRef.current !== controller || controller.signal.aborted) {
          return
        }
        setError(err instanceof Error ? err : new Error(String(err)))
        setItems([])
        setTotalCount(0)
      } finally {
        setIsLoading(false)
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
