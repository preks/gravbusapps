import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { ExpenseRequest, ExpensePlan, LeaveRequest, Translation } from '../types/employee.types'

// Define the ApprovalRequest interface based on expense manager structure
export interface ApprovalRequest {
  id: string
  title: string
  description: string | null
  totalAmount: number
  status: string
  requestDate: string
  createdAt: string
  employee: {
    id: string
    fullName: string
    firstName?: string
    lastName?: string
    pictureThumbnail?: string
  }
  // Add type to differentiate between different approval types
  type: 'expense-request' | 'expense-plan' | 'leave' | 'training' | 'other'
  // For leave requests, store the actual dates and type name
  leaveType?: string
  startDate?: string
  endDate?: string
}

export interface UseRequestsToApproveResult {
  approvalTasks: ApprovalRequest[]
  totalCount: number
  expenseRequestCount: number // Expense requests count
  expensePlanCount: number // Expense plans count
  expenseCount: number // Total expense count (requests + plans)
  absenceCount: number // Total absence requests count
  loading: boolean
  error: Error | null
  refetch: () => void
  approveRequest: (requestId: string, comments?: string) => Promise<void>
  rejectRequest: (requestId: string, comments?: string) => Promise<void>
  approving: boolean
  rejecting: boolean
}

interface UseRequestsToApproveProps {
  accessToken: string
  managerId: string
  showAll?: boolean // When true, fetch all requests instead of limiting to 5
}

// GraphQL query for fetching pending approvals (expense and leave requests)
const GET_PENDING_APPROVALS_FOR_DASHBOARD = `
  query GetPendingApprovalsForDashboard($managerId: uuid!, $expenseRequestLimit: Int!, $expensePlanLimit: Int!, $absenceLimit: Int!) {
    # Get expense REQUEST approvals
    ExpenseRequestApprovals: ExpenseRequest(
      where: {
        employee: {
          employeePosition: {
            supervisorEmployeeId: {_eq: $managerId}
          }
        },
        status: {_eq: "PENDING"},
        isDeleted: {_eq: false}
      },
      orderBy: {createdAt: DESC},
      limit: $expenseRequestLimit
    ) {
      id
      title
      description
      totalAmount
      status
      requestDate
      createdAt
      employee {
        id
        fullName
        firstName
        lastName
        pictureThumbnail
      }
    }
    # Get expense PLAN approvals
    ExpensePlanApprovals: ExpensePlan(
      where: {
        employee: {
          employeePosition: {
            supervisorEmployeeId: {_eq: $managerId}
          }
        },
        status: {_eq: "PENDING"},
        isDeleted: {_eq: false}
      },
      orderBy: {createdAt: DESC},
      limit: $expensePlanLimit
    ) {
      id
      title
      description
      totalAmount
      status
      planDate
      createdAt
      employee {
        id
        fullName
        firstName
        lastName
        pictureThumbnail
      }
    }
    # Get absence requests approvals
    LeaveApprovals: EmployeeAbsence(
      where: {
        employee: {
          employeePosition: {
            supervisorEmployeeId: {_eq: $managerId}
          }
        },
        status: {_eq: "PENDING"},
        isDeleted: {_eq: false}
      },
      orderBy: {createdAt: DESC},
      limit: $absenceLimit
    ) {
      id
      startDate
      endDate
      status
      createdAt
      employee {
        id
        firstName
        lastName
        pictureThumbnail
      }
      type {
        value
        translations {
          localeCode
          value
        }
      }
    }
    # Get expense REQUEST approvals count
    ExpenseRequestApprovalsAggregate: ExpenseRequestAggregate(
      where: {
        employee: {
          employeePosition: {
            supervisorEmployeeId: {_eq: $managerId}
          }
        },
        status: {_eq: "PENDING"},
        isDeleted: {_eq: false}
      }
    ) {
      aggregate {
        count
      }
    }
    # Get expense PLAN approvals count
    ExpensePlanApprovalsAggregate: ExpensePlanAggregate(
      where: {
        employee: {
          employeePosition: {
            supervisorEmployeeId: {_eq: $managerId}
          }
        },
        status: {_eq: "PENDING"},
        isDeleted: {_eq: false}
      }
    ) {
      aggregate {
        count
      }
    }
    # Get absence approvals count
    LeaveApprovalsAggregate: EmployeeAbsenceAggregate(
      where: {
        employee: {
          employeePosition: {
            supervisorEmployeeId: {_eq: $managerId}
          }
        },
        status: {_eq: "PENDING"},
        isDeleted: {_eq: false}
      }
    ) {
      aggregate {
        count
      }
    }
  }
`

