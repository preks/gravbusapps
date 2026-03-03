// Shared flow management components
export { FlowList } from './FlowList'
export { FlowManagement } from './FlowManagement'

// Re-export the flow detail view and tabs for direct access
export { FlowDetailView } from './flow-detail/FlowDetailView'
export { OverviewTab, WorkflowTab, DataTab, AuditTab } from './flow-detail/tabs'

// Export types
export type { FlowListProps } from './FlowList'
export type { FlowManagementProps } from './FlowManagement'

// Graph viewer (start, task, decision, end with ELK layout)
export { FlowCanvas, FlowViewer, useRightPanelExiting } from './flow-viewer/FlowViewer'
export { FlowCanvasProvider, useFlowCanvasContext } from './flow-viewer/FlowViewerProvider'
export type {
  FlowGraphDefinition,
  FlowCanvasViewProps,
  FlowCanvasEdgeActions,
  FlowCanvasProps,
  FlowViewerProps,
  FlowCanvasThemeColors
} from './flow-viewer/types/viewerTypes'
