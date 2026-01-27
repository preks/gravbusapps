import { useState, useCallback, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { GET_EXPENSE_REQUESTS_BY_EMPLOYEE } from '../queries/expenseRequests'
import { CatalogEntry } from './useGetExpensePlans'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'

// Type aliases for union types
type SortField = string | null
type SortOrder = 'ascend' | 'descend' | null

export interface ExpenseRequest {
  id: string
  code: string
  title: string
  description: string
  startDate: string | null
  endDate: string | null
  requestDate: string | null
  totalAmount: number
  currencyRef: string
  costCenter: {
    name: string
  }
  status: string
  reimbursableAmount: number
  nonReimbursableAmount: number
  requestType: CatalogEntry
  currency?: {
    code: string
  }
  employeeDocument?: {
    file: string
    name?: string
  }
  expensePlan?: {
    advancePaymentAggregate?: {
      aggregate?: {
        sum?: {
          amount: number
        }
      }
    }
  }
}

export interface ExpenseRequestsDataView {
  items: ExpenseRequest[]
  isLoading: boolean
  error: string | null
  totalCount: number
  fetchItems: (
    filters: any,
    page?: number,
    pageSize?: number,
    sortField?: SortField,
    sortOrder?: SortOrder,
    options?: { force?: boolean }
  ) => Promise<void>
  invalidateCache?: () => void
}

export const useGetExpenseRequests = (context?: BusinessAppContextProps): ExpenseRequestsDataView => {
  const [items, setItems] = useState<ExpenseRequest[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)
  const [totalCount, setTotalCount] = useState<number>(0)
  const abortControllerRef = useRef<AbortController | null>(null)
  const pageCacheRef = useRef<Map<string, { items: ExpenseRequest[]; totalCount: number }>>(new Map())
  const inflightRef = useRef<Map<string, Promise<any>>>(new Map())

  const accessToken = context?.accessToken || ''
  const client = useGraphqlClient(accessToken)

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
    (filters: any, page: number, pageSize: number, sortField: SortField, sortOrder: SortOrder) => {
      return `cache:${JSON.stringify(
        normalize({
          filters,
          page,
          pageSize,
          sortField,
          sortOrder
        })
      )}`
    },
    [normalize]
  )

  // Helper function to validate and get required values
  const validateAndGetValues = (): { employeeId: string; accessToken: string } | null => {
    const employeeId = context?.userInfo?.employeeDetails?.employeeId
    const accessToken = context?.accessToken

    if (!employeeId) {
      setError(new Error('Employee ID not found. Cannot fetch expense requests.'))
      setItems([])
      setTotalCount(0)
      setIsLoading(false)
      return null
    }

    if (!accessToken) {
      setError(new Error('Access token not found. Cannot fetch expense requests.'))
      setItems([])
      setTotalCount(0)
      setIsLoading(false)
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

  // Helper function to handle inflight requests
  const handleInflightRequest = async (requestKey: string, cacheKey: string): Promise<boolean> => {
    if (!inflightRef.current.has(requestKey)) {
      return false
    }
    try {
      const result = await inflightRef.current.get(requestKey)
      const fetchedItems = result?.ExpenseRequest ?? []
      const count = result?.ExpenseRequestAggregate?.aggregate?.count ?? 0

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

  // Helper function to build GraphQL variables
  const buildVariables = (
    employeeId: string,
    filters: any,
    page: number,
    pageSize: number,
    sortField?: SortField,
    sortOrder?: SortOrder
  ): Record<string, any> => {
    const offset = (page - 1) * pageSize
    const whereClause = {
      _and: [{ employeeId: { _eq: employeeId } }, { isDeleted: { _eq: false } }, filters]
    }

    const variables: Record<string, any> = {
      limit: pageSize,
      offset: offset,
      where: whereClause
    }

    if (sortField && sortOrder) {
      const fieldMap: Record<string, string> = {
        code: 'code',
        title: 'title',
        requestDate: 'requestDate',
        startDate: 'startDate',
        endDate: 'endDate',
        status: 'status',
        reimbursableAmount: 'reimbursableAmount',
        totalAmount: 'totalAmount',
        createdAt: 'createdAt',
        updatedAt: 'updatedAt',
        description: 'description',
        currencyRef: 'currencyRef',
        nonReimbursableAmount: 'nonReimbursableAmount'
      }
      const gqlField = fieldMap[sortField] || sortField
      const direction = sortOrder === 'ascend' ? 'ASC' : 'DESC'
      variables.orderBy = [{ [gqlField]: direction }]
    } else {
      variables.orderBy = [{ requestDate: 'DESC' }]
    }

    return variables
  }

  // Helper function to make a request cancellable using AbortController
  const makeCancellableRequest = <T>(requestPromise: Promise<T>, controller: AbortController): Promise<T> => {
    return new Promise((resolve, reject) => {
      // Check if already aborted before starting
      if (controller.signal.aborted) {
        const abortError = new Error('Request aborted')
        abortError.name = 'AbortError'
        reject(abortError)
        return
      }

      // Set up abort listener
      const abortHandler = () => {
        const abortError = new Error('Request aborted')
        abortError.name = 'AbortError'
        reject(abortError)
      }

      controller.signal.addEventListener('abort', abortHandler, { once: true })

      // Execute the request
      requestPromise
        .then(result => {
          // Check if aborted after request completes
          if (controller.signal.aborted) {
            const abortError = new Error('Request aborted')
            abortError.name = 'AbortError'
            reject(abortError)
            return
          }
          controller.signal.removeEventListener('abort', abortHandler)
          resolve(result)
        })
        .catch(error => {
          controller.signal.removeEventListener('abort', abortHandler)
          reject(error)
        })
    })
  }

  // Helper function to process and cache response data
  const processResponseData = (data: any, cacheKey: string): void => {
    const count = data?.ExpenseRequestAggregate?.aggregate?.count ?? 0
    const fetchedItems = data?.ExpenseRequest ?? []

    pageCacheRef.current.set(cacheKey, { items: fetchedItems, totalCount: count })
    setTotalCount(count)
    setItems(fetchedItems)
  }

  const fetchItems = useCallback(
    async (
      filters: any = {},
      page: number = 1,
      pageSize: number = 20,
      sortField?: SortField,
      sortOrder?: SortOrder,
      options?: { force?: boolean }
    ) => {
      const validated = validateAndGetValues()
      if (!validated) {
        return
      }

      const { employeeId } = validated
      const cacheKey = generateCacheKey(filters, page, pageSize, sortField || null, sortOrder || null)

      if (handleCachedData(cacheKey, options)) {
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
        const variables = buildVariables(employeeId, filters, page, pageSize, sortField, sortOrder)

        const baseRequestPromise = client.request(GET_EXPENSE_REQUESTS_BY_EMPLOYEE, variables)
        const requestPromise = makeCancellableRequest(baseRequestPromise, controller).finally(() => {
          inflightRef.current.delete(requestKey)
        })

        inflightRef.current.set(requestKey, requestPromise)
        const data = await requestPromise

        // If a newer request started, ignore this response.
        if (abortControllerRef.current !== controller) {
          return
        }

        processResponseData(data, cacheKey)
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
      client,
      generateCacheKey,
      setIsLoading,
      setError,
      setItems,
      setTotalCount
    ]
  )

  const invalidateAllCache = useCallback(() => {
    pageCacheRef.current.clear()
  }, [])

  return {
    items,
    isLoading,
    error: error?.message ?? null,
    totalCount,
    fetchItems,
    invalidateCache: invalidateAllCache
  }
}
