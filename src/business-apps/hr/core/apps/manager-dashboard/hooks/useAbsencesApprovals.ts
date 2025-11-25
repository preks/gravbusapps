import { useState, useEffect, useCallback } from 'react'
import { useFlowExecutionTasks } from '@/business-apps/fin/expenses/apps/manager-expenses/hooks/useFlowExecutionTasks'
import { FlowExecutionTask } from '@/common/network/flow-metrics/FlowMetricsClient'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { ExpenseApproval } from './useExpensesApprovals'

// Types for absence approvals
export interface AbsenceApproval {
  id: string
  title: string
  description: string | null
  status: string
  createdAt: string
  employee: {
    id: string
    fullName: string
    firstName?: string
    lastName?: string
    pictureThumbnail?: string
  }
  type: 'leave'
  leaveType?: string
  startDate?: string
  endDate?: string
  endpoint?: string
}

interface UseAbsencesApprovalsProps {
  accessToken: string
  directReports: Array<{ userId: string; displayName: string; pictureThumbnail?: string }>
}

interface UseAbsencesApprovalsResult {
  absenceApprovals: AbsenceApproval[]
  totalCount: number
  isLoading: boolean
  error: string | null
  refetch: () => void
}

/**
 * Helper function to get priority label based on amount and type
 */
export const getPriorityLabel = (request: AbsenceApproval | ExpenseApproval): string => {
  if (request.type === 'expense-request' || request.type === 'expense-plan') {
    const amount = request.totalAmount
    if (amount >= 1000)
      return getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.high_amount', 'High Amount')
    if (amount >= 500)
      return getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.medium_amount', 'Medium Amount')
    if (amount >= 100)
      return getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.standard_amount', 'Standard')
    return getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.low_amount', 'Low Amount')
  }

  if (request.type === 'leave') {
    const requestDate = new Date(request.startDate || '')
    const now = new Date()
    const daysDiff = Math.ceil((requestDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (daysDiff <= 3) return getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.urgent', 'Urgent')
    if (daysDiff <= 7) return getTranslationFromI18nKeyAndLabel('success:timeframe.week', 'This Week')
    if (daysDiff <= 14) return getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.soon', 'Soon')
    return getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule.expense_table.standard', 'Standard')
  }

  return getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule.expense_table.standard', 'Standard')
}

/**
 * Helper function to determine priority color based on amount and type
 */
export const getPriorityVariant = (
  request: AbsenceApproval | ExpenseApproval
): 'default' | 'info' | 'warning' | 'destructive' => {
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
    const requestDate = new Date(request.startDate || '')
    const now = new Date()
    const daysDiff = Math.ceil((requestDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (daysDiff <= 3) return 'destructive' // Leave starting soon - urgent
    if (daysDiff <= 7) return 'warning' // Leave starting this week - important
    return 'info' // Leave in the future
  }

  // For other types, use default priority logic
  return 'info'
}

/**
 * Helper function to format time ago
 */
export const getTimeAgo = (dateString: string): string => {
  const now = new Date()
  const date = new Date(dateString)
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

  if (diffInHours < 1) return 'Just now'
  if (diffInHours === 1)
    return getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.one_hour_ago', '1 hour ago')
  if (diffInHours < 24)
    return getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.hours_ago', `${diffInHours} hours ago`, {
      time: diffInHours.toString()
    })
  if (diffInHours < 48)
    return getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.one_day_ago', '1 day ago')

  const diffInDays = Math.floor(diffInHours / 24)
  return getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.days_ago', `${diffInDays} days ago`, {
    time: diffInDays.toString()
  })
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