// Mutations for approve/reject actions for expenses
const APPROVE_EXPENSE_REQUEST = `
  mutation ApproveExpenseRequest($requestId: uuid!, $comments: String) {
    update_ExpenseRequest_by_pk(
      pk_columns: {id: $requestId}, 
      _set: {
        status: "APPROVED",
        comments: $comments
      }
    ) {
      id
      status
    }
  }
`

const REJECT_EXPENSE_REQUEST = `
  mutation RejectExpenseRequest($requestId: uuid!, $comments: String) {
    update_ExpenseRequest_by_pk(
      pk_columns: {id: $requestId}, 
      _set: {
        status: "REJECTED",
        comments: $comments
      }
    ) {
      id
      status
    }
  }
`

// Mutations for approve/reject actions for expense plans
const APPROVE_EXPENSE_PLAN = `
  mutation ApproveExpensePlan($planId: uuid!, $approverEmployeeId: uuid!, $comments: String) {
    update_ExpensePlan(
      where: {id: {_eq: $planId}},
      _set: {
        status: "APPROVED",
        approvedBy: $approverEmployeeId,
        approvedDate: "now()",
        approvalComments: $comments
      }
    ) {
      affected_rows
      returning {
        id
        status
      }
    }
  }
`

const REJECT_EXPENSE_PLAN = `
  mutation RejectExpensePlan($planId: uuid!, $rejectorEmployeeId: uuid!, $reason: String!) {
    update_ExpensePlan(
      where: {id: {_eq: $planId}},
      _set: {
        status: "REJECTED",
        rejectedBy: $rejectorEmployeeId,
        rejectedDate: "now()",
        rejectionReason: $reason
      }
    ) {
      affected_rows
      returning {
        id
        status
      }
    }
  }
`

// Mutations for approve/reject actions for absence requests
const APPROVE_LEAVE_REQUEST = `
  mutation ApproveAbsenceRequest($requestId: uuid!, $comments: String) {
    update_EmployeeAbsence_by_pk(
      pk_columns: {id: $requestId}, 
      _set: {
        status: "APPROVED",
        comments: $comments
      }
    ) {
      id
      status
    }
  }
`

const REJECT_LEAVE_REQUEST = `
  mutation RejectAbsenceRequest($requestId: uuid!, $comments: String) {
    update_EmployeeAbsence_by_pk(
      pk_columns: {id: $requestId}, 
      _set: {
        status: "REJECTED",
        comments: $comments
      }
    ) {
      id
      status
    }
  }
`

/**
 * Hook to fetch requests that need approval from the GraphQL API
 * This uses the real expense approval structure and can be extended for other approval types
 */
