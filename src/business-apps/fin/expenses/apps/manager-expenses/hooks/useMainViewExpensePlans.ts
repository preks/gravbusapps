import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { message } from 'antd'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { GET_MAIN_VIEW_EXPENSE_PLANS, GET_MAIN_VIEW_EXPENSE_PLAN_STATISTICS } from '../queries/mainViewExpensePlans'
import { APPROVE_EXPENSE_PLAN, REJECT_EXPENSE_PLAN } from '../queries/expensePlans'
import { env } from '@/common/env/EnvUtils'
import { extractCurrencyCode } from '../utils/currencyUtils'

export interface ExpensePlan {
  id: string
  code: string
  title: string
  description: string | null
  status: string
  startDate: string
  endDate: string
  planDate: string
  totalAmount: number
  currency: string
  currencyRef?: string
  createdAt: string
  updatedAt: string
  requestType?: {
    value: string
    translations?: Array<{
      value: string
      localeCode: string
    }>
  }
  type?: {
    value: string
    translations?: Array<{
      value: string
      localeCode: string
    }>
  }
  expenseRequest?: Array<{
    id: string
    code?: string
    requestType?: {
      value: string
      translations?: Array<{
        value: string
        localeCode: string
      }>
    }
  }>
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
  employee: {
    id: string
    code?: string
    displayName?: string
    fullName: string
    pictureThumbnail?: string
    additionalProperties?: {
      [key: string]: any
    }
    employeePosition: {
      organizationalUnit: {
        id: string
        name: string
      }
      siteLocation: {
        id: string
        name: string
      }
    }
  }
}

export interface ExpensePlanResponse {
  ExpensePlan: (ExpensePlan & { currencyRef?: string })[]
  ExpensePlanAggregate: {
    aggregate: {
      count: number
    }
  }
}

export interface ExpensePlanStatistics {
  totalCount: number
  sumTotalAmount: number | null
  pendingCount: number
  pendingAmount: number | null
}

interface ExpensePlanStatisticsResponse {
  allPlansStats?: {
    aggregate: {
      totalCount: number
      sum?: {
        totalAmount: number | null
      }
    }
  }
  pendingPlansStats?: {
    aggregate: {
      pendingCount: number
    }
  }
  pendingAmountStats?: {
    aggregate: {
      sum?: {
        totalAmount: number | null
      }
    }
  }
  allPendingPlansDebug?: {
    aggregate: {
      count: number
    }
  }
}

export type SortField = 'createdAt' | 'startDate' | 'endDate' | 'totalAmount' | 'status' | 'title' | 'employee.fullName'
export type SortOrder = 'ASC' | 'DESC'

export interface SortConfig {
  field: SortField | null
  order: SortOrder | null
  lastField: SortField | null
}

interface UseMainViewExpensePlansProps extends Partial<BusinessAppContextProps> {
  pageSize?: number
  searchTerm?: string
  currentStatusFilter?: string[] | null
  currentCurrencyFilter?: string | null
  statisticsOnly?: boolean // If true, only fetch statistics, skip main data
  sortConfig?: SortConfig
}

