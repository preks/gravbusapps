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
  type: 'expense-request' | 'expense-plan' | 'advance-payment'
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

  // Flow execution tasks for advance payments
  const advancePaymentResult = useFlowExecutionTasks(
    { userInfo: undefined, accessToken },
    {
      currentPage: 1,
      pageSize: 1000,
      searchTerm: '',
      filterTaskName: 'approveAdvancePayment'
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

  const {
    tasks: advancePaymentTasks,
    isLoading: advancePaymentLoading,
    error: advancePaymentError,
    refresh: refreshAdvancePayments
  } = advancePaymentResult

  // Load all expense data
  const loadExpenseData = useCallback(async () => {
    if (hasLoaded) return

    setIsLoading(true)
    setError(null)

    try {
      // Process expense plan tasks from flow
      // Note: No filtering by directReports - the flow API returns tasks assigned to the current user
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

            // Try to find the direct report data for this creator (for picture)
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

      // Process advance payment tasks from flow
      const processAdvancePaymentTasks = (tasks: FlowExecutionTask[]): ExpenseApproval[] => {
        return tasks
          .filter(task => {
            const advancePayment = task.inputs?.advancePayment
            return advancePayment && advancePayment.status === 'PENDING'
          })
          .map(task => {
            const advancePayment = task.inputs?.advancePayment
            const creatorName = task.creatorName || ''
            const nameParts = creatorName.split(' ')

            // Find the direct report data for this creator
            const directReport = directReports.find(report => report.userId === task.creatorUserId)

            return {
              id: task.id,
              title:
                advancePayment?.code ||
                getTranslationFromI18nKeyAndLabel(
                  'lowcoder:backoffice_expense_landing_page.advance_title',
                  'Advance Payment'
                ),
              description: advancePayment?.description || null,
              totalAmount: advancePayment?.amount || 0,
              status: getTranslationFromI18nKeyAndLabel(
                'lowcoder:backoffice_expense_landing_page.action_required',
                'Action Required'
              ),
              requestDate: advancePayment?.transactionDate || task.started,
              createdAt: task.started || new Date().toISOString(),
              employee: {
                id: task.creatorUserId || '',
                fullName: directReport?.displayName || creatorName,
                firstName: nameParts[0] || '',
                lastName: nameParts.slice(1).join(' ') || '',
                pictureThumbnail: directReport?.pictureThumbnail
              },
              type: 'advance-payment' as const,
              requestType: 'ADVANCE_PAYMENT',
              endpoint: task.endpoint
            }
          })
      }

      // Process all task types - no filtering by directReports
      // The flow API returns tasks assigned to the current user (manager)
      const expensePlans = processExpensePlanTasks(expensePlanTasks)
      const expenseRequests = processExpenseRequestTasks(expenseRequestTasks)
      const advancePayments = processAdvancePaymentTasks(advancePaymentTasks)

      // Combine and sort all expense approvals
      const allExpenseApprovals = [...expenseRequests, ...expensePlans, ...advancePayments].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )

      setExpenseApprovals(allExpenseApprovals)
      setTotalCount(allExpenseApprovals.length)
      // Always set hasLoaded to true after processing
      setHasLoaded(true)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load expense approvals'
      setError(errorMessage)
      console.error('Error loading expense data:', err)
      setHasLoaded(true) // Mark as loaded even on error
    } finally {
      setIsLoading(false)
    }
  }, [hasLoaded, expensePlanTasks, expenseRequestTasks, advancePaymentTasks, directReports])

  // Refetch function
  const refetch = useCallback(() => {
    setHasLoaded(false)
    loadExpenseData()
    refreshExpensePlans?.()
    refreshExpenseRequests?.()
    refreshAdvancePayments?.()
  }, [loadExpenseData, refreshExpensePlans, refreshExpenseRequests, refreshAdvancePayments])

  // Simple data processing - no complex useEffect
  const processData = useCallback(() => {
    if (hasLoaded) return

    // Only process when all tasks are loaded (not loading)
    if (expensePlanLoading || expenseRequestLoading || advancePaymentLoading) return

    // Process data once loading is complete (even if 0 tasks)
    loadExpenseData()
  }, [
    hasLoaded,
    expensePlanLoading,
    expenseRequestLoading,
    advancePaymentLoading,
    expensePlanTasks.length,
    expenseRequestTasks.length,
    advancePaymentTasks.length,
    loadExpenseData
  ])

  // Single useEffect to trigger data processing
  useEffect(() => {
    processData()
  }, [processData])

  // Update error state
  useEffect(() => {
    if (expensePlanError || expenseRequestError || advancePaymentError) {
      setError(expensePlanError || expenseRequestError || advancePaymentError)
    }
  }, [expensePlanError, expenseRequestError, advancePaymentError])

  return {
    expenseApprovals,
    totalCount,
    isLoading: isLoading || expensePlanLoading || expenseRequestLoading || advancePaymentLoading,
    error: error || expensePlanError || expenseRequestError || advancePaymentError,
    refetch
  }
}
