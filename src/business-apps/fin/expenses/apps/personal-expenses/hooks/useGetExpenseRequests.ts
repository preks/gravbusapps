import { useState, useCallback, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { GET_EXPENSE_REQUESTS_BY_EMPLOYEE } from '../queries/expenseRequests'
import { CatalogEntry } from './useGetExpensePlans'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'

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
    sortField?: string | null,
    sortOrder?: 'ascend' | 'descend' | null,
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
        .sort()
        .forEach(k => {
          sorted[k] = normalize(val[k])
        })
      return sorted
    }
    return val
  }, [])

  const generateCacheKey = useCallback(
    (
      filters: any,
      page: number,
      pageSize: number,
      sortField: string | null,
      sortOrder: 'ascend' | 'descend' | null
    ) => {
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

  const fetchItems = useCallback(
    async (
      filters: any = {},
      page: number = 1,
      pageSize: number = 20,
      sortField?: string | null,
      sortOrder?: 'ascend' | 'descend' | null,
      options?: { force?: boolean }
    ) => {
      const employeeId = context?.userInfo?.employeeDetails?.employeeId
      const accessToken = context?.accessToken

      if (!employeeId) {
        setError(new Error('Employee ID not found. Cannot fetch expense requests.'))
        setItems([])
        setTotalCount(0)
        setIsLoading(false)
        return
      }

      if (!accessToken) {
        setError(new Error('Access token not found. Cannot fetch expense requests.'))
        setItems([])
        setTotalCount(0)
        setIsLoading(false)
        return
      }

      const cacheKey = generateCacheKey(filters, page, pageSize, sortField || null, sortOrder || null)

      const cachedData = pageCacheRef.current.get(cacheKey)
      if (cachedData && !options?.force) {
        setItems(cachedData.items)
        setTotalCount(cachedData.totalCount)
        setIsLoading(false)
        setError(null)
        return
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      const controller = new AbortController()
      abortControllerRef.current = controller

      const requestKey = `request:${cacheKey}`
      if (inflightRef.current.has(requestKey)) {
        try {
          const result = await inflightRef.current.get(requestKey)
          const fetchedItems = result?.ExpenseRequest ?? []
          const count = result?.ExpenseRequestAggregate?.aggregate?.count ?? 0

          pageCacheRef.current.set(cacheKey, { items: fetchedItems, totalCount: count })

          setItems(fetchedItems)
          setTotalCount(count)
          setIsLoading(false)
          setError(null)
          return
        } catch {
          // Continue with new request if in-flight request failed
        }
      }

      setIsLoading(true)
      setError(null)

      try {
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

        const requestStartTime = performance.now()

        const requestPromise = client
          .request(GET_EXPENSE_REQUESTS_BY_EMPLOYEE, variables, {
            signal: controller.signal
          })
          .finally(() => {
            inflightRef.current.delete(requestKey)
          })

        inflightRef.current.set(requestKey, requestPromise)
        const data = await requestPromise

        const requestDuration = performance.now() - requestStartTime
        console.log(`ExpenseRequests: GraphQL request completed in ${requestDuration.toFixed(2)}ms`)

        const count = data?.ExpenseRequestAggregate?.aggregate?.count ?? 0
        const fetchedItems = data?.ExpenseRequest ?? []

        pageCacheRef.current.set(cacheKey, { items: fetchedItems, totalCount: count })

        setTotalCount(count)
        setItems(fetchedItems)
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
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
