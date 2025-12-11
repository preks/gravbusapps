// Re-export shared dashboard types from common location
export * from '@/common/components/common-relations/view-layouts/dashboard-layout/types/dashboardTypes'

// CRM-specific type alias for backwards compatibility
export type SalesActivityData =
  import('@/common/components/common-relations/view-layouts/dashboard-layout/types/dashboardTypes').ActivityData
