import { PersonalWorkspaceConfig } from '@/common/components/common-relations/view-layouts/personal-workspace/types/configTypes'
import {
  useIrmKpisAdapter,
  useIrmRecentActivitiesAdapter,
  useIrmCombinedCalendarAdapter,
  useIrmTasksAdapter
} from '../hooks/usePersonalWorkspaceAdapters'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'
import { TargetIcon, BuildingsIcon, UsersIcon, ChartPieIcon, UserIcon, ChartLineUpIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { MyActivitiesTab } from '../components/MyActivitiesTab'
import { MyTasksTab } from '../components/MyTasksTab'

/**
 * IRM-specific configuration for Personal Workspace
 * Following the agnostic pattern - no UI metadata, only behavioral configuration
 * Provides factory functions for lazy loading tab-specific data
 */
const buildIrmWorkspaceConfig = (
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _context: BusinessAppContextProps
): PersonalWorkspaceConfig => ({
  // Module identifier
  module: 'irm',

  // KPI configuration
  kpis: [
    {
      id: 'opportunities',
      label: 'My Opportunities',
      description: 'Investment opportunities',
      icon: TargetIcon,
      color: '#3b82f6',
      valueKey: 'opportunities.total',
      trendKey: 'opportunities.trend',
      trendDescription: 'vs last quarter',
      formatValue: v => v?.toString() || '0'
    },
    {
      id: 'accounts',
      label: 'My Accounts',
      description: 'Investment accounts',
      icon: BuildingsIcon,
      color: '#8b5cf6',
      valueKey: 'accounts.total',
      trendKey: 'accounts.trend',
      trendDescription: 'vs last quarter',
      formatValue: v => v?.toString() || '0'
    },
    {
      id: 'contacts',
      label: 'My Contacts',
      description: 'Investment contacts',
      icon: UsersIcon,
      color: '#10b981',
      valueKey: 'contacts.total',
      trendKey: 'contacts.trend',
      trendDescription: 'vs last quarter',
      formatValue: v => v?.toString() || '0'
    },
    {
      id: 'investments',
      label: 'My Investments',
      description: 'Active investments',
      icon: ChartPieIcon,
      color: '#f59e0b',
      valueKey: 'investments.total',
      trendKey: 'investments.trend',
      trendDescription: 'vs last quarter',
      formatValue: v => v?.toString() || '0'
    }
  ],

  // Entity configuration
  entities: {
    lead: {
      enabled: true,
      displayName: 'Investment Lead',
      pluralName: 'Investment Leads',
      icon: UserIcon,
      statusField: 'investmentLeadStatus'
    },
    opportunity: {
      enabled: true,
      displayName: 'Deal',
      pluralName: 'Deals',
      icon: TargetIcon,
      statusField: 'dealStatus'
    },
    activity: {
      enabled: true,
      displayName: 'Activity',
      pluralName: 'Activities',
      icon: ChartLineUpIcon
    },
    task: {
      enabled: true,
      displayName: 'Task',
      pluralName: 'Tasks',
      icon: ChartLineUpIcon,
      statusField: 'status',
      priorityField: 'priority'
    }
  },

  // Data hooks (using adapters)
  hooks: {
    useKpis: useIrmKpisAdapter,
    useActivities: useIrmRecentActivitiesAdapter, // ✅ For Recent Activities widget (10 items)
    useTasks: useIrmTasksAdapter,
    useCombinedCalendarData: useIrmCombinedCalendarAdapter // ✅ Parallel queries for calendar (activities + tasks)
  },

  // Navigation configuration
  navigation: {
    buildEntityUrl: (entityType: string, entityId: string) => {
      return buildPlatformUrl(`/platform/irm/${entityType}-record`, { [`${entityType}Id`]: entityId })
    },
    buildRecordUrl: (entityType: string, entityId: string) => {
      return buildPlatformUrl(`/platform/irm/${entityType}-record`, { [`${entityType}Id`]: entityId })
    }
  },

  // Translations
  translations: {
    overview: {
      key: 'irm.personal.workspace.overview',
      default: 'Overview'
    },
    activities: {
      key: 'irm.personal.workspace.activities',
      default: 'Activities'
    },
    tasks: {
      key: 'irm.personal.workspace.tasks',
      default: 'Tasks'
    }
  },

  // Component wrappers for lazy loading (rendered only when their tab is active)
  MyActivitiesComponent: MyActivitiesTab,
  MyTasksComponent: MyTasksTab
})

/**
 * Export builder function for IRM workspace config
 */
export const irmWorkspaceConfig = buildIrmWorkspaceConfig
