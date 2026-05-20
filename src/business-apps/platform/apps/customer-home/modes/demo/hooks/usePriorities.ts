import { useState, useEffect, useMemo, useRef } from 'react'
import { fetchTasksInitialData, type FetchTasksInitialDataResult } from '@/business-apps/core/every/apps/every-api'
import { isApprovalsFilterTask } from '@/business-apps/core/every/apps/every-box/utils/approvalsFilter'
import {
  useTeamAvailability,
  type TeamMember
} from '@/business-apps/hr/core/apps/manager-dashboard/hooks/useTeamAvailability'
import {
  useTeamBirthdays,
  type TeamBirthday
} from '@/business-apps/hr/core/apps/manager-dashboard/hooks/useTeamBirthdays'
import { useGetExpenseDashboard } from '@/business-apps/fin/expenses/apps/personal-expenses/hooks/useGetExpenseDashboard'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface PriorityItem {
  id: string
  type: 'approvals' | 'expenses' | 'hr' | 'system' | 'team'
  label: string
  count: number
  severity: 'urgent' | 'normal' | 'info'
  href: string
  action?: string
}

interface UsePrioritiesProps {
  accessToken: string
  userId: string
  employeeId: string
  context?: BusinessAppContextProps
}

interface UsePrioritiesResult {
  priorities: PriorityItem[]
  isLoading: boolean
  error: string | null
  hasTeamData: boolean
  absentMembers: TeamMember[]
  upcomingBirthdays: TeamBirthday[]
}

export const usePriorities = ({
  accessToken,
  userId,
  employeeId,
  context
}: UsePrioritiesProps): UsePrioritiesResult => {
  const [bootstrapData, setBootstrapData] = useState<FetchTasksInitialDataResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const requestIdRef = useRef(0)

  const teamAvailability = useTeamAvailability({
    accessToken,
    managerId: employeeId
  })

  const teamBirthdays = useTeamBirthdays({
    accessToken,
    managerId: employeeId
  })

  const expenseDashboard = useGetExpenseDashboard(context)

  useEffect(() => {
    if (!userId || !accessToken) {
      setIsLoading(false)
      setBootstrapData(null)
      setError(null)
      return
    }

    const currentRequestId = ++requestIdRef.current
    let cancelled = false

    const loadBootstrap = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const result = await fetchTasksInitialData(userId, accessToken, { limit: 20 })
        if (!cancelled && currentRequestId === requestIdRef.current) {
          setBootstrapData(result)
        }
      } catch (err) {
        if (!cancelled && currentRequestId === requestIdRef.current) {
          setError(err instanceof Error ? err.message : 'Failed to load priorities')
        }
      } finally {
        if (!cancelled && currentRequestId === requestIdRef.current) {
          setIsLoading(false)
        }
      }
    }

    loadBootstrap()

    return () => {
      cancelled = true
    }
  }, [userId, accessToken])

  const priorities = useMemo(() => {
    const items: PriorityItem[] = []

    if (bootstrapData) {
      const tasks = bootstrapData.inbox?.tasks || []

      const approvalCount = tasks.filter(isApprovalsFilterTask).length

      if (approvalCount > 0) {
        items.push({
          id: 'approvals',
          type: 'approvals',
          label: 'priorities-approvals',
          count: approvalCount,
          severity: 'urgent',
          href: '/platform/task-manager?view=inbox',
          action: 'priorities-action-approve'
        })
      }

      const overdueCount = tasks.filter(t => t.dueMeta?.status === 'overdue').length

      if (overdueCount > 0) {
        items.push({
          id: 'overdue',
          type: 'system',
          label: 'priorities-overdue',
          count: overdueCount,
          severity: 'urgent',
          href: '/platform/task-manager?view=inbox',
          action: 'priorities-action-review'
        })
      }

      const dueSoonCount = tasks.filter(t => t.dueMeta?.status === 'dueSoon24h').length

      if (dueSoonCount > 0) {
        items.push({
          id: 'due-today',
          type: 'system',
          label: 'priorities-tasks',
          count: dueSoonCount,
          severity: 'normal',
          href: '/platform/task-manager?view=inbox',
          action: 'priorities-action-review'
        })
      }
    }

    // Expense tasks
    if (expenseDashboard.stats) {
      const { flaggedItems, expenseItemsWithoutReceipts, pendingItems } = expenseDashboard.stats
      const actionableExpenses = (flaggedItems || 0) + (expenseItemsWithoutReceipts || 0)
      if (actionableExpenses > 0) {
        items.push({
          id: 'expense-tasks',
          type: 'expenses',
          label: 'priorities-expense-tasks',
          count: actionableExpenses,
          severity: 'normal',
          href: '/platform/fin/expenses/personal-expenses',
          action: 'priorities-action-review'
        })
      } else if ((pendingItems || 0) > 0) {
        items.push({
          id: 'expense-pending',
          type: 'expenses',
          label: 'priorities-expense-pending',
          count: pendingItems || 0,
          severity: 'info',
          href: '/platform/fin/expenses/personal-expenses',
          action: 'priorities-action-view'
        })
      }
    }

    if (teamAvailability.data && teamAvailability.data.totalMembers > 0) {
      const absentCount = teamAvailability.data.unavailableCount
      if (absentCount > 0) {
        items.push({
          id: 'team-absent',
          type: 'team',
          label: 'priorities-team-absent',
          count: absentCount,
          severity: 'normal',
          href: '/platform/hr/absences/manager-absences',
          action: 'priorities-action-view'
        })
      }
    }

    const upcomingCount = teamBirthdays.upcomingBirthdays.filter(b => b.daysUntilBirthday >= 0).length
    if (teamBirthdays.upcomingBirthdays.length > 0) {
      items.push({
        id: 'birthdays',
        type: 'team',
        label: 'priorities-birthdays',
        count: upcomingCount || teamBirthdays.upcomingBirthdays.length,
        severity: 'info',
        href: '/platform/hr/core/apps/manager-dashboard',
        action: 'priorities-action-view'
      })
    }

    return items
  }, [bootstrapData, teamAvailability.data, teamBirthdays.upcomingBirthdays, expenseDashboard.stats])

  const hasTeamData = Boolean(teamAvailability.data && teamAvailability.data.totalMembers > 0)

  const absentMembers = useMemo(
    () => (teamAvailability.data?.members || []).filter(m => !m.isAvailable),
    [teamAvailability.data]
  )

  return {
    priorities,
    isLoading: isLoading || teamAvailability.loading || teamBirthdays.loading || expenseDashboard.isLoading,
    error,
    hasTeamData,
    absentMembers,
    upcomingBirthdays: teamBirthdays.upcomingBirthdays
  }
}
