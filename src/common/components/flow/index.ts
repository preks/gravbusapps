// Shared flow management components
export { ReadonlyTemplateFlowCanvas } from './ReadonlyTemplateFlowCanvas'
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
  FlowGraphEdge,
  FlowExecutionState,
  FlowNodeOutcome,
  StepStatus,
  FlowCanvasViewProps,
  FlowCanvasEdgeActions,
  FlowCanvasProps,
  FlowViewerProps,
  FlowCanvasThemeColors
} from './flow-viewer/types/viewerTypes'

// Data viewer (ERD canvas for entity relationship diagrams)
export { DataCanvas } from './data-viewer/DataCanvas'
export { useDataGraph, buildDataGraph } from './data-viewer/hooks/useDataGraph'
export type { DataGraphEntityInput, DataGraphOptions } from './data-viewer/hooks/useDataGraph'
export type {
  DataCanvasProps,
  DataEntityColumn,
  DataEntityNodeData,
  DataInternalEntityField,
  DataInternalEntitySchema,
  DataInternalEntityNodeData,
  DataRelationshipEdgeData,
  DataGraphNode,
  DataGraphEdge
} from './data-viewer/types/dataViewerTypes'
