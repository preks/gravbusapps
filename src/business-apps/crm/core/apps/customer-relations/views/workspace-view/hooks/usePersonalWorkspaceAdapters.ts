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
import { useCustomerPersonalWorkspaceKpis } from '@/common/data/customer/hooks/useCustomerPersonalWorkspaceKpis'
import { useCustomerRecentActivities } from '@/common/data/customer/hooks/useCustomerRecentActivities'
import { useCustomerPersonalWorkspaceTasks } from '@/common/data/customer/hooks/useCustomerPersonalWorkspaceTasks'

/**
 * Adapter for KPIs hook
 */
export const useCrmKpisAdapter = (context: BusinessAppContextProps, employeeId: string): KpiResult => {
  const { kpis, loading, error } = useCustomerPersonalWorkspaceKpis({
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
  const { activities, loading, error, refetch } = useCustomerRecentActivities({
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
  const { tasks, loading, error, refetch } = useCustomerPersonalWorkspaceTasks({
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
