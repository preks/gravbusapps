import { useState, useEffect, useCallback, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  GET_EXPENSE_REQUESTS_BY_MANAGER,
  APPROVE_EXPENSE_REQUEST,
  REJECT_EXPENSE_REQUEST,
  GET_EXPENSE_REQUEST_STATISTICS,
  GET_EXPENSE_REQUEST_STATISTICS_WITH_CURRENCY
} from '../queries/expenseRequests'
import { env } from '@/common/env/EnvUtils'

export interface UseGetExpenseRequestsProps extends Pick<BusinessAppContextProps, 'accessToken' | 'userInfo'> {
  pageSize?: number
  searchTerm?: string
  currentStatusFilter?: string[] | null
  currentCurrencyFilter?: string | null
  statisticsOnly?: boolean
}

export interface ExpenseRequest {
  id: string
  code?: string
  title: string
  description?: string
  requestDate?: string
  startDate?: string | null
  endDate?: string | null
  amount: number
  totalAmount?: number
  currency: string
  status: string
  createdAt?: string
  updatedAt?: string
  attachments?: {
    fileUrl: string
    fileName: string
  }[]
  requestType?: {
    value: string
    translations?: Array<{
      value: string
      localeCode: string
    }>
  }
  /**
   * Linked expense plan (if any). Added to avoid 'any' assertions when rendering Plan Code.
   */
  expensePlan?: {
    code?: string
    requestType?: {
      value: string
      translations?: Array<{
        value: string
        localeCode: string
      }>
    }
  } | null
  employeeDocument?: {
    file: string
    fileSize: number
    id: string
    description: string
    mimeType: string
    name: string
    type: string
    employee: {
      id: string
    }
  } | null
  employee?: {
    id: string
    code?: string
    displayName?: string
    fullName: string
    firstName: string
    lastName: string
    department?: string
    pictureThumbnail?: string
    employeePosition?: {
      organizationalUnit?: {
        id: string
        name: string
      }
      siteLocation?: {
        id: string
        name: string
      }
    }
    additionalProperties?: {
      [key: string]: any
    }
  }
  currencyRef?: string
}

export interface ExpenseRequestStatisticsData {
  pendingCount: number
  pendingAmount: number | null
  totalRequestsSubmitted: number
  totalSubmittedAmount: number | null
}

export type SortField = 'title' | 'requestDate' | 'startDate' | 'endDate' | 'amount' | 'status' | 'employee.fullName'

export type SortOrder = 'ASC' | 'DESC'

export interface SortConfig {
  field: SortField
  order: SortOrder
}

export interface ExpenseRequestsResult {
  requests: ExpenseRequest[]
  isLoading: boolean
  error: string | null
  totalCount: number
  fetchRequests: (
    searchTerm?: string,
    page?: number,
    pageSize?: number,
    sortBy?: string,
    status?: string[],
    requestDateStart?: string,
    currencyFilter?: string | null
  ) => Promise<void>
  approveRequest: (requestId: string) => Promise<boolean>
  rejectRequest: (requestId: string, rejectionReason?: string) => Promise<boolean>
  requestStats: ExpenseRequestStatisticsData | null
  requestStatsLoading: boolean
  requestStatsError: string | null
  fetchRequestStatistics: (currencyFilter?: string | null) => Promise<void>
  sorting: SortConfig
  updateSorting: (field: SortField) => void
}

/**
 * Hook to fetch expense requests for team members with pagination, search, and filtering support
 * @param context Business app context containing user info and access token
 * @returns Object containing expense requests, loading state, error, total count, and fetch function
 */
