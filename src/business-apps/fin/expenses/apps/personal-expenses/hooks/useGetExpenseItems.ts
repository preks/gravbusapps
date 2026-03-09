import { useState, useEffect, useCallback, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { GET_EXPENSE_ITEMS_BY_EMPLOYEE_WHERE, GET_EXPENSE_ITEM_BY_ID } from '../queries/expenseItems'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { normalize } from '../utils/cacheUtils'

// Type aliases for union types
type SortField = string | null
type SortOrder = 'ascend' | 'descend' | null

// Define types for the hook
export interface ExpenseItem {
  id: string
  code?: string
  title: string
  description?: string
  invoiceDate?: string
  expenseDate?: string
  status: string
  totalAmount: number
  reimbursableAmount?: number
  nonReimbursableAmount?: number
  deductibleAmount?: number
  currencyRef?: string
  currency?: {
    code: string
  }
  costCenter?: {
    name: string
  }
  expenseClass?: {
    value: string
    translations?: {
      value: string
      localeCode: string
    }[]
  }
  additionalProperties?: Record<string, any>
  expenseItemFile?: {
    id: string
    fileUrl: string
    fileName: string
  }[]
  employee?: {
    fullName: string
    additionalProperties?: Record<string, any>
  }
}

export interface ExpenseFilter {
  status?: string | string[]
  expenseDateStart?: string
  expenseDateEnd?: string
  expenseClass?: { value: string }
  totalAmountMin?: number
  totalAmountMax?: number
  currencyRef?: string
}

export interface ExpenseItemsResult {
  items: ExpenseItem[]
  isLoading: boolean
  error: string | null
  totalCount: number
  fetchItems: (
    searchTerm?: string,
    page?: number,
    pageSize?: number,
    filter?: ExpenseFilter,
    sortField?: SortField,
    sortOrder?: SortOrder,
    options?: { force?: boolean }
  ) => Promise<void>
  invalidateCache: () => void
}

export interface ExpenseItemResult {
  item: ExpenseItem | null
  isLoading: boolean
  error: string | null
  fetchItem: (id: string) => Promise<void>
}

/**
 * Hook to fetch expense items for the current employee with pagination, search, and filtering support
 * @param context Business app context containing user info and access token
 * @returns Object containing expense items, loading state, error, total count, and fetch function
 */
export const useGetExpenseItems = (
  context?: BusinessAppContextProps,
  options?: { autoFetch?: boolean }
): ExpenseItemsResult => {
  const graphqlClient = useGraphQLClient(context?.accessToken || '')
  const [items, setItems] = useState<ExpenseItem[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)
  const [totalCount, setTotalCount] = useState<number>(0)
  const abortControllerRef = useRef<AbortController | null>(null) // For request cancellation
  const itemsRef = useRef<ExpenseItem[]>([]) // For checking existing data inside fetchItems (avoid loading flash on sort/pagination)
  const lastDisplayedCacheKeyRef = useRef<string>('') // When filters/card change, clear stale data so correct data shows directly
  // Page cache: stores results by cache key (search, filters, page, pageSize, sortField, sortOrder)
  const pageCacheRef = useRef<Map<string, { items: ExpenseItem[]; totalCount: number }>>(new Map())
  const inflightRef = useRef<Map<string, Promise<any>>>(new Map()) // Track in-flight requests

  // Generate cache key for a specific page (includes all parameters that affect the query)
  const generateCacheKey = useCallback(
    (
      searchTerm: string,
      page: number,
      pageSize: number,
      filter: ExpenseFilter | undefined,
      sortField: SortField,
      sortOrder: SortOrder
    ) => {
      return `cache:${JSON.stringify(normalize({ searchTerm, page, pageSize, filter, sortField, sortOrder }))}`
    },
    []
  )

  // Helper function to build base where clause
  const buildBaseWhereClause = useCallback((employeeId: string, filter?: ExpenseFilter): Record<string, any> => {
    const where: Record<string, any> = {
      employeeId: { _eq: employeeId },
      isDeleted: { _eq: false },
      // exclude allowance
      expenseClass: { _not: { code: { _eq: 'ALLOWANCE' } } },
      // always exclude discarded
      status: { _nin: ['DISCARDED'] }
    }

    // Add expenseClass filter to server-side query if provided
    if (filter?.expenseClass?.value) {
      where.expenseClass = {
        _and: [{ value: { _eq: filter.expenseClass.value } }, { _not: { code: { _eq: 'ALLOWANCE' } } }]
      }
    }

    return where
  }, [])

  // Helper function to add search filters to where clause
  const addSearchFilters = useCallback((where: Record<string, any>, searchTerm: string): void => {
    const trimmedSearch = (searchTerm || '').trim()
    // Only add search filter if there's an actual search term (not '%' which means "all items")
    if (trimmedSearch && trimmedSearch !== '%') {
      const pattern = `%${trimmedSearch}%`
      where._or = [
        { title: { _ilike: pattern } },
        { code: { _ilike: pattern } },
        { status: { _ilike: pattern } },
        { expenseClass: { value: { _ilike: pattern } } },
        { expenseClass: { translations: { value: { _ilike: pattern } } } },
        { costCenter: { name: { _ilike: pattern } } }
      ]
    }
  }, [])

  // Helper function to add filter conditions to where clause
  const addFilterConditions = useCallback((where: Record<string, any>, filter?: ExpenseFilter): void => {
    if (!filter) return

    if (filter.status) {
      where.status = { ...(where.status || {}), _in: filter.status }
    }

    if (filter.expenseDateStart || filter.expenseDateEnd) {
      where.expenseDate = {
        ...(filter.expenseDateStart ? { _gte: filter.expenseDateStart } : {}),
        ...(filter.expenseDateEnd ? { _lte: filter.expenseDateEnd } : {})
      }
    }

    if (filter.totalAmountMin !== undefined || filter.totalAmountMax !== undefined) {
      where.totalAmount = {
        ...(filter.totalAmountMin !== undefined && filter.totalAmountMin !== null
          ? { _gte: filter.totalAmountMin }
          : {}),
        ...(filter.totalAmountMax !== undefined && filter.totalAmountMax !== null
          ? { _lte: filter.totalAmountMax }
          : {})
      }
    }

    if (filter.currencyRef) {
      where.currencyRef = { _eq: filter.currencyRef }
    }
  }, [])

  // Helper function to build orderBy clause
  const buildOrderBy = useCallback((sortField?: SortField, sortOrder?: SortOrder): any[] => {
    if (sortField && sortOrder) {
      const fieldMap: Record<string, string> = {
        title: 'title',
        expenseDate: 'expenseDate',
        status: 'status',
        reimbursableAmount: 'reimbursableAmount',
        totalAmount: 'totalAmount',
        createdAt: 'createdAt',
        updatedAt: 'updatedAt',
        code: 'code',
        description: 'description'
      }
      const gqlField = fieldMap[sortField] || sortField
      const direction = sortOrder === 'ascend' ? 'ASC' : 'DESC'
      return [{ [gqlField]: direction }]
    }
    return [{ expenseDate: 'DESC' }]
  }, [])

  /**
   * Helper function to build GraphQL variables for the query
   */
  const buildQueryVariables = useCallback(
    (
      employeeId: string,
      searchTerm: string,
      page: number,
      pageSize: number,
      filter?: ExpenseFilter,
      sortField?: SortField,
      sortOrder?: SortOrder
    ) => {
      const offset = (page - 1) * pageSize

      const where = buildBaseWhereClause(employeeId, filter)
      addSearchFilters(where, searchTerm)
      addFilterConditions(where, filter)

      const variables: Record<string, any> = {
        limit: pageSize,
        offset,
        where,
        orderBy: buildOrderBy(sortField, sortOrder)
      }

      return variables
    },
    [buildBaseWhereClause, addSearchFilters, addFilterConditions, buildOrderBy]
  )

  /**
   * Helper function to map API response to ExpenseItem objects
   */
  const mapResponseToItems = useCallback((data: any): ExpenseItem[] => {
    const fetchedItems = data?.ExpenseItem ?? []
    return fetchedItems.map((item: any) => ({
      id: item.id,
      code: item.code,
      title: item.title ?? item.description ?? 'N/A',
      description: item.description,
      invoiceDate: item.expenseDate ? new Date(item.expenseDate).toISOString().split('T')[0] : 'N/A',
      expenseDate: item.expenseDate,
      status: item.status ?? 'PENDING',
      totalAmount: item.totalAmount ?? 0,
      reimbursableAmount: item.reimbursableAmount,
      nonReimbursableAmount: (item.totalAmount ?? 0) - (item.deductibleAmount ?? 0),
      deductibleAmount: item.deductibleAmount,
      currency: item.currency,
      currencyRef: item.currencyRef,
      costCenter: item.costCenter,
      expenseClass: item.expenseClass,
      additionalProperties: item.additionalProperties,
      expenseItemFile: item.expenseItemFile,
      employee: item.employee
    }))
  }, [])

  /**
   * Function to fetch expense items with search, pagination, and filtering
   */
  const fetchItems = useCallback(
    async (
      searchTerm = '%',
      page = 1,
      pageSize = 20,
      filter?: ExpenseFilter,
      sortField?: SortField,
      sortOrder?: SortOrder,
      options?: { force?: boolean }
    ): Promise<void> => {
      const employeeId = context?.userInfo?.employeeDetails?.employeeId
      const accessToken = context?.accessToken

      if (!employeeId) {
        setError(new Error('Employee ID not found. Cannot fetch expense items.'))
        setItems([])
        setTotalCount(0)
        setIsLoading(false)
        return
      }

      if (!accessToken) {
        setError(new Error('Access token not found. Cannot fetch expense items.'))
        setItems([])
        setTotalCount(0)
        setIsLoading(false)
        return
      }

      // Generate cache key
      const cacheKey = generateCacheKey(searchTerm, page, pageSize, filter, sortField || null, sortOrder || null)

      // Check cache first - if page is cached and not forcing refresh, return immediately
      const cachedData = pageCacheRef.current.get(cacheKey)
      if (cachedData && !options?.force) {
        lastDisplayedCacheKeyRef.current = cacheKey
        setItems(cachedData.items)
        setTotalCount(cachedData.totalCount)
        setIsLoading(false)
        setError(null)
        return
      }

      // When filters/card changed (different cache key), clear stale data and show loading so correct data appears directly
      if (cacheKey !== lastDisplayedCacheKeyRef.current && itemsRef.current.length > 0) {
        setItems([])
        setTotalCount(0)
        setIsLoading(true)
      }

      // Cancel previous request if it exists
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
          const count = result?.ExpenseItemAggregate?.aggregate?.count ?? 0
          const mappedItems = mapResponseToItems(result)

          // Total count is now accurate from server since all filtering is server-side
          const finalCount = count

          // Cache the result
          pageCacheRef.current.set(cacheKey, { items: mappedItems, totalCount: finalCount })
          lastDisplayedCacheKeyRef.current = cacheKey
          setItems(mappedItems)
          setTotalCount(finalCount)
          setIsLoading(false)
          setError(null)
          return
        } catch {
          // If in-flight request failed, continue with new request
        }
      }

      // Only show loading when we have no data yet (initial load); skip for sort/pagination to avoid table rerender/flash
      if (itemsRef.current.length === 0) {
        setIsLoading(true)
      }
      setError(null)

      try {
        // Build query variables with helper function
        const variables = buildQueryVariables(employeeId, searchTerm, page, pageSize, filter, sortField, sortOrder)

        const requestPromise = graphqlClient
          .request<any>(GET_EXPENSE_ITEMS_BY_EMPLOYEE_WHERE, variables)
          .finally(() => {
            inflightRef.current.delete(requestKey)
          })

        inflightRef.current.set(requestKey, requestPromise)
        const result = await requestPromise

        // If a newer request started, ignore this response.
        if (abortControllerRef.current !== controller) {
          return
        }

        const count = result?.ExpenseItemAggregate?.aggregate?.count ?? 0
        const mappedItems = mapResponseToItems(result)

        // Total count is now accurate from server since all filtering is server-side
        const finalCount = count

        // Cache the result
        pageCacheRef.current.set(cacheKey, { items: mappedItems, totalCount: finalCount })
        lastDisplayedCacheKeyRef.current = cacheKey
        setItems(mappedItems)
        setTotalCount(finalCount)
      } catch (err) {
        // We can't abort the underlying fetch without client support; ignore stale results instead.
        if (abortControllerRef.current !== controller || controller.signal.aborted) {
          return
        }
        setError(err instanceof Error ? err : new Error(String(err)))
        setItems([]) // Clear items on error
        setTotalCount(0)
      } finally {
        setIsLoading(false)
      }
    },
    [
      context?.userInfo?.employeeDetails?.employeeId,
      context?.accessToken,
      buildQueryVariables,
      mapResponseToItems,
      graphqlClient,
      generateCacheKey
    ]
  )

  useEffect(() => {
    itemsRef.current = items
  }, [items])

  // Initial fetch on component mount (configurable)
  useEffect(() => {
    if (options?.autoFetch !== false) {
      fetchItems()
    }
  }, [fetchItems, options?.autoFetch])

  // Manual cache invalidation (for manual refresh or mutations)
  const invalidateAllCache = useCallback(() => {
    pageCacheRef.current.clear()
  }, [])

  return {
    items,
    isLoading,
    error: error?.message ?? null,
    totalCount,
    fetchItems,
    invalidateCache: invalidateAllCache // Expose for manual refresh
  }
}

