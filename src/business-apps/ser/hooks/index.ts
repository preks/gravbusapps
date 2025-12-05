// Service (SER) Hooks
export { useDataSource } from './useDataSource'
export type { DataSourceOption, UseDataSourceResult } from './useDataSource'
export { useDesksForUser } from './useDesksForUser'
export { useDeskTablePreferences } from './useDeskTablePreferences'
export { useDeskTablePreferencesSimple } from './useDeskTablePreferencesSimple'
export { useEmployeeNameCache } from './useEmployeeNameCache'
export { useEmployeeNamesBatch } from './useEmployeeNamesBatch'
export {
  useFlowAnalytics,
  useFlowManagementAnalytics,
  useTaskPerformanceAnalytics,
  useTemplatePerformanceAnalytics,
  useTrendAnalytics,
  useUsageAnalytics,
  useAuditLogs,
  useManagerDashboard
} from './useManagerAnalytics'
export { useMyRequestsCount } from './useMyRequestsCount'
export { useMyRequestsTablePreferences } from './useMyRequestsTablePreferences'
export { useServiceDeskCatalogCache } from './useServiceDeskCatalogCache'
export { useServiceFileUpload } from './useServiceFileUpload'
export { useServicePortalCategories } from './useServicePortalCategories'
export { useSharedFlowTemplates } from './useSharedFlowTemplates'
export { useUserCapabilitiesGraphQL } from './useUserCapabilitiesGraphQL'
export { useUserDetails } from './useUserDetails'

// Re-export service-desk specific hooks for convenience
export { useMultipleDeskCounts } from '../apps/service-desk/hooks/useMultipleDeskCounts'

// Export types from useServiceFileUpload
export type {
  UseServiceFileUploadProps,
  UseServiceFileUploadReturn,
  UploadFile,
  UploadProgress
} from './useServiceFileUpload'

// Export types from service-desk hooks
export type {
  UseMultipleDeskCountsProps,
  UseMultipleDeskCountsReturn
} from '../apps/service-desk/hooks/useMultipleDeskCounts'
