/**
 * Adapter hooks to transform CRM-specific hooks into generic workspace interfaces
 * This allows CRM hooks to work with the generic PersonalWorkspace component
 */
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type {
  KpiResult,
  ActivitiesResult,
  TasksResult
} from '@/common/components/common-relations/view-layouts/personal-workspace/types'
import { useMyPerformanceKpis } from './useMyPerformanceKpis'
import { useRecentActivities } from './useRecentActivities'
import { useMyTasks } from './useMyTasks'

/**
 * Adapter for KPIs hook
 */
export const useCrmKpisAdapter = (context: BusinessAppContextProps, employeeId: string): KpiResult => {
  const { kpis, loading, error } = useMyPerformanceKpis({
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
export const useCrmActivitiesAdapter = (context: BusinessAppContextProps, employeeId: string): ActivitiesResult => {
  const { activities, loading, error, refetch } = useRecentActivities({
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
export const useCrmTasksAdapter = (context: BusinessAppContextProps, employeeId: string): TasksResult => {
  const { tasks, loading, error, refetch } = useMyTasks({
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
