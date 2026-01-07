import { useState, useEffect, useCallback } from 'react'
import { message } from 'antd'
import {
  GET_EXPENSE_PLANS_BY_MANAGER,
  GET_EXPENSE_PLAN_STATISTICS,
  APPROVE_EXPENSE_PLAN,
  REJECT_EXPENSE_PLAN
} from '../queries/expensePlans'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { env } from '@/common/env/EnvUtils'

export interface ExpensePlan {
  id: string
  code: string
  title: string
  description: string | null
  status: string
  startDate: string
  endDate: string
  planDate: string // Added by user query modification
  totalAmount: number
  currency: string
  createdAt: string
  updatedAt: string
  employeeDocument?: {
    id: string
    file: string
    fileSize?: number
    fileName?: string
    mimeType?: string
  } | null
  employee: {
    id: string
    displayName?: string
    fullName: string
    email: string
    pictureThumbnail?: string
    department: {
      id: string
      name: string
    }
  }
  approvedBy: string | null
  approvedDate: string | null
  approvalComments: string | null
  rejectedBy: string | null
  rejectedDate: string | null
  rejectionReason: string | null
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
      sum?: {
        totalAmount: number | null
      }
    }
  }
}

interface UseGetExpensePlansProps extends BusinessAppContextProps {
  pageSize?: number
  // We're using managerId from userInfo instead of a separate employeeId parameter
  searchTerm?: string // Added
  currentStatusFilter?: string | null // Added
}

