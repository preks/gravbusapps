import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { GET_EXPENSE_ITEMS_BY_EMPLOYEE_WHERE, GET_EXPENSE_ITEM_BY_ID } from '../queries/expenseItems'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

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
  noReceipt?: boolean
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
    sortField?: string | null,
    sortOrder?: 'ascend' | 'descend' | null
  ) => Promise<void>
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
      sortField?: string | null,
      sortOrder?: 'ascend' | 'descend' | null
    ) => {
      const trimmedSearch = (searchTerm || '').trim()
      const offset = (page - 1) * pageSize

      // Build dynamic where clause to avoid forcing currency when not selected
      const where: Record<string, any> = {
        employeeId: { _eq: employeeId },
        isDeleted: { _eq: false },
        // exclude allowance
        expenseClass: { _not: { code: { _eq: 'ALLOWANCE' } } },
        // always exclude discarded
        status: { _nin: ['DISCARDED'] }
      }

      if (trimmedSearch) {
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

      if (filter?.status) {
        where.status = { ...(where.status || {}), _in: filter.status }
      }

      if (filter?.expenseDateStart || filter?.expenseDateEnd) {
        where.expenseDate = {
          ...(filter?.expenseDateStart ? { _gte: filter.expenseDateStart } : {}),
          ...(filter?.expenseDateEnd ? { _lte: filter.expenseDateEnd } : {})
        }
      }

      if (filter?.totalAmountMin !== undefined || filter?.totalAmountMax !== undefined) {
        where.totalAmount = {
          ...(filter?.totalAmountMin !== undefined && filter.totalAmountMin !== null
            ? { _gte: filter.totalAmountMin }
            : {}),
          ...(filter?.totalAmountMax !== undefined && filter.totalAmountMax !== null
            ? { _lte: filter.totalAmountMax }
            : {})
        }
      }

      if (filter?.currencyRef) {
        where.currencyRef = { _eq: filter.currencyRef }
      }

      const variables: Record<string, any> = {
        limit: pageSize,
        offset,
        where
      }

      // Add orderBy for server-side sorting
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
        variables.orderBy = [{ [gqlField]: direction }]
      } else {
        variables.orderBy = [{ expenseDate: 'DESC' }]
      }

      return variables
    },
    []
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
      sortField?: string | null,
      sortOrder?: 'ascend' | 'descend' | null
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

      setIsLoading(true)
      setError(null)

      try {
        // Build query variables with helper function
        const variables = buildQueryVariables(employeeId, searchTerm, page, pageSize, filter, sortField, sortOrder)

        const result = await graphqlClient.request<any>(GET_EXPENSE_ITEMS_BY_EMPLOYEE_WHERE, variables)
        const count = result?.ExpenseItemAggregate?.aggregate?.count ?? 0
        setTotalCount(count)

        // Map the items using helper function
        let mappedItems = mapResponseToItems(result)

        // Apply client-side filtering for expenseClass
        if (filter?.expenseClass && filter.expenseClass.value) {
          mappedItems = mappedItems.filter(item => item.expenseClass?.value === filter.expenseClass?.value)
        }

        // Apply client-side filtering for items with no receipts
        if (filter?.noReceipt) {
          // Apply the filter with stronger type checking
          mappedItems = mappedItems.filter(item => {
            // More robust check for no attachments
            const hasNoAttachments = !Array.isArray(item.expenseItemFile) || item.expenseItemFile.length === 0
            return hasNoAttachments
          })
        }

        // Update total count based on filtered results if any client-side filtering was applied
        if (filter?.expenseClass || filter?.noReceipt) {
          setTotalCount(mappedItems.length)
        }

        setItems(mappedItems)
      } catch (err) {
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
      graphqlClient
    ]
  )

  // Initial fetch on component mount (configurable)
  useEffect(() => {
    if (options?.autoFetch !== false) {
      fetchItems()
    }
  }, [fetchItems, options?.autoFetch])

  return { items, isLoading, error: error?.message ?? null, totalCount, fetchItems }
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
