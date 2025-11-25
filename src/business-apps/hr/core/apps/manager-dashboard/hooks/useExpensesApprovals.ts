import { useState, useEffect, useCallback } from 'react'
import { useFlowExecutionTasks } from '@/business-apps/fin/expenses/apps/manager-expenses/hooks/useFlowExecutionTasks'
import { FlowExecutionTask } from '@/common/network/flow-metrics/FlowMetricsClient'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

// Types for expense approvals
export interface ExpenseApproval {
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
  type: 'expense-request' | 'expense-plan'
  requestType?: string
  startDate?: string
  endDate?: string
  endpoint?: string
}

interface UseExpensesApprovalsProps {
  accessToken: string
  directReports: Array<{ userId: string; displayName: string; pictureThumbnail?: string }>
}

interface UseExpensesApprovalsResult {
  expenseApprovals: ExpenseApproval[]
  totalCount: number
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export const useExpensesApprovals = ({
  accessToken,
  directReports
}: UseExpensesApprovalsProps): UseExpensesApprovalsResult => {
  const [expenseApprovals, setExpenseApprovals] = useState<ExpenseApproval[]>([])
  const [totalCount, setTotalCount] = useState<number>(0)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [hasLoaded, setHasLoaded] = useState<boolean>(false)
  const [previousDirectReportsLength, setPreviousDirectReportsLength] = useState<number>(0)

  // Flow execution tasks for expense plans
  const expensePlanResult = useFlowExecutionTasks(
    { userInfo: undefined, accessToken },
    {
      currentPage: 1,
      pageSize: 1000,
      searchTerm: '',
      filterTaskName: 'approveExpensePlan'
    }
  )

  // Flow execution tasks for expense requests
  const expenseRequestResult = useFlowExecutionTasks(
    { userInfo: undefined, accessToken },
    {
      currentPage: 1,
      pageSize: 1000,
      searchTerm: '',
      filterTaskName: 'approveExpenseRequest'
    }
  )

  // Extract values
  const {
    tasks: expensePlanTasks,
    isLoading: expensePlanLoading,
    error: expensePlanError,
    refresh: refreshExpensePlans
  } = expensePlanResult

  const {
    tasks: expenseRequestTasks,
    isLoading: expenseRequestLoading,
    error: expenseRequestError,
    refresh: refreshExpenseRequests
  } = expenseRequestResult

  // Load all expense data
  const loadExpenseData = useCallback(async () => {
    if (hasLoaded) return

    setIsLoading(true)
    setError(null)

    try {
      // Helper function to filter tasks by direct reports
      const filterTasksByDirectReports = (tasks: FlowExecutionTask[]) => {
        if (!directReports || directReports.length === 0) {
          return tasks
        }

        const directReportUserIds = directReports.map(report => report.userId)
        return tasks.filter(task => {
          return task.creatorUserId && directReportUserIds.includes(task.creatorUserId)
        })
      }

      // Process expense plan tasks from flow
      const processExpensePlanTasks = (tasks: FlowExecutionTask[]): ExpenseApproval[] => {
        return tasks
          .filter(task => {
            const expensePlan = task.inputs?.expensePlan
            return expensePlan && expensePlan.status === 'PENDING'
          })
          .map(task => {
            const expensePlan = task.inputs?.expensePlan
            const creatorName = task.creatorName || ''
            const nameParts = creatorName.split(' ')

            // Find the direct report data for this creator
            const directReport = directReports.find(report => report.userId === task.creatorUserId)

            return {
              id: task.id,
              title:
                expensePlan?.title ||
                getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.expense_plan', 'Expense Plan'),
              description: expensePlan?.description || null,
              totalAmount: expensePlan?.totalAmount || 0,
              status: getTranslationFromI18nKeyAndLabel(
                'lowcoder:backoffice_expense_landing_page.action_required',
                'Action Required'
              ),
              requestDate: expensePlan?.planDate || task.started,
              createdAt: task.started || new Date().toISOString(),
              employee: {
                id: task.creatorUserId || '',
                fullName: directReport?.displayName || creatorName,
                firstName: nameParts[0] || '',
                lastName: nameParts.slice(1).join(' ') || '',
                pictureThumbnail: directReport?.pictureThumbnail
              },
              type: 'expense-plan' as const,
              requestType: expensePlan?.requestTypeRef || 'EXPENSE_PLAN',
              startDate: expensePlan?.startDate,
              endDate: expensePlan?.endDate,
              endpoint: task.endpoint
            }
          })
      }

      // Process expense request tasks from flow
      const processExpenseRequestTasks = (tasks: FlowExecutionTask[]): ExpenseApproval[] => {
        return tasks
          .filter(task => {
            const expenseRequest = task.inputs?.expenseRequest
            return expenseRequest && expenseRequest.status === 'PENDING'
          })
          .map(task => {
            const expenseRequest = task.inputs?.expenseRequest
            const creatorName = task.creatorName || ''
            const nameParts = creatorName.split(' ')

            // Find the direct report data for this creator
            const directReport = directReports.find(report => report.userId === task.creatorUserId)

            return {
              id: task.id,
              title:
                expenseRequest?.title ||
                getTranslationFromI18nKeyAndLabel(
                  'lowcoder:create_expense_request.initiate_title_header',
                  'Expense Request'
                ),
              description: expenseRequest?.description || null,
              totalAmount: expenseRequest?.totalAmount || 0,
              status: getTranslationFromI18nKeyAndLabel(
                'lowcoder:backoffice_expense_landing_page.action_required',
                'Action Required'
              ),
              requestDate: expenseRequest?.requestDate || task.started,
              createdAt: task.started || new Date().toISOString(),
              employee: {
                id: task.creatorUserId || '',
                fullName: directReport?.displayName || creatorName,
                firstName: nameParts[0] || '',
                lastName: nameParts.slice(1).join(' ') || '',
                pictureThumbnail: directReport?.pictureThumbnail
              },
              type: 'expense-request' as const,
              requestType: expenseRequest?.requestTypeRef || 'EXPENSE_REQUEST',
              startDate: expenseRequest?.startDate,
              endDate: expenseRequest?.endDate,
              endpoint: task.endpoint
            }
          })
      }

      // Filter both task types by direct reports
      const filteredExpensePlanTasks = filterTasksByDirectReports(expensePlanTasks)
      const filteredExpenseRequestTasks = filterTasksByDirectReports(expenseRequestTasks)

      // Process both task types
      const expensePlans = processExpensePlanTasks(filteredExpensePlanTasks)
      const expenseRequests = processExpenseRequestTasks(filteredExpenseRequestTasks)

      // Combine and sort all expense approvals
      const allExpenseApprovals = [...expenseRequests, ...expensePlans].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )

      setExpenseApprovals(allExpenseApprovals)
      setTotalCount(allExpenseApprovals.length)
      setPreviousDirectReportsLength(directReports?.length || 0)

      // Only set hasLoaded to true if we have data
      if (allExpenseApprovals.length > 0) {
        setHasLoaded(true)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load expense approvals'
      setError(errorMessage)
      console.error('Error loading expense data:', err)
    } finally {
      setIsLoading(false)
    }
  }, [hasLoaded, expensePlanTasks, expenseRequestTasks, directReports])

  // Refetch function
  const refetch = useCallback(() => {
    setHasLoaded(false)
    loadExpenseData()
    refreshExpensePlans?.()
    refreshExpenseRequests?.()
  }, [loadExpenseData, refreshExpensePlans, refreshExpenseRequests])

  // Simple data processing - no complex useEffect
  const processData = useCallback(() => {
    if (hasLoaded) return

    // Only process when both tasks are loaded (not loading)
    if (expensePlanLoading || expenseRequestLoading) return

    // Process data if we have tasks
    if (expensePlanTasks.length > 0 || expenseRequestTasks.length > 0) {
      loadExpenseData()
    }
  }, [
    hasLoaded,
    expensePlanLoading,
    expenseRequestLoading,
    expensePlanTasks.length,
    expenseRequestTasks.length,
    loadExpenseData
  ])

  // Single useEffect to trigger data processing
  useEffect(() => {
    processData()
  }, [processData])

  // Reset hasLoaded when directReports becomes available (was empty before)
  useEffect(() => {
    const currentLength = directReports?.length || 0
    if (
      currentLength > 0 &&
      previousDirectReportsLength === 0 &&
      hasLoaded &&
      (expensePlanTasks.length > 0 || expenseRequestTasks.length > 0)
    ) {
      // If we already loaded but directReports was empty, re-process now that it's available
      setHasLoaded(false)
    }
  }, [directReports, previousDirectReportsLength, hasLoaded, expensePlanTasks.length, expenseRequestTasks.length])

  // Update error state
  useEffect(() => {
    if (expensePlanError || expenseRequestError) {
      setError(expensePlanError || expenseRequestError)
    }
  }, [expensePlanError, expenseRequestError])

  return {
    expenseApprovals,
    totalCount,
    isLoading: isLoading || expensePlanLoading || expenseRequestLoading,
    error: error || expensePlanError || expenseRequestError,
    refetch
  }
}
