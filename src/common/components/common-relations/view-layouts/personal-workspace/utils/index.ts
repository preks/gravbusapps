/**
 * Personal Workspace Utilities
 * Generic factories and helpers for workspace adapters
 */
export {
  createKpiAdapter,
  createActivitiesAdapter,
  createTasksAdapter,
  createCombinedCalendarAdapter
} from './createWorkspaceAdapter'

export {
  getNestedValue,
  transformTaskToCalendarActivity,
  transformActivityToCalendarActivity,
  getEntityDisplayName
} from './dataTransformers'
