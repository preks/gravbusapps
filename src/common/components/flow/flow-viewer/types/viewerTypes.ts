/**
 * Generic graph types for the reusable FlowViewer.
 * Decoupled from FlowTemplate to allow reuse across applications.
 */

import type { ReactNode } from 'react'
import type { FlowCanvasThemeColors } from '../utils/themeColors'

export type FlowNodeType = 'start' | 'task' | 'decision' | 'fork' | 'join' | 'end'

export type FlowEdgeDirection = 'forward' | 'backward'

export type DecisionMode = 'USER' | 'AI' | 'LOGIC'

export type TriggerType = 'MANUAL_FORM' | 'WEBHOOK' | 'EVENT' | 'SCHEDULE'

export type TaskVariant =
  | 'TASK'
  | 'APPROVAL'
  | 'ACKNOWLEDGE'
  | 'INFORMATION'
  | 'FUNCTION'
  | 'AI_AGENT'
  | 'AI_TASK_EXPERT'

export type StepStatus = 'pending' | 'active' | 'completed' | 'failed' | 'skipped'

export interface FlowGraphNode {
  id: string
  type: FlowNodeType
  label: string
  metadata?: {
    /** Task variant for task nodes */
    taskVariant?: TaskVariant
    /** Decision mode for decision nodes */
    decisionMode?: DecisionMode
    /** Trigger type for start nodes */
    triggerType?: TriggerType
    /** Join condition for join nodes */
    joinCondition?: 'ALL' | 'ANY'
    /** Assignment mode badge text */
    assignmentMode?: string
    /** Whether this is a system step */
    isSystem?: boolean
    /** Step number for display */
    stepNumber?: number
    /** Secondary label / message */
    description?: string
    /** Summary fields count for end nodes */
    summaryFieldsCount?: number
    /** Any additional data */
    [key: string]: unknown
  }
}

export interface FlowGraphEdge {
  id: string
  source: string
  target: string
  label?: string
  direction: FlowEdgeDirection
  metadata?: {
    /** Condition expression for decision branches */
    condition?: string
    /** Rework reason label for backward edges */
    reworkReason?: string
    /** Whether this edge is animated */
    animated?: boolean
    [key: string]: unknown
  }
}

export interface FlowGraphDefinition {
  nodes: FlowGraphNode[]
  edges: FlowGraphEdge[]
}

export interface FlowExecutionState {
  /** Map of node ID to its execution status */
  nodeStates: Record<string, StepStatus>
  /** Currently active node ID */
  activeNodeId?: string
  /** Iteration counts per node (for rework loops) */
  iterations?: Record<string, number>
}

/** Edge actions for edit mode: insert node on edge, open insert panel. */
export interface FlowCanvasEdgeActions {
  onInsert?: (type: 'task' | 'decision' | 'fork', taskStepType?: unknown) => void
  onOpenInsertPanel?: () => void
}

/** Props for FlowCanvas when used inside FlowCanvasProvider. */
export interface FlowCanvasViewProps {
  /** The graph definition to render */
  definition: FlowGraphDefinition
  /** Optional pre-resolved theme colors for Background/Controls/MiniMap (else resolved from gba: classes) */
  themeColors?: FlowCanvasThemeColors
  /** Options for fitView (padding, minZoom, maxZoom). Used for initial fit when nodes are initialized (orgchart-style). */
  fitViewOptions?: { padding?: number; minZoom?: number; maxZoom?: number }
  /** When true, only forward edges are used for ELK layer ranking (backward/rework edges do not affect layout). */
  useForwardEdgesOnlyForRanking?: boolean
  /** Optional content rendered in React Flow Panel (center-right). Use for detail/sidebar. */
  rightPanel?: ReactNode
  /** Optional: called when a new connection is created (edit mode). */
  onConnect?: (connection: {
    source: string
    target: string
    sourceHandle?: string | null
    targetHandle?: string | null
  }) => void
  /** Optional: node click handler (edit mode). When not set, uses provider selectNode when isInteractive. */
  onNodeClick?: (event: React.MouseEvent, node: { id: string }) => void
  /** Optional: edge click handler (edit mode). When not set, uses provider selectEdge when isInteractive. */
  onEdgeClick?: (event: React.MouseEvent, edge: { id: string }) => void
  /** Optional: pane click handler (edit mode). When not set, clears selection via provider when isInteractive. */
  onPaneClick?: () => void
  /** Optional: per-edge actions for insert UI (edit mode). Merged into edge data. */
  getEdgeActions?: (edgeId: string) => FlowCanvasEdgeActions
  /** When true, nodes can be connected with new edges (edit mode). Default false. */
  nodesConnectable?: boolean
  /** When true, nodes are draggable. Default false. */
  nodesDraggable?: boolean
  /** When true, nodes and edges are selectable. Default from provider isInteractive when no edit callbacks. */
  elementsSelectable?: boolean
  /** Vertical alignment used after fitView. Defaults to top so flows open with the start node visible. */
  fitViewVerticalAlign?: 'top' | 'center'
  /** When false, hides the minimap. Defaults to true. */
  showMiniMap?: boolean
  /** Test ID for automated testing */
  'data-testid'?: string
}

/** @deprecated Use FlowCanvasViewProps for FlowCanvas; provider props go to FlowCanvasProvider. */
export interface FlowCanvasProps extends FlowCanvasViewProps {
  /** @deprecated Pass executionState to FlowCanvasProvider instead */
  state?: FlowExecutionState
  /** @deprecated Pass isInteractive to FlowCanvasProvider instead */
  mode?: 'static' | 'interactive'
  /** @deprecated Pass onNodeSelect to FlowCanvasProvider instead */
  onNodeSelect?: (nodeId: string) => void
  /** @deprecated Pass onEdgeSelect to FlowCanvasProvider instead */
  onEdgeSelect?: (edgeId: string) => void
  /** @deprecated Pass selectedNodeId to FlowCanvasProvider instead */
  selectedNodeId?: string | null
  /** @deprecated Pass selectedEdgeId to FlowCanvasProvider instead */
  selectedEdgeId?: string | null
}

/** @deprecated Use FlowCanvasProps */
export type FlowViewerProps = FlowCanvasProps

export type { FlowCanvasThemeColors } from '../utils/themeColors'

export interface FlowCanvasContextValue {
  /** Current zoom level */
  zoom: number
  /** Selected node ID */
  selectedNodeId: string | null
  /** Selected edge ID (optional; when set, onPaneClick clears both node and edge) */
  selectedEdgeId: string | null
  /** Select a node */
  selectNode: (nodeId: string | null) => void
  /** Select an edge (optional) */
  selectEdge: (edgeId: string | null) => void
  /** Execution state */
  executionState?: FlowExecutionState
  /** Whether the viewer is in interactive mode */
  isInteractive: boolean
}

/** @deprecated Use FlowCanvasContextValue */
export type FlowViewerContextValue = FlowCanvasContextValue
