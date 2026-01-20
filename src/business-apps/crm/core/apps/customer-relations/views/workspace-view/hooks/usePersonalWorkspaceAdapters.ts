/**
 * Adapter hooks to transform CRM-specific hooks into generic workspace interfaces
 * Uses generic adapter factory to eliminate code duplication with IRM
 */
import { useCustomerPersonalWorkspaceKpis } from '@/common/data/customer/hooks/useCustomerPersonalWorkspaceKpis'
import { useCustomerRecentActivities } from '@/common/data/customer/hooks/useCustomerRecentActivities'
import { useCustomerPersonalWorkspaceTasks } from '@/common/data/customer/hooks/useCustomerPersonalWorkspaceTasks'
import { useCustomerCalendarData } from '@/common/data/customer/hooks/useCustomerCalendarData'
import {
  createKpiAdapter,
  createActivitiesAdapter,
  createTasksAdapter,
  createCombinedCalendarAdapter
} from '@/common/components/common-relations/view-layouts/personal-workspace/utils'

/**
 * CRM KPIs Adapter - uses generic factory
 */
export const useCrmKpisAdapter = createKpiAdapter(useCustomerPersonalWorkspaceKpis, 'fetchKpis')

/**
 * CRM Recent Activities Adapter - uses generic factory
 * Fetches last 10 activities for Recent Activities widget
 */
export const useCrmRecentActivitiesAdapter = createActivitiesAdapter(
  useCustomerRecentActivities,
  'fetchActivities',
  10 // limit to 10 activities
)

/**
 * CRM Activities Adapter (alias for backward compatibility)
 */
export const useCrmActivitiesAdapter = useCrmRecentActivitiesAdapter

/**
 * CRM Tasks Adapter - uses generic factory
 */
export const useCrmTasksAdapter = createTasksAdapter(
  useCustomerPersonalWorkspaceTasks,
  'fetchTasks',
  ['PENDING', 'IN_PROGRESS'], // statusFilter
  100 // limit
)

/**
 * CRM Combined Calendar Adapter - uses generic factory
 * Fetches both activities and tasks in parallel for calendar widget
 */
export const useCrmCombinedCalendarAdapter = createCombinedCalendarAdapter(useCustomerCalendarData, 'fetchCalendarData')
