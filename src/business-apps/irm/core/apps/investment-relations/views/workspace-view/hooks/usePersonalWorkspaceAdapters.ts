/**
 * Adapter hooks to transform IRM-specific hooks into generic workspace interfaces
 * Uses generic adapter factory to eliminate code duplication with CRM
 */
import { useInvestmentPersonalWorkspaceKpis } from '@/common/data/investment/hooks/useInvestmentPersonalWorkspaceKpis'
import { useInvestmentRecentActivities } from '@/common/data/investment/hooks/useInvestmentRecentActivities'
import { useInvestmentPersonalWorkspaceTasks } from '@/common/data/investment/hooks/useInvestmentPersonalWorkspaceTasks'
import { useInvestmentCalendarData } from '@/common/data/investment/hooks/useInvestmentCalendarData'
import {
  createKpiAdapter,
  createActivitiesAdapter,
  createTasksAdapter,
  createCombinedCalendarAdapter
} from '@/common/components/common-relations/view-layouts/personal-workspace/utils'

/**
 * IRM KPIs Adapter - uses generic factory
 */
export const useIrmKpisAdapter = createKpiAdapter(useInvestmentPersonalWorkspaceKpis, 'fetchKpis')

/**
 * IRM Recent Activities Adapter - uses generic factory
 * Fetches last 10 activities for Recent Activities widget
 */
export const useIrmRecentActivitiesAdapter = createActivitiesAdapter(
  useInvestmentRecentActivities,
  'fetchActivities',
  10 // limit to 10 activities
)

/**
 * IRM Activities Adapter (alias for backward compatibility)
 */
export const useIrmActivitiesAdapter = useIrmRecentActivitiesAdapter

/**
 * IRM Tasks Adapter - uses generic factory
 */
export const useIrmTasksAdapter = createTasksAdapter(
  useInvestmentPersonalWorkspaceTasks,
  'fetchTasks',
  ['PENDING', 'IN_PROGRESS'], // statusFilter
  100 // limit
)

/**
 * IRM Combined Calendar Adapter - uses generic factory
 * Fetches both activities and tasks in parallel for calendar widget
 */
export const useIrmCombinedCalendarAdapter = createCombinedCalendarAdapter(
  useInvestmentCalendarData,
  'fetchCalendarData'
)
