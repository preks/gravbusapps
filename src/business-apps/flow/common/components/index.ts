// Shared flow management components
export { FlowList } from './FlowList'
export { FlowManagement } from '@/common/components/flow'

// Re-export the flow detail view and tabs for direct access
export { FlowDetailView } from '@/common/components/flow/flow-detail'
export { OverviewTab, WorkflowTab, DataTab, AuditTab } from '@/common/components/flow'

// Export types
export type { FlowListProps } from './FlowList'
export type { FlowManagementProps } from '@/common/components/flow'

// Visual flow renderer (reusable in edit/view modes)
export { FlowRenderer } from './flow-renderer/FlowRenderer'
