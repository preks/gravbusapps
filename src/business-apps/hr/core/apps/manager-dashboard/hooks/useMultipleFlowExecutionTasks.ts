import { useFlowExecutionTasks } from '@/business-apps/fin/expenses/apps/manager-expenses/hooks/useFlowExecutionTasks'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { FlowExecutionTask } from '@/common/network/flow-metrics/FlowMetricsClient'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface UseMultipleFlowExecutionTasksProps {
  userInfo: BusinessAppContextProps['userInfo']
  accessToken: string
  directReports: Array<{ userId: string }>
  currentPage?: number
  pageSize?: number
  searchTerm?: string
}

interface TaskResult {
  tasks: unknown[]
  totalCount: number
  isLoading: boolean
  error: string | null
}

// Interface for processed expense plan data
interface ProcessedExpensePlan {
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
  type: 'expense-plan'
  requestType?: string
  startDate?: string
  endDate?: string
}

export const useMultipleFlowExecutionTasks = ({
  userInfo,
  accessToken,
  directReports,
  currentPage = 1,
  pageSize = 1000,
  searchTerm = ''
}: UseMultipleFlowExecutionTasksProps) => {
  // Helper function to filter tasks by direct reports
  const filterTasksByDirectReports = (tasks: unknown[]) => {
    if (!directReports || directReports.length === 0) {
      return tasks
    }

    const directReportUserIds = directReports.map(report => report.userId)

    return tasks.filter((task: unknown) => {
      const flowTask = task as FlowExecutionTask
      return flowTask.creatorUserId && directReportUserIds.includes(flowTask.creatorUserId)
    })
  }

  // Helper function to process expense plan tasks
  const processExpensePlanTasks = (tasks: FlowExecutionTask[]): ProcessedExpensePlan[] => {
    return tasks
      .filter(task => {
        // Filter for My Directs
        const isMyDirect = directReports.some(report => report.userId === task.creatorUserId)

        // Filter for PENDING status
        const isPending = task.inputs?.expensePlan?.status === 'PENDING'

        return isMyDirect && isPending
      })
      .map(task => {
        const expensePlan = task.inputs?.expensePlan

        if (!expensePlan) {
          return null
        }

        // Parse creator name
        const creatorName = task.creatorName || ''
        const nameParts = creatorName.split(' ')
        const firstName = nameParts[0] || ''
        const lastName = nameParts.slice(1).join(' ') || ''

        const processedTask: ProcessedExpensePlan = {
          id: expensePlan.id,
          title:
            expensePlan.title ||
            getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.expense_plan', 'Expense Plan'),
          description: expensePlan.description || null,
          totalAmount: expensePlan.totalAmount || 0,
          status: expensePlan.status || 'PENDING',
          requestDate: expensePlan.planDate ? new Date(expensePlan.planDate).toISOString() : new Date().toISOString(),
          createdAt: task.started ? new Date(task.started).toISOString() : new Date().toISOString(),
          employee: {
            id: task.creatorUserId || '',
            fullName:
              creatorName || getTranslationFromI18nKeyAndLabel('lowcoder:common.unknown_employee', 'Unknown Employee'),
            firstName: firstName,
            lastName: lastName,
            pictureThumbnail: undefined // Not available in flow tasks
          },
          type: 'expense-plan' as const,
          requestType: expensePlan.requestTypeRef || 'EXPENSE_PLAN',
          startDate: expensePlan.startDate,
          endDate: expensePlan.endDate
        }
        return processedTask
      })
      .filter((task): task is ProcessedExpensePlan => task !== null)
  }

  // Call hooks for each task name individually
  const expenseRequestResult = useFlowExecutionTasks(
    { userInfo, accessToken },
    {
      currentPage,
      pageSize,
      searchTerm,
      filterTaskName: 'approveExpenseRequest'
    }
  )

  const expensePlanResult = useFlowExecutionTasks(
    { userInfo, accessToken },
    {
      currentPage,
      pageSize,
      searchTerm,
      filterTaskName: 'approveExpensePlan'
    }
  )

  const absenceResult = useFlowExecutionTasks(
    { userInfo, accessToken },
    {
      currentPage,
      pageSize,
      searchTerm,
      filterTaskName: 'approveEmployeeAbsence'
    }
  )

  const personalInfoResult = useFlowExecutionTasks(
    { userInfo, accessToken },
    {
      currentPage,
      pageSize,
      searchTerm,
      filterTaskName: 'approvePersonalInformationChange'
    }
  )

  const addressResult = useFlowExecutionTasks(
    { userInfo, accessToken },
    {
      currentPage,
      pageSize,
      searchTerm,
      filterTaskName: 'approveChangeAddress'
    }
  )

  // Transform results into a more usable format with filtering applied
  const taskResults: Record<string, TaskResult> = {
    approveExpenseRequest: {
      tasks: filterTasksByDirectReports(expenseRequestResult.tasks),
      totalCount: filterTasksByDirectReports(expenseRequestResult.tasks).length,
      isLoading: expenseRequestResult.isLoading,
      error: expenseRequestResult.error
    },
    approveExpensePlan: {
      tasks: filterTasksByDirectReports(expensePlanResult.tasks),
      totalCount: filterTasksByDirectReports(expensePlanResult.tasks).length,
      isLoading: expensePlanResult.isLoading,
      error: expensePlanResult.error
    },
    approveEmployeeAbsence: {
      tasks: filterTasksByDirectReports(absenceResult.tasks),
      totalCount: filterTasksByDirectReports(absenceResult.tasks).length,
      isLoading: absenceResult.isLoading,
      error: absenceResult.error
    },
    approvePersonalInformationChange: {
      tasks: filterTasksByDirectReports(personalInfoResult.tasks),
      totalCount: filterTasksByDirectReports(personalInfoResult.tasks).length,
      isLoading: personalInfoResult.isLoading,
      error: personalInfoResult.error
    },
    approveChangeAddress: {
      tasks: filterTasksByDirectReports(addressResult.tasks),
      totalCount: filterTasksByDirectReports(addressResult.tasks).length,
      isLoading: addressResult.isLoading,
      error: addressResult.error
    }
  }

  // Process expense plan tasks
  const processedExpensePlanTasks = processExpensePlanTasks(expensePlanResult.tasks as FlowExecutionTask[])

  // Calculate combined totals using filtered results
  const combinedTotalCount = Object.values(taskResults).reduce((sum, result) => sum + result.totalCount, 0)
  const combinedIsLoading = Object.values(taskResults).some(result => result.isLoading)
  const combinedError = Object.values(taskResults).find(result => result.error)?.error

  return {
    taskResults,
    combinedTotalCount,
    combinedIsLoading,
    combinedError,
    // Add processed expense plan tasks
    expensePlanTasks: processedExpensePlanTasks,
    expensePlanCount: processedExpensePlanTasks.length
  }
}