export const useGetExpenseRequests = ({
  accessToken,
  userInfo,
  pageSize = 20,
  searchTerm,
  currentStatusFilter,
  currentCurrencyFilter,
  statisticsOnly = false
}: UseGetExpenseRequestsProps): ExpenseRequestsResult => {
  const [requests, setRequests] = useState<ExpenseRequest[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState<number>(0)
  const [requestStats, setRequestStats] = useState<ExpenseRequestStatisticsData | null>(null)
  const [requestStatsLoading, setRequestStatsLoading] = useState<boolean>(false)
  const [requestStatsError, setRequestStatsError] = useState<string | null>(null)

  const [sorting, setSorting] = useState<SortConfig>({
    field: 'requestDate',
    order: 'DESC'
  })

  const supervisorEmployeeId = userInfo?.employeeDetails?.employeeId || '00000000-0000-0000-0000-000000000000'

  const lastFetchParams = useRef<{
    searchTerm: string
    page: number
    pageSize: number
    sortBy: string
    status: string[]
    requestDateStart?: string
    currencyFilter?: string | null
  } | null>(null)

  const lastStatsFetchParams = useRef<{
    currencyFilter?: string | null
  } | null>(null)

  /**
   *
   */
  const mapResponseToRequests = (data: any): ExpenseRequest[] => {
    const fetchedRequests = data?.ExpenseRequest ?? []

    return fetchedRequests.map((request: any) => {
      return {
        id: request.id,
        code: request.code,
        title: request.title ?? 'Untitled Request',
        description: request.description,
        requestDate: request.requestDate,
        startDate: request.startDate,
        endDate: request.endDate,
        amount: request.totalAmount,
        currency: (() => {
          const extractedCurrency = request.currencyRef ? request.currencyRef.replaceAll('Currency:v1:', '') : 'EUR'

          return extractedCurrency
        })(),
        status: request.status ?? 'PENDING',
        attachments: request.employeeDocument
          ? [
              {
                fileUrl: request.employeeDocument.file,
                fileName: request.employeeDocument.name
              }
            ]
          : [],
        employeeDocument: request.employeeDocument || null,
        employee: request.employee
          ? {
              id: request.employee.id,
              displayName: request.employee.displayName,
              fullName: request.employee.fullName,
              department: request.employee.employeePosition?.organizationalUnit?.name,
              pictureThumbnail: request.employee.pictureThumbnail,
              additionalProperties: request.employee.additionalProperties
            }
          : undefined,
        // expose linked plan code for table column
        expensePlan: request.expensePlan ? { code: request.expensePlan.code } : undefined
      }
    })
  }

  const fetchRequests = useCallback(
    async (
      searchTerm: string = '',
      page: number = 1,
      pageSize: number = 10,
      sortBy?: string,
      status: string[] = [],
      requestDateStart?: string,
      currencyFilter: string | null = null
    ) => {
      const effectiveSortBy = sortBy || `${sorting.field}:${sorting.order.toLowerCase()}`

      if (!accessToken) {
        setError('Access token not available.')
        setIsLoading(false)
        return
      }

      const currentParams = {
        searchTerm: searchTerm || '',
        page,
        pageSize,
        sortBy: effectiveSortBy,
        status: status || [],
        requestDateStart,
        currencyFilter
      }

      const isDuplicateRequest =
        lastFetchParams.current &&
        lastFetchParams.current.searchTerm === currentParams.searchTerm &&
        lastFetchParams.current.page === currentParams.page &&
        lastFetchParams.current.pageSize === currentParams.pageSize &&
        lastFetchParams.current.sortBy === currentParams.sortBy &&
        JSON.stringify(lastFetchParams.current.status) === JSON.stringify(currentParams.status) &&
        lastFetchParams.current.requestDateStart === currentParams.requestDateStart &&
        lastFetchParams.current.currencyFilter === currentParams.currencyFilter

      if (isDuplicateRequest) {
        return
      }

      lastFetchParams.current = currentParams

      setIsLoading(true)
      setError(null)

      try {
        const offset = (page - 1) * pageSize

        const whereClause: Record<string, any> = {
          employee: {
            employeePosition: {
              supervisorEmployeeId: { _eq: supervisorEmployeeId }
            }
          },
          isDeleted: { _eq: false }
        }

        if (currencyFilter) {
          whereClause.currencyRef = { _eq: `Currency:v1:${currencyFilter}` }
        }

        if (searchTerm && searchTerm.trim() !== '') {
          whereClause._or = [{ title: { _ilike: `%${searchTerm}%` } }, { description: { _ilike: `%${searchTerm}%` } }]
        }

        if (status && status.length > 0) {
          const mappedStatuses = status.map(statusValue => {
            let actualStatus = statusValue

            const validStatuses = [
              'PENDING',
              'APPROVED',
              'VERIFIED',
              'BOOKED',
              'TRANSFERRED',
              'PAID',
              'CLOSED',
              'RETURNED',
              'REJECTED'
            ]

            if (validStatuses.includes(statusValue.toUpperCase())) {
              actualStatus = statusValue.toUpperCase()
            } else if (statusValue.toLowerCase() === 'in_approval') {
              actualStatus = 'PENDING'
            }

            return actualStatus
          })

          whereClause.status = { _in: mappedStatuses }
        } else {
          // Exclude CREATED status by default when no specific filter is provided
          whereClause.status = { _neq: 'CREATED' }
        }

        // Parse the sortBy parameter to create orderBy array
        let orderBy: any[] | undefined = [{ requestDate: 'DESC' }] // Default sorting
        if (effectiveSortBy && effectiveSortBy !== 'none') {
          const [field, order] = effectiveSortBy.split(':')
          if (field && order) {
            const orderDirection = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'

            // Handle nested fields like 'employee.fullName'
            if (field.includes('.')) {
              const [parent, child] = field.split('.')
              // Try different approaches for nested field sorting
              if (parent === 'employee' && child === 'fullName') {
                // Try sorting by firstName and lastName separately
                orderBy = [{ employee: { firstName: orderDirection } }, { employee: { lastName: orderDirection } }]
              } else {
                orderBy = [{ [parent]: { [child]: orderDirection } }]
              }
            } else if (field === 'amount') {
              // The GraphQL server is receiving the correct sorting parameters
              // but the sorting is still not working correctly. This suggests the issue
              // is in the GraphQL server or database handling of the totalAmount field.
              //
              // Since the data is numeric but sorting isn't working, this appears to be
              // a server-side issue with how the totalAmount field is handled for sorting.
              orderBy = [{ totalAmount: orderDirection }]
            } else if (field === 'requestDate') {
              orderBy = [{ requestDate: orderDirection }]
            } else if (field === 'status') {
              orderBy = [{ status: orderDirection }]
            } else if (field === 'title') {
              orderBy = [{ title: orderDirection }]
            } else if (field === 'startDate') {
              orderBy = [{ startDate: orderDirection }]
            } else if (field === 'endDate') {
              orderBy = [{ endDate: orderDirection }]
            } else {
              orderBy = [{ [field]: orderDirection }]
            }
          }
        } else if (effectiveSortBy === 'none') {
          // No sorting - use natural order (no orderBy parameter)
          orderBy = undefined
        }

        const variables: any = {
          where: whereClause,
          limit: pageSize,
          offset
        }

        // Only include orderBy if it's defined
        if (orderBy) {
          variables.orderBy = orderBy
        }

        const response = await fetch(env('NEXT_PUBLIC_GRAPHQL_ENDPOINT_NEWWORK')!, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            query: GET_EXPENSE_REQUESTS_BY_MANAGER,
            variables
          })
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`)
        }

        const result = await response.json()

        if (result.errors) {
          console.error('GraphQL errors:', result.errors)
          throw new Error(result.errors.map((e: any) => e.message).join(', '))
        }

        const count = result.data?.ExpenseRequestAggregate?.aggregate?.count ?? 0
        setTotalCount(count)

        const mappedRequests = mapResponseToRequests(result.data)

        setRequests(mappedRequests)
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
        setRequests([])
        setTotalCount(0)
      } finally {
        setIsLoading(false)
      }
    },
    [accessToken, supervisorEmployeeId, setIsLoading, setError, setRequests, setTotalCount]
  )

  const approveRequest = useCallback(
    async (requestId: string): Promise<boolean> => {
      if (!accessToken) {
        setError('Access token not available for approval.')
        return false
      }

      try {
        const response = await fetch(env('NEXT_PUBLIC_GRAPHQL_ENDPOINT_NEWWORK')!, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            query: APPROVE_EXPENSE_REQUEST,
            variables: { requestId }
          })
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const result = await response.json()

        if (result.errors && result.errors.length > 0) {
          throw new Error(result.errors.map((e: any) => e.message).join(', '))
        }

        setRequests(prevRequests =>
          prevRequests.map(request => (request.id === requestId ? { ...request, status: 'APPROVED' } : request))
        )
        return true
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
        return false
      }
    },
    [accessToken, setError, setRequests]
  )

  const rejectRequest = useCallback(
    async (requestId: string, rejectionReason?: string): Promise<boolean> => {
      if (!accessToken) {
        setError('Access token not available for rejection.')
        return false
      }

      try {
        const response = await fetch(env('NEXT_PUBLIC_GRAPHQL_ENDPOINT_NEWWORK')!, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            query: REJECT_EXPENSE_REQUEST,
            variables: {
              requestId,
              rejectionReason: rejectionReason || ''
            }
          })
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const result = await response.json()

        if (result.errors && result.errors.length > 0) {
          throw new Error(result.errors.map((e: any) => e.message).join(', '))
        }

        setRequests(prevRequests =>
          prevRequests.map(request => (request.id === requestId ? { ...request, status: 'REJECTED' } : request))
        )
        return true
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
        return false
      }
    },
    [accessToken, setError, setRequests]
  )

  const fetchRequestStatistics = useCallback(
    async (currencyFilter?: string | null) => {
      if (!accessToken) {
        setRequestStatsError('Access token not available for statistics.')
        setRequestStatsLoading(false)
        return
      }

      if (lastStatsFetchParams.current && lastStatsFetchParams.current.currencyFilter === currencyFilter) {
        return
      }

      lastStatsFetchParams.current = { currencyFilter }

      setRequestStatsLoading(true)
      setRequestStatsError(null)
      try {
        const query = currencyFilter ? GET_EXPENSE_REQUEST_STATISTICS_WITH_CURRENCY : GET_EXPENSE_REQUEST_STATISTICS

        const variables = currencyFilter
          ? {
              employeeId: supervisorEmployeeId,
              currencyRef: `Currency:v1:${currencyFilter}`
            }
          : {
              employeeId: supervisorEmployeeId
            }

        const response = await fetch(env('NEXT_PUBLIC_GRAPHQL_ENDPOINT_NEWWORK')!, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            query,
            variables
          })
        })
        const result = await response.json()
        if (result.errors) {
          throw new Error(result.errors.map((e: any) => e.message).join(', '))
        }

        const data = result.data

        const stats = {
          pendingCount: data.pendingRequests?.aggregate?.count ?? 0,
          pendingAmount: data.pendingAmount?.aggregate?.sum?.totalAmount ?? null,
          totalRequestsSubmitted: data.totalRequestsSubmitted?.aggregate?.count ?? 0,
          totalSubmittedAmount: data.totalSubmittedAmount?.aggregate?.sum?.totalAmount ?? null
        }

        setRequestStats(stats)
      } catch (err: any) {
        console.error(err)
        setRequestStatsError(err.message ?? 'Failed to fetch expense request statistics.')
        setRequestStats(null)
      } finally {
        setRequestStatsLoading(false)
      }
    },
    [accessToken, supervisorEmployeeId, setRequestStats, setRequestStatsLoading, setRequestStatsError]
  )

  useEffect(() => {
    if (!statisticsOnly) {
      fetchRequests(
        searchTerm || '',
        1,
        pageSize,
        undefined,
        currentStatusFilter || [],
        undefined,
        currentCurrencyFilter
      )
    }
  }, [fetchRequests, statisticsOnly, searchTerm, pageSize, currentStatusFilter, currentCurrencyFilter])

  useEffect(() => {
    if (currentCurrencyFilter) {
      fetchRequestStatistics(currentCurrencyFilter)
    }
  }, [currentCurrencyFilter, fetchRequestStatistics])

  const updateSorting = useCallback((field: SortField) => {
    setSorting(prevSorting => {
      if (prevSorting.field === field) {
        return {
          field,
          order: prevSorting.order === 'ASC' ? 'DESC' : 'ASC'
        }
      }

      return {
        field,
        order: 'DESC'
      }
    })
  }, [])

  return {
    requests,
    isLoading,
    error,
    totalCount,
    fetchRequests,
    approveRequest,
    rejectRequest,
    requestStats,
    requestStatsLoading,
    requestStatsError,
    fetchRequestStatistics,
    sorting,
    updateSorting
  }
}