export const useMainViewExpensePlans = ({
  accessToken,
  userInfo,
  pageSize = 20,
  searchTerm,
  currentStatusFilter,
  currentCurrencyFilter,
  statisticsOnly = false
}: UseMainViewExpensePlansProps) => {
  const hookId = useMemo(() => Math.random().toString(36).substring(7), [])

  // Get managerId from userInfo or use a fallback for development
  const managerId = userInfo?.employeeDetails?.employeeId || '00000000-0000-0000-0000-000000000000'

  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<Error | null>(null)
  const [plans, setPlans] = useState<ExpensePlan[]>([])
  const [totalCount, setTotalCount] = useState<number>(0)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [sorting, setSorting] = useState<SortConfig>({
    field: null,
    order: null,
    lastField: null
  })
  const [employeeFilter, setEmployeeFilter] = useState<string | null>(null)
  const [approving, setApproving] = useState<boolean>(false)
  const [rejecting, setRejecting] = useState<boolean>(false)
  const [planStats, setPlanStats] = useState<ExpensePlanStatistics | null>(null)
  const [statsLoading, setStatsLoading] = useState<boolean>(false)
  const [statsError, setStatsError] = useState<Error | null>(null)

  // Reference to store the last fetch parameters to prevent duplicate fetches
  const lastFetchParams = useRef<{
    filter: string[] | null
    currencyFilter: string | null
    sortConfig: SortConfig
    page: number
    pageSize: number
    searchTerm: string
  } | null>(null)

  // Reference for stats debounce timer
  const statsDebounceTimer = useRef<NodeJS.Timeout | null>(null)

  // Reference to store the last stats fetch parameters
  const lastStatsFetchParams = useRef<{
    currencyFilter: string | null
  } | null>(null)

  const fetchPlans = useCallback(
    async (forceFilter?: string[] | null, forceCurrencyFilter?: string | null, forceSortConfig?: SortConfig) => {
      // Use forced filter or current filter - this prevents stale closure issues
      const activeFilter = forceFilter !== undefined ? forceFilter : currentStatusFilter
      const activeCurrencyFilter = forceCurrencyFilter !== undefined ? forceCurrencyFilter : currentCurrencyFilter
      const activeSortConfig = forceSortConfig || sorting
      const offset = (currentPage - 1) * pageSize
      const searchValue = searchTerm ? `%${searchTerm}%` : '%%'

      // Check if we already fetched with these exact parameters to prevent duplicate fetches
      const currentFetchParams = {
        filter: activeFilter || null, // Ensure it's never undefined
        currencyFilter: activeCurrencyFilter || null, // Ensure it's never undefined
        sortConfig: activeSortConfig,
        page: currentPage,
        pageSize,
        searchTerm: searchTerm || ''
      }

      // Skip if parameters haven't changed
      if (lastFetchParams.current && JSON.stringify(lastFetchParams.current) === JSON.stringify(currentFetchParams)) {
        return
      }

      // Update last fetch parameters
      lastFetchParams.current = currentFetchParams

      if (!accessToken) {
        setError(new Error('Access token not found. Cannot fetch expense plans.'))
        setLoading(false)
        return
      }

      if (!managerId) {
        setError(new Error('Manager ID not found. Cannot fetch expense plans.'))
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        // Build the where clause for filtering
        const whereClause: Record<string, any> = {
          employee: {
            employeePosition: {
              supervisorEmployeeId: { _eq: managerId }
            }
          },
          isDeleted: { _eq: false }
        }

        // Add currency filtering if specified
        if (currentCurrencyFilter) {
          whereClause.currencyRef = {
            _eq: `Currency:v1:${currentCurrencyFilter}`
          }
        }

        // Add search functionality
        if (searchTerm && searchTerm.trim() !== '') {
          whereClause._or = [
            { code: { _ilike: searchValue } },
            { title: { _ilike: searchValue } },
            { employee: { fullName: { _ilike: searchValue } } }
          ]
        }

        // Add status filtering to server-side query
        if (activeFilter && activeFilter.length > 0) {
          whereClause.status = { _in: activeFilter }
        } else {
          // Exclude CREATED status by default when no specific filter is provided
          whereClause.status = { _neq: 'CREATED' }
        }

        // Build the orderBy configuration based on the sort field and order
        let orderBy: Record<string, any>[] | undefined = undefined

        // Only add orderBy if sorting is active
        if (activeSortConfig.field && activeSortConfig.order) {
          orderBy = []

          // Handle specific nested fields with proper GraphQL structure
          if (activeSortConfig.field === 'employee.fullName') {
            // For employee fullName, sort by firstName and lastName separately
            orderBy = [
              { employee: { firstName: activeSortConfig.order } },
              { employee: { lastName: activeSortConfig.order } }
            ]
          } else if (activeSortConfig.field.includes('.')) {
            // Handle other nested fields
            const [parent, child] = activeSortConfig.field.split('.')
            orderBy = [{ [parent]: { [child]: activeSortConfig.order } }]
          } else {
            // Handle regular fields
            orderBy = [{ [activeSortConfig.field]: activeSortConfig.order }]
          }
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
            query: GET_MAIN_VIEW_EXPENSE_PLANS,
            variables
          })
        })

        const result = await response.json()

        if (result.errors) {
          throw new Error(result.errors[0].message)
        }

        const data = result.data as ExpensePlanResponse

        let plans = data.ExpensePlan

        // Map currency information from currencyRef field (for display purposes)
        plans = plans.map(plan => ({
          ...plan,
          currency: plan.currencyRef ? extractCurrencyCode(plan.currencyRef) || 'EUR' : 'EUR'
        }))

        // Filter by employee if specified (this is still client-side as it's a specific filter)
        if (employeeFilter) {
          plans = plans.filter(plan => plan.employee?.id === employeeFilter)
        }

        setPlans(plans || [])
        // Use server response count for total count since filtering is now server-side
        setTotalCount(data.ExpensePlanAggregate?.aggregate?.count || 0)
      } catch (err) {
        console.error('Error fetching expense plans:', err)
        setError(err instanceof Error ? err : new Error('Failed to fetch expense plans'))
      } finally {
        setLoading(false)
      }
    },
    [
      accessToken,
      managerId,
      currentPage,
      pageSize,
      searchTerm,
      currentStatusFilter,
      employeeFilter,
      hookId,
      currentCurrencyFilter,
      sorting
    ]
  )

  // Effect to fetch plans when dependencies change
  useEffect(() => {
    if (!statisticsOnly) {
      fetchPlans(currentStatusFilter, currentCurrencyFilter, sorting) // Pass current filter to prevent stale closure
    }
  }, [
    fetchPlans,
    statisticsOnly,
    hookId,
    currentStatusFilter,
    currentCurrencyFilter,
    sorting,
    currentPage,
    pageSize,
    searchTerm
  ])

  // Function to fetch plan statistics
  const fetchPlanStatistics = useCallback(
    async (forceCurrencyFilter?: string | null) => {
      if (!accessToken || !managerId) {
        return
      }

      // Use forced currency filter or current filter
      const activeCurrencyFilter = forceCurrencyFilter !== undefined ? forceCurrencyFilter : currentCurrencyFilter

      // Check if this is a duplicate request with the same parameters
      if (lastStatsFetchParams.current && lastStatsFetchParams.current.currencyFilter === activeCurrencyFilter) {
        return
      }

      // Update last fetch parameters
      lastStatsFetchParams.current = {
        currencyFilter: activeCurrencyFilter || null
      }

      setStatsLoading(true)
      setStatsError(null)
      try {
        const currencyRefValue = activeCurrencyFilter ? `Currency:v1:${activeCurrencyFilter}` : 'Currency:v1:EUR' // Default to EUR if no currency filter

        const response = await fetch(env('NEXT_PUBLIC_GRAPHQL_ENDPOINT_NEWWORK')!, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            query: GET_MAIN_VIEW_EXPENSE_PLAN_STATISTICS,
            variables: {
              managerId,
              currencyRef: currencyRefValue
            }
          })
        })
        const result = await response.json()

        if (result.errors) {
          throw new Error(result.errors[0].message)
        }

        const data = result.data as ExpensePlanStatisticsResponse

        const stats = {
          totalCount: data.allPlansStats?.aggregate.totalCount || 0,
          sumTotalAmount: data.allPlansStats?.aggregate.sum?.totalAmount || null,
          pendingCount: data.pendingPlansStats?.aggregate.pendingCount || 0,
          pendingAmount: data.pendingAmountStats?.aggregate.sum?.totalAmount || null
        }

        setPlanStats(stats)
      } catch (err) {
        console.error('Error fetching expense plan statistics:', err)
        setStatsError(err instanceof Error ? err : new Error('Failed to fetch expense plan statistics'))
      } finally {
        setStatsLoading(false)
      }
    },
    [accessToken, managerId, currentCurrencyFilter]
  )

  // Effect to debounce statistics fetch
  useEffect(() => {
    // Clear any existing timer
    if (statsDebounceTimer.current) {
      clearTimeout(statsDebounceTimer.current)
    }

    // Set a new timer to debounce the fetch
    statsDebounceTimer.current = setTimeout(() => {
      fetchPlanStatistics()
    }, 300) // 300ms debounce delay

    // Cleanup function to clear the timer if the component unmounts
    return () => {
      if (statsDebounceTimer.current) {
        clearTimeout(statsDebounceTimer.current)
      }
    }
  }, [fetchPlanStatistics, statisticsOnly, currentCurrencyFilter, hookId])

  // Effect to fetch statistics on mount and when currency changes
  useEffect(() => {
    if (!statisticsOnly && currentCurrencyFilter) {
      fetchPlanStatistics()
    }
  }, [statisticsOnly, currentCurrencyFilter, hookId, fetchPlanStatistics])

  // Function to approve expense plan
  const approvePlan = useCallback(
    async (planId: string, comments?: string) => {
      if (!accessToken || !managerId) return

      setApproving(true)
      try {
        const response = await fetch(env('NEXT_PUBLIC_GRAPHQL_ENDPOINT_NEWWORK')!, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            query: APPROVE_EXPENSE_PLAN,
            variables: {
              planId,
              approverEmployeeId: managerId,
              comments: comments ?? null
            }
          })
        })

        const result = await response.json()

        if (result.errors) {
          console.error('GraphQL errors in approve plan:', result.errors)
          throw new Error(result.errors[0].message)
        }

        message.success('Expense plan approved successfully')
        fetchPlans(currentStatusFilter, currentCurrencyFilter) // Pass current filters to refresh with same filters
        fetchPlanStatistics(currentCurrencyFilter)
      } catch (err) {
        console.error('Error approving expense plan:', err)
        message.error('Failed to approve expense plan')
      } finally {
        setApproving(false)
      }
    },
    [accessToken, managerId, fetchPlans, fetchPlanStatistics, currentStatusFilter, currentCurrencyFilter]
  )

  // Function to reject expense plan
  const rejectPlan = useCallback(
    async (planId: string, reason: string) => {
      if (!accessToken || !managerId) return

      setRejecting(true)
      try {
        const response = await fetch(env('NEXT_PUBLIC_GRAPHQL_ENDPOINT_NEWWORK')!, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            query: REJECT_EXPENSE_PLAN,
            variables: {
              planId,
              rejectorEmployeeId: managerId,
              reason
            }
          })
        })

        const result = await response.json()

        if (result.errors) {
          console.error('GraphQL errors in reject plan:', result.errors)
          throw new Error(result.errors[0].message)
        }

        message.success('Expense plan rejected successfully')
        fetchPlans(currentStatusFilter, currentCurrencyFilter) // Pass current filters to refresh with same filters
        fetchPlanStatistics(currentCurrencyFilter)
      } catch (err) {
        console.error('Error rejecting expense plan:', err)
        message.error('Failed to reject expense plan')
      } finally {
        setRejecting(false)
      }
    },
    [accessToken, managerId, fetchPlans, fetchPlanStatistics, currentStatusFilter, currentCurrencyFilter]
  )

  // Function to update sorting configuration with three-state cycle
  const updateSorting = useCallback((field: SortField) => {
    setSorting(prevSorting => {
      // If clicking the same field, cycle through: ASC -> DESC -> Default (null)
      if (prevSorting.lastField === field) {
        if (prevSorting.order === 'ASC') {
          return { field, order: 'DESC', lastField: field }
        } else if (prevSorting.order === 'DESC') {
          return { field: null, order: null, lastField: null }
        } else {
          return { field, order: 'ASC', lastField: field }
        }
      }

      // If clicking a new field, start with ASC
      return { field, order: 'ASC', lastField: field }
    })
    // Reset to first page when sorting changes
    setCurrentPage(1)
  }, [])

  return {
    plans,
    loading,
    error,
    totalCount,
    currentPage,
    setCurrentPage,
    employeeFilter,
    setEmployeeFilter,
    approving,
    rejecting,
    approvePlan,
    rejectPlan,
    planStats,
    statsLoading,
    statsError,
    sorting,
    updateSorting
  }
}
