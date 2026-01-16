import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { MyTasksViewConfig } from '../components/tasks'
import type { MyActivitiesViewConfig } from '../components/activities'

// Re-export types for external use
export type { MyTasksViewConfig, MyActivitiesViewConfig }

/**
 * Generic configuration for Personal Workspace component
 * Following the pattern of other view layouts (AccountLayout, LeadLayout, etc.)
 *
 * Note: Visual properties (colors, icons, titles) should be passed as props to the component,
 * not stored in the config. Config should only contain behavioral/data logic.
 */
export interface PersonalWorkspaceConfig {
  // Module identifier
  module: 'crm' | 'irm'

  // KPI configuration
  kpis: KpiDefinition[]

  // Entity configuration
  entities: EntityConfiguration

  // Data hooks (injected by module)
  hooks: {
    useKpis: (context: BusinessAppContextProps, employeeId: string) => KpiResult
    useActivities: (context: BusinessAppContextProps, employeeId: string) => ActivitiesResult
    useTasks: (context: BusinessAppContextProps, employeeId: string) => TasksResult
  }

  // Navigation configuration (module-specific URL building)
  navigation: {
    buildEntityUrl: (entityType: string, entityId: string) => string
    buildRecordUrl: (entityType: string, entityId: string) => string
  }

  // Translations
  translations: {
    overview: { key: string; default: string }
    activities: { key: string; default: string }
    tasks: { key: string; default: string }
  }

  // Optional: My Activities configuration for Activities tab
  myActivitiesConfig?: MyActivitiesViewConfig<any>

  // Optional: My Tasks configuration for Tasks tab
  myTasksConfig?: MyTasksViewConfig<any, any>
}

/**
 * KPI definition for dynamic rendering
 */
export interface KpiDefinition {
  id: string
  label: string
  description?: string // Optional description/subtitle text
  icon: React.ComponentType<any>
  color: string
  valueKey: string // Path to value in data object (e.g., 'leads.total')
  trendKey?: string // Path to trend in data object (e.g., 'leads.trend')
  trendDescription?: string // Optional trend comparison description (e.g., 'vs last quarter')
  formatValue?: (value: number) => string
}

/**
 * Entity configuration for each entity type
 */
export interface EntityConfiguration {
  lead: EntityTypeConfig
  opportunity: EntityTypeConfig
  activity: EntityTypeConfig
  task: EntityTypeConfig
}

/**
 * Configuration for a specific entity type
 */
export interface EntityTypeConfig {
  enabled: boolean
  displayName: string
  pluralName: string
  icon: React.ComponentType<any>
  statusField?: string
  priorityField?: string
}

/**
 * Result from KPI data hooks
 */
export interface KpiResult {
  data: any
  loading: boolean
  error: Error | null
}

/**
 * Result from activities data hooks
 */
export interface ActivitiesResult {
  activities: any[]
  loading: boolean
  error: Error | null
  refetch?: () => void
}

/**
 * Result from tasks data hooks
 */
export interface TasksResult {
  tasks: any[]
  loading: boolean
  error: Error | null
  refetch?: () => void
}
