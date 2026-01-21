import { PersonalWorkspaceConfig } from '@/common/components/common-relations/view-layouts/personal-workspace/types/configTypes'
import {
  useCrmKpisAdapter,
  useCrmRecentActivitiesAdapter,
  useCrmTasksAdapter,
  useCrmCombinedCalendarAdapter
} from '../hooks/usePersonalWorkspaceAdapters'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'
import { UserIcon, TargetIcon, BuildingsIcon, ChartLineUpIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { MyTasksTab } from '../components/MyTasksTab'
import { MyActivitiesTab } from '../components/MyActivitiesTab'

/**
 * CRM-specific configuration for Personal Workspace
 * Following the agnostic pattern - no UI metadata, only behavioral configuration
 */
const buildCrmWorkspaceConfig = (
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _context: BusinessAppContextProps
): PersonalWorkspaceConfig => ({
  // Module identifier
  module: 'crm',

  // KPI configuration
  kpis: [
    {
      id: 'leads',
      label: 'My Leads',
      description: 'Active leads in pipeline',
      icon: UserIcon,
      color: '#1677ff',
      valueKey: 'leads.total',
      trendKey: 'leads.trend',
      formatValue: v => v?.toString() || '0'
    },
    {
      id: 'opportunities',
      label: 'My Opportunities',
      description: 'Open opportunities',
      icon: TargetIcon,
      color: '#52c41a',
      valueKey: 'opportunities.total',
      trendKey: 'opportunities.trend',
      formatValue: v => v?.toString() || '0'
    },
    {
      id: 'accounts',
      label: 'My Accounts',
      description: 'Accounts owned by me',
      icon: BuildingsIcon,
      color: '#faad14',
      valueKey: 'accounts.total',
      trendKey: 'accounts.trend',
      trendDescription: 'vs last quarter',
      formatValue: v => v?.toString() || '0'
    },
    {
      id: 'activities',
      label: 'My Activities',
      description: 'This month',
      icon: ChartLineUpIcon,
      color: '#722ed1',
      valueKey: 'activities.thisMonth',
      trendKey: 'activities.trend',
      formatValue: v => v?.toString() || '0'
    }
  ],

  // Entity configuration
  entities: {
    lead: {
      enabled: true,
      displayName: 'Lead',
      pluralName: 'Leads',
      icon: UserIcon,
      statusField: 'leadStatus'
    },
    opportunity: {
      enabled: true,
      displayName: 'Opportunity',
      pluralName: 'Opportunities',
      icon: TargetIcon,
      statusField: 'opportunityStatus'
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
    useKpis: useCrmKpisAdapter,
    useActivities: useCrmRecentActivitiesAdapter, // For Recent Activities widget
    useTasks: useCrmTasksAdapter, // Still used for the dedicated Tasks tab
    useCombinedCalendarData: useCrmCombinedCalendarAdapter // New combined hook for calendar
  },

  // Navigation configuration
  navigation: {
    buildEntityUrl: (entityType: string, entityId: string) => {
      return buildPlatformUrl(`/platform/crm/${entityType}-record`, { [`${entityType}Id`]: entityId })
    },
    buildRecordUrl: (entityType: string, entityId: string) => {
      return buildPlatformUrl(`/platform/crm/${entityType}-record`, { [`${entityType}Id`]: entityId })
    }
  },

  // Translations
  translations: {
    overview: {
      key: 'crm.personal.workspace.overview',
      default: 'Overview'
    },
    activities: {
      key: 'crm.personal.workspace.activities',
      default: 'Activities'
    },
    tasks: {
      key: 'crm.personal.workspace.tasks',
      default: 'Tasks'
    }
  },

  // Tab wrapper components (for lazy loading)
  MyActivitiesComponent: MyActivitiesTab,
  MyTasksComponent: MyTasksTab
})

/**
 * Export builder function for CRM workspace config
 */
export const crmWorkspaceConfig = buildCrmWorkspaceConfig
