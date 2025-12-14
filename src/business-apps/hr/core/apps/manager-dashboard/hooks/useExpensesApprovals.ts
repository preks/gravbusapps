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

type DirectReportLookup = Array<{ userId: string; displayName: string; pictureThumbnail?: string }>

const getActionRequiredStatus = (): string =>
  getTranslationFromI18nKeyAndLabel('lowcoder:backoffice_expense_landing_page.action_required', 'Action Required')

const buildEmployeeData = (task: FlowExecutionTask, directReports: DirectReportLookup): ExpenseApproval['employee'] => {
  const creatorName = task.creatorName || ''
  const nameParts = creatorName.split(' ')
  const directReport = directReports.find(report => report.userId === task.creatorUserId)

  return {
    id: task.creatorUserId || '',
    fullName: directReport?.displayName || creatorName,
    firstName: nameParts[0] || '',
    lastName: nameParts.slice(1).join(' ') || '',
    pictureThumbnail: directReport?.pictureThumbnail
  }
}

const processExpensePlanTasks = (tasks: FlowExecutionTask[], directReports: DirectReportLookup): ExpenseApproval[] => {
  return tasks
    .filter(task => task.inputs?.expensePlan?.status === 'PENDING')
    .map(task => {
      const expensePlan = task.inputs?.expensePlan

      return {
        id: task.id,
        title:
          expensePlan?.title ||
          getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.expense_plan', 'Expense Plan'),
        description: expensePlan?.description || null,
        totalAmount: expensePlan?.totalAmount || 0,
        status: getActionRequiredStatus(),
        requestDate: expensePlan?.planDate || task.started,
        createdAt: task.started || new Date().toISOString(),
        employee: buildEmployeeData(task, directReports),
        type: 'expense-plan' as const,
        requestType: expensePlan?.requestTypeRef || 'EXPENSE_PLAN',
        startDate: expensePlan?.startDate,
        endDate: expensePlan?.endDate,
        endpoint: task.endpoint
      }
    })
}

const processExpenseRequestTasks = (
  tasks: FlowExecutionTask[],
  directReports: DirectReportLookup
): ExpenseApproval[] => {
  return tasks
    .filter(task => task.inputs?.expenseRequest?.status === 'PENDING')
    .map(task => {
      const expenseRequest = task.inputs?.expenseRequest

      return {
        id: task.id,
        title:
          expenseRequest?.title ||
          getTranslationFromI18nKeyAndLabel('lowcoder:create_expense_request.initiate_title_header', 'Expense Request'),
        description: expenseRequest?.description || null,
        totalAmount: expenseRequest?.totalAmount || 0,
        status: getActionRequiredStatus(),
        requestDate: expenseRequest?.requestDate || task.started,
        createdAt: task.started || new Date().toISOString(),
        employee: buildEmployeeData(task, directReports),
        type: 'expense-request' as const,
        requestType: expenseRequest?.requestTypeRef || 'EXPENSE_REQUEST',
        startDate: expenseRequest?.startDate,
        endDate: expenseRequest?.endDate,
        endpoint: task.endpoint
      }
    })
}

const processAdvancePaymentTasks = (
  tasks: FlowExecutionTask[],
  directReports: DirectReportLookup
): ExpenseApproval[] => {
  return tasks
    .filter(task => task.inputs?.advancePayment?.status === 'PENDING')
    .map(task => {
      const advancePayment = task.inputs?.advancePayment

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
        status: getActionRequiredStatus(),
        requestDate: advancePayment?.transactionDate || task.started,
        createdAt: task.started || new Date().toISOString(),
        employee: buildEmployeeData(task, directReports),
        type: 'advance-payment' as const,
        requestType: 'ADVANCE_PAYMENT',
        endpoint: task.endpoint
      }
    })
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
      const expensePlans = processExpensePlanTasks(expensePlanTasks, directReports)
      const expenseRequests = processExpenseRequestTasks(expenseRequestTasks, directReports)
      const advancePayments = processAdvancePaymentTasks(advancePaymentTasks, directReports)

      // Combine and sort all expense approvals
      const allExpenseApprovals = [...expenseRequests, ...expensePlans, ...advancePayments].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )

      setExpenseApprovals(allExpenseApprovals)
      setTotalCount(allExpenseApprovals.length)
      setHasLoaded(true)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load expense approvals'
      setError(errorMessage)
      console.error('Error loading expense data:', err)
      setHasLoaded(true)
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
