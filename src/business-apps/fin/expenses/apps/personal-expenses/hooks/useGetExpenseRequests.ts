import { useState, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { GET_EXPENSE_REQUESTS_BY_EMPLOYEE } from '../queries/expenseRequests'
import { CatalogEntry } from './useGetExpensePlans'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'

// Type for expense request data
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

// Type for the hook return value
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
    sortOrder?: 'ascend' | 'descend' | null
  ) => Promise<void>
}

export const useGetExpenseRequests = (context?: BusinessAppContextProps): ExpenseRequestsDataView => {
  const [items, setItems] = useState<ExpenseRequest[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)
  const [totalCount, setTotalCount] = useState<number>(0)

  // Initialize the GraphQL client at the top level of the hook
  // This is necessary because hooks can only be called at the top level
  const accessToken = context?.accessToken || ''
  const client = useGraphqlClient(accessToken)

  // Function to fetch items with search, pagination, filters, and sorting
  const fetchItems = useCallback(
    async (
      filters: any = {},
      page: number = 1,
      pageSize: number = 20,
      sortField?: string | null,
      sortOrder?: 'ascend' | 'descend' | null
    ) => {
      // Set loading state immediately when function is called
      setIsLoading(true)
      setError(null)

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

      try {
        const offset = (page - 1) * pageSize

        // Build the where clause by combining employee filter with the provided filters
        const whereClause = {
          _and: [
            { employeeId: { _eq: employeeId } },
            { isDeleted: { _eq: false } },
            filters // This is the GraphQL where clause from getFilters()
          ]
        }

        // Build variables object
        const variables: Record<string, any> = {
          limit: pageSize,
          offset: offset,
          where: whereClause
        }

        // Add orderBy for server-side sorting
        if (sortField && sortOrder) {
          // Map UI sort field to GraphQL field names - only include fields that exist in the schema
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
          // Default sorting by request date descending
          variables.orderBy = [{ requestDate: 'DESC' }]
        }

        // Start a performance measurement to track request time
        const requestStartTime = performance.now()

        // Make the request using the GraphQL client
        const data = await client.request(GET_EXPENSE_REQUESTS_BY_EMPLOYEE, variables)

        // Log the request duration
        const requestDuration = performance.now() - requestStartTime
        console.log(`ExpenseRequests: GraphQL request completed in ${requestDuration.toFixed(2)}ms`)

        // Set loading to false immediately after receiving the response
        setIsLoading(false)

        // Get total count from aggregate query
        const count = data?.ExpenseRequestAggregate?.aggregate?.count ?? 0

        // Get the items - server-side filtering is now applied via GraphQL
        const fetchedItems = data?.ExpenseRequest ?? []

        // Update state with the fetched data
        setTotalCount(count)
        setItems(fetchedItems)
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)))
        setItems([]) // Clear items on error
        setTotalCount(0)
        setIsLoading(false) // Make sure to set loading to false in case of error
      }
    },
    [
      context?.userInfo?.employeeDetails?.employeeId,
      context?.accessToken,
      setIsLoading,
      setError,
      setItems,
      setTotalCount
    ]
  )

  return { items, isLoading, error: error?.message ?? null, totalCount, fetchItems }
}
