/**
 * Adapter hooks to transform IRM-specific hooks into generic workspace interfaces
 * This allows IRM hooks to work with the generic PersonalWorkspace component
 */
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type {
  KpiResult,
  ActivitiesResult,
  TasksResult
} from '@/common/components/common-relations/view-layouts/personal-workspace/types'
import { useMyInvestmentKpis } from './useMyInvestmentKpis'
import { useRecentInvestmentActivities } from './useMyInvestmentActivities'
import { useMyInvestmentTasks } from './useMyInvestmentTasks'

/**
 * Adapter for KPIs hook
 */
export const useIrmKpisAdapter = (context: BusinessAppContextProps, employeeId: string): KpiResult => {
  const { kpis, loading, error } = useMyInvestmentKpis({
    employeeId,
    accessToken: context.accessToken || ''
  })

  return {
    data: kpis,
    loading,
    error
  }
}

/**
 * Adapter for Activities hook
 */
export const useIrmActivitiesAdapter = (context: BusinessAppContextProps, employeeId: string): ActivitiesResult => {
  const { activities, loading, error, refetch } = useRecentInvestmentActivities({
    employeeId,
    accessToken: context.accessToken || '',
    limit: 100 // Get more for calendar view
  })

  return {
    activities,
    loading,
    error,
    refetch
  }
}

/**
 * Adapter for Tasks hook
 */
export const useIrmTasksAdapter = (context: BusinessAppContextProps, employeeId: string): TasksResult => {
  const { tasks, loading, error, refetch } = useMyInvestmentTasks({
    employeeId,
    accessToken: context.accessToken || '',
    statusFilter: ['PENDING', 'IN_PROGRESS'],
    limit: 100
  })

  return {
    tasks,
    loading,
    error,
    refetch
  }
}