export const useGetExpensePlans = ({
  accessToken,
  userInfo,
  pageSize = 20,
  searchTerm,
  currentStatusFilter
}: UseGetExpensePlansProps) => {
  // Get managerId from userInfo or use a fallback for development
  const managerId = userInfo?.employeeDetails?.employeeId || '00000000-0000-0000-0000-000000000000'

  // Log the managerId to help with debugging
  if (import.meta.env?.DEV) console.log('useGetExpensePlans - managerId:', managerId)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<Error | null>(null)
  const [plans, setPlans] = useState<ExpensePlan[]>([])
  const [totalCount, setTotalCount] = useState<number>(0)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [employeeFilter, setEmployeeFilter] = useState<string | null>(null)
  const [approving, setApproving] = useState<boolean>(false)
  const [rejecting, setRejecting] = useState<boolean>(false)
  const [planStats, setPlanStats] = useState<ExpensePlanStatistics | null>(null)
  const [statsLoading, setStatsLoading] = useState<boolean>(false)
  const [statsError, setStatsError] = useState<Error | null>(null)

  const fetchPlans = useCallback(async () => {
    if (import.meta.env?.DEV) console.log('fetchPlans called with accessToken:', !!accessToken, 'managerId:', managerId)

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
      const searchValue = searchTerm ? `%${searchTerm}%` : '%%'
      const offset = (currentPage - 1) * pageSize

      if (import.meta.env?.DEV) console.log('Fetching expense plans with managerId:', managerId)

      const response = await fetch(env('NEXT_PUBLIC_GRAPHQL_ENDPOINT_NEWWORK')!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          query: GET_EXPENSE_PLANS_BY_MANAGER,
          variables: {
            managerId,
            limit: pageSize,
            offset,
            searchTerm: searchValue,
            status: currentStatusFilter === 'all' || !currentStatusFilter ? null : currentStatusFilter
          }
        })
      })

      const result = await response.json()

      if (result.errors) {
        throw new Error(result.errors[0].message)
      }

      const data = result.data as ExpensePlanResponse
      if (import.meta.env?.DEV)
        console.log('Expense plans data received:', {
          plansCount: data.ExpensePlan?.length,
          totalCount: data.ExpensePlanAggregate?.aggregate?.count,
          firstPlan: data.ExpensePlan?.[0],
          managerId
        })

      // Apply client-side filtering for status and employee
      let filteredPlans = data.ExpensePlan

      // Map currency information from currencyRef field
      filteredPlans = filteredPlans.map(plan => ({
        ...plan,
        currency: plan.currencyRef ? plan.currencyRef.replaceAll('Currency:v1:', '') : 'EUR'
      }))

      // Filter by employee if employeeFilter is set (client-side for now)
      if (employeeFilter) {
        filteredPlans = filteredPlans.filter(plan => plan.employee.id === employeeFilter)
      }

      // Update state with data (status filtering is now server-side)
      setPlans(filteredPlans)
      setTotalCount(data.ExpensePlanAggregate.aggregate.count)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch expense plans'))
      if (import.meta.env?.DEV) console.error('Error fetching expense plans:', err)
    } finally {
      setLoading(false)
    }
  }, [accessToken, managerId, currentPage, pageSize, searchTerm, currentStatusFilter, employeeFilter])

  useEffect(() => {
    fetchPlans()
  }, [fetchPlans])

  const fetchPlanStatistics = useCallback(async () => {
    if (!accessToken || !managerId) {
      setStatsError(new Error('Missing required parameters'))
      setStatsLoading(false)
      return
    }
    setStatsLoading(true)
    setStatsError(null)
    try {
      const response = await fetch(env('NEXT_PUBLIC_GRAPHQL_ENDPOINT_NEWWORK')!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          query: GET_EXPENSE_PLAN_STATISTICS,
          variables: { managerId }
        })
      })
      const result = await response.json()
      if (result.errors) {
        throw new Error(result.errors[0].message)
      }
      const data = result.data as ExpensePlanStatisticsResponse

      if (import.meta.env?.DEV)
        console.log('Expense plan statistics received:', {
          totalCount: data.allPlansStats?.aggregate.totalCount,
          sumTotalAmount: data.allPlansStats?.aggregate.sum?.totalAmount,
          pendingCount: data.pendingPlansStats?.aggregate.pendingCount,
          pendingAmount: data.pendingPlansStats?.aggregate.sum?.totalAmount
        })

      setPlanStats({
        totalCount: data.allPlansStats?.aggregate.totalCount ?? 0,
        sumTotalAmount: data.allPlansStats?.aggregate.sum?.totalAmount ?? null,
        pendingCount: data.pendingPlansStats?.aggregate.pendingCount ?? 0,
        pendingAmount: data.pendingPlansStats?.aggregate.sum?.totalAmount ?? null
      })
    } catch (err) {
      setStatsError(err instanceof Error ? err : new Error('Failed to fetch expense plan statistics'))
      if (import.meta.env?.DEV) console.error('Error fetching expense plan statistics:', err)
    } finally {
      setStatsLoading(false)
    }
  }, [accessToken, managerId])

  useEffect(() => {
    fetchPlanStatistics()
  }, [fetchPlanStatistics])

  const handleEmployeeFilter = (value: string | null) => {
    setEmployeeFilter(value)
    setCurrentPage(1) // Reset to first page on filter change
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const approvePlan = useCallback(
    async (planId: string, comments: string = '') => {
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
          throw new Error(result.errors[0].message)
        }

        message.success('Expense plan approved successfully')
        fetchPlans()
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to approve expense plan'))
        message.error('Failed to approve expense plan')
        if (import.meta.env?.DEV) console.error('Error approving expense plan:', err)
      } finally {
        setApproving(false)
      }
    },
    [accessToken, managerId]
  )

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
          throw new Error(result.errors[0].message)
        }

        message.success('Expense plan rejected successfully')
        fetchPlans()
        fetchPlanStatistics()
      } catch (err) {
        if (import.meta.env?.DEV) console.error('Error rejecting expense plan:', err)
        message.error('Failed to reject expense plan')
      } finally {
        setRejecting(false)
      }
    },
    [accessToken, managerId, fetchPlans, fetchPlanStatistics]
  )

  return {
    loading,
    error,
    plans,
    totalCount,
    currentPage,
    setCurrentPage,
    employeeFilter,
    approving,
    rejecting,
    handleEmployeeFilter,
    handlePageChange,
    approvePlan,
    rejectPlan,
    fetchPlans,
    planStats,
    statsLoading,
    statsError,
    fetchPlanStatistics
  }
}

export default useGetExpensePlans
