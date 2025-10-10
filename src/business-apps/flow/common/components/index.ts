// Shared flow management components
export { FlowList } from './FlowList'
export { FlowManagement } from './FlowManagement'

// Re-export the flow detail view and tabs for direct access
export { FlowDetailView } from './flow-detail/FlowDetailView'
export { OverviewTab, WorkflowTab, DataTab, AuditTab } from './flow-detail/tabs'

// Export types
export type { FlowListProps } from './FlowList'
export type { FlowManagementProps } from './FlowManagement'

// Visual flow renderer (reusable in edit/view modes)
export { FlowRenderer } from './flow-renderer/FlowRenderer'