export const useAbsencesApprovals = ({
  accessToken,
  directReports
}: UseAbsencesApprovalsProps): UseAbsencesApprovalsResult => {
  const [absenceApprovals, setAbsenceApprovals] = useState<AbsenceApproval[]>([])
  const [totalCount, setTotalCount] = useState<number>(0)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [hasLoaded, setHasLoaded] = useState<boolean>(false)
  const [previousDirectReportsLength, setPreviousDirectReportsLength] = useState<number>(0)

  // Flow execution tasks for employee absences - only when enabled
  const absenceFlowResult = useFlowExecutionTasks(
    { userInfo: undefined, accessToken },
    {
      currentPage: 1,
      pageSize: 1000,
      searchTerm: '',
      filterTaskName: 'approveEmployeeAbsence'
    }
  )

  // Flow execution tasks for employee vacations - only when enabled
  const vacationFlowResult = useFlowExecutionTasks(
    { userInfo: undefined, accessToken },
    {
      currentPage: 1,
      pageSize: 1000,
      searchTerm: '',
      filterTaskName: 'approveEmployeeVacation'
    }
  )

  // Flow execution tasks for employee special leave - only when enabled
  const specialLeaveFlowResult = useFlowExecutionTasks(
    { userInfo: undefined, accessToken },
    {
      currentPage: 1,
      pageSize: 1000,
      searchTerm: '',
      filterTaskName: 'approveEmployeeSpecialLeave'
    }
  )

  // Flow execution tasks for employee work leave - only when enabled
  const workLeaveFlowResult = useFlowExecutionTasks(
    { userInfo: undefined, accessToken },

    {
      currentPage: 1,
      pageSize: 1000,
      searchTerm: '',
      filterTaskName: 'approveEmployeeWorkLeave'
    }
  )

  // Extract values with fallbacks when disabled
  const {
    tasks: absenceTasks,
    isLoading: absenceLoading,
    error: absenceError,
    refresh: refreshAbsenceTasks
  } = absenceFlowResult

  const {
    tasks: vacationTasks,
    isLoading: vacationLoading,
    error: vacationError,
    refresh: refreshVacationTasks
  } = vacationFlowResult

  const {
    tasks: specialLeaveTasks,
    isLoading: specialLeaveLoading,
    error: specialLeaveError,
    refresh: refreshSpecialLeaveTasks
  } = specialLeaveFlowResult

  const {
    tasks: workLeaveTasks,
    isLoading: workLeaveLoading,
    error: workLeaveError,
    refresh: refreshWorkLeaveTasks
  } = workLeaveFlowResult

  // Load absence data
  const loadAbsenceData = useCallback(async () => {
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

      // Process absence tasks from flow
      const processAbsenceTasks = (tasks: FlowExecutionTask[]): AbsenceApproval[] => {
        return tasks
          .filter(task => {
            const absence = task.inputs?.employeeAbsence
            return absence && absence.status === 'PENDING'
          })
          .map(task => {
            const absence = task.inputs?.employeeAbsence
            const creatorName = task.creatorName || ''
            const nameParts = creatorName.split(' ')

            // Find the direct report data for this creator
            const directReport = directReports.find(report => report.userId === task.creatorUserId)

            return {
              id: task.id,
              title:
                absence?.title ||
                getTranslationFromI18nKeyAndLabel(
                  'master-data:hr.manager_dashboard.absence_request',
                  'Absence Request'
                ),
              description: absence?.description || null,
              status: getTranslationFromI18nKeyAndLabel('lowcoder:employee_landing_page.in_approval', 'In Approval'),
              createdAt: task.started || new Date().toISOString(),
              employee: {
                id: task.creatorUserId || '',
                fullName: directReport?.displayName || creatorName,
                firstName: nameParts[0] || '',
                lastName: nameParts.slice(1).join(' ') || '',
                pictureThumbnail: directReport?.pictureThumbnail
              },
              type: 'leave' as const,
              leaveType: absence?.leaveType || 'ABSENCE',
              startDate: absence?.startDate,
              endDate: absence?.endDate,
              endpoint: task.endpoint
            }
          })
      }

      // Process vacation tasks from flow
      const processVacationTasks = (tasks: FlowExecutionTask[]): AbsenceApproval[] => {
        return tasks
          .filter(task => {
            const vacation = task.inputs?.employeeAbsence
            return vacation && vacation.status === 'PENDING'
          })
          .map(task => {
            const vacation = task.inputs?.employeeAbsence
            const creatorName = task.creatorName || ''
            const nameParts = creatorName.split(' ')

            // Find the direct report data for this creator
            const directReport = directReports.find(report => report.userId === task.creatorUserId)

            return {
              id: task.id,
              title:
                vacation?.title ||
                getTranslationFromI18nKeyAndLabel('lowcoder:absence_module.vacation_request', 'Vacation Request'),
              description: vacation?.description || null,
              status: getTranslationFromI18nKeyAndLabel('lowcoder:employee_landing_page.in_approval', 'In Approval'),
              createdAt: task.started || new Date().toISOString(),
              employee: {
                id: task.creatorUserId || '',
                fullName: directReport?.displayName || creatorName,
                firstName: nameParts[0] || '',
                lastName: nameParts.slice(1).join(' ') || '',
                pictureThumbnail: directReport?.pictureThumbnail
              },
              type: 'leave' as const,
              leaveType: vacation?.leaveType || 'VACATION',
              startDate: vacation?.startDate,
              endDate: vacation?.endDate,
              endpoint: task.endpoint
            }
          })
      }

      // Process special leave tasks from flow
      const processSpecialLeaveTasks = (tasks: FlowExecutionTask[]): AbsenceApproval[] => {
        return tasks
          .filter(task => {
            const specialLeave = task.inputs?.employeeAbsence
            return specialLeave && specialLeave.status === 'PENDING'
          })
          .map(task => {
            const specialLeave = task.inputs?.employeeAbsence
            const creatorName = task.creatorName || ''
            const nameParts = creatorName.split(' ')

            // Find the direct report data for this creator
            const directReport = directReports.find(report => report.userId === task.creatorUserId)

            return {
              id: task.id,
              title:
                specialLeave?.title ||
                getTranslationFromI18nKeyAndLabel(
                  'lowcoder:absence_module.special_leave_request',
                  'Special Leave Request'
                ),
              description: specialLeave?.description || null,
              status: getTranslationFromI18nKeyAndLabel('lowcoder:employee_landing_page.in_approval', 'In Approval'),
              createdAt: task.started || new Date().toISOString(),
              employee: {
                id: task.creatorUserId || '',
                fullName: directReport?.displayName || creatorName,
                firstName: nameParts[0] || '',
                lastName: nameParts.slice(1).join(' ') || '',
                pictureThumbnail: directReport?.pictureThumbnail
              },
              type: 'leave' as const,
              leaveType: specialLeave?.leaveType || 'SPECIAL LEAVE',
              startDate: specialLeave?.startDate,
              endDate: specialLeave?.endDate,
              endpoint: task.endpoint
            }
          })
      }

      // Process work leave tasks from flow
      const processWorkLeaveTasks = (tasks: FlowExecutionTask[]): AbsenceApproval[] => {
        return tasks
          .filter(task => {
            const workLeave = task.inputs?.employeeAbsence
            return workLeave && workLeave.status === 'PENDING'
          })
          .map(task => {
            const workLeave = task.inputs?.employeeAbsence
            const creatorName = task.creatorName || ''
            const nameParts = creatorName.split(' ')

            // Find the direct report data for this creator
            const directReport = directReports.find(report => report.userId === task.creatorUserId)

            return {
              id: task.id,
              title:
                workLeave?.title ||
                getTranslationFromI18nKeyAndLabel(
                  'master-data:hr.manager_dashboard.work_leave_request',
                  'Work Leave Request'
                ),
              description: workLeave?.description || null,
              status: getTranslationFromI18nKeyAndLabel('lowcoder:employee_landing_page.in_approval', 'In Approval'),
              createdAt: task.started || new Date().toISOString(),
              employee: {
                id: task.creatorUserId || '',
                fullName: directReport?.displayName || creatorName,
                firstName: nameParts[0] || '',
                lastName: nameParts.slice(1).join(' ') || '',
                pictureThumbnail: directReport?.pictureThumbnail
              },
              type: 'leave' as const,
              leaveType: workLeave?.leaveType || 'WORK LEAVE',
              startDate: workLeave?.startDate,
              endDate: workLeave?.endDate,
              endpoint: task.endpoint
            }
          })
      }

      // Filter tasks by direct reports
      const filteredAbsenceTasks = filterTasksByDirectReports(absenceTasks)
      const filteredVacationTasks = filterTasksByDirectReports(vacationTasks)
      const filteredSpecialLeaveTasks = filterTasksByDirectReports(specialLeaveTasks)
      const filteredWorkLeaveTasks = filterTasksByDirectReports(workLeaveTasks)

      // Process absence, vacation, special leave, and work leave tasks
      const processedAbsences = processAbsenceTasks(filteredAbsenceTasks)
      const processedVacations = processVacationTasks(filteredVacationTasks)
      const processedSpecialLeaves = processSpecialLeaveTasks(filteredSpecialLeaveTasks)
      const processedWorkLeaves = processWorkLeaveTasks(filteredWorkLeaveTasks)

      // Combine and sort all absence, vacation, special leave, and work leave approvals
      const allAbsenceApprovals = [
        ...processedAbsences,
        ...processedVacations,
        ...processedSpecialLeaves,
        ...processedWorkLeaves
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

      setAbsenceApprovals(allAbsenceApprovals)
      setTotalCount(allAbsenceApprovals.length)
      setPreviousDirectReportsLength(directReports?.length || 0)

      // Only set hasLoaded to true if we have data
      if (allAbsenceApprovals.length > 0) {
        setHasLoaded(true)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load absence approvals'
      setError(errorMessage)
      console.error('Error loading absence data:', err)
    } finally {
      setIsLoading(false)
    }
  }, [hasLoaded, absenceTasks, vacationTasks, specialLeaveTasks, workLeaveTasks, directReports])

  // Refetch function
  const refetch = useCallback(() => {
    setHasLoaded(false)
    loadAbsenceData()
    refreshAbsenceTasks?.()
    refreshVacationTasks?.()
    refreshSpecialLeaveTasks?.()
    refreshWorkLeaveTasks?.()
  }, [loadAbsenceData, refreshAbsenceTasks, refreshVacationTasks, refreshSpecialLeaveTasks, refreshWorkLeaveTasks])

  // Simple data processing - no complex useEffect
  const processData = useCallback(() => {
    if (hasLoaded) return

    // Only process when all tasks are loaded (not loading)
    if (absenceLoading || vacationLoading || specialLeaveLoading || workLeaveLoading) return

    // Process data if we have tasks
    if (
      absenceTasks.length > 0 ||
      vacationTasks.length > 0 ||
      specialLeaveTasks.length > 0 ||
      workLeaveTasks.length > 0
    ) {
      loadAbsenceData()
    }
  }, [
    hasLoaded,
    absenceLoading,
    vacationLoading,
    specialLeaveLoading,
    workLeaveLoading,
    absenceTasks.length,
    vacationTasks.length,
    specialLeaveTasks.length,
    workLeaveTasks.length,
    loadAbsenceData
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
      (absenceTasks.length > 0 || vacationTasks.length > 0 || specialLeaveTasks.length > 0 || workLeaveTasks.length > 0)
    ) {
      // If we already loaded but directReports was empty, re-process now that it's available
      setHasLoaded(false)
    }
  }, [
    directReports,
    previousDirectReportsLength,
    hasLoaded,
    absenceTasks.length,
    vacationTasks.length,
    specialLeaveTasks.length,
    workLeaveTasks.length
  ])

  // Update error state based on flow tasks
  useEffect(() => {
    if (absenceError || vacationError || specialLeaveError || workLeaveError) {
      setError(absenceError || vacationError || specialLeaveError || workLeaveError)
    }
  }, [absenceError, vacationError, specialLeaveError, workLeaveError])

  return {
    absenceApprovals,
    totalCount,
    isLoading: isLoading || absenceLoading || vacationLoading || specialLeaveLoading || workLeaveLoading,
    error: error || absenceError || vacationError || specialLeaveError || workLeaveError,
    refetch
  }
}