export const useRequestsToApprove = ({
  accessToken,
  managerId,
  showAll = false
}: UseRequestsToApproveProps): UseRequestsToApproveResult => {
  const [approvalTasks, setApprovalTasks] = useState<ApprovalRequest[]>([])
  const [totalCount, setTotalCount] = useState<number>(0)
  const [expenseRequestCount, setExpenseRequestCount] = useState<number>(0)
  const [expensePlanCount, setExpensePlanCount] = useState<number>(0)
  const [expenseCount, setExpenseCount] = useState<number>(0)
  const [absenceCount, setAbsenceCount] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)
  const [approving, setApproving] = useState<boolean>(false)
  const [rejecting, setRejecting] = useState<boolean>(false)

  // Initialize GraphQL client
  const graphQLClient = useGraphQLClient(accessToken)

  const fetchApprovalTasks = useCallback(async () => {
    if (!managerId || !accessToken) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      if (!graphQLClient) {
        throw new Error('GraphQL client not initialized')
      }

      // Fetch pending approvals with separate limits per type for balanced representation
      const expenseRequestLimit = showAll ? 1000 : 5 // Up to 5 expense requests
      const expensePlanLimit = showAll ? 1000 : 5 // Up to 5 expense plans
      const absenceLimit = showAll ? 1000 : 5 // Up to 5 absences for dashboard, unlimited for detailed view
      const result = await graphQLClient.request(GET_PENDING_APPROVALS_FOR_DASHBOARD, {
        managerId,
        expenseRequestLimit,
        expensePlanLimit,
        absenceLimit
      })

      // Map expense REQUEST approvals to our format
      const expenseRequestApprovals: ApprovalRequest[] = (result?.ExpenseRequestApprovals ?? []).map(
        (expense: ExpenseRequest) => ({
          id: expense.id,
          title: expense.title ?? 'Expense Request',
          description: expense.description,
          totalAmount: expense.totalAmount ?? 0,
          status: expense.status ?? 'PENDING',
          requestDate: expense.requestDate ? new Date(expense.requestDate).toISOString() : new Date().toISOString(),
          createdAt: expense.createdAt ? new Date(expense.createdAt).toISOString() : new Date().toISOString(),
          employee: {
            id: expense.employee?.id ?? '',
            fullName: expense.employee?.fullName ?? 'Unknown Employee',
            firstName: expense.employee?.firstName,
            lastName: expense.employee?.lastName,
            pictureThumbnail: expense.employee?.pictureThumbnail
          },
          type: 'expense-request' as const
        })
      )

      // Map expense PLAN approvals to our format
      const expensePlanApprovals: ApprovalRequest[] = (result?.ExpensePlanApprovals ?? []).map((plan: ExpensePlan) => ({
        id: plan.id,
        title: plan.title ?? 'Expense Plan',
        description: plan.description,
        totalAmount: plan.totalAmount ?? 0,
        status: plan.status ?? 'PENDING',
        requestDate: plan.planDate ? new Date(plan.planDate).toISOString() : new Date().toISOString(),
        createdAt: plan.createdAt ? new Date(plan.createdAt).toISOString() : new Date().toISOString(),
        employee: {
          id: plan.employee?.id ?? '',
          fullName: plan.employee?.fullName ?? 'Unknown Employee',
          firstName: plan.employee?.firstName,
          lastName: plan.employee?.lastName,
          pictureThumbnail: plan.employee?.pictureThumbnail
        },
        type: 'expense-plan' as const
      }))

      // Map absence approvals to our format
      const leaveApprovals: ApprovalRequest[] = (result?.LeaveApprovals ?? []).map((absence: LeaveRequest) => {
        // Get absence type name, prefer translated value
        const absenceTypeName =
          absence.type?.translations?.find((t: Translation) => t.localeCode === 'en-US')?.value ||
          absence.type?.value ||
          'Absence'

        // Create employee full name from firstName and lastName
        const employeeFullName =
          `${absence.employee?.firstName || ''} ${absence.employee?.lastName || ''}`.trim() || 'Unknown Employee'

        return {
          id: absence.id,
          title: `${absenceTypeName} Request`,
          description: `${absenceTypeName} from ${absence.startDate} to ${absence.endDate}`,
          totalAmount: 0, // Absence requests don't have amounts
          status: absence.status ?? 'PENDING',
          requestDate: absence.startDate ? new Date(absence.startDate).toISOString() : new Date().toISOString(),
          createdAt: absence.createdAt ? new Date(absence.createdAt).toISOString() : new Date().toISOString(),
          employee: {
            id: absence.employee?.id ?? '',
            fullName: employeeFullName,
            firstName: absence.employee?.firstName,
            lastName: absence.employee?.lastName,
            pictureThumbnail: absence.employee?.pictureThumbnail
          },
          type: 'leave' as const,
          // Additional fields for better absence display
          leaveType: absenceTypeName,
          startDate: absence.startDate,
          endDate: absence.endDate
        }
      })

      // Combine all approval types and sort by priority first, then by creation date
      // For absences: sort by priority (urgent first), then by creation time (most recent first)
      // For expenses: sort by creation time (most recent first)
      const allApprovals: ApprovalRequest[] = [
        ...expenseRequestApprovals,
        ...expensePlanApprovals,
        ...leaveApprovals
      ].sort((a, b) => {
        // If both are absences, sort by priority first, then by creation time
        if (a.type === 'leave' && b.type === 'leave') {
          const priorityDiff = getPriorityOrder(a) - getPriorityOrder(b)
          if (priorityDiff !== 0) return priorityDiff // Higher priority first
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() // Then most recent first
        }

        // For mixed types or non-absences, sort by creation date (most recent first)
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })

      // Set individual and total counts for badge display (from aggregate counts, not visible items)
      const expenseRequestApprovalCount = result?.ExpenseRequestApprovalsAggregate?.aggregate?.count || 0
      const expensePlanApprovalCount = result?.ExpensePlanApprovalsAggregate?.aggregate?.count || 0
      const totalExpenseApprovalCount = expenseRequestApprovalCount + expensePlanApprovalCount
      const absenceApprovalCount = result?.LeaveApprovalsAggregate?.aggregate?.count || 0
      const totalApprovalCount = totalExpenseApprovalCount + absenceApprovalCount

      setExpenseRequestCount(expenseRequestApprovalCount)
      setExpensePlanCount(expensePlanApprovalCount)
      setExpenseCount(totalExpenseApprovalCount)
      setAbsenceCount(absenceApprovalCount)
      setTotalCount(totalApprovalCount)

      // For both dashboard and detailed view, show all fetched items (up to 5 per type for dashboard)
      setApprovalTasks(allApprovals)
    } catch (err) {
      console.error('Error fetching approval tasks:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch approval tasks'))
      setApprovalTasks([])
    } finally {
      setLoading(false)
    }
  }, [managerId, accessToken, graphQLClient])

  // Approve a request (handles both expense and leave requests)
  const approveRequest = useCallback(
    async (requestId: string, comments?: string) => {
      if (!accessToken || !graphQLClient) return

      setApproving(true)
      try {
        // Find the request to determine its type
        const request = approvalTasks.find(task => task.id === requestId)

        if (request?.type === 'expense-request') {
          await graphQLClient.request(APPROVE_EXPENSE_REQUEST, { requestId, comments })
        } else if (request?.type === 'expense-plan') {
          await graphQLClient.request(APPROVE_EXPENSE_PLAN, {
            planId: requestId,
            approverEmployeeId: managerId,
            comments
          })
        } else if (request?.type === 'leave') {
          await graphQLClient.request(APPROVE_LEAVE_REQUEST, { requestId, comments })
        } else {
          throw new Error('Unknown request type')
        }

        await fetchApprovalTasks() // Refresh the list
      } catch (err) {
        console.error('Error approving request:', err)
        setError(err instanceof Error ? err : new Error('Failed to approve request'))
      } finally {
        setApproving(false)
      }
    },
    [accessToken, graphQLClient, fetchApprovalTasks, approvalTasks]
  )

  // Reject a request (handles both expense and leave requests)
  const rejectRequest = useCallback(
    async (requestId: string, comments?: string) => {
      if (!accessToken || !graphQLClient) return

      setRejecting(true)
      try {
        // Find the request to determine its type
        const request = approvalTasks.find(task => task.id === requestId)

        if (request?.type === 'expense-request') {
          await graphQLClient.request(REJECT_EXPENSE_REQUEST, { requestId, comments })
        } else if (request?.type === 'expense-plan') {
          await graphQLClient.request(REJECT_EXPENSE_PLAN, {
            planId: requestId,
            rejectorEmployeeId: managerId,
            reason: comments || 'Rejected from dashboard'
          })
        } else if (request?.type === 'leave') {
          await graphQLClient.request(REJECT_LEAVE_REQUEST, { requestId, comments })
        } else {
          throw new Error('Unknown request type')
        }

        await fetchApprovalTasks() // Refresh the list
      } catch (err) {
        console.error('Error rejecting request:', err)
        setError(err instanceof Error ? err : new Error('Failed to reject request'))
      } finally {
        setRejecting(false)
      }
    },
    [accessToken, graphQLClient, fetchApprovalTasks, approvalTasks]
  )

  useEffect(() => {
    fetchApprovalTasks()
  }, [fetchApprovalTasks])

  return {
    approvalTasks,
    totalCount,
    expenseRequestCount,
    expensePlanCount,
    expenseCount,
    absenceCount,
    loading,
    error,
    refetch: fetchApprovalTasks,
    approveRequest,
    rejectRequest,
    approving,
    rejecting
  }
}

