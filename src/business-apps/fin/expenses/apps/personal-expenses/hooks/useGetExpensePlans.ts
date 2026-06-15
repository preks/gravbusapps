import { useState, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { GET_EXPENSE_PLANS_BY_EMPLOYEE } from '../queries/expensePlans'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { buildExpensePlanOrderBy } from '../config/expensePlanOrderBy'

// Translation interface for catalog entries
export interface Translation {
  value: string
  localeCode: string
}

// Catalog entry interface for dropdown values
export interface CatalogEntry {
  value: string
  code?: string
  translations: Translation[]
  catalog?: {
    defaultLocale: string
  }
}

// Type for expense plan data
export interface ExpensePlan {
  id: string
  employeeId: string
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
  employeeDocument: any | null
  currency: CatalogEntry | null
  currencyRef: any
  description: string
  requestType: CatalogEntry | null
  expensePlanItem: any[]
  advancePayment: any[] | null
  expenseRequestTrip: any[] | null
  // expenseRequest: any[] | null;
  employee: {
    id: string
    code: string
    firstName: string
    lastName: string
    employeePosition: any
  }
  expenseRequest: Array<{
    id: string
    employeeId: string
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
}

export type ExpensePlanFilter = Record<string, any>

// Type for the hook return value
export interface ExpensePlansDataView {
  items: ExpensePlan[]
  isLoading: boolean
  error: string | null
  totalCount: number
  fetchItems: (
    filters: ExpensePlanFilter,
    page?: number,
    pageSize?: number,
    sortField?: string | null,
    sortOrder?: 'ascend' | 'descend' | null
  ) => Promise<void>
}

export const useGetExpensePlans = (context?: BusinessAppContextProps): ExpensePlansDataView => {
  const accessToken = context?.accessToken
  const employeeId = context?.userInfo?.employeeDetails?.employeeId
  const [items, setItems] = useState<ExpensePlan[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)
  const [totalCount, setTotalCount] = useState<number>(0)
  const graphqlClient = useGraphQLClient(accessToken || '')

  // Function to fetch items with search, pagination, and server-side sorting
  const fetchItems = useCallback(
    async (
      filters: ExpensePlanFilter = {},
      page: number = 1,
      pageSize: number = 20,
      sortField?: string | null,
      sortOrder?: 'ascend' | 'descend' | null
    ) => {
      if (!employeeId) {
        setError(new Error('Employee ID not found. Cannot fetch expense plans.'))
        setItems([])
        setTotalCount(0)
        setIsLoading(false)
        return
      }

      if (!accessToken) {
        setError(new Error('Access token not found. Cannot fetch expense plans.'))
        setItems([])
        setTotalCount(0)
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const offset = (page - 1) * pageSize

        // Build variables object
        const variables: Record<string, any> = {
          employeeId,
          filters,
          limit: pageSize,
          offset: offset
        }

        variables.orderBy = buildExpensePlanOrderBy(sortField, sortOrder)

        const result = await graphqlClient.request<any>(GET_EXPENSE_PLANS_BY_EMPLOYEE, variables)
        const count = result?.ExpensePlanAggregate?.aggregate?.count ?? 0
        setTotalCount(count)

        const fetchedItems = result?.ExpensePlan ?? []
        setItems(fetchedItems)
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)))
        setItems([]) // Clear items on error
        setTotalCount(0)
      } finally {
        setIsLoading(false)
      }
    },
    [employeeId, accessToken, graphqlClient]
  )

  // We only want to run this once when the component mounts and has the required IDs.

  return { items, isLoading, error: error?.message ?? null, totalCount, fetchItems }
}