/**
 * Hook to fetch expense item data for a specific expense item
 * @param context Business app context containing user info and access token
 * @returns Object containing the expense item, loading state, error, and fetch function
 */

export const useGetExpenseItem = (context?: BusinessAppContextProps, initialId?: string): ExpenseItemResult => {
  const graphqlClient = useGraphQLClient(context?.accessToken || '')
  const [item, setItem] = useState<ExpenseItem | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(!!initialId)
  const [error, setError] = useState<Error | null>(null)

  // Function to fetch a specific expense item by ID
  const fetchItem = async (itemId: string) => {
    const accessToken = context?.accessToken

    if (!itemId) {
      setError(new Error('No expense item ID provided.'))
      setItem(null)
      setIsLoading(false)
      return
    }

    if (!accessToken) {
      setError(new Error('Access token not found. Cannot fetch expense item.'))
      setItem(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await graphqlClient.request<any>(GET_EXPENSE_ITEM_BY_ID, { id: itemId })
      const fetchedItem = result?.ExpenseItem?.[0] ?? null
      setItem(fetchedItem)
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
      setItem(null) // Clear item on error
    } finally {
      setIsLoading(false)
    }
  }

  // Initial fetch if initialId is provided
  useEffect(() => {
    if (initialId) {
      fetchItem(initialId)
    }
  }, [initialId, context?.accessToken]) // Re-run when initialId or accessToken changes

  return { item, isLoading, error: error?.message ?? null, fetchItem }
}