/**
 * Helper function to determine priority color based on amount and type
 */
export const getPriorityVariant = (request: ApprovalRequest): 'default' | 'info' | 'warning' | 'destructive' => {
  // For expense requests and plans, use amount-based priority
  if (request.type === 'expense-request' || request.type === 'expense-plan') {
    const amount = request.totalAmount
    if (amount >= 1000) return 'destructive' // High amount - urgent
    if (amount >= 500) return 'warning' // Medium amount - important
    if (amount >= 100) return 'info' // Low amount - normal
    return 'default' // Very low amount
  }

  // For leave requests, use time-based priority
  if (request.type === 'leave') {
    const requestDate = new Date(request.requestDate)
    const now = new Date()
    const daysDiff = Math.ceil((requestDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (daysDiff <= 3) return 'destructive' // Leave starting soon - urgent
    if (daysDiff <= 7) return 'warning' // Leave starting this week - important
    if (daysDiff <= 14) return 'info' // Leave starting within 2 weeks - normal
    return 'default' // Leave in the future
  }

  // For other types, use default priority logic
  return 'info'
}

/**
 * Helper function to get priority order for sorting (lower number = higher priority)
 */
export const getPriorityOrder = (request: ApprovalRequest): number => {
  if (request.type === 'leave') {
    const requestDate = new Date(request.requestDate)
    const now = new Date()
    const daysDiff = Math.ceil((requestDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (daysDiff <= 3) return 1 // Urgent - highest priority
    if (daysDiff <= 7) return 2 // This Week
    if (daysDiff <= 14) return 3 // Soon
    return 4 // Standard - lowest priority
  }

  // For non-absence requests, use a neutral priority order
  return 3
}

/**
 * Helper function to get priority label based on amount and type
 */
export const getPriorityLabel = (request: ApprovalRequest): string => {
  if (request.type === 'expense-request' || request.type === 'expense-plan') {
    const amount = request.totalAmount
    if (amount >= 1000) return 'High Amount'
    if (amount >= 500) return 'Medium Amount'
    if (amount >= 100) return 'Standard'
    return 'Low Amount'
  }

  if (request.type === 'leave') {
    const requestDate = new Date(request.requestDate)
    const now = new Date()
    const daysDiff = Math.ceil((requestDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (daysDiff <= 3) return 'Urgent'
    if (daysDiff <= 7) return 'This Week'
    if (daysDiff <= 14) return 'Soon'
    return 'Standard'
  }

  return 'Standard'
}

/**
 * Helper function to format time ago
 */
export const getTimeAgo = (dateString: string): string => {
  const now = new Date()
  const date = new Date(dateString)
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

  if (diffInHours < 1) return 'Just now'
  if (diffInHours < 24) return `${diffInHours}h ago`

  const diffInDays = Math.floor(diffInHours / 24)
  return `${diffInDays}d ago`
}

/**
 * Helper function to format currency amount
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}
